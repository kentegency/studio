import { useEffect, useState } from 'react'
import './EntryLine.css'

const NODES = [
  { cx: 78,  cy: 41, r: 8,  fill: '#1E8A8A', glow: true,  glowR: 16, glowFill: 'rgba(30,138,138,0.18)' },
  { cx: 170, cy: 41, r: 4.5,fill: '#123A3A', glow: false },
  { cx: 260, cy: 41, r: 4.5,fill: '#123A3A', glow: false },
  { cx: 394, cy: 41, r: 10, fill: '#C07010', glow: true,  glowR: 19, glowFill: 'rgba(245,146,12,0.12)', glowDelay: '.7s' },
  { cx: 482, cy: 41, r: 4.5,fill: '#5A3808', glow: false },
  { cx: 572, cy: 41, r: 6,  fill: '#6A4008', glow: false },
  { cx: 702, cy: 41, r: 4.5,fill: '#481008', glow: false },
  { cx: 812, cy: 41, r: 8,  fill: '#621408', glow: true,  glowR: 16, glowFill: 'rgba(96,20,8,0.16)',    glowDelay: '1.4s' },
  { cx: 932, cy: 41, r: 4.5,fill: '#3A0A04', glow: false },
]

export default function EntryLine({ visible }) {
  const [draw, setDraw]   = useState(false)
  const [nodes, setNodes] = useState([])

  useEffect(() => {
    if (!visible) return
    setTimeout(() => setDraw(true), 80)
    document.querySelectorAll('.e-az').forEach((el, i) => {
      setTimeout(() => el.classList.add('on'), 180 + i * 220)
    })
    NODES.forEach((_, i) => {
      setTimeout(() => setNodes(prev => [...prev, i]), 580 + i * 90)
    })
  }, [visible])

  return (
    <div className={`entry-line-wrap ${visible ? 'on' : ''}`}>
      <svg className="entry-svg" viewBox="0 0 1000 100" preserveAspectRatio="none">
        {/* Act zones */}
        <rect className="e-az" x="18" y="22" width="275" height="38" rx="2"
          fill="rgba(30,138,138,0.07)" stroke="rgba(30,138,138,0.2)" strokeWidth="0.5"/>
        <rect className="e-az" x="308" y="22" width="332" height="38" rx="2"
          fill="rgba(245,146,12,0.055)" stroke="rgba(245,146,12,0.16)" strokeWidth="0.5"/>
        <rect className="e-az" x="656" y="22" width="328" height="38" rx="2"
          fill="rgba(90,18,10,0.07)" stroke="rgba(120,38,22,0.2)" strokeWidth="0.5"/>

        {/* Act labels */}
        <text x="22" y="17" fill="rgba(30,138,138,0.65)" fontSize="7" fontFamily="IBM Plex Mono" letterSpacing="2.5">I — PAST</text>
        <text x="312" y="17" fill="rgba(245,146,12,0.6)"  fontSize="7" fontFamily="IBM Plex Mono" letterSpacing="2.5">II — PRESENT</text>
        <text x="660" y="17" fill="rgba(180,60,30,0.65)"  fontSize="7" fontFamily="IBM Plex Mono" letterSpacing="2.5">III — FUTURE</text>

        {/* The line */}
        <line className={`entry-line-track ${draw ? 'draw' : ''}`}
          x1="0" y1="41" x2="1000" y2="41" stroke="#1A1814" strokeWidth="1.5"/>

        {/* Glow rings */}
        {NODES.filter(n => n.glow).map((n, i) => (
          <circle key={`glow-${i}`} cx={n.cx} cy={n.cy} r={n.glowR}
            fill={n.glowFill}
            style={{ animation: `grp 3s ease-in-out infinite ${n.glowDelay || '0s'}` }}/>
        ))}

        {/* Nodes */}
        {NODES.map((n, i) => (
          nodes.includes(i) && (
            <circle key={i} cx={n.cx} cy={n.cy} r={n.r} fill={n.fill}
              className="entry-node-dot" />
          )
        ))}
      </svg>
    </div>
  )
}
