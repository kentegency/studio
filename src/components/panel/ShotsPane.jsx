import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useNodeStore, useProjectStore, useUIStore, useAuthStore } from '../../stores'
import { getVocab } from '../../lib/vocabulary'
import { undoStack } from '../../lib/undo'
import EmptyState from '../EmptyState'
import '../EmptyState.css'
import './Panes.css'

const SH_COLOR = { done:'#4ADE80', progress:'var(--accent)', pending:'#2A2720' }
const SH_LABEL = { done:'Done', progress:'In progress', pending:'Pending' }

// ── SHOTS PANE — live data per selected node ───
export function ShotsPane() {
  const { selectedNode }   = useNodeStore()
  const { currentProject } = useProjectStore()
  const { showToast, openOverlay } = useUIStore()
  const vocab = getVocab(currentProject?.type)

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
    const prev  = shot.status ?? 'pending'
    const next  = order[(order.indexOf(prev) + 1) % order.length]
    await supabase.from('shots').update({ status: next }).eq('id', shot.id)
    setShots(s => s.map(sh => sh.id === shot.id ? { ...sh, status: next } : sh))
    undoStack.push({
      label: `Shot ${shot.number} → ${SH_LABEL[next]}`,
      undo: async () => {
        await supabase.from('shots').update({ status: prev }).eq('id', shot.id)
        setShots(s => s.map(sh => sh.id === shot.id ? { ...sh, status: prev } : sh))
      }
    })
    showToast(`Shot ${shot.number} → ${SH_LABEL[next]}`, 'var(--orange)', 5000)
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
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div className="rp-ti">{vocab.shots}</div>
          <button
            style={{ fontSize:'11px', color:'var(--mute)', background:'none', border:'.5px solid var(--b)', borderRadius:'2px', padding:'3px 9px', fontFamily:'var(--font-mono)', letterSpacing:'.1em', transition:'color var(--dur-fast), border-color var(--dur-fast)' }}
            onClick={() => openOverlay('storyboard')}
            data-hover
            title="Open Storyboard (B)">
            Storyboard
          </button>
        </div>
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

      {/* Shot presets — quick-add common sequences */}
      {addingShot && (
        <div style={{ padding:'10px 14px 0' }}>
          <div className="shot-presets">
            {/* Vocab-aware: only show presets if shotPresets exist for this project type */}
            <div className="shot-preset-label">Quick add</div>
            <div className="shot-preset-row">
              {[
                { label:'Interview',  shots:[{name:'Wide establishing', shot_type:'WS', shot_kind:'Interview', duration:'00:10'},{name:'Medium interview', shot_type:'MS', shot_kind:'Interview', duration:'00:08'},{name:'Close-up interview', shot_type:'CU', shot_kind:'Interview', duration:'00:06'}] },
                { label:'B-roll pack', shots:[{name:'Establishing wide', shot_type:'EWS', shot_kind:'Candid', duration:'00:08'},{name:'Mid detail', shot_type:'MS', shot_kind:'Candid', duration:'00:05'},{name:'Close detail', shot_type:'ECU', shot_kind:'Candid', duration:'00:04'}] },
                { label:'Drama',      shots:[{name:'Scene wide', shot_type:'WS', shot_kind:'Drama enactment', duration:'00:12'},{name:'Over the shoulder', shot_type:'MCU', shot_kind:'Drama enactment', duration:'00:08'},{name:'Reaction CU', shot_type:'CU', shot_kind:'Drama enactment', duration:'00:05'}] },
              ].map(preset => (
                <button key={preset.label}
                  className="shot-preset-btn" data-hover
                  onClick={async () => {
                    if (!selectedNode?.id || !currentProject?.id) return
                    setSaving(true)
                    const base = shots.length
                    for (let i = 0; i < preset.shots.length; i++) {
                      const s = preset.shots[i]
                      const num = base + i + 1
                      const { data } = await supabase.from('shots').insert({
                        node_id: selectedNode.id, project_id: currentProject.id,
                        number: num, name: s.name, shot_type: s.shot_type,
                        shot_kind: s.shot_kind, duration: s.duration,
                        status: 'pending', order_index: num,
                      }).select().single()
                      if (data) setShots(prev => [...prev, data])
                    }
                    setSaving(false)
                    setAddingShot(false)
                    showToast(`${preset.label} preset added — ${preset.shots.length} shots.`, '#4ADE80')
                  }}>
                  {preset.label}
                  <span>{preset.shots.length} shots</span>
                </button>
              ))}
            </div>
            <div className="shot-preset-divider">or add manually</div>
          </div>
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

// ── TEAM PANE — live from database ────────────
export function TeamPane({ onInvite }) {
  const { currentProject } = useProjectStore()
  const { profile }        = useAuthStore()
  const [contributors, setContributors] = useState([])

  useEffect(() => {
    if (!currentProject) return
    supabase.from('contributors')
      .select('*')
      .eq('project_id', currentProject.id)
      .then(({ data }) => setContributors(data ?? []))
  }, [currentProject?.id])

  const ROOM_COLOR = { studio:'var(--accent)', meeting:'var(--teal)', window:'#4ADE80' }

  return (
    <div className="node-pane">
      <div className="rph">
        <div className="rp-ey">{currentProject?.name ?? 'No project open'}</div>
        <div className="rp-ti">The Team</div>
      </div>
      <div className="team-list">
        {/* Always show yourself — the CD */}
        {profile && (
          <div className="team-member">
            <div className="tm-av" style={{ background:'var(--accent)', color:'#040402' }}>
              {(profile.name ?? 'CD').slice(0,2).toUpperCase()}
            </div>
            <div className="tm-info">
              <div className="tm-name">{profile.name ?? 'Creative Director'}</div>
              <div className="tm-role">Creative Director · Owner</div>
            </div>
            <span className="tm-badge" style={{ color:'var(--accent)', background:'rgba(212,170,106,0.1)' }}>Studio</span>
          </div>
        )}

        {/* Live contributors from database */}
        {contributors.map(c => (
          <div key={c.id} className="team-member">
            <div className="tm-av" style={{ background: c.color ?? 'var(--teal)', color:'#040402' }}>
              {c.name.slice(0,2).toUpperCase()}
            </div>
            <div className="tm-info">
              <div className="tm-name">{c.name}</div>
              <div className="tm-role">{c.role}</div>
            </div>
            <span className="tm-badge"
              style={{ color: ROOM_COLOR[c.room] ?? 'var(--teal)', background:`${ROOM_COLOR[c.room] ?? 'var(--teal)'}18` }}>
              {c.room.charAt(0).toUpperCase() + c.room.slice(1)}
            </span>
          </div>
        ))}

        {contributors.length === 0 && (
          <div style={{ padding:'12px 0 8px', fontSize:'12px', color:'var(--ghost)', letterSpacing:'.08em' }}>
            No contributors yet. Invite your team below.
          </div>
        )}

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


// ── IDENTITY PANE — project creative identity ─
const ACCENT_PRESETS = [
  { name:'Sand',    hex:'#D4AA6A' },
  { name:'Teal',    hex:'#2A8A7A' },
  { name:'Indigo',  hex:'#5C6BC0' },
  { name:'Crimson', hex:'#C0392B' },
  { name:'Violet',  hex:'#7B5CE8' },
  { name:'Forest',  hex:'#2E7D52' },
  { name:'Slate',   hex:'#4A6580' },
  { name:'Ember',   hex:'#C05020' },
  { name:'Custom',  hex: null     },
]

export function StylePane({ onOpenSettings }) {
  const { currentProject, updateProject } = useProjectStore()
  const { showToast } = useUIStore()
  const accent = currentProject?.accent_color ?? '#D4AA6A'

  const [palette,   setPalette]   = useState(() => {
    const saved = currentProject?.brief_answers?._palette
    return saved ?? ['#D4AA6A','#ECEAE4','#1D1D21','#4ADE80','#E05050']
  })
  const [palLabels, setPalLabels] = useState(() => {
    const saved = currentProject?.brief_answers?._palette_labels
    return saved ?? ['Primary','Light','Dark','Positive','Alert']
  })
  const [customAccent, setCustomAccent] = useState(accent)

  const saveAccent = async (hex) => {
    if (!currentProject) return
    await updateProject(currentProject.id, { accent_color: hex })
    showToast('Accent updated.')
  }

  const savePalette = async (newPal, newLabels) => {
    if (!currentProject) return
    const existing = currentProject?.brief_answers ?? {}
    await updateProject(currentProject.id, {
      brief_answers: { ...existing, _palette: newPal, _palette_labels: newLabels }
    })
  }

  const updateSwatch = (i, hex) => {
    const next = [...palette]; next[i] = hex
    setPalette(next); savePalette(next, palLabels)
  }
  const updateLabel = (i, label) => {
    const next = [...palLabels]; next[i] = label
    setPalLabels(next)
  }

  const TYPE_PREVIEW = [
    { role:'Display',  sample:'Opening Sequence',
      style:{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', letterSpacing:'.03em', color:'var(--cream)', lineHeight:1 } },
    { role:'Creative', sample:'The work is what is colourful.',
      style:{ fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic', fontSize:'14px', color:'var(--dim)', lineHeight:1.6 } },
    { role:'UI',       sample:'Scene inspector · 4 shots',
      style:{ fontFamily:"'DM Sans',system-ui,sans-serif", fontSize:'12px', color:'var(--cream)', lineHeight:1.5 } },
    { role:'Data',     sample:'S04 · 00:08 · IN REVIEW',
      style:{ fontFamily:"'IBM Plex Mono',monospace", fontSize:'11px', letterSpacing:'.08em', color:'var(--dim)', lineHeight:1.5 } },
  ]

  return (
    <div className="node-pane">
      <div className="rph">
        <div className="rp-ey">{currentProject?.name ?? 'No project'}</div>
        <div className="rp-ti">Identity</div>
      </div>

      <div className="sec">
        <div className="sec-l">Project accent</div>
        <div className="id-accent-grid">
          {ACCENT_PRESETS.map(p => p.hex ? (
            <button key={p.name}
              className={`id-swatch ${accent === p.hex ? 'on' : ''}`}
              style={{ background: p.hex }}
              title={p.name}
              onClick={() => { setCustomAccent(p.hex); saveAccent(p.hex) }} />
          ) : (
            <label key="custom" className="id-swatch id-custom" title="Custom colour" style={{ position:'relative', overflow:'hidden' }}>
              <input type="color" value={customAccent}
                onChange={e => setCustomAccent(e.target.value)}
                onBlur={e => saveAccent(e.target.value)}
                style={{ opacity:0, position:'absolute', inset:0, cursor:'pointer', width:'100%', height:'100%' }} />
              <span style={{ fontSize:'14px', color:'var(--ghost)', pointerEvents:'none' }}>+</span>
            </label>
          ))}
        </div>
        <div className="id-accent-preview" style={{ borderLeftColor: accent }}>
          <span style={{ color: accent, fontFamily:'var(--font-mono)', fontSize:'10px' }}>{accent}</span>
          <span style={{ fontSize:'11px', color:'var(--mute)', marginLeft:'8px' }}>arc · cursor · active states</span>
        </div>
      </div>

      <div className="sec">
        <div className="sec-l">Reference palette
          <span style={{ fontSize:'10px', color:'var(--ghost)', fontWeight:400, marginLeft:'6px' }}>click to edit</span>
        </div>
        <div className="id-palette-row">
          {palette.map((c, i) => (
            <div key={i} className="id-pal-item">
              <label className="id-pal-swatch" style={{ background: c, position:'relative', overflow:'hidden' }}>
                <input type="color" value={c}
                  onChange={e => updateSwatch(i, e.target.value)}
                  style={{ opacity:0, position:'absolute', inset:0, cursor:'pointer', width:'100%', height:'100%' }} />
              </label>
              <input className="id-pal-label"
                value={palLabels[i] ?? ''}
                onChange={e => updateLabel(i, e.target.value)}
                onBlur={() => savePalette(palette, palLabels)}
                maxLength={10} placeholder="Label" />
            </div>
          ))}
        </div>
        <div style={{ fontSize:'11px', color:'var(--ghost)', marginTop:'6px', lineHeight:1.5 }}>
          Brand palette, moodboard anchors, or key scene tones.
        </div>
      </div>

      <div className="sec">
        <div className="sec-l">Typography in use</div>
        <div className="id-type-stack">
          {TYPE_PREVIEW.map((t, i) => (
            <div key={i} className="id-type-row">
              <span className="id-type-role">{t.role}</span>
              <span style={t.style}>{t.sample}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sec" style={{ paddingTop:'10px' }}>
        <button className="id-settings-link" onClick={() => onOpenSettings?.()}>
          Project settings — name, type, logline →
        </button>
      </div>
    </div>
  )
}
