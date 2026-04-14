import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useNodeStore, useProjectStore, useUIStore } from '../../stores'
import EmptyState from '../EmptyState'
import '../EmptyState.css'
import './Panes.css'

const SH_COLOR = { done:'#4ADE80', progress:'#F5920C', pending:'#2A2720' }
const SH_LABEL = { done:'Done', progress:'In progress', pending:'Pending' }

// ── SHOTS PANE — live data per selected node ───
export function ShotsPane() {
  const { selectedNode }   = useNodeStore()
  const { currentProject } = useProjectStore()
  const { showToast }      = useUIStore()

  const [shots,      setShots]      = useState([])
  const [loading,    setLoading]    = useState(false)
  const [addingShot, setAddingShot] = useState(false)
  const [newShot,    setNewShot]    = useState({ name:'', shot_type:'CU', shot_kind:'Drama enactment', duration:'00:05' })
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    if (selectedNode?.id) {
      fetchShots(selectedNode.id)
    } else {
      setShots([])
    }
  }, [selectedNode?.id])

  const fetchShots = async (nodeId) => {
    setLoading(true)
    const { data } = await supabase
      .from('shots').select('*')
      .eq('node_id', nodeId)
      .order('number')
    setShots(data ?? [])
    setLoading(false)
  }

  const cycleStatus = async (shot) => {
    const order = ['pending','progress','done']
    const next  = order[(order.indexOf(shot.status) + 1) % order.length]
    await supabase.from('shots').update({ status: next }).eq('id', shot.id)
    setShots(s => s.map(sh => sh.id === shot.id ? { ...sh, status: next } : sh))
    showToast(`Shot ${shot.number} → ${SH_LABEL[next]}`)
  }

  const saveShot = async (e) => {
    e.preventDefault()
    if (!selectedNode?.id || !currentProject?.id || !newShot.name.trim()) return
    setSaving(true)
    const num = shots.length + 1
    const { data, error } = await supabase.from('shots').insert({
      node_id:     selectedNode.id,
      project_id:  currentProject.id,
      number:      num,
      name:        newShot.name,
      shot_type:   newShot.shot_type,
      shot_kind:   newShot.shot_kind,
      duration:    newShot.duration,
      status:      'pending',
      order_index: num,
    }).select().single()
    setSaving(false)
    if (!error && data) {
      setShots(s => [...s, data])
      setNewShot({ name:'', shot_type:'CU', shot_kind:'Drama enactment', duration:'00:05' })
      setAddingShot(false)
      showToast(`Shot ${num} added.`)
    }
  }

  const doneCount  = shots.filter(s => s.status === 'done').length
  const completion = shots.length > 0 ? Math.round((doneCount / shots.length) * 100) : 0

  if (!selectedNode) return (
    <div className="node-pane">
      <EmptyState
        icon={<svg viewBox="0 0 24 24" style={{width:'16px',height:'16px',stroke:'currentColor',fill:'none',strokeWidth:'1.5'}}><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>}
        title="No scene selected"
        body="Click a node on the timeline to view its shot list."
      />
    </div>
  )

  return (
    <div className="node-pane">
      {/* Header */}
      <div className="rph">
        <div className="rp-ey">{selectedNode.act ?? selectedNode.name}</div>
        <div className="rp-ti">Shot List</div>
        {shots.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginTop:'10px' }}>
            <div style={{ flex:1, height:'3px', background:'var(--s3)', borderRadius:'2px', overflow:'hidden' }}>
              <div style={{
                width:`${completion}%`, height:'100%',
                background:'#4ADE80', borderRadius:'2px',
                transition:'width .4s ease'
              }} />
            </div>
            <span style={{ fontSize:'11px', color:'var(--mute)', fontFamily:'var(--font-mono)', flexShrink:0 }}>
              {doneCount}/{shots.length}
            </span>
          </div>
        )}
      </div>

      {/* Add shot form */}
      {addingShot && (
        <div style={{ padding:'10px 14px 0' }}>
          <form className="add-shot-form" onSubmit={saveShot}>
            <input className="nn-input" placeholder="Shot description" required autoFocus
              value={newShot.name}
              onChange={e => setNewShot(s => ({ ...s, name: e.target.value }))} />
            <div className="shot-form-row">
              <select className="nn-select" value={newShot.shot_type}
                onChange={e => setNewShot(s => ({ ...s, shot_type: e.target.value }))}>
                {['ECU','CU','MCU','MS','MWS','WS','EWS'].map(t => <option key={t}>{t}</option>)}
              </select>
              <select className="nn-select" value={newShot.shot_kind}
                onChange={e => setNewShot(s => ({ ...s, shot_kind: e.target.value }))}>
                {['Drama enactment','Archival','Candid','Staged','Animation','Interview'].map(k => <option key={k}>{k}</option>)}
              </select>
              <input className="nn-input" style={{ width:'70px', flexShrink:0 }}
                placeholder="00:05" value={newShot.duration}
                onChange={e => setNewShot(s => ({ ...s, duration: e.target.value }))} />
            </div>
            <div className="nn-foot">
              <button type="button" className="nn-cancel" onClick={() => setAddingShot(false)}>Cancel</button>
              <button type="submit" className="nn-save" disabled={saving}>
                {saving ? 'Adding…' : 'Add shot →'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Shot list body */}
      {loading ? (
        <div style={{ padding:'24px 17px', fontSize:'12px', color:'var(--mute)', letterSpacing:'.14em', textTransform:'uppercase' }}>
          Loading shots…
        </div>
      ) : shots.length === 0 && !addingShot ? (
        <EmptyState compact
          icon={<svg viewBox="0 0 24 24" style={{width:'16px',height:'16px',stroke:'currentColor',fill:'none',strokeWidth:'1.5'}}><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>}
          title="No shots yet"
          body="Build your shot list for this scene."
          action="Add first shot →"
          onAction={() => setAddingShot(true)} />
      ) : (
        <div style={{ padding:'10px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
            <span style={{ fontSize:'11px', color:'var(--dim)', letterSpacing:'.22em', textTransform:'uppercase' }}>
              {shots.length} shot{shots.length !== 1 ? 's' : ''}
            </span>
            <button style={{ fontSize:'12px', color:'var(--orange)', background:'none', border:'none', letterSpacing:'.1em', cursor:'none' }}
              onClick={() => setAddingShot(s => !s)} data-hover>
              + Add shot
            </button>
          </div>
          <div className="shot-list-mini">
            {shots.map(shot => (
              <div key={shot.id}
                className="shm"
                style={{ borderLeftColor: SH_COLOR[shot.status] ?? '#2A2720' }}
                onClick={() => cycleStatus(shot)}
                title={`${shot.name} — click to advance status`}
                data-hover>
                <span className="shm-n">{String(shot.number).padStart(2,'0')}</span>
                <div className="shm-info">
                  <div className="shm-name">{shot.name}</div>
                  <div className="shm-meta">
                    <span className="shm-type">{shot.shot_type}</span>
                    <span className="shm-kind">{shot.shot_kind}</span>
                    <span className="shm-dur">{shot.duration}</span>
                  </div>
                </div>
                <div className="shm-dot" style={{ background: SH_COLOR[shot.status] ?? '#2A2720' }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── TEAM PANE ─────────────────────────────────
const TEAM = [
  { initials:'EN', name:'E. Nii Ayi Solomon', role:'Creative Director · Owner', room:'Studio',  color:'#F5920C', bg:'rgba(245,146,12,0.1)' },
  { initials:'KA', name:'Kwame Asante',        role:'Director of Photography',  room:'Meeting', color:'#1E8A8A', bg:'rgba(30,138,138,0.1)'  },
  { initials:'AB', name:'Ama Boateng',          role:'Score Provider',           room:'Meeting', color:'#F4EFD8', bg:'rgba(244,239,216,0.08)' },
  { initials:'GN', name:'George Nkrumah',       role:'Producer',                room:'Window',  color:'#4ADE80', bg:'rgba(74,222,128,0.08)'  },
]

export function TeamPane({ onInvite }) {
  return (
    <div className="node-pane">
      <div className="rph">
        <div className="rp-ey">EBAN — Project</div>
        <div className="rp-ti">The Team</div>
      </div>
      <div className="team-list">
        {TEAM.map((m, i) => (
          <div key={i} className="team-member">
            <div className="tm-av" style={{ background: m.color, color: '#040402' }}>{m.initials}</div>
            <div className="tm-info">
              <div className="tm-name">{m.name}</div>
              <div className="tm-role">{m.role}</div>
            </div>
            <span className="tm-badge" style={{ color: m.color, background: m.bg }}>{m.room}</span>
          </div>
        ))}
        <div className="team-member invite" data-hover onClick={() => onInvite?.()}>
          <div className="tm-av invite-av">+</div>
          <div className="tm-info">
            <div className="tm-name muted">Invite contributor</div>
            <div className="tm-role">Generate a scoped access link →</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── STYLE PANE ────────────────────────────────
const PALETTE = ['#F5920C','#1E8A8A','#F4EFD8','#7A7A7A','#4ADE80','#621408']
const FONTS = [
  { label:'Display', value:'Bebas Neue',    style:{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px' } },
  { label:'Body',    value:'Cormorant',     style:{ fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic', fontSize:'14px' } },
  { label:'Mono',    value:'IBM Plex Mono', style:{ fontFamily:"'IBM Plex Mono',monospace", fontSize:'11px' } },
  { label:'UI',      value:'Inter',         style:{ fontFamily:"'Inter',sans-serif", fontSize:'12px' } },
]
const TOKENS = [
  { k:'--color-accent', v:'#F5920C' },
  { k:'--color-teal',   v:'#1E8A8A' },
  { k:'--font-display', v:'Bebas Neue' },
  { k:'--spacing',      v:'normal' },
  { k:'--motion',       v:'cinematic' },
  { k:'--radius',       v:'2px' },
]

export function StylePane() {
  const [activeColor, setActiveColor] = useState('#F5920C')
  return (
    <div className="node-pane">
      <div className="rph">
        <div className="rp-ey">EBAN — Project</div>
        <div className="rp-ti">Style Tokens</div>
      </div>
      <div className="sec">
        <div className="sec-l">Project Palette</div>
        <div className="color-row">
          {PALETTE.map((c, i) => (
            <div key={i} className={`cp ${activeColor===c?'on':''}`}
              style={{ background:c }} onClick={() => setActiveColor(c)} data-hover />
          ))}
          <div className="cp add-cp" data-hover>+</div>
        </div>
      </div>
      <div className="sec">
        <div className="sec-l">Typography</div>
        <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
          {FONTS.map((f, i) => (
            <div key={i} className="font-row">
              <span className="fr-l">{f.label}</span>
              <span className="fr-v" style={f.style}>{f.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="sec">
        <div className="sec-l">Active Tokens</div>
        <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
          {TOKENS.map((t, i) => (
            <div key={i} className="tok">
              <span className="tok-k">{t.k}</span>
              <span className="tok-v">{t.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
