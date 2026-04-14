import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const STATUS_RING = {
  concept:  { color:'#3A3020', glow: false },
  progress: { color:'#F5920C', glow: true  },
  review:   { color:'#C07010', glow: true  },
  approved: { color:'#4ADE80', glow: true  },
  locked:   { color:'#4ADE80', glow: false },
}

export default function Node({ node, selected, onClick }) {
  const [hovered,    setHovered]    = useState(false)
  const [shotData,   setShotData]   = useState(null) // { total, done }
  const [showTooltip,setShowTooltip]= useState(false)

  const isRealNode = node.id && !node.id.startsWith('cn')

  // Fetch shot counts for real nodes only
  useEffect(() => {
    if (!isRealNode) return
    let cancelled = false
    supabase
      .from('shots')
      .select('status', { count:'exact' })
      .eq('node_id', node.id)
      .then(({ data }) => {
        if (cancelled || !data) return
        const total = data.length
        const done  = data.filter(s => s.status === 'done').length
        setShotData({ total, done })
      })
    return () => { cancelled = true }
  }, [node.id])

  const status   = node.status ?? 'concept'
  const ring     = STATUS_RING[status] ?? STATUS_RING.concept
  const ringR    = node.r + 4
  const glowR    = node.r + 10
  const scale    = selected ? 1.35 : hovered ? 1.2 : 1
  const cx       = node.cx
  const cy       = node.cy

  // Completion arc — partial circle around node
  const completion = shotData?.total > 0
    ? shotData.done / shotData.total
    : null

  const arcPath = completion !== null ? describeArc(cx, cy, ringR + 2, 0, completion) : null

  // Hover delay for tooltip
  let hoverTimer
  const onEnter = () => {
    setHovered(true)
    hoverTimer = setTimeout(() => setShowTooltip(true), 400)
  }
  const onLeave = () => {
    setHovered(false)
    setShowTooltip(false)
    clearTimeout(hoverTimer)
  }

  return (
    <g
      className="node-group"
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ cursor:'pointer' }}
      data-hover>

      {/* Status glow — approved/progress/review only */}
      {(ring.glow || selected) && (
        <circle cx={cx} cy={cy} r={glowR}
          fill={`${ring.color}18`}
          style={{ animation:`grp ${selected ? '1.8s' : '3s'} ease-in-out infinite` }} />
      )}

      {/* Status ring */}
      <circle
        cx={cx} cy={cy} r={ringR}
        fill="none"
        stroke={selected ? ring.color : `${ring.color}55`}
        strokeWidth={selected ? 1.5 : 0.8}
        style={{ transition:'stroke .25s ease, stroke-width .25s ease' }} />

      {/* Completion arc — overlays the ring */}
      {arcPath && (
        <path
          d={arcPath}
          fill="none"
          stroke="#4ADE80"
          strokeWidth={2}
          strokeLinecap="round"
          style={{ transition:'d .4s ease' }} />
      )}

      {/* Main circle */}
      <circle
        cx={cx} cy={cy} r={node.r}
        fill={node.fill}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: `${cx}px ${cy}px`,
          transition: 'transform 0.2s cubic-bezier(.16,1,.3,1)',
        }} />

      {/* Shot count badge — shows inside node if shots exist */}
      {shotData?.total > 0 && (
        <text
          x={cx} y={cy + 1}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={node.r > 7 ? 8 : 6}
          fontFamily="IBM Plex Mono"
          fill={status === 'approved' || status === 'locked' ? '#040402' : 'rgba(255,255,255,0.7)'}
          style={{ pointerEvents:'none', fontWeight:500 }}>
          {shotData.done}/{shotData.total}
        </text>
      )}

      {/* Label — always visible below node */}
      <text
        x={cx} y={cy + node.r + 13}
        textAnchor="middle"
        fontSize={9}
        fontFamily="IBM Plex Mono"
        letterSpacing={0.8}
        fill={selected ? ring.color : node.labelFill}
        style={{ pointerEvents:'none', transition:'fill .25s ease' }}>
        {(node.label ?? '').length > 12
          ? (node.label ?? '').slice(0, 11) + '…'
          : (node.label ?? '')}
      </text>

      {/* Hover tooltip */}
      {showTooltip && (
        <Tooltip
          cx={cx} cy={cy}
          name={node.name ?? node.label}
          status={status}
          statusColor={ring.color}
          shotData={shotData} />
      )}
    </g>
  )
}

// Tooltip rendered inside SVG
function Tooltip({ cx, cy, name, status, statusColor, shotData }) {
  const W = 140
  const H = shotData ? 52 : 38
  const PAD = 8
  // Position above node, clamped to viewport
  const tx = Math.max(W/2 + 4, Math.min(896 - W/2, cx))
  const ty = cy - 28

  return (
    <g style={{ pointerEvents:'none' }}>
      {/* Background */}
      <rect
        x={tx - W/2} y={ty - H}
        width={W} height={H} rx={3}
        fill="#0C0B08" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
      {/* Arrow */}
      <polygon
        points={`${tx-5},${ty} ${tx+5},${ty} ${tx},${ty+6}`}
        fill="#0C0B08" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
      {/* Name */}
      <text
        x={tx} y={ty - H + PAD + 6}
        textAnchor="middle" fontSize={11}
        fontFamily="Inter, sans-serif" fontWeight={500}
        fill="#F4EFD8">
        {name.length > 18 ? name.slice(0, 16) + '…' : name}
      </text>
      {/* Status */}
      <text
        x={tx} y={ty - H + PAD + 20}
        textAnchor="middle" fontSize={9.5}
        fontFamily="IBM Plex Mono"
        letterSpacing={1}
        fill={statusColor}>
        {status.toUpperCase()}
      </text>
      {/* Shot count */}
      {shotData && (
        <text
          x={tx} y={ty - H + PAD + 36}
          textAnchor="middle" fontSize={9.5}
          fontFamily="IBM Plex Mono"
          fill="rgba(160,152,144,0.9)">
          {shotData.done}/{shotData.total} shots done
        </text>
      )}
    </g>
  )
}

// Describe partial arc path for completion ring
function describeArc(cx, cy, r, startAngle, fraction) {
  if (fraction <= 0) return ''
  if (fraction >= 1) {
    // Full circle — two arcs
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`
  }
  const start = polarToCartesian(cx, cy, r, -90)
  const end   = polarToCartesian(cx, cy, r, -90 + fraction * 360)
  const large = fraction > 0.5 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}
