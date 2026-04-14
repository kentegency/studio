import { useUIStore, useNodeStore, useProjectStore } from '../../stores'
import './Minimap.css'

const STATUS_COLOR = {
  concept:  '#2A2720',
  progress: '#F5920C',
  review:   '#C07010',
  approved: '#4ADE80',
  locked:   '#4ADE80',
}

const DEMO_MARKS = [
  { p:6,  status:'progress' },
  { p:16, status:'concept'  },
  { p:26, status:'concept'  },
  { p:39, status:'review'   },
  { p:49, status:'concept'  },
  { p:59, status:'concept'  },
  { p:72, status:'concept'  },
  { p:83, status:'concept'  },
  { p:95, status:'concept'  },
]

export default function Minimap() {
  const minimapPos     = useUIStore(s => s.minimapPos)
  const { nodes }      = useNodeStore()
  const { currentProject, acts } = useProjectStore()

  const hasReal = currentProject && nodes.length > 0

  const marks = hasReal
    ? [...nodes]
        .sort((a,b) => (a.position??0)-(b.position??0))
        .map(n => ({ p: Math.round((n.position??0) * 94) + 3, status: n.status ?? 'concept' }))
    : DEMO_MARKS

  const approvedCount = hasReal
    ? nodes.filter(n => n.status === 'approved' || n.status === 'locked').length
    : 0

  const totalRuntime = '40 min'

  return (
    <div className="minimap">
      <span className="cm-l">Arc</span>
      <div className="cm-track">
        {/* Act zones */}
        <div className="cm-zone" style={{ left:'1%',  width:'28%', background:'rgba(30,138,138,0.28)'  }} />
        <div className="cm-zone" style={{ left:'31%', width:'32%', background:'rgba(245,146,12,0.22)' }} />
        <div className="cm-zone" style={{ left:'65%', width:'33%', background:'rgba(180,60,30,0.24)'  }} />

        {/* Node markers — coloured by status */}
        {marks.map((m, i) => (
          <div key={i} className="cm-node"
            style={{
              left: `${m.p}%`,
              background: STATUS_COLOR[m.status] ?? '#2A2720',
              opacity: m.status === 'concept' ? 0.5 : 1,
            }} />
        ))}

        {/* Current position cursor */}
        <div className="cm-pos" style={{ left: `${minimapPos}%` }} />
      </div>
      <span className="cm-l">
        {hasReal
          ? `${nodes.length} scenes · ${approvedCount} approved`
          : `9 scenes · ${totalRuntime}`}
      </span>
    </div>
  )
}
