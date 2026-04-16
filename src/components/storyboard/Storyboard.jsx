import { useState, useEffect, useRef, useCallback } from 'react'
import { useUIStore, useNodeStore, useProjectStore } from '../../stores'
import { supabase } from '../../lib/supabase'
import './Storyboard.css'

// ── DRAWING TOOLS ─────────────────────────────────────────────
const TOOLS = [
  { key:'pen',    label:'Pen',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><circle cx="11" cy="11" r="2" fill="none"/></svg> },
  { key:'marker', label:'Marker',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { key:'eraser', label:'Eraser',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 20H7L3 16l10-10 7 7-3.5 3.5"/></svg> },
]
const COLORS  = ['var(--accent)','var(--teal)','#F4EFD8','#4ADE80','#E05050','#8B5CF6','#A09890']
const LAYOUTS = [
  { panels:4,  label:'4',  cols:2 },
  { panels:6,  label:'6',  cols:3 },
  { panels:9,  label:'9',  cols:3 },
]

// ── PANEL CANVAS ──────────────────────────────────────────────
function PanelCanvas({ panelIdx, active, onActivate, tool, color, canvasRefs, hasContent }) {
  const ref = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const ctxRef = useRef(null)

  // Register ref globally so parent can read canvas data
  useEffect(() => {
    canvasRefs.current[panelIdx] = ref.current
  }, [panelIdx])

  // Init canvas background
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    canvas.width  = rect.width  || 320
    canvas.height = rect.height || 240
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#040402'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctxRef.current = ctx
  }, [])

  // Resize handler
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      const ctx = ctxRef.current
      if (!ctx) return
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      ctx.fillStyle = '#040402'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.putImageData(imgData, 0, 0)
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  const startDraw = (e) => {
    if (!active) { onActivate(); return }
    setDrawing(true)
    const ctx = ctxRef.current
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
  }

  const draw = (e) => {
    if (!drawing || !active || !ctxRef.current) return
    const ctx = ctxRef.current
    if (tool === 'eraser') {
      const x = e.nativeEvent.offsetX, y = e.nativeEvent.offsetY
      ctx.clearRect(x - 14, y - 14, 28, 28)
      ctx.fillStyle = '#040402'
      ctx.fillRect(x - 14, y - 14, 28, 28)
      return
    }
    ctx.lineWidth   = tool === 'marker' ? 10 : 2
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.globalAlpha = tool === 'marker' ? 0.35 : 1
    ctx.strokeStyle = color
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
  }

  const stopDraw = () => setDrawing(false)

  const clearPanel = (e) => {
    e.stopPropagation()
    const canvas = ref.current
    const ctx = ctxRef.current
    if (!ctx || !canvas) return
    ctx.fillStyle = '#040402'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <div className={`sb-panel ${active ? 'active' : ''}`} onClick={!active ? onActivate : undefined}>
      <div className="sb-panel-num">
        {String(panelIdx + 1).padStart(2, '0')}
      </div>
      {active && (
        <button className="sb-panel-clear" onClick={clearPanel} title="Clear panel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      )}
      <canvas
        ref={ref}
        className="sb-canvas"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        style={{ cursor: active ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'pointer' }} />
    </div>
  )
}

// ── MAIN STORYBOARD ───────────────────────────────────────────
export default function Storyboard({ onClose }) {
  const { selectedNode }    = useNodeStore()
  const { currentProject }  = useProjectStore()
  const { showToast }       = useUIStore()

  const [layout,      setLayout]      = useState(LAYOUTS[0])   // 4 panels default
  const [activePanel, setActivePanel] = useState(0)
  const [tool,        setTool]        = useState('pen')
  const [color,       setColor]       = useState('var(--accent)')
  const [saving,      setSaving]      = useState(false)
  const [saveProgress,setSaveProgress]= useState('')

  const canvasRefs = useRef([])

  // Reset active panel when layout changes
  useEffect(() => {
    setActivePanel(0)
    canvasRefs.current = []
  }, [layout.panels])

  // Keyboard shortcuts within storyboard
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Tab') {
        e.preventDefault()
        setActivePanel(p => (p + 1) % layout.panels)
      }
      if (e.key === 'ArrowRight') setActivePanel(p => Math.min(p + 1, layout.panels - 1))
      if (e.key === 'ArrowLeft')  setActivePanel(p => Math.max(p - 1, 0))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [layout.panels, onClose])

  // Save all panels as PNG assets
  const saveAll = async () => {
    if (!selectedNode?.id || !currentProject?.id || selectedNode.id.startsWith('cn')) {
      showToast('Select a scene first to save the storyboard.', 'var(--accent)')
      return
    }
    setSaving(true)
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    let saved = 0

    for (let i = 0; i < layout.panels; i++) {
      const canvas = canvasRefs.current[i]
      if (!canvas) continue

      setSaveProgress(`Saving panel ${i + 1} of ${layout.panels}…`)

      try {
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 0.92))
        if (!blob) continue

        const filename = `storyboard-${timestamp}-panel-${String(i + 1).padStart(2, '0')}.png`
        const path     = `${currentProject.id}/${selectedNode.id}/${filename}`

        const { error: upErr } = await supabase.storage
          .from('assets').upload(path, blob, { contentType: 'image/png', upsert: false })

        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(path)
          await supabase.from('assets').insert({
            project_id: currentProject.id,
            node_id:    selectedNode.id,
            name:       filename,
            file_url:   publicUrl,
            file_path:  path,
            type:       'image',
            room:       'studio',
            size:       blob.size,
          })
          saved++
        }
      } catch (err) {
        console.error(`Panel ${i + 1} save error:`, err)
      }
    }

    setSaving(false)
    setSaveProgress('')

    if (saved > 0) {
      showToast(`${saved} storyboard panel${saved !== 1 ? 's' : ''} saved to "${selectedNode.name}"`, '#4ADE80')
      onClose()
    } else {
      showToast('Could not save panels — check storage permissions.', '#E05050')
    }
  }

  return (
    <div className="sb-overlay">

      {/* Top bar */}
      <div className="sb-topbar">
        <div className="sb-topbar-left">
          <button className="sb-back" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Arc view
          </button>
          <div className="sb-title">
            Storyboard
            {selectedNode && (
              <span className="sb-scene">
                <span className="sb-scene-dot" />
                {selectedNode.name}
              </span>
            )}
          </div>
        </div>

        <div className="sb-topbar-center">
          {/* Layout selector */}
          <div className="sb-layout-group">
            {LAYOUTS.map(l => (
              <button key={l.panels}
                className={`sb-layout-btn ${layout.panels === l.panels ? 'on' : ''}`}
                onClick={() => setLayout(l)}>
                {l.label}
              </button>
            ))}
          </div>

          {/* Drawing tools */}
          <div className="sb-tool-group">
            {TOOLS.map(t => (
              <button key={t.key}
                className={`sb-tool-btn ${tool === t.key ? 'on' : ''}`}
                onClick={() => setTool(t.key)}
                title={t.label}>
                {t.icon}
              </button>
            ))}
          </div>

          {/* Colour picker */}
          <div className="sb-color-group">
            {COLORS.map((c, i) => (
              <div key={i}
                className={`sb-color-dot ${color === c ? 'on' : ''}`}
                style={{ background: c }}
                onClick={() => { setColor(c); setTool('pen') }} />
            ))}
          </div>
        </div>

        <div className="sb-topbar-right">
          <div className="sb-nav-hint">Tab · next panel · ← → navigate</div>
          <button className="sb-save-btn"
            onClick={saveAll}
            disabled={saving || !selectedNode}>
            {saving ? saveProgress || 'Saving…' : `Save ${layout.panels} panels →`}
          </button>
          <button className="ov-discard-btn" onClick={onClose} title="Close without saving (Esc)">×</button>
        </div>
      </div>

      {/* Panel grid */}
      <div className="sb-grid-wrap">
        <div className={`sb-grid sb-grid-${layout.cols}`}>
          {Array.from({ length: layout.panels }, (_, i) => (
            <PanelCanvas
              key={`${layout.panels}-${i}`}
              panelIdx={i}
              active={activePanel === i}
              onActivate={() => setActivePanel(i)}
              tool={tool}
              color={color}
              canvasRefs={canvasRefs} />
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className="sb-statusbar">
        <span className="sb-status-panel">
          Panel {activePanel + 1} of {layout.panels} active
        </span>
        <span className="sb-status-hint">
          Click a panel to select · draw freely · Tab to advance
        </span>
        {!selectedNode && (
          <span className="sb-status-warn">
            ⚠ No scene selected — panels will not be saved
          </span>
        )}
      </div>
    </div>
  )
}
