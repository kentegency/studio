import { useEffect, useState, useRef } from 'react'
import { useNodeStore, useUIStore, useAssetsStore, useNotesStore, useAuthStore, useProjectStore } from '../../stores'
import { supabase } from '../../lib/supabase'
import { undoStack } from '../../lib/undo'
import EmptyState from '../EmptyState'
import ConfirmModal from '../ConfirmModal'
import './Panes.css'
import '../EmptyState.css'

const STATUSES      = ['concept','progress','review','approved','locked']
const STATUS_COLORS = { concept:'#6A6258', progress:'var(--accent)', review:'#C07010', approved:'#4ADE80', locked:'#4ADE80' }
const STATUS_LABELS = { concept:'Concept', progress:'In Progress', review:'In Review', approved:'Approved ✓', locked:'Locked ✓' }
const NOTE_COLORS   = ['var(--accent)','var(--teal)','#F4EFD8','#4ADE80','#8B5CF6','#E05050']
const WAVEFORM      = [.3,.5,.8,.6,.9,.4,.7,.55,.8,.6,.4,.9,.7,.5,.3,.65,.8,.4,.7,.5,.9,.6,.4,.8,.5,.7,.35,.6,.9,.4,.8,.6,.5,.7,.3,.9,.6,.4,.75,.5]
const TYPE_COLORS   = { pdf:'#E05050', image:'var(--teal)', gif:'#8B5CF6', video:'var(--accent)', audio:'#4ADE80', document:'#D4CAAA', reference:'#D4CAAA' }

const getType = (asset) => {
  const ext = (asset.file_url?.split('.').pop() ?? '').toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (['jpg','jpeg','png','webp','gif','svg','heic'].includes(ext)) return 'image'
  if (['mp4','mov','avi','webm','mkv'].includes(ext)) return 'video'
  if (['mp3','wav','m4a','aac','opus','flac'].includes(ext)) return 'audio'
  return asset.type ?? 'document'
}

const UpIcon   = () => <svg viewBox="0 0 24 24" style={{width:'13px',height:'13px',stroke:'currentColor',fill:'none',strokeWidth:'1.5',strokeLinecap:'round',flexShrink:0}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
const LinkIcon = () => <svg viewBox="0 0 24 24" style={{width:'13px',height:'13px',stroke:'currentColor',fill:'none',strokeWidth:'1.5',flexShrink:0}}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
const NoteIcon = () => <svg viewBox="0 0 24 24" style={{width:'16px',height:'16px',stroke:'currentColor',fill:'none',strokeWidth:'1.5'}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
const ImgIcon  = () => <svg viewBox="0 0 24 24" style={{width:'16px',height:'16px',stroke:'currentColor',fill:'none',strokeWidth:'1.5'}}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
const ShotIcon = () => <svg viewBox="0 0 24 24" style={{width:'16px',height:'16px',stroke:'currentColor',fill:'none',strokeWidth:'1.5'}}><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
const PdfIcon  = () => <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
const VidIcon  = () => <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
const AudIcon  = () => <svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
const DocIcon  = () => <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
const MicIcon  = () => <svg viewBox="0 0 24 24" style={{width:'13px',height:'13px',stroke:'currentColor',fill:'none',strokeWidth:'1.5',strokeLinecap:'round',flexShrink:0}}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>

export default function NodePane({ onUpload }) {
  const { selectedNode, selectNode, updateNode } = useNodeStore()
  const { assets, fetchAssets }                  = useAssetsStore()
  const { notes, fetchNotes, addNote }           = useNotesStore()
  const { openOverlay, showToast }               = useUIStore()
  const { user }                                 = useAuthStore()
  const { currentProject }                       = useProjectStore()

  const [newNote,      setNewNote]      = useState('')
  const [noteColor,    setNoteColor]    = useState('var(--accent)')
  const [addingNote,   setAddingNote]   = useState(false)
  const [showWindow,     setShowWindow]     = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [saveIndicator,  setSaveIndicator]  = useState(false)
  const [confirmLock,    setConfirmLock]    = useState(false)

  const [assetsLoading, setAssetsLoading] = useState(false)
  const [notesLoading,  setNotesLoading]  = useState(false)
  const [description,   setDescription]  = useState('')
  const [descSaving,    setDescSaving]   = useState(false)
  const descTimer = useRef(null)

  // Sync description from selected node
  useEffect(() => {
    setDescription(selectedNode?.description ?? '')
  }, [selectedNode?.id])

  // Auto-save description with debounce
  const handleDescChange = (val) => {
    setDescription(val)
    clearTimeout(descTimer.current)
    descTimer.current = setTimeout(async () => {
      if (!selectedNode?.id || selectedNode.id.startsWith('cn')) return
      setDescSaving(true)
      await updateNode(selectedNode.id, { description: val })
      setDescSaving(false)
    }, 800)
  }

  useEffect(() => {
    if (!selectedNode?.id) return
    setAssetsLoading(true)
    setNotesLoading(true)
    ;(async () => {
      await fetchAssets(selectedNode.id)
      setAssetsLoading(false)
    })()
    ;(async () => {
      await fetchNotes(selectedNode.id)
      setNotesLoading(false)
    })()
  }, [selectedNode?.id])

  const showSaved = () => { setSaveIndicator(true); setTimeout(() => setSaveIndicator(false), 2000) }

  const openViewer = (asset, idx) => {
    window.__openViewer?.(asset, assets, idx)
  }

  if (!selectedNode) return (
    <div className="node-pane">
      <EmptyState
        icon={<svg viewBox="0 0 24 24" style={{width:'16px',height:'16px',stroke:'currentColor',fill:'none',strokeWidth:'1.5'}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
        title="No scene selected"
        body="Click any node on the timeline to open its details here."
      />
    </div>
  )

  const name   = selectedNode?.name  ?? selectedNode?.label ?? 'Untitled'
  const act    = selectedNode?.act   ?? ''
  const status = selectedNode?.status ?? 'concept'
  const color  = STATUS_COLORS[status] ?? '#6A6258'
  const label  = STATUS_LABELS[status] ?? 'Concept'

  const cycleStatus = async () => {
    if (!selectedNode?.id || updatingStatus) return
    const prev = selectedNode.status ?? 'concept'
    const idx  = STATUSES.indexOf(prev)
    const next = STATUSES[(idx + 1) % STATUSES.length]
    setUpdatingStatus(true)
    const { data } = await updateNode(selectedNode.id, { status: next })
    if (data) {
      selectNode({ ...selectedNode, status: next })
      showSaved()
      // Push undo action
      undoStack.push({
        label: `Status → ${STATUS_LABELS[next]}`,
        undo: async () => {
          await updateNode(selectedNode.id, { status: prev })
          selectNode({ ...selectedNode, status: prev })
        }
      })
      showToast(`Status → ${STATUS_LABELS[next]}`, 'var(--orange)', 5000)
    }
    setUpdatingStatus(false)
  }

  const lockNode = async () => {
    if (!selectedNode?.id) return
    await updateNode(selectedNode.id, { locked:true, status:'locked', locked_by:user?.id, locked_at:new Date().toISOString() })
    selectNode({ ...selectedNode, status:'locked', locked:true })
    setConfirmLock(false)
    showSaved()
    showToast('Node locked. No further edits.', '#4ADE80', 3000)
  }

  const saveNote = async () => {
    if (!newNote.trim() || !selectedNode) return
    const pid = currentProject?.id
    if (!pid) { showToast('Open a project first.', '#E05050'); return }
    const { data } = await addNote({ project_id:pid, node_id:selectedNode.id, author_id:user?.id, body:newNote, color:noteColor, room:'studio' })
    setNewNote(''); setAddingNote(false); showSaved()
    // Push undo — delete the note we just added
    if (data?.id) {
      undoStack.push({
        label: 'Note saved',
        undo: async () => {
          await supabase.from('notes').delete().eq('id', data.id)
          await fetchNotes(selectedNode.id)
        }
      })
    }
    showToast('Note saved.', 'var(--orange)', 5000)
  }

  const windowUrl  = currentProject?.window_token
    ? `${window.location.origin}/#/window/${currentProject.window_token}` : ''

  // Session token — stored on project, generated once
  const [sessionToken,    setSessionToken]    = useState(currentProject?.session_token ?? null)
  const [sessionCopied,   setSessionCopied]   = useState(false)
  const [generatingToken, setGeneratingToken] = useState(false)

  const sessionUrl = sessionToken
    ? `${window.location.origin}/#/session/${sessionToken}` : ''

  const generateSessionToken = async () => {
    if (!currentProject?.id) return
    setGeneratingToken(true)
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 20)
    const { error } = await import('../../lib/supabase').then(({ supabase }) =>
      supabase.from('projects').update({ session_token: token }).eq('id', currentProject.id)
    )
    if (!error) {
      setSessionToken(token)
      showToast('Session link created.', '#4ADE80')
    }
    setGeneratingToken(false)
  }

  const copySession = () => {
    navigator.clipboard.writeText(sessionUrl)
    setSessionCopied(true)
    setTimeout(() => setSessionCopied(false), 2000)
  }

  const startSession = () => {
    if (!sessionToken) return
    window.__startSession?.(sessionToken)
  }

  return (
    <div className="node-pane">
      {/* Header */}
      <div className="rph">
        {confirmLock && (
          <ConfirmModal
            title={`Lock "${name}"?`}
            body={<>Locking this scene marks it as final. <strong>No further edits</strong> can be made without unlocking. Contributors will be notified.</>}
            confirmLabel="Lock scene →"
            danger
            onConfirm={lockNode}
            onCancel={() => setConfirmLock(false)}
          />
        )}
        <div className="rp-ey">{act || `${selectedNode.type ?? 'scene'} · ${Math.round((selectedNode.position ?? 0) * 100)}%`}</div>
        <div className="rp-ti">{name}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div className="rp-st" style={{ cursor:'pointer' }}
            onClick={cycleStatus} data-hover title="Click to advance status">
            <span className="rp-dot" style={{ background:color }} />
            <span style={{ color }}>{label}</span>
            <span style={{ color:'var(--ghost)', fontSize:'11px', marginLeft:'4px' }}>↻</span>
          </div>
          {saveIndicator && (
            <div className="save-indicator">
              <svg viewBox="0 0 24 24" style={{width:'11px',height:'11px',stroke:'var(--green)',fill:'none',strokeWidth:'2.5',strokeLinecap:'round'}}><polyline points="20 6 9 17 4 12"/></svg>
              Saved
            </div>
          )}
        </div>
      </div>

      {/* Scene description — auto-saves, uses Cormorant Garamond for creative identity */}
      <div className="scene-desc-wrap">
        <textarea
          className="scene-desc-input"
          placeholder="What is this scene trying to do? Describe the mood, the purpose, the creative direction…"
          value={description}
          onChange={e => handleDescChange(e.target.value)}
          rows={3}
        />
        {descSaving && (
          <div className="scene-desc-saving">saving…</div>
        )}
      </div>

      {/* Assets */}
      <div className="sec">
        <div className="sec-l">
          Assets — {assetsLoading ? '…' : assets.length}
          <span onClick={() => openOverlay('compare')} data-hover>Compare</span>
        </div>
        <button className="upload-trigger" onClick={onUpload} data-hover>
          <UpIcon /><span>Upload files to this node</span>
        </button>
        {assetsLoading ? (
          <div className="asset-grid" style={{ marginTop:'8px' }}>
            {[1,2,3].map(i => (
              <div key={i} className="at skeleton" style={{ height:'52px' }} />
            ))}
          </div>
        ) : assets.length > 0 ? (
          <div className="asset-grid" style={{ marginTop:'8px' }}>
            {assets.slice(0,7).map((a, i) => {
              const type = getType(a)
              const tc   = TYPE_COLORS[type] ?? '#D4CAAA'
              const isImg = type === 'image' || type === 'gif'
              return (
                <div key={a.id} className="at" data-hover
                  onClick={() => openViewer(a, i)} title={a.name}>
                  {isImg ? (
                    <img src={a.file_url} alt={a.name}
                      style={{ width:'100%',height:'100%',objectFit:'cover',borderRadius:'2px' }}
                      onError={e => { e.target.style.display='none' }} />
                  ) : (
                    <div className="at-type-icon" style={{ color:tc }}>
                      {type === 'pdf'   && <PdfIcon />}
                      {type === 'video' && <VidIcon />}
                      {type === 'audio' && <AudIcon />}
                      {(type === 'document' || type === 'reference') && <DocIcon />}
                    </div>
                  )}
                  <span className="at-b" style={{ background:`${tc}22`, color:tc }}>
                    {type.slice(0,3)}
                  </span>
                </div>
              )
            })}
            <div className="at at-add" onClick={onUpload} data-hover><AddIcon /></div>
          </div>
        ) : (
          <div style={{ marginTop:'6px' }}>
            <EmptyState compact icon={<ImgIcon />}
              title="No assets yet"
              body="Upload images, video, audio, or documents."
              action="Upload first asset →"
              onAction={onUpload} />
          </div>
        )}
        {/* Waveform — only shown when audio assets are attached */}
        {assets.some(a => getType(a) === 'audio') && (
          <div className="waveform-wrap">
            <div className="waveform-label">Audio reference</div>
            <div className="waveform">
              {WAVEFORM.map((h, i) => (
                <div key={i} className={`wb ${i < 20 ? 'active' : ''}`}
                  style={{ height:`${h*22}px`, minWidth:'3px' }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Window Link */}
      {currentProject && (
        <div className="sec" style={{ flexShrink:0 }}>
          <div className="sec-l">Client Window</div>
          <button className="window-link-btn" onClick={() => setShowWindow(s => !s)} data-hover>
            <LinkIcon /><span>Share Window link with client</span>
          </button>
          {showWindow && (
            <div className="window-link-box">
              <div className="wl-url">{windowUrl || 'Save project first'}</div>
              {windowUrl && (
                <button className="wl-copy" onClick={() => {
                  navigator.clipboard.writeText(windowUrl)
                  showToast('Window link copied.', '#4ADE80')
                  setShowWindow(false)
                }} data-hover>Copy</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Live Session */}
      {currentProject && (
        <div className="sec" style={{ flexShrink:0 }}>
          <div className="sec-l">Live Session</div>
          {!sessionToken ? (
            <button className="window-link-btn" onClick={generateSessionToken}
              disabled={generatingToken} data-hover>
              <svg viewBox="0 0 24 24" style={{ width:13, height:13, stroke:'currentColor', fill:'none', strokeWidth:1.5, strokeLinecap:'round', flexShrink:0 }}>
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
              <span>{generatingToken ? 'Creating…' : 'Create session link'}</span>
            </button>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              <button className="window-link-btn" onClick={startSession} data-hover
                style={{ color:'var(--project-accent, var(--orange))', borderColor:'rgba(212,170,106,.2)' }}>
                <svg viewBox="0 0 24 24" style={{ width:13, height:13, stroke:'currentColor', fill:'none', strokeWidth:1.5, strokeLinecap:'round', flexShrink:0 }}>
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
                <span>Start session now</span>
              </button>
              <div className="window-link-box">
                <div className="wl-url">{sessionUrl}</div>
                <button className="wl-copy" onClick={copySession} data-hover>
                  {sessionCopied ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
              <div style={{ fontSize:'11px', color:'var(--mute)', fontFamily:'var(--font-ui)', lineHeight:1.5 }}>
                Send this link to your client. They join from their browser — no login needed.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="notes-wrap">
        <div className="notes-header">
          <span className="nh-l">Notes — {notesLoading ? '…' : notes.length}</span>
          <div style={{ display:'flex', gap:'8px' }}>
            <span className="nh-a" style={{ color:'#8B5CF6', borderColor:'rgba(139,92,246,.2)', display:'flex', alignItems:'center', gap:'4px' }}
              onClick={() => window.__openVoice?.()}
              data-hover title="Voice note">
              <MicIcon />
            </span>
            <span className="nh-a" onClick={() => setAddingNote(s => !s)} data-hover>
              {addingNote ? 'Cancel' : '+ Add'}
            </span>
          </div>
        </div>
        {addingNote && (
          <div className="add-note-form">
            <textarea className="an-input" rows={3}
              placeholder="What are you thinking about this scene?"
              value={newNote} onChange={e => setNewNote(e.target.value)} autoFocus />
            <div className="an-footer">
              <div className="an-colors">
                {NOTE_COLORS.map((c,i) => (
                  <div key={i} className={`an-color ${noteColor===c?'on':''}`}
                    style={{ background:c }} onClick={() => setNoteColor(c)} />
                ))}
              </div>
              <button className="an-save" onClick={saveNote} data-hover>Save</button>
            </div>
          </div>
        )}
        {notesLoading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'6px', padding:'8px 0' }}>
            {[1,2].map(i => (
              <div key={i} className="skeleton skeleton-block" style={{ opacity:.5 }} />
            ))}
          </div>
        ) : notes.length > 0 ? (
          notes.map((n,i) => (
            <div key={n.id??i} className={`note ${n.resolved?'resolved':''}`}
              style={{ borderLeftColor:n.color??'var(--accent)' }} data-hover>
              <div className="nb">{n.body}</div>
              <div className="nm">{n.room??'studio'} · {formatTime(n.created_at)}</div>
            </div>
          ))
        ) : !addingNote && (
          <EmptyState compact icon={<NoteIcon />}
            title="No notes yet"
            body="Capture your thinking about this scene."
            action="Add first note →"
            onAction={() => setAddingNote(true)} />
        )}
        {selectedNode && !selectedNode.locked && notes.length > 0 && (
          <div className="lock-row">
            <button className="lock-btn" onClick={() => setConfirmLock(true)} data-hover>
              ⊠ Lock this scene
            </button>
          </div>
        )}
        {selectedNode?.locked && (
          <div className="lock-row">
            <div className="locked-badge">⊠ Locked · {formatTime(selectedNode.locked_at)}</div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatTime(iso) {
  if (!iso) return 'just now'
  const diff = Date.now() - new Date(iso)
  if (diff < 60000)    return 'just now'
  if (diff < 3600000)  return `${Math.floor(diff/60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`
  return `${Math.floor(diff/86400000)}d ago`
}
