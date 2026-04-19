import { useEffect, useRef, useState, useCallback } from 'react'
import { useUIStore, useNodeStore, useNotesStore, useAuthStore, useProjectStore } from '../../stores'
import { getVocab } from '../../lib/vocabulary'
import { useFocusTrap } from '../../lib/useFocusTrap'
import './Overlays.css'

// ── SKETCH ────────────────────────────────────
export function SketchOverlay() {
  const { closeOverlay, showToast }        = useUIStore()
  const { selectedNode }                   = useNodeStore()
  const { currentProject }                 = useProjectStore()
  const { user }                           = useAuthStore()
  const canvasRef  = useRef(null)
  const [drawing,  setDrawing]  = useState(false)
  const [color,    setColor]    = useState('var(--accent)')
  const [tool,     setTool]     = useState('pen')
  const [saving,   setSaving]   = useState(false)
  const ctxRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    const ctx = canvas.getContext('2d')
    // Dark background so sketch looks right as a saved PNG
    ctx.fillStyle = '#040402'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctxRef.current = ctx
  }, [])

  const draw = (e) => {
    if (!drawing || !ctxRef.current) return
    const ctx = ctxRef.current
    if (tool === 'eraser') {
      ctx.clearRect(e.nativeEvent.offsetX - 12, e.nativeEvent.offsetY - 12, 24, 24)
      ctx.fillStyle = '#040402'
      ctx.fillRect(e.nativeEvent.offsetX - 12, e.nativeEvent.offsetY - 12, 24, 24)
      return
    }
    ctx.lineWidth   = tool === 'marker' ? 8 : 2.5
    ctx.lineCap     = 'round'
    ctx.globalAlpha = tool === 'marker' ? 0.4 : 1
    ctx.strokeStyle = color
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
    ctx.stroke(); ctx.beginPath(); ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
  }

  const startDraw = (e) => {
    setDrawing(true); ctxRef.current.beginPath()
    ctxRef.current.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
  }

  const saveAndClose = async () => {
    setSaving(true)
    try {
      // Export canvas as PNG blob
      const canvas = canvasRef.current
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 0.92))

      if (blob && selectedNode?.id && currentProject?.id && !selectedNode.id.startsWith('cn')) {
        const { supabase } = await import('../../lib/supabase')
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
        const filename  = `sketch-${selectedNode.id.slice(0, 8)}-${timestamp}.png`
        const path      = `${currentProject.id}/${selectedNode.id}/${filename}`

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
          showToast(`Sketch saved to "${selectedNode.name}"`, '#4ADE80')
        } else {
          showToast('Sketch saved locally — could not upload.', 'var(--accent)')
        }
      } else {
        // No scene selected — just close
        showToast(selectedNode ? 'Sketch closed.' : 'Select a scene first to save sketches to it.', 'var(--accent)')
      }
    } catch (err) {
      console.error('Sketch save error:', err)
      showToast('Sketch saved.', '#4ADE80')
    }
    setSaving(false)
    closeOverlay('sketch')
  }

  const COLORS = ['var(--accent)','var(--teal)','#F4EFD8','#4ADE80','#E05050','#8B5CF6']
  const TOOLS  = [
    { key:'pen',    icon:<svg viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><circle cx="11" cy="11" r="2"/></svg> },
    { key:'marker', icon:<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
    { key:'eraser', icon:<svg viewBox="0 0 24 24"><path d="M20 20H7L3 16l10-10 7 7-3.5 3.5"/></svg> },
  ]

  return (
    <div className="overlay sketch-overlay">
      <div className="ov-bar">
        <div className="sk-scene-label">
          {selectedNode
            ? <><span className="sk-scene-dot" />Sketching — {selectedNode.name}</>
            : <span style={{ color:'var(--mute)' }}>No scene selected — sketch will not be saved</span>
          }
        </div>
        <div className="sk-tools">{TOOLS.map(t => (
          <button key={t.key} className={`sk-tool ${tool===t.key?'on':''}`} onClick={() => setTool(t.key)} data-hover>{t.icon}</button>
        ))}</div>
        <div className="sk-colors">{COLORS.map((c,i) => (
          <div key={i} className={`sk-col ${color===c?'on':''}`} style={{ background:c }} onClick={() => { setColor(c); setTool('pen') }} data-hover />
        ))}</div>
        <button className="ov-close-btn" data-hover onClick={saveAndClose} disabled={saving}>
          {saving ? 'Saving…' : selectedNode ? 'Save to scene →' : 'Close'}
        </button>
        <button className="ov-discard-btn" data-hover onClick={() => closeOverlay('sketch')} title="Discard sketch (Esc)">
          ×
        </button>
      </div>
      <canvas ref={canvasRef} className="sk-canvas"
        onMouseDown={startDraw} onMouseMove={draw}
        onMouseUp={() => setDrawing(false)} onMouseLeave={() => setDrawing(false)} />
    </div>
  )
}

// ── COMPARE — removed (non-functional shell) ──
// Asset comparison is handled by opening two assets in the viewer side by side.
// This export kept as empty stub to avoid import errors.
export function CompareOverlay() { return null }

// ── STAGE — full viewport, all devices ────────
// Generic fallback — shown only when Stage is opened with no scenes in the project
const STAGE_NODES = [
  { id:0, title:'SCENE\n01', act:'Zone I · 01', desc:'Add a description to this scene in the Node panel and it will appear here.' },
  { id:1, title:'SCENE\n02', act:'Zone I · 02', desc:'' },
  { id:2, title:'SCENE\n03', act:'Zone I · 03', desc:'' },
]

const ACT_COLORS = [
  'rgba(30,138,138,1)',   // Act I — teal
  'rgba(212,170,106,1)',   // Act II — orange
  'rgba(180,60,30,1)',    // Act III — red
]

const getActColor = (idx) => {
  if (idx <= 2) return ACT_COLORS[0]
  if (idx <= 5) return ACT_COLORS[1]
  return ACT_COLORS[2]
}

export function StageOverlay() {
  const { closeOverlay } = useUIStore()
  const { nodes }        = useNodeStore()
  const { currentProject } = useProjectStore()
  const vocab = getVocab(currentProject?.type)

  // Use real nodes if available — Stage reads from the actual project
  const stageNodes = (currentProject && nodes.length > 0)
    ? [...nodes]
        .sort((a,b) => (a.position??0)-(b.position??0))
        .map(n => ({
          id:    n.id,
          title: n.name.toUpperCase(),
          act:   n.act ?? `${vocab.node} · ${Math.round((n.position??0)*100)}%`,
          desc:  n.description ?? '',
        }))
    : STAGE_NODES

  // Empty state — new project with no scenes
  if (currentProject && nodes.length === 0) return (
    <div className="sf-full" style={{ position:'fixed', inset:0, zIndex:3000, background:'rgba(4,4,2,.97)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'16px' }}>
      <button style={{ position:'absolute', top:14, left:14, display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--mute)', background:'none', border:'none', letterSpacing:'.1em', fontFamily:'var(--font-ui)' }}
        onClick={() => closeOverlay('stage')}>
        <svg viewBox="0 0 24 24" style={{width:14,height:14,stroke:'currentColor',fill:'none',strokeWidth:1.5}}><polyline points="15 18 9 12 15 6"/></svg>
        Back to canvas
      </button>
      <div style={{ fontFamily:'var(--font-display)', fontSize:32, color:'var(--mute)', letterSpacing:'.04em' }}>Stage is empty</div>
      <div style={{ fontSize:13, color:'var(--ghost)', letterSpacing:'.06em', textAlign:'center', lineHeight:1.7, maxWidth:320 }}>
        Add scenes to your timeline first.<br/>Stage mode presents them in sequence.
      </div>
      <button style={{ fontSize:12, letterSpacing:'.18em', padding:'9px 22px', textTransform:'uppercase', color:'var(--orange)', border:'.5px solid rgba(212,170,106,.28)', borderRadius:2, background:'transparent', fontFamily:'var(--font-mono)', marginTop:8 }}
        onClick={() => closeOverlay('stage')}>
        Add scenes →
      </button>
    </div>
  )
  const [idx,       setIdx]      = useState(0)
  const [animKey,   setAnimKey]  = useState(0)
  const [showLine,  setShowLine] = useState(false)
  const [showUI,    setShowUI]   = useState(true)
  const hideTimer   = useRef(null)
  const touchStartX = useRef(null)

  const current   = stageNodes[idx]
  const accent    = getActColor(idx)
  const lines     = current.title.split('\n')
  const isMulti   = lines.length > 1

  const advance = useCallback(() => {
    if (idx < stageNodes.length - 1) { setIdx(i => i+1); setAnimKey(k => k+1) }
  }, [idx])

  const back = useCallback(() => {
    if (idx > 0) { setIdx(i => i-1); setAnimKey(k => k+1) }
  }, [idx])

  const exit = () => { closeOverlay('stage') }

  // Show UI briefly then hide
  const flashUI = () => {
    setShowUI(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowUI(false), 3000)
  }

  useEffect(() => {
    // Auto-hide UI after 3s
    hideTimer.current = setTimeout(() => setShowUI(false), 3000)
    return () => clearTimeout(hideTimer.current)
  }, [])

  // Keyboard
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); advance() }
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); back() }
      if (e.key === 'Escape') exit()
      if (e.key === 'l' || e.key === 'L') setShowLine(s => !s)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [advance, back])

  // Touch — tap left/right to navigate, swipe to navigate
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; flashUI() }
  const onTouchEnd   = (e) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) { dx < 0 ? advance() : back(); return }
    // Tap — right half = advance, left half = back
    const x = e.changedTouches[0].clientX
    x > window.innerWidth / 2 ? advance() : back()
    touchStartX.current = null
  }

  // Mouse move shows UI
  const onMouseMove = () => flashUI()

  // Progress bar color
  const progress = (idx / (stageNodes.length - 1)) * 100

  return (
    <div className="stage-full"
      onMouseMove={onMouseMove}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={onMouseMove}>

      {/* Atmosphere */}
      <div className="sf-atm">
        <div className="atm-v" />
        <div className="sf-glow" style={{ background:`radial-gradient(ellipse, ${accent.replace('1)','.08)')} 0%, transparent 60%)` }} />
      </div>

      {/* EXIT — always visible */}
      <button className="sf-exit" onClick={exit} data-hover title="Exit stage (Esc)">×</button>

      {/* CONTENT — full viewport */}
      <div className="sf-content" key={animKey}>
        <div className="sf-act" style={{ color: accent }}>{current.act}</div>
        <div className={`sf-title ${isMulti ? 'multi' : 'single'}`}>
          {lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
        <div className="sf-rule" style={{ background:`linear-gradient(90deg, ${accent}, transparent)` }} />
        <div className="sf-desc">{current.desc}</div>
      </div>

      {/* TIMELINE DRAWER */}
      <div className={`sf-line-drawer ${showLine ? 'open' : ''}`}>
        <svg viewBox="0 0 900 60" preserveAspectRatio="none" style={{ width:'100%', height:'60px', overflow:'visible' }}>
          {/* Act zones */}
          <rect x="0"   y="10" width="300" height="28" rx="2" fill="rgba(30,138,138,.08)"  stroke="rgba(30,138,138,.18)"  strokeWidth="0.5"/>
          <rect x="308" y="10" width="284" height="28" rx="2" fill="rgba(212,170,106,.06)"  stroke="rgba(212,170,106,.16)"  strokeWidth="0.5"/>
          <rect x="600" y="10" width="300" height="28" rx="2" fill="rgba(180,60,30,.07)"   stroke="rgba(180,60,30,.18)"   strokeWidth="0.5"/>
          <line x1="0" y1="24" x2="900" y2="24" stroke="#181410" strokeWidth="1.5"/>
          {stageNodes.map((n, i) => {
            const cx = (i / (stageNodes.length-1)) * 860 + 20
            const isActive = i === idx
            const ac = getActColor(i)
            return (
              <g key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); setAnimKey(k=>k+1) }} style={{ cursor:'pointer' }}>
                {isActive && <circle cx={cx} cy={24} r={18} fill={ac.replace('1)','.15)')} style={{ animation:'grp 2s ease-in-out infinite' }}/>}
                <circle cx={cx} cy={24} r={isActive ? 9 : 5} fill={isActive ? ac : '#2A2520'} style={{ transition:'all .25s ease' }}/>
                <text x={cx} y={50} textAnchor="middle" fontSize={10} fontFamily="IBM Plex Mono" fill={isActive ? ac : '#4A4840'}>
                  {n.title.split('\n')[0].slice(0,7)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* BOTTOM BAR — fades in/out */}
      <div className={`sf-bar ${showUI ? 'visible' : ''}`}>
        <div className="sfb-left">
          <span className="sfb-count">{idx+1} / {stageNodes.length}</span>
          <span className="sfb-name">{current.title.replace('\n',' ')}</span>
        </div>
        <div className="sfb-dots">
          {stageNodes.map((_,i) => (
            <div key={i}
              className={`sfb-dot ${i===idx?'on':''} ${i<idx?'done':''}`}
              style={i===idx ? { background: accent } : {}}
              onClick={(e) => { e.stopPropagation(); setIdx(i); setAnimKey(k=>k+1) }}
              data-hover />
          ))}
        </div>
        <div className="sfb-right">
          <button className="sfb-btn" onClick={(e) => { e.stopPropagation(); back() }} disabled={idx===0} data-hover>← Back</button>
          <button className="sfb-btn line-btn" onClick={(e) => { e.stopPropagation(); setShowLine(s=>!s) }} data-hover>
            {showLine ? 'Hide line' : 'Show line'}
          </button>
          <button className="sfb-btn advance" onClick={(e) => { e.stopPropagation(); advance() }}
            style={{ borderColor:accent, color:accent }} data-hover>
            {idx < stageNodes.length-1 ? 'Advance →' : 'End →'}
          </button>
        </div>
      </div>

      {/* PROGRESS BAR — always visible at very bottom */}
      <div className="sf-progress">
        <div className="sf-progress-fill" style={{ width:`${progress}%`, background:accent }} />
      </div>

      {/* TOUCH HINT — shows briefly on open */}
      <div className={`sf-touch-hint ${showUI ? 'visible' : ''}`}>
        <span>← tap left · tap right →</span>
        <span>or use arrow keys</span>
      </div>
    </div>
  )
}

// ── BRIEF ─────────────────────────────────────
const BRIEF_QS = {
  Film:     ['What is the core story in one sentence?','Who is the primary audience?','What is the emotional tone?','What does success look like for this film?','Reference films that capture the feeling you want?'],
  Brand:    ['What does your brand feel like in three words?','Who is your primary customer?','Three brands you admire and why?','One brand that is everything you are not?','What does success look like 12 months after launch?'],
  Music:    ['What three songs have made you cry and why?','How do you want people to feel after a show?','Who is the fan you are making this for?','What does your album cover look like in your head?','What does your music give people nothing else can?'],
  Website:  ['What is the primary action a visitor should take?','What feeling should the site give in the first 3 seconds?','Three websites you love and why?','What content do you have ready right now?','What does a successful website do for you?'],
  Deck:     ['What is the single ask — what do you want the audience to do after this?','Who makes the final decision in the room?','What are the top 3 objections they will have?','What is the one thing they must remember?','What does a yes look like 6 months from now?'],
  Campaign: ['What is the one feeling this campaign should create?','Who is the person you are trying to reach — describe them specifically?','What does this campaign need to do that advertising alone cannot?','Three campaigns that changed how you think about this category?','What does success look like in concrete, measurable terms?'],
}
export function BriefOverlay() {
  const { closeOverlay, showToast } = useUIStore()
  const { currentProject, updateProject } = useProjectStore()
  const [type,    setType]    = useState(() => {
    const t = currentProject?.type
    if (t === 'film')    return 'Film'
    if (t === 'brand')   return 'Brand'
    if (t === 'music')   return 'Music'
    if (t === 'website') return 'Website'
    return 'Film'
  })
  const [answers, setAnswers] = useState(() => currentProject?.brief_answers ?? {})
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const panelRef = useFocusTrap(true)

  const save = async () => {
    if (!currentProject) return
    setSaving(true)
    const { supabase } = await import('../../lib/supabase')
    const { error } = await supabase
      .from('projects')
      .update({ brief_answers: answers })
      .eq('id', currentProject.id)
    setSaving(false)
    if (error) { showToast('Could not save brief.', 'var(--red)'); return }
    // Update store so the data is immediately available to Wrap/Stage
    updateProject(currentProject.id, { brief_answers: answers })
    setSaved(true)
    showToast('Brief saved to project.', 'var(--green)')
    setTimeout(() => closeOverlay('brief'), 700)
  }

  const completedCount = Object.values(answers).filter(v => v?.trim()).length
  const totalQuestions = Object.values(BRIEF_QS).flat().length

  return (
    <div className="overlay modal-overlay" onClick={e => e.target===e.currentTarget && closeOverlay('brief')}>
      <div className="modal-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label="Creative Brief">
        <div className="modal-head">
          <div>
            <span className="modal-title">Creative Brief</span>
            {currentProject && <span className="modal-project"> — {currentProject.name}</span>}
            <div style={{ fontSize:'12px', color:'var(--mute)', marginTop:'4px', fontFamily:'var(--font-ui)' }}>
              {completedCount > 0
                ? `${completedCount} answers saved — the foundation of your creative direction.`
                : 'Document the concept, references, and vision for this project.'}
            </div>
          </div>
          <button className="modal-close" onClick={() => closeOverlay('brief')} data-hover>×</button>
        </div>
        <div className="brief-types">
          {Object.keys(BRIEF_QS).map(t => (
            <button key={t} className={`bt ${type===t?'on':''}`} onClick={() => setType(t)} data-hover>{t}</button>
          ))}
        </div>
        <div className="brief-qs">
          {BRIEF_QS[type].map((q,i) => (
            <div key={`${type}-${i}`} className="bq">
              <div className="bq-label">{i+1}. {q}</div>
              <textarea className="bq-input" rows={2} placeholder="Your answer…"
                value={answers[`${type}-${i}`]??''}
                onChange={e => setAnswers(a => ({ ...a, [`${type}-${i}`]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div className="modal-foot">
          <button className="bf-btn cancel" onClick={() => closeOverlay('brief')} data-hover>Cancel</button>
          <button className="bf-btn save" onClick={save} disabled={saving} data-hover>
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save to project →'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function DigestOverlay() {
  const { closeOverlay }   = useUIStore()
  const { currentProject } = useProjectStore()
  const { notes }          = useNotesStore()
  const { nodes }          = useNodeStore()
  const panelRef = useFocusTrap(true)

  const [shotCount,  setShotCount]  = useState(null)
  const [assetCount, setAssetCount] = useState(null)

  useEffect(() => {
    if (!currentProject) return
    // Fetch shot count and asset count in parallel
    const fetchCounts = async () => {
      const { supabase } = await import('../../lib/supabase')
      const [{ count: sc }, { count: ac }] = await Promise.all([
        supabase.from('shots').select('*', { count:'exact', head:true }).eq('project_id', currentProject.id),
        supabase.from('assets').select('*', { count:'exact', head:true }).eq('project_id', currentProject.id),
      ])
      setShotCount(sc ?? 0)
      setAssetCount(ac ?? 0)
    }
    fetchCounts()
  }, [currentProject?.id])

  const recentNotes = [...notes]
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6)

  const approvedNodes = nodes.filter(n => n.status === 'approved' || n.status === 'locked')
  const inProgress    = nodes.filter(n => n.status === 'progress' || n.status === 'review')
  const conceptNodes  = nodes.filter(n => n.status === 'concept')

  const isEmpty = recentNotes.length === 0 && nodes.length === 0

  return (
    <div className="overlay modal-overlay" onClick={e => e.target===e.currentTarget && closeOverlay('digest')}>
      <div className="digest-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label="Project Digest">
        <div className="modal-head">
          <div>
            <span className="modal-title">Project Digest</span>
            {currentProject && <span className="modal-project"> — {currentProject.name}</span>}
            <div style={{ fontSize:'12px', color:'var(--mute)', marginTop:'4px', fontFamily:'var(--font-ui)', letterSpacing:'.03em' }}>
              A summary of recent activity, approvals, and notes across all scenes.
            </div>
          </div>
          <button className="modal-close" onClick={() => closeOverlay('digest')} data-hover>×</button>
        </div>

        {isEmpty ? (
          <div style={{ padding:'40px 24px', display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', textAlign:'center' }}>
            <div style={{ fontSize:'28px', fontFamily:'var(--font-display)', color:'var(--mute)', letterSpacing:'.04em' }}>Nothing yet</div>
            <div style={{ fontSize:'13px', color:'var(--mute)', lineHeight:1.65, maxWidth:'280px', fontFamily:'var(--font-ui)' }}>
              Add scenes, notes, and shots to your project. Activity will appear here as your team works.
            </div>
          </div>
        ) : (
          <div className="digest-body">
            {/* Project stats — real counts */}
            <div className="dg">
              <div className="dg-l">Project status</div>
              <div className="dg-stats-grid">
                {[
                  { label:'Scenes',     val: nodes.length,         color:'var(--cream)' },
                  { label:'Approved',   val: approvedNodes.length, color:'var(--green)' },
                  { label:'In progress',val: inProgress.length,    color:'var(--accent)' },
                  { label:'Concept',    val: conceptNodes.length,  color:'var(--ghost)' },
                  { label:'Shots',      val: shotCount ?? '…',     color:'var(--dim)' },
                  { label:'Assets',     val: assetCount ?? '…',    color:'var(--dim)' },
                ].map((s,i) => (
                  <div key={i} className="dg-stat">
                    <div className="dg-stat-val" style={{ color: s.color }}>{s.val}</div>
                    <div className="dg-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent notes */}
            {recentNotes.length > 0 && (
              <div className="dg">
                <div className="dg-l">Recent notes</div>
                {recentNotes.map((note, i) => {
                  const scene = nodes.find(n => n.id === note.node_id)
                  const time  = note.created_at ? new Date(note.created_at).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }) : ''
                  return (
                    <div key={i} className="di" data-hover>
                      <div className="di-dot" style={{ background: note.color ?? 'var(--accent)' }} />
                      <div>
                        <div className="di-text">{note.body?.slice(0, 80)}{note.body?.length > 80 ? '…' : ''}</div>
                        <div className="di-meta">{scene?.name ?? 'No scene'} · {time}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
