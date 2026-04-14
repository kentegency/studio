import { useState, useCallback, useEffect } from 'react'
import { useNodeStore, useUIStore, useProjectStore } from '../../stores'
import Node from './Node'
import EmptyState from '../EmptyState'
import '../EmptyState.css'
import './Timeline.css'

const ACTS_DEMO = [
  { x:8,   width:268, fill:'rgba(30,138,138,0.055)', stroke:'rgba(30,138,138,0.13)',  label:'I — PAST',     labelFill:'rgba(30,138,138,0.65)',  labelX:12  },
  { x:284, width:302, fill:'rgba(245,146,12,0.042)', stroke:'rgba(245,146,12,0.1)',   label:'II — PRESENT', labelFill:'rgba(245,146,12,0.6)',   labelX:288 },
  { x:594, width:300, fill:'rgba(90,18,10,0.052)',   stroke:'rgba(120,38,22,0.1)',    label:'III — FUTURE', labelFill:'rgba(180,60,30,0.65)',   labelX:598 },
]

const DEMO_NODES = [
  { id:'cn0', cx:58,  cy:53, r:10, fill:'#1E8A8A', label:'OPENING',    labelFill:'#3A7070', glow:true,  glowFill:'rgba(30,138,138,0.15)',  status:'progress', act:'Act I — Past · Scene 01',     name:'Opening Sequence',  position:.06, emphasis:1.8, type:'scene' },
  { id:'cn1', cx:148, cy:53, r:5,  fill:'#1A3A3A', label:'PIONEERS',   labelFill:'#2A5050', glow:false, status:'concept',  act:'Act I — Past · Scene 02',     name:'Pioneers',          position:.16, emphasis:1.0, type:'scene' },
  { id:'cn2', cx:238, cy:53, r:5,  fill:'#1A3A3A', label:'CRACKS',     labelFill:'#2A5050', glow:false, status:'concept',  act:'Act I — Past · Scene 03',     name:'First Cracks',      position:.265,emphasis:1.0, type:'scene' },
  { id:'cn3', cx:356, cy:53, r:12, fill:'#C07010', label:'BATTLES',    labelFill:'#A06020', glow:true,  glowFill:'rgba(245,146,12,0.1)', glowDelay:'.5s', status:'review', act:'Act II — Present · Scene 01', name:'Battles & Breaches',position:.375,emphasis:1.6, type:'scene' },
  { id:'cn4', cx:454, cy:53, r:5,  fill:'#6A4808', label:'FRAUD',      labelFill:'#7A5030', glow:false, status:'concept',  act:'Act II — Present · Scene 02', name:'Fraud Vectors',     position:.485,emphasis:1.0, type:'scene' },
  { id:'cn5', cx:548, cy:53, r:7,  fill:'#7A5010', label:'COST',       labelFill:'#8A6030', glow:false, status:'concept',  act:'Act II — Present · Scene 03', name:'The Human Cost',    position:.595,emphasis:1.2, type:'scene' },
  { id:'cn6', cx:648, cy:53, r:5,  fill:'#581818', label:'RESILIENCE', labelFill:'#683030', glow:false, status:'concept',  act:'Act III — Future · Scene 01', name:'Resilience',        position:.695,emphasis:1.0, type:'scene' },
  { id:'cn7', cx:758, cy:53, r:9,  fill:'#721818', label:'YOUTH',      labelFill:'#823030', glow:true,  glowFill:'rgba(96,20,8,0.14)', glowDelay:'1.2s', status:'concept', act:'Act III — Future · Scene 02', name:'Youth Defenders',   position:.815,emphasis:1.4, type:'scene' },
  { id:'cn8', cx:862, cy:53, r:5,  fill:'#481010', label:'FUTURE',     labelFill:'#582828', glow:false, status:'concept',  act:'Act III — Future · Scene 03', name:'The Future Arc',    position:.945,emphasis:1.0, type:'scene' },
]

const STATUS_FILL  = { concept:'#3A3020', progress:'#F5920C', review:'#C07010', approved:'#4ADE80', locked:'#4ADE80' }
const STATUS_LABEL = { concept:'Concept', progress:'In Progress', review:'In Review', approved:'Approved', locked:'Locked' }
const ACT_COLORS   = {
  teal:   { fill:'rgba(30,138,138,0.055)',  stroke:'rgba(30,138,138,0.13)',  labelFill:'rgba(30,138,138,0.65)'  },
  orange: { fill:'rgba(245,146,12,0.042)',  stroke:'rgba(245,146,12,0.1)',   labelFill:'rgba(245,146,12,0.6)'   },
  red:    { fill:'rgba(90,18,10,0.052)',    stroke:'rgba(120,38,22,0.1)',    labelFill:'rgba(180,60,30,0.65)'   },
}

// ── SCENE MODE ───────────────────────────────────────────────
function SceneMode({ node, allNodes, onClose, onSelectNode }) {
  const { updateNode, selectNode: storeSelect } = useNodeStore()
  const { showToast } = useUIStore()
  const accent = STATUS_FILL[node.status] ?? '#3A3020'
  const sorted = [...allNodes].sort((a,b) => (a.position??0)-(b.position??0))
  const idx    = sorted.findIndex(n => n.id === node.id)
  const prev   = sorted[idx - 1]
  const next   = sorted[idx + 1]

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape')                        onClose()
      if (e.key === 'ArrowRight' && next) onSelectNode(next)
      if (e.key === 'ArrowLeft'  && prev) onSelectNode(prev)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, onSelectNode, prev, next])

  const cycleStatus = async () => {
    const statuses = ['concept','progress','review','approved','locked']
    const nextStatus = statuses[(statuses.indexOf(node.status ?? 'concept') + 1) % statuses.length]
    if (node.id && !node.id.startsWith('cn')) {
      await updateNode(node.id, { status: nextStatus })
    }
    storeSelect({ ...node, status: nextStatus })
    onSelectNode({ ...node, status: nextStatus })
    showToast(`Status → ${STATUS_LABEL[nextStatus]}`)
  }

  return (
    <div className="scene-mode" onClick={e => { if (e.target.classList.contains('scene-mode')) onClose() }}>
      {/* Ambient glow */}
      <div className="sm-glow" style={{ background:`radial-gradient(ellipse, ${accent}14 0%, transparent 65%)` }} />

      {/* Back button — absolute top left */}
      <button className="sm-back" onClick={onClose}>
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        Arc view
      </button>

      {/* Top spacer — clears the back button */}
      <div style={{ height: 44, flexShrink: 0 }} />

      {/* Main layout — flex: 1 so it fills remaining space */}
      <div className="sm-layout">

        {/* Prev node */}
        <button className={`sm-flank ${!prev ? 'hidden' : ''}`}
          onClick={() => prev && onSelectNode(prev)} disabled={!prev}>
          {prev && <>
            <div className="smf-dot" style={{ background: STATUS_FILL[prev.status] ?? '#3A3020' }} />
            <div className="smf-label">Previous</div>
            <div className="smf-name">{prev.name}</div>
          </>}
        </button>

        {/* Current */}
        <div className="sm-center">
          <div className="sm-act-label">{node.act ?? node.type ?? 'Scene'}</div>

          <div className="sm-node-name">{node.name}</div>

          <div className="sm-divider" style={{ background:`linear-gradient(90deg, ${accent}, transparent)` }} />

          {/* Status */}
          <button className="sm-status" onClick={cycleStatus}>
            <div className="sm-status-dot" style={{ background: accent }} />
            <span style={{ color: accent }}>{STATUS_LABEL[node.status ?? 'concept']}</span>
            <span className="sm-status-hint">↻ advance</span>
          </button>

          {/* Arc position dots */}
          <div className="sm-arc-dots">
            {sorted.map((n, i) => (
              <button key={n.id}
                className={`sm-arc-pip ${n.id === node.id ? 'active' : ''}`}
                style={{ background: n.id === node.id ? accent : STATUS_FILL[n.status] ?? '#2A2520' }}
                onClick={() => onSelectNode(n)}
                title={n.name} />
            ))}
          </div>
          <div className="sm-arc-label">{idx + 1} of {sorted.length} scenes</div>

          {/* Meta */}
          <div className="sm-meta">
            <div className="sm-meta-row">
              <span className="sm-meta-k">Type</span>
              <span className="sm-meta-v">{node.type ?? 'scene'}</span>
            </div>
            <div className="sm-meta-row">
              <span className="sm-meta-k">Position</span>
              <span className="sm-meta-v">{Math.round((node.position ?? 0) * 100)}%</span>
            </div>
            <div className="sm-meta-row">
              <span className="sm-meta-k">Weight</span>
              <span className="sm-meta-v">{node.emphasis ?? 1}×</span>
            </div>
          </div>

          <div className="sm-panel-hint">
            Use the right panel to view shots, notes, and assets for this scene.
          </div>
        </div>

        {/* Next node */}
        <button className={`sm-flank right ${!next ? 'hidden' : ''}`}
          onClick={() => next && onSelectNode(next)} disabled={!next}>
          {next && <>
            <div className="smf-dot" style={{ background: STATUS_FILL[next.status] ?? '#3A3020' }} />
            <div className="smf-label">Next</div>
            <div className="smf-name">{next.name}</div>
          </>}
        </button>
      </div>

      {/* Keyboard hint — in flow at bottom */}
      <div className="sm-kb">← → navigate · Esc back to arc</div>
    </div>
  )
} 
export default function Timeline() {
  const { selectedNode, selectNode, nodes, createNode } = useNodeStore()
  const { currentProject, acts } = useProjectStore()
  const { setMinimapPos, showToast } = useUIStore()

  const [showNewNode, setShowNewNode] = useState(false)
  const [newNodeName, setNewNodeName] = useState('')
  const [newNodePos,  setNewNodePos]  = useState(0.5)
  const [newNodeType, setNewNodeType] = useState('scene')
  const [creating,    setCreating]    = useState(false)
  const [sceneMode,   setSceneMode]   = useState(false)
  const [zoom,        setZoom]        = useState(1)

  const hasRealNodes = currentProject && nodes.length > 0

  const displayNodes = hasRealNodes
    ? nodes.map(n => ({
        id:       n.id,
        cx:       Math.max(20, Math.min(880, (n.position ?? 0) * 900)),
        cy:       53,
        r:        Math.max(5, Math.min(14, (n.emphasis ?? 1) * 7)),
        fill:     STATUS_FILL[n.status] ?? '#3A3020',
        label:    (n.name ?? '').toUpperCase().slice(0, 9),
        labelFill:'#6A6258',
        glow:     n.status === 'progress' || n.status === 'review',
        glowFill: 'rgba(245,146,12,0.12)',
        status:   n.status,
        act:      n.act ?? n.name,
        name:     n.name,
        position: n.position,
        emphasis: n.emphasis,
        type:     n.type,
        _raw:     n,
      }))
    : DEMO_NODES

  const displayActs = (currentProject && acts.length > 0)
    ? acts.map(a => {
        const c = ACT_COLORS[a.color] ?? ACT_COLORS.teal
        const x = a.position * 900
        return { x, width:(a.end_pos - a.position)*900, fill:c.fill, stroke:c.stroke, label:a.name, labelFill:c.labelFill, labelX:x+4 }
      })
    : ACTS_DEMO

  const handleNodeClick = (node) => {
    const raw = node._raw ?? node
    const merged = { ...raw, label:node.label, act:node.act, name:node.name, position:node.position, emphasis:node.emphasis, type:node.type }
    selectNode(merged)
    setMinimapPos(Math.round((node.cx / 900) * 94) + 3)
    showToast(node.name)
    setSceneMode(true)
  }

  const handleSceneSelect = (node) => {
    const raw = node._raw ?? node
    const merged = { ...raw, label:node.label, act:node.act, name:node.name, position:node.position, emphasis:node.emphasis, type:node.type }
    selectNode(merged)
    setMinimapPos(Math.round(((node.position ?? 0)) * 94) + 3)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e) => {
      if (sceneMode) return
      if (e.key === 'z') setZoom(z => Math.min(z + 0.3, 2.5))
      if (e.key === 'x') setZoom(z => Math.max(z - 0.3, 0.5))
      if (e.key === 'f') setZoom(1)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [sceneMode])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newNodeName.trim() || !currentProject) return
    setCreating(true)
    const { error } = await createNode({
      project_id: currentProject.id, name: newNodeName,
      type: newNodeType, position: newNodePos, emphasis: 1, status: 'concept',
    })
    setCreating(false)
    if (error) { showToast('Could not add scene.', '#E05050'); return }
    setShowNewNode(false)
    setNewNodeName('')
    showToast(`${newNodeName} added.`)
  }

  return (
    <div className="timeline-wrap">
      {/* Scene mode */}
      {sceneMode && selectedNode && (
        <SceneMode
          node={selectedNode}
          allNodes={displayNodes}
          onClose={() => setSceneMode(false)}
          onSelectNode={handleSceneSelect} />
      )}

      {/* ── TOP ZONE — project status header ── */}
      <div className="tl-header">
        <div className="tl-header-left">
          {currentProject ? (
            <>
              <div className="tl-proj-name">
                <span className="tl-arrow">▸</span>
                {currentProject.name}
              </div>
              {currentProject.logline && (
                <div className="tl-proj-logline">{currentProject.logline}</div>
              )}
            </>
          ) : (
            <span className="tl-demo">Demo — open a project to see your timeline</span>
          )}
        </div>

        <div className="tl-header-right">
          {/* Act completion stats */}
          {currentProject && acts.length > 0 && (
            <div className="tl-act-strip">
              {acts.map((act, i) => {
                const actNodes = nodes.filter(n => n.act_id === act.id)
                const done = actNodes.filter(n => n.status === 'approved' || n.status === 'locked').length
                const pct  = actNodes.length > 0 ? Math.round((done / actNodes.length) * 100) : 0
                const COLORS = ['#1E8A8A','#F5920C','#B43C1E']
                return (
                  <div key={act.id} className="tl-act-stat">
                    <div className="tas-dot" style={{ background: COLORS[i] ?? '#6A6258' }} />
                    <span className="tas-name">{act.name}</span>
                    <span className="tas-pct" style={{ color: pct === 100 ? '#4ADE80' : 'var(--mute)' }}>
                      {pct}%
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Zoom + add controls */}
          <div className="tl-controls">
            <div className="tl-zoom-group">
              <button className="tl-zoom-btn" onClick={() => setZoom(z => Math.max(z - 0.3, 0.5))} title="Zoom out (X)">−</button>
              <span className="tl-zoom-val">{Math.round(zoom * 100)}%</span>
              <button className="tl-zoom-btn" onClick={() => setZoom(z => Math.min(z + 0.3, 2.5))} title="Zoom in (Z)">+</button>
              <button className="tl-zoom-btn tl-fit-btn" onClick={() => setZoom(1)} title="Fit to arc (F)">
                <svg viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
              </button>
            </div>
            {currentProject && (
              <button className="add-node-btn" onClick={() => setShowNewNode(s => !s)}>
                + Add Scene
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add scene form */}
      {showNewNode && currentProject && (
        <form className="new-node-form" onSubmit={handleCreate}>
          <div className="nn-row">
            <input className="nn-input" type="text"
              placeholder="Scene name — e.g. Opening Sequence"
              value={newNodeName} onChange={e => setNewNodeName(e.target.value)}
              required autoFocus />
            <select className="nn-select" value={newNodeType}
              onChange={e => setNewNodeType(e.target.value)}>
              {['scene','beat','marker','music','equipment','staging'].map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="nn-pos-wrap">
            <label className="nn-label">Position on timeline</label>
            <input type="range" min="0.01" max="0.99" step="0.01"
              value={newNodePos} onChange={e => setNewNodePos(parseFloat(e.target.value))} />
            <span className="nn-pos-val">{Math.round(newNodePos * 100)}%</span>
          </div>
          <div className="nn-foot">
            <button type="button" className="nn-cancel" onClick={() => setShowNewNode(false)}>Cancel</button>
            <button type="submit" className="nn-save" disabled={creating}>
              {creating ? 'Adding…' : 'Add to timeline →'}
            </button>
          </div>
        </form>
      )}

      {/* ── MIDDLE ZONE — arc fills the space ── */}
      <div className="tl-arc-zone">
        {/* Empty state */}
        {currentProject && !hasRealNodes && !showNewNode && (
          <div className="tl-empty-state">
            <EmptyState
              icon={<svg viewBox="0 0 24 24" style={{width:'16px',height:'16px',stroke:'currentColor',fill:'none',strokeWidth:'1.5'}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
              title="No scenes yet"
              body="Add your first scene to begin building your timeline."
              action="Add first scene →"
              onAction={() => setShowNewNode(true)} />
          </div>
        )}

        {/* SVG arc */}
        <div className="timeline-svg-wrap"
          style={{ transform:`scaleX(${zoom})`, transformOrigin:'left center', transition:'transform .3s var(--ease)' }}>
          <svg id="csvg" className="timeline-svg" viewBox="0 0 900 200" preserveAspectRatio="none">
            {displayActs.map((act, i) => (
              <g key={i}>
                <rect x={act.x} y={30} width={act.width} height={100} rx={3}
                  fill={act.fill} stroke={act.stroke} strokeWidth={0.5}/>
                <text x={act.labelX + 4} y={22} fill={act.labelFill}
                  fontSize={11} fontFamily="IBM Plex Mono" letterSpacing={2} fontWeight={400}>
                  {act.label}
                </text>
              </g>
            ))}
            <line x1={0} y1={80} x2={900} y2={80} stroke="#181410" strokeWidth={1.5}/>
            {displayNodes.map((node) => (
              <Node key={node.id} node={{ ...node, cy: 80 }}
                selected={selectedNode?.id === node.id}
                onClick={() => handleNodeClick(node)} />
            ))}
          </svg>
        </div>
      </div>

      {/* Keyboard hint — first visit only */}
      {!localStorage.getItem('kb_hint_seen') && (
        <div className="tl-kb-strip"
          onAnimationEnd={() => localStorage.setItem('kb_hint_seen', '1')}>
          <span>Z zoom in</span><span>·</span>
          <span>X zoom out</span><span>·</span>
          <span>F fit arc</span><span>·</span>
          <span>click node to open scene</span>
        </div>
      )}
    </div>
  )
}
