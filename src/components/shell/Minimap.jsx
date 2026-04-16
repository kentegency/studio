import { useUIStore, useNodeStore, useProjectStore } from '../../stores'
import './Minimap.css'

const STATUS_COLOR = {
  concept:  '#2A2A2E',
  progress: 'var(--accent)',
  review:   '#A88040',
  approved: '#4ADE80',
  locked:   '#4ADE80',
}

const DEMO_MARKS = [
  { p:6,  status:'progress', node:null },
  { p:16, status:'concept',  node:null },
  { p:26, status:'concept',  node:null },
  { p:39, status:'review',   node:null },
  { p:49, status:'concept',  node:null },
  { p:59, status:'concept',  node:null },
  { p:72, status:'concept',  node:null },
  { p:83, status:'concept',  node:null },
  { p:95, status:'concept',  node:null },
]

export default function Minimap() {
  const minimapPos = useUIStore(s => s.minimapPos)
  const { nodes, selectNode } = useNodeStore()
  const { currentProject, acts } = useProjectStore()

  const hasReal = currentProject && nodes.length > 0

  const marks = hasReal
    ? [...nodes]
        .sort((a,b) => (a.position??0)-(b.position??0))
        .map(n => ({
          p:      Math.round((n.position??0) * 94) + 3,
          status: n.status ?? 'concept',
          node:   n,
        }))
    : DEMO_MARKS

  const approvedCount = hasReal
    ? nodes.filter(n => n.status === 'approved' || n.status === 'locked').length
    : 0

  const pct = hasReal && nodes.length > 0
    ? Math.round((approvedCount / nodes.length) * 100)
    : 0

  const ACT_ZONE_COLORS = [
    'rgba(212,170,106,0.20)', 'rgba(74,158,158,0.18)',
    'rgba(180,60,30,0.20)',   'rgba(155,127,232,0.18)',
    'rgba(74,222,128,0.16)',  'rgba(92,107,192,0.18)',
  ]

  const actZones = hasReal && acts.length > 0
    ? acts.map((act, i) => ({
        left:  `${Math.round((act.position ?? 0) * 100)}%`,
        width: `${Math.round(((act.end_pos ?? 1) - (act.position ?? 0)) * 100)}%`,
        color: ACT_ZONE_COLORS[i % ACT_ZONE_COLORS.length],
      }))
    : [
        { left:'1%',  width:'28%', color:'rgba(74,158,158,0.20)' },
        { left:'31%', width:'32%', color:'rgba(212,170,106,0.18)' },
        { left:'65%', width:'33%', color:'rgba(180,60,30,0.20)' },
      ]

  return (
    <div className="minimap">
      <span className="cm-l">Arc</span>
      <div className="cm-track">
        {actZones.map((z, i) => (
          <div key={i} className="cm-zone" style={{ left: z.left, width: z.width, background: z.color }} />
        ))}

        {hasReal && approvedCount > 0 && (
          <div className="cm-progress-fill"
            style={{ width: `${pct}%`, background: 'rgba(74,222,128,0.15)' }} />
        )}

        {marks.map((m, i) => (
          <div key={i}
            className="cm-node"
            title={m.node?.name}
            onClick={() => m.node && selectNode(m.node)}
            style={{
              left:       `${m.p}%`,
              background: STATUS_COLOR[m.status] ?? '#2A2A2E',
              opacity:    m.status === 'concept' ? 0.5 : 1,
              cursor:     m.node ? 'pointer' : 'default',
              transition: 'transform 0.1s ease',
            }}
            onMouseEnter={e => { if(m.node) e.target.style.transform='scale(1.8)' }}
            onMouseLeave={e => { e.target.style.transform='scale(1)' }}
          />
        ))}

        <div className="cm-pos" style={{ left: `${minimapPos}%` }} />
      </div>

      <span className="cm-l" style={{ flexShrink: 0 }}>
        {hasReal ? (
          <>
            <span style={{ color: approvedCount > 0 ? 'rgba(74,222,128,0.7)' : 'var(--ghost)' }}>
              {pct}%
            </span>
            {' '}
            <span style={{ color: 'var(--ghost)' }}>
              {nodes.length} scenes
            </span>
          </>
        ) : (
          '9 scenes'
        )}
      </span>
    </div>
  )
}
