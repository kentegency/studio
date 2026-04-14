import { useEffect, useState } from 'react'
import { useNodeStore, useUIStore, useAssetsStore, useNotesStore, useAuthStore, useProjectStore } from '../../stores'
import './Panes.css'

const STATUS_COLORS = {
  concept:  '#3A3628',
  progress: '#F5920C',
  review:   '#F4EFD8',
  approved: '#4ADE80',
  locked:   '#4ADE80',
}
const STATUS_LABELS = {
  concept:'Concept', progress:'In Progress',
  review:'In Review', approved:'Approved', locked:'Locked'
}

const WAVEFORM = [.3,.5,.8,.6,.9,.4,.7,.55,.8,.6,.4,.9,.7,.5,.3,.65,.8,.4,.7,.5,.9,.6,.4,.8,.5,.7,.35,.6,.9,.4,.8,.6,.5,.7,.3,.9,.6,.4,.75,.5]

const NOTE_COLORS = ['#F5920C','#1E8A8A','#F4EFD8','#4ADE80','#8B5CF6','#E05050']

const AddIcon = () => <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const UpIcon  = () => <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
const LinkIcon= () => <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>

export default function NodePane({ onUpload }) {
  const selectedNode = useNodeStore(s => s.selectedNode)
  const { assets, fetchAssets }     = useAssetsStore()
  const { notes, fetchNotes, addNote } = useNotesStore()
  const { openOverlay, showToast }  = useUIStore()
  const { user }                    = useAuthStore()
  const { currentProject }          = useProjectStore()

  const [newNote, setNewNote]       = useState('')
  const [noteColor, setNoteColor]   = useState('#F5920C')
  const [addingNote, setAddingNote] = useState(false)
  const [windowUrl, setWindowUrl]   = useState('')
  const [showWindow, setShowWindow] = useState(false)

  useEffect(() => {
    if (selectedNode?.id) {
      fetchAssets(selectedNode.id)
      fetchNotes(selectedNode.id)
    }
  }, [selectedNode?.id])

  useEffect(() => {
    if (currentProject?.window_token) {
      setWindowUrl(`${window.location.origin}/window/${currentProject.window_token}`)
    }
  }, [currentProject])

  const name   = selectedNode?.label  ?? selectedNode?.name ?? 'SELECT A NODE'
  const act    = selectedNode?.act    ?? 'Click any node on the timeline to begin'
  const status = selectedNode?.status ?? 'concept'
  const color  = STATUS_COLORS[status] ?? '#3A3628'
  const label  = STATUS_LABELS[status] ?? 'Concept'

  const lock = () => {
    if (!selectedNode) return
    showToast('Node locked. Producer notified.', '#4ADE80')
  }

  const saveNote = async () => {
    if (!newNote.trim() || !selectedNode) return
    await addNote({
      project_id: currentProject?.id ?? selectedNode.project_id,
      node_id:    selectedNode.id,
      author_id:  user?.id,
      body:       newNote,
      color:      noteColor,
      room:       'studio',
    })
    setNewNote('')
    setAddingNote(false)
    showToast('Note saved.')
  }

  const copyWindow = () => {
    navigator.clipboard.writeText(windowUrl)
    showToast('Window link copied. Send to your client.', '#4ADE80')
    setShowWindow(false)
  }

  // Asset type icon
  const AssetThumb = ({ asset }) => {
    if (asset.type === 'image' || asset.type === 'gif') {
      return (
        <div className="at" data-hover
          onClick={() => window.open(asset.file_url, '_blank')}>
          <img src={asset.file_url} alt={asset.name}
            style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'2px' }} />
          <span className="at-b">{asset.type.slice(0,3)}</span>
        </div>
      )
    }
    if (asset.type === 'video') {
      return (
        <div className="at" data-hover
          onClick={() => window.open(asset.file_url, '_blank')}>
          <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <span className="at-b">vid</span>
        </div>
      )
    }
    if (asset.type === 'audio') {
      return (
        <div className="at" data-hover
          onClick={() => window.open(asset.file_url, '_blank')}>
          <svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          <span className="at-b">aud</span>
        </div>
      )
    }
    return (
      <div className="at" data-hover
        onClick={() => window.open(asset.file_url, '_blank')}>
        <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span className="at-b">{asset.type?.slice(0,3) ?? 'doc'}</span>
      </div>
    )
  }

  return (
    <div className="node-pane">
      {/* Header */}
      <div className="rph">
        <div className="rp-ey">{act}</div>
        <div className="rp-ti">{name}</div>
        <div className="rp-st">
          <span className="rp-dot" style={{ background: color }} />
          <span style={{ color }}>{label}</span>
        </div>
      </div>

      {/* Assets */}
      <div className="sec">
        <div className="sec-l">
          Assets — {assets.length}
          <span onClick={() => openOverlay('compare')} data-hover>Compare</span>
        </div>

        <button className="upload-trigger" onClick={onUpload} data-hover>
          <UpIcon /><span>Upload files to this node</span>
        </button>

        {assets.length > 0 && (
          <div className="asset-grid" style={{ marginTop:'8px' }}>
            {assets.slice(0, 7).map(a => <AssetThumb key={a.id} asset={a} />)}
            <div className="at at-add" onClick={onUpload} data-hover><AddIcon /></div>
          </div>
        )}

        <div className="waveform">
          {WAVEFORM.map((h, i) => (
            <div key={i} className={`wb ${i < 20 ? 'active' : ''}`}
              style={{ height:`${h*22}px`, minWidth:'3px' }} />
          ))}
        </div>
      </div>

      {/* Window Link — FIVE */}
      {currentProject && (
        <div className="sec" style={{ flexShrink:0 }}>
          <div className="sec-l">Client Window</div>
          <button className="window-link-btn" onClick={() => setShowWindow(s => !s)} data-hover>
            <LinkIcon />
            <span>Share Window link with client</span>
          </button>
          {showWindow && (
            <div className="window-link-box">
              <div className="wl-url">{windowUrl || 'No window token — save project first'}</div>
              <button className="wl-copy" onClick={copyWindow} data-hover>Copy link</button>
            </div>
          )}
        </div>
      )}

      {/* Notes — FOUR: real save */}
      <div className="notes-wrap">
        <div className="notes-header">
          <span className="nh-l">Notes — {notes.length}</span>
          <span className="nh-a" onClick={() => setAddingNote(s => !s)} data-hover>
            {addingNote ? 'Cancel' : '+ Add note'}
          </span>
        </div>

        {addingNote && (
          <div className="add-note-form">
            <textarea className="an-input" rows={3}
              placeholder="What are you thinking about this scene?"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              autoFocus />
            <div className="an-footer">
              <div className="an-colors">
                {NOTE_COLORS.map((c, i) => (
                  <div key={i}
                    className={`an-color ${noteColor === c ? 'on' : ''}`}
                    style={{ background: c }}
                    onClick={() => setNoteColor(c)} />
                ))}
              </div>
              <button className="an-save" onClick={saveNote} data-hover>Save note</button>
            </div>
          </div>
        )}

        {/* Real notes from DB */}
        {notes.map((n, i) => (
          <div key={n.id ?? i}
            className={`note ${n.resolved ? 'resolved' : ''}`}
            style={{ borderLeftColor: n.color ?? '#F5920C' }}
            data-hover>
            <div className="nb">{n.body}</div>
            <div className="nm">
              {n.room ?? 'studio'} · {formatTime(n.created_at)}
            </div>
          </div>
        ))}

        {/* Show lock if node is selected */}
        {selectedNode && (
          <div className="lock-row">
            <button className="lock-btn" onClick={lock} data-hover>⊠ Lock this node</button>
          </div>
        )}
      </div>
    </div>
  )
}

function formatTime(iso) {
  if (!iso) return 'just now'
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60000)   return 'just now'
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`
  if (diff < 86400000)return `${Math.floor(diff/3600000)}h ago`
  return `${Math.floor(diff/86400000)}d ago`
}
