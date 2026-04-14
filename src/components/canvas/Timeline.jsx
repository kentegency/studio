import { useState } from 'react'
import { useNodeStore, useUIStore, useProjectStore } from '../../stores'
import Node from './Node'
import './Timeline.css'

const ACTS = [
  { x:8,   width:268, fill:'rgba(30,138,138,0.055)',  stroke:'rgba(30,138,138,0.13)',  label:'I — PAST',     labelFill:'rgba(30,138,138,0.65)',  labelX:12  },
  { x:284, width:302, fill:'rgba(245,146,12,0.042)',  stroke:'rgba(245,146,12,0.1)',   label:'II — PRESENT', labelFill:'rgba(245,146,12,0.6)',   labelX:288 },
  { x:594, width:300, fill:'rgba(90,18,10,0.052)',    stroke:'rgba(120,38,22,0.1)',    label:'III — FUTURE', labelFill:'rgba(180,60,30,0.65)',   labelX:598 },
]

const DEMO_NODES = [
  { id:'cn0', cx:58,  cy:53, r:9,  fill:'#1E8A8A', label:'OPENING',    labelFill:'#2A6060', glow:true,  glowFill:'rgba(30,138,138,0.15)',  status:'progress', act:'Scene 01 — Act I — Past',    desc:'The invisible war begins before anyone understands what war is.' },
  { id:'cn1', cx:148, cy:53, r:5,  fill:'#112E2E', label:'PIONEERS',   labelFill:'#1A3A3A', glow:false, status:'concept',  act:'Scene 02 — Act I — Past',    desc:'Before cybersecurity had a name, pioneers in Ghana saw the risk.' },
  { id:'cn2', cx:234, cy:53, r:5,  fill:'#112E2E', label:'CRACKS',     labelFill:'#1A3A3A', glow:false, status:'concept',  act:'Scene 03 — Act I — Past',    desc:'The earliest digital crimes were small. A forged email. A misplaced trust.' },
  { id:'cn3', cx:356, cy:53, r:12, fill:'#C07010', label:'BATTLES',    labelFill:'#8A5010', glow:true,  glowFill:'rgba(245,146,12,0.1)', glowDelay:'.5s', status:'review', act:'Scene 01 — Act II — Present', desc:'Battles, breaches and the cost of convenience.' },
  { id:'cn4', cx:444, cy:53, r:5,  fill:'#5A3808', label:'FRAUD',      labelFill:'#5A3A10', glow:false, status:'progress', act:'Scene 02 — Act II — Present', desc:'Social engineering has become the most effective weapon.' },
  { id:'cn5', cx:538, cy:53, r:7,  fill:'#6A4008', label:'COST',       labelFill:'#6A4018', glow:false, status:'approved', act:'Scene 03 — Act II — Present', desc:'Cybercrime does not only steal money. It steals peace of mind.' },
  { id:'cn6', cx:648, cy:53, r:5,  fill:'#481008', label:'RESILIENCE', labelFill:'#501820', glow:false, status:'concept',  act:'Scene 01 — Act III — Future', desc:'Every moment of crisis carries a choice — to retreat or respond.' },
  { id:'cn7', cx:752, cy:53, r:9,  fill:'#621408', label:'YOUTH',      labelFill:'#601818', glow:true,  glowFill:'rgba(96,20,8,0.14)', glowDelay:'1.2s', status:'concept', act:'Scene 02 — Act III — Future', desc:'Ghana\'s greatest cybersecurity asset is its people.' },
  { id:'cn8', cx:862, cy:53, r:5,  fill:'#3A0A04', label:'FUTURE',     labelFill:'#481010', glow:false, status:'concept',  act:'Scene 03 — Act III — Future', desc:'To learn, to adapt, and to protect.' },
]

const MINIMAP_PCTS = [6,16,26,39,49,59,72,83,95]

// Map status to color
const STATUS_FILL = {
  concept:  '#2A2520',
  progress: '#F5920C',
  review:   '#F4EFD8',
  approved: '#4ADE80',
  locked:   '#4ADE80',
}

export default function Timeline() {
  const { selectedNode, selectNode, nodes, createNode } = useNodeStore()
  const { currentProject } = useProjectStore()
  const { setMinimapPos, showToast } = useUIStore()
  const [showNewNode, setShowNewNode] = useState(false)
  const [newNodeName, setNewNodeName] = useState('')
  const [newNodePos, setNewNodePos]   = useState(0.5)
  const [creating, setCreating]       = useState(false)

  // Use real nodes if project is loaded and has nodes, else show demo
  const displayNodes = (currentProject && nodes.length > 0) ? nodes.map((n, i) => ({
    id:        n.id,
    cx:        n.position * 900,
    cy:        53,
    r:         Math.max(5, (n.emphasis ?? 1) * 7),
    fill:      STATUS_FILL[n.status] ?? '#2A2520',
    label:     n.name.toUpperCase().slice(0, 10),
    labelFill: '#5A5448',
    glow:      n.status === 'progress' || n.status === 'review',
    glowFill:  'rgba(245,146,12,0.12)',
    status:    n.status,
    act:       `${n.name} — ${n.type}`,
    desc:      n.name,
    name:      n.name,
  })) : DEMO_NODES

  const handleNodeClick = (node, idx) => {
    selectNode(node)
    setMinimapPos(MINIMAP_PCTS[idx] ?? 50)
    showToast(node.label ?? node.name)
  }

  const handleCreateNode = async (e) => {
    e.preventDefault()
    if (!newNodeName.trim() || !currentProject) return
    setCreating(true)
    await createNode({
      project_id: currentProject.id,
      name:       newNodeName,
      type:       'scene',
      position:   newNodePos,
      emphasis:   1,
      status:     'concept',
    })
    setCreating(false)
    setShowNewNode(false)
    setNewNodeName('')
    showToast(`${newNodeName} added to timeline.`)
  }

  return (
    <div className="timeline-wrap">
      {/* Add node button */}
      <div className="timeline-toolbar">
        {currentProject && (
          <button className="add-node-btn" onClick={() => setShowNewNode(s => !s)} data-hover>
            + Add Scene
          </button>
        )}
      </div>

      {/* New node form */}
      {showNewNode && currentProject && (
        <form className="new-node-form" onSubmit={handleCreateNode}>
          <input
            className="nn-input" type="text"
            placeholder="Scene name…"
            value={newNodeName}
            onChange={e => setNewNodeName(e.target.value)}
            autoFocus required
          />
          <div className="nn-pos-wrap">
            <label className="nn-label">Position on line</label>
            <input type="range" min="0" max="1" step="0.01"
              value={newNodePos}
              onChange={e => setNewNodePos(parseFloat(e.target.value))}
              className="nn-slider" />
            <span className="nn-pos-val">{Math.round(newNodePos * 100)}%</span>
          </div>
          <div className="nn-foot">
            <button type="button" className="nn-cancel"
              onClick={() => setShowNewNode(false)}>Cancel</button>
            <button type="submit" className="nn-save" disabled={creating}>
              {creating ? 'Adding…' : 'Add to timeline →'}
            </button>
          </div>
        </form>
      )}

      <svg id="csvg" className="timeline-svg"
        viewBox="0 0 900 130" preserveAspectRatio="none">
        {/* Act zones */}
        {ACTS.map((act, i) => (
          <g key={i}>
            <rect x={act.x} y={26} width={act.width} height={54} rx={3}
              fill={act.fill} stroke={act.stroke} strokeWidth={0.5}/>
            <text x={act.labelX} y={20} fill={act.labelFill}
              fontSize={7} fontFamily="IBM Plex Mono"
              letterSpacing={2.5} fontWeight={400}>{act.label}</text>
          </g>
        ))}

        {/* The line */}
        <line x1={0} y1={53} x2={900} y2={53} stroke="#181410" strokeWidth={1.5}/>

        {/* Nodes */}
        {displayNodes.map((node, i) => (
          <Node key={node.id} node={node}
            selected={selectedNode?.id === node.id}
            onClick={() => handleNodeClick(node, i)} />
        ))}
      </svg>
    </div>
  )
}
