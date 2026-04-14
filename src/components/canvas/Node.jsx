import { useState } from 'react'

export default function Node({ node, selected, onClick }) {
  const [hovered, setHovered] = useState(false)

  const scale = selected ? 1.5 : hovered ? 1.4 : 1
  const brightness = selected ? 2.2 : hovered ? 1.9 : 1
  const filterStr = selected
    ? `brightness(${brightness}) drop-shadow(0 0 10px rgba(245,146,12,0.4))`
    : hovered
    ? `brightness(${brightness})`
    : 'none'

  return (
    <g
      className="node-group"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer' }}
      data-hover
    >
      {/* Glow ring */}
      {node.glow && (
        <circle
          cx={node.cx} cy={node.cy}
          r={node.r * 2}
          fill={node.glowFill}
          style={{ animation: `grp 3s ease-in-out infinite ${node.glowDelay || '0s'}` }}
        />
      )}

      {/* Main circle */}
      <circle
        cx={node.cx} cy={node.cy} r={node.r}
        fill={node.fill}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: `${node.cx}px ${node.cy}px`,
          filter: filterStr,
          transition: 'transform 0.2s cubic-bezier(.16,1,.3,1), filter 0.2s ease',
        }}
      />

      {/* Label */}
      <text
        x={node.cx} y={94}
        textAnchor="middle"
        fontSize={7.5}
        fontFamily="IBM Plex Mono"
        letterSpacing={1.5}
        textTransform="uppercase"
        fill={node.labelFill}
        style={{ pointerEvents: 'none', fontWeight: 400 }}
      >
        {node.label}
      </text>
    </g>
  )
}
