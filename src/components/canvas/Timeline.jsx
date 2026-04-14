import { useState } from 'react'
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
  { id:'cn0', cx:58,  cy:53, r:9,  fill:'#1E8A8A', label:'OPENING',    labelFill:'#3A7070', glow:true,  glowFill:'rgba(30,138,138,0.15)',  status:'progress', act:'Scene 01 — Act I — Past',    name:'Opening Sequence' },
  { id:'cn1', cx:148, cy:53, r:5,  fill:'#1A3A3A', label:'PIONEERS',   labelFill:'#2A5050', glow:false, status:'concept',  act:'Scene 02 — Act I — Past',    name:'Pioneers' },
  { id:'cn2', cx:234, cy:53, r:5,  fill:'#1A3A3A', label:'CRACKS',     labelFill:'#2A5050', glow:false, status:'concept',  act:'Scene 03 — Act I — Past',    name:'First Cracks' },
  { id:'cn3', cx:356, cy:53, r:12, fill:'#C07010', label:'BATTLES',    labelFill:'#A06020', glow:true,  glowFill:'rgba(245,146,12,0.1)', glowDelay:'.5s', status:'review', act:'Scene 01 — Act II — Present', name:'Battles & Breaches' },
  { id:'cn4', cx:444, cy:53, r:5,  fill:'#6A4808', label:'FRAUD',      labelFill:'#7A5030', glow:false, status:'progress', act:'Scene 02 — Act II — Present', name:'Fraud Vectors' },
  { id:'cn5', cx:538, cy:53, r:7,  fill:'#7A5010', label:'COST',       labelFill:'#8A6030', glow:false, status:'approved', act:'Scene 03 — Act II — Present', name:'The Human Cost' },
  { id:'cn6', cx:648, cy:53, r:5,  fill:'#581818', label:'RESILIENCE', labelFill:'#683030', glow:false, status:'concept',  act:'Scene 01 — Act III — Future', name:'Resilience' },
  { id:'cn7', cx:752, cy:53, r:9,  fill:'#721818', label:'YOUTH',      labelFill:'#823030', glow:true,  glowFill:'rgba(96,20,8,0.14)', glowDelay:'1.2s', status:'concept', act:'Scene 02 — Act III — Future', name:'Youth Defenders' },
  { id:'cn8', cx:862, cy:53, r:5,  fill:'#481010', label:'FUTURE',     labelFill:'#582828', glow:false, status:'concept',  act:'Scene 03 — Act III — Future', name:'The Future Arc' },
]

const MINIMAP_PCTS = [6,16,26,39,49,59,72,83,95]
const STATUS_FILL = { concept:'#3A3020', progress:'#F5920C', review:'#C07010', approved:'#4ADE80', locked:'#4ADE80' }
const ACT_COLORS = {
  teal:   { fill:'rgba(30,138,138,0.055)',  stroke:'rgba(30,138,138,0.13)',  labelFill:'rgba(30,138,138,0.65)'  },
  orange: { fill:'rgba(245,146,12,0.042)',  stroke:'rgba(245,146,12,0.1)',   labelFill:'rgba(245,146,12,0.6)'   },
  red:    { fill:'rgba(90,18,10,0.052)',    stroke:'rgba(120,38,22,0.1)',    labelFill:'rgba(180,60,30,0.65)'   },
}

const AddNodeIcon = () => <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>

export default function Timeline() {
  const { selectedNode, selectNode, nodes, createNode } = useNodeStore()
  const { currentProject, acts }  = useProjectStore()
  const { setMinimapPos, showToast } = useUIStore()
  const [showNewNode, setShowNewNode] = useState(false)
  const [newNodeName, setNewNodeName] = useState('')
  const [newNodePos,  setNewNodePos]  = useState(0.5)
  const [newNodeType, setNewNodeType] = useState('scene')
  const [creating, setCreating]       = useState(false)

  const hasRealNodes = currentProject && nodes.length > 0
  const displayNodes = hasRealNodes
    ? nodes.map(n => ({
        id:        n.id,
        cx:        Math.max(20, Math.min(880, (n.position ?? 0) * 900)),
        cy:        53,
        r:         Math.max(5, Math.min(14, (n.emphasis ?? 1) * 7)),
        fill:      STATUS_FILL[n.status] ?? '#3A3020',
        label:     (n.name ?? '').toUpperCase().slice(0, 9),
        labelFill: '#6A6258',
        glow:      n.status === 'progress' || n.status === 'review',
        glowFill:  'rgba(245,146,12,0.12)',
        status:    n.status,
        act:       `${n.name} — ${n.type ?? 'scene'}`,
        name:      n.name,
        _raw:      n,
      }))
    : DEMO_NODES

  const displayActs = (currentProject && acts.length > 0)
    ? acts.map(a => {
        const c = ACT_COLORS[a.color] ?? ACT_COLORS.teal
        const x = a.position * 900
        return { x, width:(a.end_pos - a.position)*900, fill:c.fill, stroke:c.stroke, label:a.name, labelFill:c.labelFill, labelX:x+4 }
      })
    : ACTS_DEMO

  const handleNodeClick = (node, idx) => {
    const raw = node._raw ?? node
    selectNode({ ...raw, label:node.label, act:node.act, name:node.name })
    setMinimapPos(hasRealNodes ? Math.round((node.cx/900)*94)+3 : MINIMAP_PCTS[idx] ?? 50)
    showToast(node.name ?? node.label)
  }

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
    showToast(`${newNodeName} added to timeline.`)
  }

  return (
    <div className="timeline-wrap">
      <div className="timeline-toolbar">
        <div className="tl-project-name">
          {currentProject
            ? <><span style={{ color:'var(--orange)', marginRight:'6px' }}>▸</span>{currentProject.name}</>
            : <span style={{ color:'var(--mute)' }}>Demo — open a project to see your timeline</span>}
        </div>
        {currentProject && (
          <button className="add-node-btn" onClick={() => setShowNewNode(s => !s)} data-hover>
            + Add Scene
          </button>
        )}
      </div>

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
              value={newNodePos} onChange={e => setNewNodePos(parseFloat(e.target.value))}
              className="nn-slider" />
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

      {/* Empty state when project has no nodes */}
      {currentProject && !hasRealNodes && !showNewNode && (
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:2, pointerEvents:'all' }}>
          <EmptyState
            icon={<AddNodeIcon />}
            title="No scenes yet"
            body="Add your first scene to begin building your timeline."
            action="Add first scene →"
            onAction={() => setShowNewNode(true)} />
        </div>
      )}

      <svg id="csvg" className="timeline-svg" viewBox="0 0 900 130" preserveAspectRatio="none">
        {displayActs.map((act, i) => (
          <g key={i}>
            <rect x={act.x} y={26} width={act.width} height={54} rx={3}
              fill={act.fill} stroke={act.stroke} strokeWidth={0.5}/>
            <text x={act.labelX} y={20} fill={act.labelFill}
              fontSize={11} fontFamily="IBM Plex Mono" letterSpacing={2} fontWeight={400}>
              {act.label}
            </text>
          </g>
        ))}
        <line x1={0} y1={53} x2={900} y2={53} stroke="#181410" strokeWidth={1.5}/>
        {displayNodes.map((node, i) => (
          <Node key={node.id} node={node}
            selected={selectedNode?.id === node.id}
            onClick={() => handleNodeClick(node, i)} />
        ))}
      </svg>
    </div>
  )
}
