import { useUIStore } from '../../stores'
import './Minimap.css'

const NODE_MARKS = [6,16,26,39,49,59,72,83,95]

export default function Minimap() {
  const minimapPos = useUIStore(s => s.minimapPos)

  return (
    <div className="minimap">
      <span className="cm-l">arc</span>
      <div className="cm-track">
        <div className="cm-zone" style={{ left:'1%',  width:'28%', background:'rgba(30,138,138,0.3)'  }} />
        <div className="cm-zone" style={{ left:'31%', width:'32%', background:'rgba(245,146,12,0.24)' }} />
        <div className="cm-zone" style={{ left:'65%', width:'33%', background:'rgba(180,60,30,0.26)'  }} />
        {NODE_MARKS.map((p, i) => (
          <div key={i} className="cm-node" style={{ left: `${p}%` }} />
        ))}
        <div className="cm-pos" style={{ left: `${minimapPos}%` }} />
      </div>
      <span className="cm-l">9 nodes · 40 min</span>
    </div>
  )
}
