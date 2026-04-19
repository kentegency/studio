import { useState, useCallback, useEffect, useRef } from 'react'
import { useNodeStore, useUIStore, useProjectStore } from '../../stores'
import { getVocab } from '../../lib/vocabulary'
import Node from './Node'
import EmptyState from '../EmptyState'
import '../EmptyState.css'
import './Timeline.css'

const ACTS_DEMO = [
  { x:8,   width:268, fill:'rgba(74,158,158,0.045)', stroke:'rgba(74,158,158,0.11)',  label:'I — PAST',     labelFill:'rgba(74,158,158,0.60)',  labelX:12  },
  { x:284, width:302, fill:'rgba(212,170,106,0.042)', stroke:'rgba(212,170,106,0.1)',   label:'II — PRESENT', labelFill:'rgba(212,170,106,0.6)',   labelX:288 },
  { x:594, width:300, fill:'rgba(90,18,10,0.052)',   stroke:'rgba(120,38,22,0.1)',    label:'III — FUTURE', labelFill:'rgba(180,60,30,0.65)',   labelX:598 },
]

// Demo nodes — generic placeholder shown only when no real project is loaded
const DEMO_NODES = [
  { id:'cn0', cx:80,  cy:53, r:8,  fill:'#1A3028', label:'Scene 01', labelFill:'#3A7070', glow:false, status:'concept', act:'Zone I · 01',  name:'Scene 01', position:.08, emphasis:1.4, type:'scene' },
  { id:'cn1', cx:175, cy:53, r:5,  fill:'#1A3028', label:'Scene 02', labelFill:'#2A5050', glow:false, status:'concept', act:'Zone I · 02',  name:'Scene 02', position:.19, emphasis:1.0, type:'scene' },
  { id:'cn2', cx:270, cy:53, r:5,  fill:'#1A3028', label:'Scene 03', labelFill:'#2A5050', glow:false, status:'concept', act:'Zone I · 03',  name:'Scene 03', position:.30, emphasis:1.0, type:'scene' },
  { id:'cn3', cx:390, cy:53, r:10, fill:'#382808', label:'Scene 04', labelFill:'#A06020', glow:false, status:'concept', act:'Zone II · 01', name:'Scene 04', position:.43, emphasis:1.6, type:'scene' },
  { id:'cn4', cx:480, cy:53, r:5,  fill:'#382808', label:'Scene 05', labelFill:'#7A5030', glow:false, status:'concept', act:'Zone II · 02', name:'Scene 05', position:.53, emphasis:1.0, type:'scene' },
  { id:'cn5', cx:570, cy:53, r:6,  fill:'#382808', label:'Scene 06', labelFill:'#8A6030', glow:false, status:'concept', act:'Zone II · 03', name:'Scene 06', position:.63, emphasis:1.2, type:'scene' },
  { id:'cn6', cx:680, cy:53, r:5,  fill:'#281010', label:'Scene 07', labelFill:'#583030', glow:false, status:'concept', act:'Zone III · 01',name:'Scene 07', position:.75, emphasis:1.0, type:'scene' },
  { id:'cn7', cx:775, cy:53, r:8,  fill:'#281010', label:'Scene 08', labelFill:'#683030', glow:false, status:'concept', act:'Zone III · 02',name:'Scene 08', position:.86, emphasis:1.4, type:'scene' },
  { id:'cn8', cx:870, cy:53, r:5,  fill:'#281010', label:'Scene 09', labelFill:'#482828', glow:false, status:'concept', act:'Zone III · 03',name:'Scene 09', position:.97, emphasis:1.0, type:'scene' },
]

const STATUS_FILL  = {
  concept:  '#1C1C20',  /* cool-neutral, barely above surface */
  progress: '#D4AA6A',  /* accent-full */
  review:   '#A88040',  /* accent-full desaturated — in-between state */
  approved: '#4ADE80',
  locked:   '#4ADE80',
}
const STATUS_LABEL = { concept:'Concept', progress:'In Progress', review:'In Review', approved:'Approved', locked:'Locked' }
const ACT_COLORS   = {
  teal:   { fill:'rgba(74,158,158,0.045)',  stroke:'rgba(74,158,158,0.11)',  labelFill:'rgba(74,158,158,0.60)'  },
  orange: { fill:'rgba(212,170,106,0.042)',  stroke:'rgba(212,170,106,0.1)',   labelFill:'rgba(212,170,106,0.6)'   },
  red:    { fill:'rgba(90,18,10,0.052)',    stroke:'rgba(120,38,22,0.1)',    labelFill:'rgba(180,60,30,0.65)'   },
  purple: { fill:'rgba(139,92,246,0.042)', stroke:'rgba(139,92,246,0.12)',  labelFill:'rgba(139,92,246,0.65)'  },
  green:  { fill:'rgba(74,222,128,0.038)', stroke:'rgba(74,222,128,0.1)',   labelFill:'rgba(74,222,128,0.6)'   },
  blue:   { fill:'rgba(59,130,246,0.042)', stroke:'rgba(59,130,246,0.12)',  labelFill:'rgba(59,130,246,0.6)'   },
}

// ── SCENE MODE — status-led working inspector ─────────────────
function SceneMode({ node, allNodes, onClose, onSelectNode }) {
  const { updateNode, selectNode: storeSelect } = useNodeStore()
  const { showToast } = useUIStore()
  const { currentProject } = useProjectStore()

  const accent = STATUS_FILL[node.status] ?? '#3A3020'
  const sorted = [...allNodes].sort((a,b) => (a.position??0)-(b.position??0))
  const idx    = sorted.findIndex(n => n.id === node.id)
  const prev   = sorted[idx - 1]
  const next   = sorted[idx + 1]

  // Shot count for this node
  const [shotCount, setShotCount] = useState({ total: 0, done: 0 })
  useEffect(() => {
    if (node.id && !node.id.startsWith('cn')) {
      import('../../lib/supabase').then(({ supabase }) => {
        supabase.from('shots').select('status').eq('node_id', node.id)
          .then(({ data }) => {
            if (data) setShotCount({ total: data.length, done: data.filter(s => s.status === 'done').length })
          })
      })
    }
  }, [node.id])

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape')              onClose()
      if (e.key === 'ArrowRight' && next)  onSelectNode(next)
      if (e.key === 'ArrowLeft'  && prev)  onSelectNode(prev)
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
    showToast(`${node.name} → ${STATUS_LABEL[nextStatus]}`)
  }

  // Parse act path from node.act or node.type
  const actPath = node.act ?? `Scene ${idx + 1}`

  return (
    <div className="scene-mode" onClick={e => { if (e.target.classList.contains('scene-mode')) onClose() }}>
      <div className="sm-glow" style={{ background:`radial-gradient(ellipse, ${accent}12 0%, transparent 65%)` }} />

      {/* ── TOP BAR: back + arc navigation indicator ── */}
      <div className="sm-topbar">
        <button className="sm-back" onClick={onClose}>
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          Arc view
        </button>

        {/* Arc pip strip — position indicator in topbar */}
        <div className="sm-pip-strip">
          {sorted.map((n, i) => (
            <button key={n.id}
              className={`sm-arc-pip ${n.id === node.id ? 'active' : ''}`}
              style={{
                background: n.id === node.id
                  ? accent
                  : (n.status === 'approved' || n.status === 'locked')
                  ? '#4ADE8066'
                  : STATUS_FILL[n.status] ?? '#2A2520'
              }}
              onClick={() => onSelectNode(n)}
              title={n.name} />
          ))}
        </div>

        <div className="sm-scene-counter">
          {idx + 1} of {sorted.length}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="sm-body">

        {/* ── STATUS ZONE — leads, largest actionable element ── */}
        <div className="sm-status-zone">
          <div className="sm-status-left">
            <div className="sm-status-badge" style={{
              background: `${accent}14`,
              borderColor: `${accent}35`,
            }}>
              <div className="sm-status-dot" style={{ background: accent }} />
              <span className="sm-status-label" style={{ color: accent }}>
                {STATUS_LABEL[node.status ?? 'concept']}
              </span>
            </div>
            <button className="sm-advance" onClick={cycleStatus} title="Advance to next status">
              ↻ advance
            </button>
          </div>

          {/* Shot progress — right side of status zone */}
          {shotCount.total > 0 && (
            <div className="sm-shot-progress">
              <span className="sm-shot-label">{shotCount.done}/{shotCount.total} shots</span>
              <div className="sm-shot-bar">
                <div className="sm-shot-fill"
                  style={{ width:`${Math.round((shotCount.done/shotCount.total)*100)}%`, background: accent }} />
              </div>
            </div>
          )}
        </div>

        {/* ── SCENE IDENTITY — present but not dominant ── */}
        <div className="sm-identity">
          <div className="sm-scene-name">{node.name}</div>
          <div className="sm-act-path">{actPath}</div>
          {node.description && (
            <div className="sm-scene-desc">{node.description}</div>
          )}
        </div>

        {/* ── ARC MINI-VIZ — spatial context ── */}
        <div className="sm-arc-viz">
          {sorted.map((n, i) => (
            <button key={n.id}
              className={`sm-arc-scene ${n.id === node.id ? 'active' : ''}`}
              onClick={() => onSelectNode(n)}
              title={n.name}>
              <div className="sm-arc-scene-dot"
                style={{ background: n.id === node.id ? accent : STATUS_FILL[n.status] ?? '#1E1C14' }} />
              <div className="sm-arc-scene-name"
                style={{ color: n.id === node.id ? accent : '#3A3530' }}>
                {(n.name ?? '').slice(0, 7)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── BOTTOM NAV — prev / keyboard hint / next ── */}
      <div className="sm-bottombar">
        <button className={`sm-nav-btn ${!prev ? 'hidden' : ''}`}
          onClick={() => prev && onSelectNode(prev)} disabled={!prev}>
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          {prev?.name}
        </button>
        <div className="sm-kb">← → navigate · Esc back</div>
        <button className={`sm-nav-btn right ${!next ? 'hidden' : ''}`}
          onClick={() => next && onSelectNode(next)} disabled={!next}>
          {next?.name}
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  )
}
export default function Timeline() {
  const { selectedNode, selectNode, nodes, createNode, updateNode } = useNodeStore()
  const { currentProject, acts } = useProjectStore()
  const { setMinimapPos, showToast, openOverlay } = useUIStore()
  const vocab = getVocab(currentProject?.type)

  const [showNewNode, setShowNewNode] = useState(false)
  const [newNodeName, setNewNodeName] = useState('')
  const [newNodePos,  setNewNodePos]  = useState(0.5)
  const [newNodeType, setNewNodeType] = useState('scene')
  const [creating,    setCreating]    = useState(false)
  const [sceneMode,   setSceneMode]   = useState(false)
  const [listView,    setListView]    = useState(false)
  const [zoom,        setZoom]        = useState(1)
  const [ctxMenu,     setCtxMenu]     = useState(null) // { x, y, node }

  // ── ZOOM via SVG viewBox — proportional, no clipping, labels stay readable ──
  // viewBox width = 900 / zoom → zooming in narrows the visible coordinate range
  // panOffset shifts which part of the 900px arc is visible
  const [panOffset, setPanOffset] = useState(0)

  // When zoom changes, clamp pan so we don't go out of bounds
  const visibleWidth = 900 / zoom
  const maxPan = Math.max(0, 900 - visibleWidth)
  const clampedPan = Math.min(panOffset, maxPan)
  const [dragging,     setDragging]     = useState(null)  // { node, startPos }
  const [dragPos,      setDragPos]      = useState(null)  // 0–1 live position
  const [dragCx,       setDragCx]       = useState(null)  // live SVG x
  const svgRef = useRef(null)

  const hasRealNodes = currentProject && nodes.length > 0

  const displayNodes = hasRealNodes
    ? nodes.map(n => ({
        id:       n.id,
        cx:       Math.max(20, Math.min(880, (n.position ?? 0) * 900)),
        cy:       53,
        r:        Math.max(5, Math.min(14, (n.emphasis ?? 1) * 7)),
        fill:     STATUS_FILL[n.status] ?? '#3A3020',
        label:    (n.name ?? '').slice(0, 12),
        labelFill: n.status === 'approved' || n.status === 'locked'
          ? 'rgba(74,222,128,0.55)'
          : n.status === 'review' || n.status === 'progress'
          ? 'rgba(212,170,106,0.5)'
          : '#4A4840',
        glow:     n.status === 'progress' || n.status === 'review',
        glowFill: 'rgba(212,170,106,0.12)',
        status:   n.status,
        act:      n.act ?? n.name,
        name:     n.name,
        position: n.position,
        emphasis: n.emphasis,
        type:     n.type,
        description: n.description,
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

  // ── DRAG HANDLERS ─────────────────────────────────────────
  // Convert clientX to SVG position (0–1), accounting for zoom transform
  const clientXToSVGPos = useCallback((clientX) => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    // Map clientX to SVG coordinate space accounting for viewBox pan + zoom
    const normalised = (clientX - rect.left) / rect.width  // 0–1
    const svgX = clampedPan + normalised * (900 / zoom)
    return Math.max(0.01, Math.min(0.99, svgX / 900))
  }, [zoom, clampedPan])

  const startDrag = useCallback((e, node) => {
    if (!node.id || node.id.startsWith('cn')) return  // demo nodes not draggable
    e.preventDefault()
    e.stopPropagation()
    setDragging(node)
    setDragPos(node.position ?? 0)
    setDragCx(node.cx)
  }, [])

  useEffect(() => {
    if (!dragging) return

    const onMove = (e) => {
      const pos = clientXToSVGPos(e.clientX)
      if (pos === null) return
      setDragPos(pos)
      setDragCx(Math.max(20, Math.min(880, pos * 900)))
    }

    const onUp = async (e) => {
      const pos = clientXToSVGPos(e.clientX)
      if (pos !== null && dragging.id) {
        const prevPos = dragging.position ?? 0
        const newPos  = parseFloat(pos.toFixed(4))

        // Optimistic update in store
        const updated = { ...dragging._raw ?? dragging, position: newPos }
        selectNode(updated)

        // Write to DB
        await updateNode(dragging.id, { position: newPos })

        // Undo
        const { undoStack } = await import('../../lib/undo')
        undoStack.push({
          label: `Move "${dragging.name}"`,
          undo: async () => {
            await updateNode(dragging.id, { position: prevPos })
            selectNode({ ...(dragging._raw ?? dragging), position: prevPos })
            showToast(`"${dragging.name}" moved back`)
          }
        })

        showToast(`"${dragging.name}" repositioned`)
      }
      setDragging(null)
      setDragPos(null)
      setDragCx(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [dragging, clientXToSVGPos, updateNode, selectNode, showToast])

  const handleNodeClick = (node) => {
    if (dragging) return   // ignore click events that end a drag
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
      const active = document.activeElement
      const inInput = active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable
      if (inInput) return
      if (e.key === 'z') setZoom(z => Math.min(z + 0.3, 2.5))
      if (e.key === 'x') setZoom(z => Math.max(z - 0.3, 0.5))
      if (e.key === 'f') { setZoom(1); setPanOffset(0) }
      if (e.key === 'l' || e.key === 'L') setListView(v => !v)
      // S — advance status on selected node (not while dragging)
      if (e.key === 's' && selectedNode?.id && !selectedNode.id.startsWith('cn') && !dragging) {
        const { updateNode, selectNode: storeSelect } = useNodeStore.getState()
        const statuses = ['concept','progress','review','approved','locked']
        const curr = selectedNode.status ?? 'concept'
        const next = statuses[(statuses.indexOf(curr) + 1) % statuses.length]
        updateNode(selectedNode.id, { status: next }).then(() => {
          storeSelect({ ...selectedNode, status: next })
          useUIStore.getState().showToast(`${selectedNode.name} → ${next}`)
        })
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [sceneMode, selectedNode])

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

  const duplicateScene = async (node) => {
    if (!currentProject) return
    const newPos = Math.min(1, (node.position ?? 0.5) + 0.04)
    const { error } = await createNode({
      project_id: currentProject.id,
      name:       `${node.name} (copy)`,
      type:       node.type ?? 'scene',
      position:   newPos,
      emphasis:   node.emphasis ?? 1,
      status:     'concept',
      act_id:     node.act_id ?? null,
    })
    if (!error) showToast(`Duplicated "${node.name}".`)
    else showToast('Could not duplicate scene.', '#E05050')
    setCtxMenu(null)
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
              {(currentProject.logline || currentProject.brief_answers?.['Film-0'] || currentProject.brief_answers?.['Brand-0'] || currentProject.brief_answers?.['Deck-0']) && (
                <div className="tl-proj-logline">
                  {currentProject.logline
                    || currentProject.brief_answers?.['Film-0']
                    || currentProject.brief_answers?.['Brand-0']
                    || currentProject.brief_answers?.['Deck-0']
                    || currentProject.brief_answers?.['Music-0']
                    || currentProject.brief_answers?.['Website-0']
                    || currentProject.brief_answers?.['Campaign-0']}
                </div>
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
                const COLORS = ['var(--teal)','var(--accent)','#B43C1E']
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
              <button className="tl-zoom-btn tl-fit-btn" onClick={() => { setZoom(1); setPanOffset(0) }} title="Fit to arc (F)">
                <svg viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
              </button>
            </div>
            {/* List / Arc view toggle */}
            <button className={`tl-view-toggle ${listView ? 'on' : ''}`}
              onClick={() => setListView(v => !v)}
              title={listView ? 'Arc view (L)' : 'List view (L)'}>
              {listView ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10z"/>
                  <path d="M12 8v4l3 3"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              )}
            </button>
            {currentProject && (
              <button className="add-node-btn" onClick={() => setShowNewNode(s => !s)}>
                + {vocab.nodeVerb ?? 'Add scene'}
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
              placeholder={vocab.nodeHint ?? "Scene name"}
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

      {/* ── MIDDLE ZONE — arc or list view ── */}
      <div className="tl-arc-zone">

        {/* LIST VIEW — toggled with L key */}
        {listView && currentProject && (
          <div className="tl-list-view">
            <div className="tlv-head">
              <span className="tlv-col tlv-col-name">Scene</span>
              <span className="tlv-col tlv-col-status">Status</span>
              <span className="tlv-col tlv-col-shots">Shots</span>
              <span className="tlv-col tlv-col-pos">Position</span>
            </div>
            {[...displayNodes]
              .sort((a,b) => (a.position??0) - (b.position??0))
              .map((node, i) => {
                const STATUS_C = { concept:'var(--ghost)', progress:'var(--accent)', review:'#A88040', approved:'var(--green)', locked:'var(--green)' }
                const isSelected = selectedNode?.id === node.id
                return (
                  <div key={node.id}
                    className={`tlv-row ${isSelected ? 'on' : ''}`}
                    onClick={() => onSelectNode(node)}>
                    <span className="tlv-col tlv-col-name">
                      <span className="tlv-idx">{String(i+1).padStart(2,'0')}</span>
                      {node.name}
                    </span>
                    <span className="tlv-col tlv-col-status">
                      <span className="tlv-dot" style={{ background: STATUS_C[node.status] ?? 'var(--ghost)' }} />
                      {node.status}
                    </span>
                    <span className="tlv-col tlv-col-shots" style={{ color:'var(--ghost)', fontFamily:'var(--font-mono)', fontSize:'11px' }}>
                      —
                    </span>
                    <span className="tlv-col tlv-col-pos" style={{ color:'var(--ghost)', fontFamily:'var(--font-mono)', fontSize:'11px' }}>
                      {Math.round((node.position??0)*100)}%
                    </span>
                  </div>
                )
              })}
            {!hasRealNodes && (
              <div className="tlv-empty">No {vocab.nodes.toLowerCase()} yet — add one from the arc view</div>
            )}
          </div>
        )}
        {/* Empty state — only when not in list view */}
        {!listView && currentProject && !hasRealNodes && !showNewNode && (
          <div className="tl-empty-state">
            <EmptyState
              icon={<svg viewBox="0 0 24 24" style={{width:'16px',height:'16px',stroke:'currentColor',fill:'none',strokeWidth:'1.5'}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
              title={`No ${vocab.nodes.toLowerCase()} yet`}
              body={`Add your first ${vocab.node.toLowerCase()} to begin building your arc.`}
              action={`${vocab.nodeVerb} →`}
              onAction={() => setShowNewNode(true)} />
          </div>
        )}

        {/* SVG arc — hidden when list view is active */}
        <div className="timeline-svg-wrap"
          style={{ display: listView ? 'none' : undefined }}
          onWheel={e => {
            if (e.ctrlKey || e.metaKey) {
              // Ctrl/Cmd + wheel = zoom
              e.preventDefault()
              const delta = e.deltaY > 0 ? -0.2 : 0.2
              setZoom(z => Math.max(0.5, Math.min(2.5, z + delta)))
            } else {
              // Regular wheel = pan horizontally
              e.preventDefault()
              const newVW = 900 / zoom
              const maxP = Math.max(0, 900 - newVW)
              setPanOffset(p => Math.max(0, Math.min(maxP, p + e.deltaX * 0.5)))
            }
          }}>
          <svg id="csvg" className="timeline-svg"
            ref={svgRef}
            viewBox={`${clampedPan} 0 ${Math.round(900 / zoom)} 220`}
            style={{
              width:'100%', height:'100%', minHeight:'180px', maxHeight:'360px',
              cursor: dragging ? 'grabbing' : 'default',
              transition: dragging ? 'none' : 'all .25s var(--ease)',
            }}>
            {displayActs.map((act, i) => {
              // Compute completion for this act zone
              const actNodes = displayNodes.filter(n => {
                const nx = n.cx
                return nx >= act.x && nx <= (act.x + act.width)
              })
              const doneNodes = actNodes.filter(n =>
                n.status === 'approved' || n.status === 'locked'
              ).length
              const completion = actNodes.length > 0 ? doneNodes / actNodes.length : 0
              const progressW  = act.width * completion

              // Parse act label into number + name
              // Supports "Act I — Name", "I — Name", "I · Name", "Name" formats
              const labelStr = act.label ?? ''
              const romanMatch = labelStr.match(/^(I{1,3}V?|VI{0,3}|IV|IX)\s*[·—\-]\s*(.*)/)
              const actNum  = romanMatch ? romanMatch[1] : String(i + 1)
              const actName = romanMatch ? romanMatch[2] : labelStr

              // Truncate name to fit zone width (approx 7px per char at 10px font)
              const maxChars = Math.max(3, Math.floor((act.width - 20) / 7))
              const displayName = actName.length > maxChars
                ? actName.slice(0, maxChars - 1) + '…'
                : actName

              return (
                <g key={i}>
                  {/* Zone background */}
                  <rect x={act.x} y={28} width={act.width} height={120} rx={3}
                    fill={act.fill} stroke={act.stroke} strokeWidth={0.5}/>

                  {/* Completion progress — thin fill on bottom edge */}
                  {completion > 0 && (
                    <rect
                      x={act.x} y={145} width={progressW} height={3} rx={1.5}
                      fill={act.labelFill} opacity={0.55}
                    />
                  )}

                  {/* Act number — small mono, top-left inside zone */}
                  <text
                    x={act.x + 8} y={44}
                    fill={act.labelFill} opacity={0.9}
                    fontSize={9} fontFamily="IBM Plex Mono"
                    letterSpacing={1.5} fontWeight={500}>
                    {actNum}
                  </text>

                  {/* Act name — below number, truncated */}
                  {displayName && (
                    <text
                      x={act.x + 8} y={56}
                      fill={act.labelFill} opacity={0.6}
                      fontSize={9} fontFamily="IBM Plex Mono"
                      letterSpacing={0.5}>
                      {displayName}
                    </text>
                  )}
                </g>
              )
            })}
            <line x1={0} y1={88} x2={900} y2={88} stroke="rgba(255,255,255,0.04)" strokeWidth={1}/>

            {/* Drag guide — vertical snap line */}
            {dragging && dragCx !== null && (
              <>
                <line
                  x1={dragCx} y1={28} x2={dragCx} y2={148}
                  stroke="rgba(212,170,106,0.35)" strokeWidth={1}
                  strokeDasharray="3 3" />
                <text
                  x={dragCx} y={170}
                  textAnchor="middle" fontSize={9}
                  fontFamily="IBM Plex Mono" fill="rgba(212,170,106,0.6)">
                  {Math.round((dragPos ?? 0) * 100)}%
                </text>
              </>
            )}

            {displayNodes.map((node) => {
              const isDragged = dragging?.id === node.id
              const displayNode = isDragged
                ? { ...node, cx: dragCx ?? node.cx }
                : node
              return (
                <g key={node.id}
                  onMouseDown={(e) => {
                    // Hold 150ms before starting drag to distinguish click from drag
                    const t = setTimeout(() => startDrag(e, node), 150)
                    const cancel = () => clearTimeout(t)
                    window.addEventListener('mouseup', cancel, { once: true })
                    window.addEventListener('mousemove', cancel, { once: true })
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    if (!node.id?.startsWith('cn')) {
                      setCtxMenu({ x: e.clientX, y: e.clientY, node })
                    }
                  }}
                  style={{ cursor: node.id?.startsWith('cn') ? 'pointer' : 'grab' }}>
                  <Node
                    node={{ ...displayNode, cy: 88 }}
                    selected={selectedNode?.id === node.id}
                    onClick={() => !isDragged && handleNodeClick(node)}
                    isDragging={isDragged} />
                </g>
              )
            })}
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
          <span>L list view</span><span>·</span>
          <span>1–5 panel tabs</span><span>·</span>
          <span>right-click scene to duplicate</span>
        </div>
      )}

      {/* CONTEXT MENU — right-click on arc node */}
      {ctxMenu && (
        <>
          {/* Click-away backdrop */}
          <div
            style={{ position:'fixed', inset:0, zIndex:4999 }}
            onClick={() => setCtxMenu(null)} />
          <div className="arc-ctx-menu"
            style={{ top: ctxMenu.y, left: ctxMenu.x }}>
            <div className="acm-scene-name">{ctxMenu.node?.name}</div>
            <button className="acm-item" onClick={() => duplicateScene(ctxMenu.node)}>
              <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Duplicate scene
            </button>
            <button className="acm-item" onClick={() => {
              selectNode(ctxMenu.node)
              setCtxMenu(null)
              openOverlay('sketch')
            }}>
              <svg viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>
              Sketch this scene
            </button>
            <button className="acm-item" onClick={() => {
              selectNode(ctxMenu.node)
              setCtxMenu(null)
              openOverlay('storyboard')
            }}>
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Storyboard this scene
            </button>
          </div>
        </>
      )}
    </div>
  )
}
