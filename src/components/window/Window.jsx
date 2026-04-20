import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import './Window.css'

// ── CLIENT COMMENT — text feedback from client to CD ──────────
function ClientComment({ project, selected, accent }) {
  const [comment,  setComment]  = useState('')
  const [sent,     setSent]     = useState(false)
  const [sending,  setSending]  = useState(false)

  // Reset when scene changes
  useEffect(() => { setSent(false); setComment('') }, [selected?.id])

  const send = async () => {
    if (!comment.trim() || !project?.id || !selected?.id) return
    setSending(true)
    await supabase.from('notes').insert({
      project_id: project.id,
      node_id:    selected.id,
      body:       `Client note: ${comment.trim()}`,
      color:      '#A09890',
      room:       'meeting',
      resolved:   false,
    })
    setSent(true)
    setSending(false)
  }

  if (sent) return (
    <div className="win-comment-sent">
      Note sent to the Creative Director ✓
    </div>
  )

  return (
    <div className="win-comment">
      <div className="win-react-label">Leave a note for the Creative Director</div>
      <textarea
        className="win-comment-input"
        placeholder="The colour grade feels too dark… The pacing in the second half works really well… Could we see an alternative opening?"
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={3} />
      <button
        className="win-comment-send"
        style={{ borderColor: accent, color: accent }}
        disabled={!comment.trim() || sending}
        onClick={send}>
        {sending ? 'Sending…' : 'Send note →'}
      </button>
    </div>
  )
}

const LOGO_PIXELS = [
  'var(--cream)','var(--black)','#7A7A7A',
  'var(--accent)','#7A7A7A','var(--black)',
  '#7A7A7A','var(--black)','var(--cream)',
]

export default function Window({ token }) {
  const [project,  setProject]  = useState(null)
  const [nodes,    setNodes]    = useState([])
  const [acts,     setActs]     = useState([])
  const [selected, setSelected] = useState(null)
  const [assets,   setAssets]   = useState([])
  const [notes,    setNotes]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [expired,  setExpired]  = useState(false)
  const [reaction, setReaction] = useState(null)

  // Approval states
  const [approvalState, setApprovalState] = useState('idle') // idle | confirming | approved
  const [approvedAt,    setApprovedAt]    = useState(null)

  useEffect(() => { if (token) loadProject(token) }, [token])

  const loadProject = async (tok) => {
    setLoading(true)
    const { data: proj, error } = await supabase
      .from('projects').select('*').eq('window_token', tok).single()
    if (error || !proj) { setExpired(true); setLoading(false); return }
    if (proj.window_expires_at && new Date(proj.window_expires_at) < new Date()) {
      setExpired(true); setLoading(false); return
    }
    setProject(proj)
    const [{ data: nd }, { data: ac }] = await Promise.all([
      supabase.from('nodes').select('*').eq('project_id', proj.id).order('position'),
      supabase.from('acts').select('*').eq('project_id', proj.id).order('order_index'),
    ])
    setNodes(nd ?? [])
    setActs(ac ?? [])
    setLoading(false)
  }

  const loadNodeContent = async (nodeId) => {
    const [{ data: as }, { data: no }] = await Promise.all([
      supabase.from('assets').select('*').eq('node_id', nodeId).eq('room', 'window'),
      supabase.from('notes').select('*').eq('node_id', nodeId).eq('room', 'window').eq('resolved', false),
    ])
    setAssets(as ?? [])
    setNotes(no ?? [])
  }

  const selectNode = async (node) => {
    setSelected(node)
    loadNodeContent(node.id)

    // Restore approval state from node status
    if (node.status === 'approved' || node.status === 'locked') {
      setApprovalState('approved')
      // Find the approval note timestamp
      const { data: approvalNote } = await supabase
        .from('notes')
        .select('created_at')
        .eq('node_id', node.id)
        .ilike('body', 'Client approved%')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      setApprovedAt(approvalNote ? new Date(approvalNote.created_at) : new Date())
    } else {
      setApprovalState('idle')
      setApprovedAt(null)
    }

    // Restore reaction from notes
    const { data: reactionNote } = await supabase
      .from('notes')
      .select('body')
      .eq('node_id', node.id)
      .ilike('body', 'Client reacted%')
      .eq('room', 'meeting')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (reactionNote) {
      // Extract emoji from "Client reacted 🔥 to this scene."
      const match = reactionNote.body.match(/Client reacted (.+?) to this scene/)
      setReaction(match ? match[1] : null)
    } else {
      setReaction(null)
    }
  }

  const saveReaction = async (r) => {
    setReaction(r)
    if (!selected || !project) return
    await supabase.from('notes').insert({
      project_id: project.id, node_id: selected.id,
      body: `Client reacted ${r} to this scene.`,
      color: 'var(--accent)', room: 'meeting', resolved: false,
    })
  }

  // TWO-STEP APPROVAL — FOUR
  const requestApproval = () => setApprovalState('confirming')
  const cancelApproval  = () => setApprovalState('idle')

  const confirmApproval = async () => {
    if (!selected || !project) return
    const now = new Date()
    await supabase.from('notes').insert({
      project_id: project.id, node_id: selected.id,
      body: `Client approved this scene via Window link on ${now.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })} at ${now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}.`,
      color: '#4ADE80', room: 'meeting', resolved: false,
    })
    // Also update node status to approved
    await supabase.from('nodes').update({ status: 'approved' }).eq('id', selected.id)
    setApprovedAt(now)
    setApprovalState('approved')
  }

  const STATUS_COLORS = { concept:'#6A6258', progress:'var(--accent)', review:'#C07010', approved:'#4ADE80', locked:'#4ADE80' }
  const accent = project?.accent_color ?? 'var(--accent)'

  if (loading) return (
    <div className="win-loading">
      <div className="win-logo">{LOGO_PIXELS.map((c,i) => <div key={i} className="win-px" style={{ background:c }}/>)}</div>
      <div className="win-loading-text">Loading…</div>
    </div>
  )

  if (expired || !project) return (
    <div className="win-expired">
      <div className="win-logo">{LOGO_PIXELS.map((c,i) => <div key={i} className="win-px" style={{ background:c }}/>)}</div>
      <div className="win-exp-title">This link has expired.</div>
      <div className="win-exp-sub">Reach out to your Creative Director for an updated link.</div>
    </div>
  )

  return (
    <div className="win-shell">
      <div className="win-atm">
        <div className="atm-v" />
        <div className="win-glow" style={{ background:`radial-gradient(ellipse, ${accent}18 0%, transparent 60%)` }} />
      </div>

      {/* HEADER */}
      <header className="win-header">
        <div className="win-logo-sm">{LOGO_PIXELS.map((c,i) => <div key={i} className="win-px-sm" style={{ background:c }}/>)}</div>
        <div className="win-project-name">{project.name}</div>
        <div className="win-type" style={{ color: accent }}>{project.type}</div>
      </header>

      {/* FIVE — INTRO BLOCK */}
      <div className="win-intro">
        <div className="win-intro-eye" style={{ color: accent }}>
          Creative Direction · {project.type?.charAt(0).toUpperCase()+project.type?.slice(1)}
        </div>
        <div className="win-intro-title">{project.name}</div>
        {project.logline && <div className="win-intro-log">{project.logline}</div>}
        <div className="win-intro-meta">
          <span>Prepared by The Kentegency</span>
          <span className="win-intro-dot" />
          <span>{new Date(project.updated_at ?? Date.now()).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</span>
        </div>
        {!selected && nodes.length > 0 && (
          <div className="win-intro-hint">
            Select a scene below to explore and leave feedback.
          </div>
        )}
        {nodes.length === 0 && (
          <div className="win-intro-hint" style={{ color: 'var(--mute)' }}>
            Content is being prepared. Check back soon.
          </div>
        )}
      </div>

      {/* SELECTED NODE */}
      {selected && (
        <div className="win-content">
          <div className="win-node-header">
            <div className="win-node-eye" style={{ color: accent }}>{selected.type ?? 'Scene'}</div>
            <div className="win-node-title">{selected.name}</div>
            <div className="win-node-status" style={{ color: STATUS_COLORS[selected.status] ?? '#6A6258' }}>
              {selected.status === 'concept'  ? '○ Concept' :
               selected.status === 'progress' ? '● In progress' :
               selected.status === 'review'   ? '◎ In review' :
               selected.status === 'approved' ? '◉ Approved' :
               selected.status === 'locked'   ? '⊠ Locked' :
               selected.status ?? 'Concept'}
            </div>
          </div>

          {/* Assets */}
          {assets.length > 0 && (
            <div className="win-assets">
              {assets.map(a => (
                <div key={a.id} className="win-asset" onClick={() => window.open(a.file_url, '_blank')}>
                  {(a.type === 'image' || a.type === 'gif') ? (
                    <img src={a.file_url} alt={a.name} className="win-asset-img" />
                  ) : (
                    <div className="win-asset-placeholder">
                      <span>{a.type}</span>
                      <span className="win-asset-name">{a.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {notes.length > 0 && (
            <div className="win-notes">
              {notes.map((n,i) => (
                <div key={n.id ?? i} className="win-note" style={{ borderLeftColor: n.color ?? accent }}>
                  {n.body}
                </div>
              ))}
            </div>
          )}

          {/* Empty asset state for client */}
          {assets.length === 0 && notes.length === 0 && (
            <div className="win-empty-scene">
              Content for this scene is being prepared.
            </div>
          )}

          {/* Reactions */}
          <div className="win-reactions">
            <div className="win-react-label">Your reaction to this scene</div>
            <div className="win-react-row">
              {['❤️','🔥','✓','❓'].map(r => (
                <button key={r}
                  className={`win-react-btn ${reaction===r?'on':''}`}
                  style={reaction===r ? { borderColor:accent, background:`${accent}18` } : {}}
                  onClick={() => saveReaction(r)} title={r}>
                  {r}
                </button>
              ))}
            </div>
            {reaction && <div className="win-react-confirm">Reaction sent ✓</div>}
          </div>

          {/* Client comment */}
          <ClientComment
            project={project}
            selected={selected}
            accent={accent} />

          {/* FOUR — Two-step approval */}
          {approvalState === 'idle' && (
            <button className="win-approve" onClick={requestApproval}
              style={{ borderColor: accent, color: accent }}>
              Approve this scene →
            </button>
          )}

          {approvalState === 'confirming' && (
            <div className="win-approve-confirm">
              <div className="wac-title">Send approval to your Creative Director?</div>
              <div className="wac-body">
                This will mark <strong>{selected.name}</strong> as approved and notify the Creative Director immediately.
              </div>
              <div className="wac-actions">
                <button className="wac-cancel" onClick={cancelApproval}>Cancel</button>
                <button className="wac-confirm"
                  style={{ background: accent, borderColor: accent }}
                  onClick={confirmApproval}>
                  Yes, approve →
                </button>
              </div>
            </div>
          )}

          {approvalState === 'approved' && (
            <div className="win-approved-state">
              <div className="was-check">✓</div>
              <div className="was-title">Approved</div>
              <div className="was-body">
                Your approval for <strong>{selected.name}</strong> has been sent.
              </div>
              <div className="was-time">
                {approvedAt?.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })} at {approvedAt?.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TIMELINE */}
      <div className="win-timeline">
        <div className="win-line-wrap">
          <svg className="win-svg" viewBox="0 0 900 80" preserveAspectRatio="none">
            {acts.map((a,i) => (
              <rect key={i} x={a.position*900} y={14}
                width={(a.end_pos-a.position)*900} height={32}
                rx={2} fill={`${accent}10`} stroke={`${accent}22`} strokeWidth={0.5}/>
            ))}
            <line x1={0} y1={30} x2={900} y2={30} stroke="#181410" strokeWidth={1.5}/>
            {nodes.map((n,i) => (
              <g key={n.id} onClick={() => selectNode(n)} style={{ cursor:'pointer' }}>
                {selected?.id===n.id && (
                  <circle cx={n.position*900} cy={30} r={18}
                    fill={`${accent}20`}
                    style={{ animation:'grp 2.5s ease-in-out infinite' }}/>
                )}
                <circle cx={n.position*900} cy={30}
                  r={selected?.id===n.id ? 9 : 6}
                  fill={selected?.id===n.id ? accent : '#3A3020'}
                  style={{ transition:'all .25s ease' }}/>
                <text x={n.position*900} y={60}
                  textAnchor="middle" fontSize={11}
                  fontFamily="IBM Plex Mono" letterSpacing={1}
                  fill={selected?.id===n.id ? accent : '#6A6258'}>
                  {n.name.toUpperCase().slice(0,8)}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* FIVE — Touch-friendly node pills for tablet */}
        <div className="win-node-list">
          {nodes.map(n => (
            <button key={n.id}
              className={`win-node-pill ${selected?.id===n.id?'on':''}`}
              style={selected?.id===n.id ? { borderColor:accent, color:accent, background:`${accent}0f` } : {}}
              onClick={() => selectNode(n)}>
              {n.name}
            </button>
          ))}
        </div>
      </div>

      <div className="win-footer">
        <span>Presented by The Kentegency</span>
        <span style={{ color:'var(--mute)' }}>·</span>
        <span>Creative Intelligence Studio</span>
        {project?.session_token && (
          <button
            className="win-session-btn"
            style={{ borderColor: accent, color: accent }}
            onClick={() => {
              window.location.hash = `#/session/${project.session_token}`
            }}>
            <svg viewBox="0 0 24 24" style={{ width:12, height:12, stroke:'currentColor', fill:'none', strokeWidth:1.5, strokeLinecap:'round' }}>
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
            Join live session
          </button>
        )}
      </div>
    </div>
  )
}
