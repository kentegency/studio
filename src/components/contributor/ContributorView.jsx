import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import './Contributor.css'

const LOGO_PIXELS = [
  '#F4EFD8','#040402','#7A7A7A',
  'var(--accent)','#7A7A7A','#040402',
  '#7A7A7A','#040402','#F4EFD8',
]

const STATUS_COLORS = { concept:'#6A6258', progress:'var(--accent)', review:'#C07010', approved:'#4ADE80', locked:'#4ADE80' }
const NOTE_COLORS   = ['var(--teal)','var(--accent)','#4ADE80','#F4EFD8','#8B5CF6','#E05050']

export default function ContributorView({ token }) {
  const [contributor, setContributor] = useState(null)
  const [project,     setProject]     = useState(null)
  const [nodes,       setNodes]       = useState([])
  const [selected,    setSelected]    = useState(null)
  const [assets,      setAssets]      = useState([])
  const [notes,       setNotes]       = useState([])
  const [shots,       setShots]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [expired,     setExpired]     = useState(false)
  const [newNote,     setNewNote]     = useState('')
  const [noteColor,   setNoteColor]   = useState('var(--teal)')
  const [savingNote,  setSavingNote]  = useState(false)
  const [noteSaved,   setNoteSaved]   = useState(false)

  useEffect(() => { if (token) loadContributor(token) }, [token])

  const loadContributor = async (tok) => {
    setLoading(true)
    const { data: contrib, error } = await supabase
      .from('contributors').select('*').eq('link_token', tok).single()
    if (error || !contrib) { setExpired(true); setLoading(false); return }
    if (contrib.link_expires_at && new Date(contrib.link_expires_at) < new Date()) {
      setExpired(true); setLoading(false); return
    }
    setContributor(contrib)

    const { data: proj } = await supabase.from('projects')
      .select('*').eq('id', contrib.project_id).single()
    setProject(proj)

    // Load scoped nodes
    let q = supabase.from('nodes').select('*').eq('project_id', contrib.project_id).order('position')
    if (contrib.node_ids?.length > 0) q = q.in('id', contrib.node_ids)
    const { data: nd } = await q
    setNodes(nd ?? [])
    if (nd?.length > 0) { setSelected(nd[0]); loadNodeContent(nd[0].id, contrib.project_id) }
    setLoading(false)
  }

  const loadNodeContent = async (nodeId, projectId) => {
    const [{ data: as }, { data: no }, { data: sh }] = await Promise.all([
      supabase.from('assets').select('*').eq('node_id', nodeId).in('room', ['studio','meeting']),
      supabase.from('notes').select('*').eq('node_id', nodeId).in('room', ['studio','meeting']).order('created_at', { ascending:false }),
      supabase.from('shots').select('*').eq('node_id', nodeId).order('number'),
    ])
    setAssets(as ?? [])
    setNotes(no ?? [])
    setShots(sh ?? [])
  }

  const selectNode = (node) => {
    setSelected(node)
    setNewNote('')
    setNoteSaved(false)
    if (project) loadNodeContent(node.id, project.id)
  }

  const submitNote = async () => {
    if (!newNote.trim() || !selected || !project) return
    setSavingNote(true)
    await supabase.from('notes').insert({
      project_id: project.id,
      node_id:    selected.id,
      body:       newNote,
      color:      noteColor,
      room:       'meeting',
      resolved:   false,
    })
    setSavingNote(false)
    setNoteSaved(true)
    setNewNote('')
    // Reload notes
    const { data: no } = await supabase.from('notes').select('*')
      .eq('node_id', selected.id).in('room', ['studio','meeting'])
      .order('created_at', { ascending:false })
    setNotes(no ?? [])
    setTimeout(() => setNoteSaved(false), 3000)
  }

  const updateShotStatus = async (shot) => {
    const next = shot.status==='done'?'pending':shot.status==='pending'?'progress':'done'
    await supabase.from('shots').update({ status:next }).eq('id', shot.id)
    setShots(s => s.map(sh => sh.id===shot.id ? {...sh,status:next} : sh))
  }

  const SH_COLOR = { done:'#4ADE80', progress:'var(--accent)', pending:'#2A2720' }
  const accent = project?.accent_color ?? 'var(--teal)'

  if (loading) return (
    <div className="contrib-loading">
      <div className="contrib-logo">{LOGO_PIXELS.map((c,i) => <div key={i} className="cl-px" style={{ background:c }}/>)}</div>
      <div className="contrib-loading-text">Loading your workspace…</div>
    </div>
  )

  if (expired || !contributor) return (
    <div className="contrib-loading">
      <div className="contrib-logo">{LOGO_PIXELS.map((c,i) => <div key={i} className="cl-px" style={{ background:c }}/>)}</div>
      <div className="contrib-exp-title">This link has expired.</div>
      <div className="contrib-exp-sub">Contact your Creative Director for a new invite.</div>
    </div>
  )

  return (
    <div className="contrib-view">
      <div className="cv-atm">
        <div className="atm-v" />
        <div style={{ position:'absolute', width:'600px', height:'400px', top:'-100px', right:'-100px', background:`radial-gradient(ellipse, ${accent}14 0%, transparent 60%)`, animation:'breathe 8s ease-in-out infinite' }} />
      </div>

      {/* HEADER */}
      <header className="cv-header">
        <div className="cv-logo">{LOGO_PIXELS.map((c,i) => <div key={i} className="cv-px" style={{ background:c }}/>)}</div>
        <div className="cv-project">{project?.name}</div>
        <div className="cv-badge" style={{ background:`${contributor.color}18`, color:contributor.color, border:`.5px solid ${contributor.color}30` }}>
          {contributor.name} · {contributor.role}
        </div>
        <div className="cv-room">Meeting Room</div>
      </header>

      <div className="cv-body">
        {/* NODE LIST */}
        <div className="cv-sidebar">
          <div className="cv-sidebar-label">
            {nodes.length} scene{nodes.length !== 1 ? 's' : ''}
            {contributor.node_ids?.length > 0 ? ' — scoped' : ' — full project'}
          </div>
          {nodes.map(n => (
            <button key={n.id}
              className={`cv-node-btn ${selected?.id === n.id ? 'on' : ''}`}
              style={selected?.id === n.id ? { borderColor: accent, color: accent } : {}}
              onClick={() => selectNode(n)} data-hover>
              <div className="cvn-name">{n.name}</div>
              <div className="cvn-status" style={{ color: STATUS_COLORS[n.status] ?? 'var(--mute)' }}>
                {n.status}
              </div>
            </button>
          ))}
        </div>

        {/* NODE CONTENT */}
        {selected && (
          <div className="cv-content">
            <div className="cv-node-title">{selected.name}</div>
            <div className="cv-node-status" style={{ color: STATUS_COLORS[selected.status] ?? 'var(--mute)' }}>
              {selected.type ?? 'scene'} · {selected.status}
            </div>

            {/* ASSETS */}
            {assets.length > 0 && (
              <div className="cv-section">
                <div className="cv-section-label">Assets — {assets.length}</div>
                <div className="cv-asset-grid">
                  {assets.map(a => (
                    <div key={a.id} className="cv-asset" data-hover
                      onClick={() => window.open(a.file_url, '_blank')} title={a.name}>
                      {(a.type === 'image' || a.type === 'gif') ? (
                        <img src={a.file_url} alt={a.name} style={{ width:'100%',height:'100%',objectFit:'cover',borderRadius:'2px' }} />
                      ) : (
                        <div className="cv-asset-type">{a.type?.slice(0,3) ?? 'doc'}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SHOT LIST */}
            {shots.length > 0 && (
              <div className="cv-section">
                <div className="cv-section-label">Shot List — {shots.length}</div>
                {shots.map(sh => (
                  <div key={sh.id} className="cv-shot" data-hover onClick={() => updateShotStatus(sh)}
                    title="Click to update status">
                    <span className="cvs-n">{String(sh.number).padStart(2,'0')}</span>
                    <div className="cvs-info">
                      <div className="cvs-name">{sh.name}</div>
                      <div className="cvs-meta">{sh.shot_type} · {sh.shot_kind} · {sh.duration}</div>
                    </div>
                    <div className="cvs-dot" style={{ background: SH_COLOR[sh.status] ?? '#2A2720' }} />
                  </div>
                ))}
              </div>
            )}

            {/* NOTES FROM STUDIO + MEETING */}
            {notes.length > 0 && (
              <div className="cv-section">
                <div className="cv-section-label">Notes — {notes.length}</div>
                {notes.map((n,i) => (
                  <div key={n.id??i} className="cv-note" style={{ borderLeftColor: n.color ?? accent }}>
                    <div className="cvn-body">{n.body}</div>
                    <div className="cvn-meta">{n.room} · {formatTime(n.created_at)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ADD NOTE */}
            <div className="cv-section">
              <div className="cv-section-label">Add a note to this scene</div>
              <div className="cv-note-form">
                <textarea className="cv-note-input"
                  placeholder="Your thoughts, questions, or direction on this scene…"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  rows={4} />
                <div className="cv-note-footer">
                  <div className="cv-note-colors">
                    {NOTE_COLORS.map((c,i) => (
                      <div key={i}
                        className={`cv-nc ${noteColor===c?'on':''}`}
                        style={{ background:c }}
                        onClick={() => setNoteColor(c)} />
                    ))}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    {noteSaved && <span className="cv-saved">Note saved ✓</span>}
                    <button className="cv-note-submit"
                      onClick={submitNote} disabled={savingNote || !newNote.trim()}
                      style={{ borderColor: accent, color: accent }} data-hover>
                      {savingNote ? 'Saving…' : 'Add note →'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="cv-footer">
        <span>Meeting Room · The Kentegency</span>
        <span style={{ color:'var(--mute)' }}>·</span>
        <span>{project?.name}</span>
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
