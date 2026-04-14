import { useEffect, useRef, useState, useCallback } from 'react'
import { useUIStore, useNodeStore, useNotesStore, useAuthStore, useProjectStore } from '../../stores'
import './Overlays.css'

// ── SKETCH ────────────────────────────────────
export function SketchOverlay() {
  const { closeOverlay, showToast } = useUIStore()
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [color, setColor]     = useState('#F5920C')
  const [tool, setTool]       = useState('pen')
  const ctxRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    ctxRef.current = canvas.getContext('2d')
  }, [])

  const draw = (e) => {
    if (!drawing || !ctxRef.current) return
    const ctx = ctxRef.current
    if (tool === 'eraser') { ctx.clearRect(e.nativeEvent.offsetX-12, e.nativeEvent.offsetY-12, 24, 24); return }
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
  const COLORS = ['#F5920C','#1E8A8A','#F4EFD8','#4ADE80','#E05050','#8B5CF6']
  const TOOLS  = [
    { key:'pen',    icon:<svg viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><circle cx="11" cy="11" r="2"/></svg> },
    { key:'marker', icon:<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
    { key:'eraser', icon:<svg viewBox="0 0 24 24"><path d="M20 20H7L3 16l10-10 7 7-3.5 3.5"/></svg> },
  ]
  return (
    <div className="overlay sketch-overlay">
      <div className="ov-bar">
        <span className="ov-label">Sketch</span>
        <div className="sk-tools">{TOOLS.map(t => (
          <button key={t.key} className={`sk-tool ${tool===t.key?'on':''}`} onClick={() => setTool(t.key)} data-hover>{t.icon}</button>
        ))}</div>
        <div className="sk-colors">{COLORS.map((c,i) => (
          <div key={i} className={`sk-col ${color===c?'on':''}`} style={{ background:c }} onClick={() => { setColor(c); setTool('pen') }} data-hover />
        ))}</div>
        <button className="ov-close-btn" data-hover onClick={() => { closeOverlay('sketch'); showToast('Sketch saved.') }}>Save & Close</button>
      </div>
      <canvas ref={canvasRef} className="sk-canvas" onMouseDown={startDraw} onMouseMove={draw} onMouseUp={() => setDrawing(false)} onMouseLeave={() => setDrawing(false)} />
    </div>
  )
}

// ── COMPARE ───────────────────────────────────
export function CompareOverlay() {
  const { closeOverlay, showToast } = useUIStore()
  const select = (g) => { showToast(`${g} selected and locked.`, '#4ADE80'); closeOverlay('compare') }
  return (
    <div className="overlay">
      <div className="ov-bar">
        <span className="ov-label teal">Compare</span>
        <button className="ov-close-btn" onClick={() => closeOverlay('compare')} data-hover>Close ×</button>
      </div>
      <div className="cmp-body">
        <div className="cmp-side">
          <span className="cmp-side-label">Option A</span>
          <div className="cmp-asset teal-asset"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Upload to compare</span></div>
          <button className="cmp-sel teal-sel" onClick={() => select('Option A')} data-hover>Select A →</button>
        </div>
        <div className="cmp-side">
          <span className="cmp-side-label">Option B</span>
          <div className="cmp-asset orange-asset"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Upload to compare</span></div>
          <button className="cmp-sel orange-sel" onClick={() => select('Option B')} data-hover>Select B →</button>
        </div>
      </div>
    </div>
  )
}

// ── STAGE — full viewport, all devices ────────
const STAGE_NODES = [
  { id:0, title:'OPENING\nSEQUENCE',   act:'Act I — Scene 01', desc:'The invisible war begins before anyone understands what war is. Every tap. Every click. Every transfer — an act of trust.' },
  { id:1, title:'PIONEERS',             act:'Act I — Scene 02', desc:'Before cybersecurity had a name, a small group of people in Ghana saw the risk coming. They built protection with nothing but intuition and belief.' },
  { id:2, title:'FIRST\nCRACKS',        act:'Act I — Scene 03', desc:'The earliest digital crimes were small. A forged email. A manipulated record. A misplaced trust. They did not always look like crime.' },
  { id:3, title:'BATTLES &\nBREACHES',  act:'Act II — Scene 01', desc:'Today Ghana is more connected than ever before. Money moves in seconds. But convenience has a cost.' },
  { id:4, title:'FRAUD\nVECTORS',       act:'Act II — Scene 02', desc:'Today\'s fraud rarely looks like crime. It sounds polite. Professional. Convincing. Social engineering has become the most effective weapon.' },
  { id:5, title:'THE HUMAN\nCOST',      act:'Act II — Scene 03', desc:'Cybercrime does not only steal money. It steals peace of mind. It makes the heart bleed and can shatter confidence and dignity.' },
  { id:6, title:'RESILIENCE',           act:'Act III — Scene 01', desc:'Every moment of crisis carries a choice — to retreat, or to respond. For Ghana, the choice is clear.' },
  { id:7, title:'YOUTH\nDEFENDERS',     act:'Act III — Scene 02', desc:'Ghana\'s greatest cybersecurity asset is not software. It is its people. The next generation can turn risk into resilience.' },
  { id:8, title:'THE FUTURE\nARC',      act:'Act III — Scene 03', desc:'The future will bring new threats, new technologies. But also new choices — to learn, to adapt, and to protect.' },
]

const ACT_COLORS = [
  'rgba(30,138,138,1)',   // Act I — teal
  'rgba(245,146,12,1)',   // Act II — orange
  'rgba(180,60,30,1)',    // Act III — red
]

const getActColor = (idx) => {
  if (idx <= 2) return ACT_COLORS[0]
  if (idx <= 5) return ACT_COLORS[1]
  return ACT_COLORS[2]
}

export function StageOverlay() {
  const { closeOverlay } = useUIStore()
  const [idx,       setIdx]      = useState(0)
  const [animKey,   setAnimKey]  = useState(0)
  const [showLine,  setShowLine] = useState(false)
  const [showUI,    setShowUI]   = useState(true)
  const hideTimer   = useRef(null)
  const touchStartX = useRef(null)

  const current   = STAGE_NODES[idx]
  const accent    = getActColor(idx)
  const lines     = current.title.split('\n')
  const isMulti   = lines.length > 1

  const advance = useCallback(() => {
    if (idx < STAGE_NODES.length - 1) { setIdx(i => i+1); setAnimKey(k => k+1) }
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
  const progress = (idx / (STAGE_NODES.length - 1)) * 100

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
          <rect x="308" y="10" width="284" height="28" rx="2" fill="rgba(245,146,12,.06)"  stroke="rgba(245,146,12,.16)"  strokeWidth="0.5"/>
          <rect x="600" y="10" width="300" height="28" rx="2" fill="rgba(180,60,30,.07)"   stroke="rgba(180,60,30,.18)"   strokeWidth="0.5"/>
          <line x1="0" y1="24" x2="900" y2="24" stroke="#181410" strokeWidth="1.5"/>
          {STAGE_NODES.map((n, i) => {
            const cx = (i / (STAGE_NODES.length-1)) * 860 + 20
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
          <span className="sfb-count">{idx+1} / {STAGE_NODES.length}</span>
          <span className="sfb-name">{current.title.replace('\n',' ')}</span>
        </div>
        <div className="sfb-dots">
          {STAGE_NODES.map((_,i) => (
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
            {idx < STAGE_NODES.length-1 ? 'Advance →' : 'End →'}
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
  Film:    ['What is the core story in one sentence?','Who is the primary audience?','What is the emotional tone?','What does success look like for this film?','Reference films that capture the feeling you want?'],
  Brand:   ['What does your brand feel like in three words?','Who is your primary customer?','Three brands you admire and why?','One brand that is everything you are not?','What does success look like 12 months after launch?'],
  Music:   ['What three songs have made you cry and why?','How do you want people to feel after a show?','Who is the fan you are making this for?','What does your album cover look like in your head?','What does your music give people nothing else can?'],
  Website: ['What is the primary action a visitor should take?','What feeling should the site give in the first 3 seconds?','Three websites you love and why?','What content do you have ready right now?','What does a successful website do for you?'],
}
export function BriefOverlay() {
  const { closeOverlay, showToast } = useUIStore()
  const { currentProject }          = useProjectStore()
  const [type,    setType]    = useState('Film')
  const [answers, setAnswers] = useState({})
  const [saved,   setSaved]   = useState(false)
  const save = () => { showToast('Brief saved.', '#4ADE80'); setSaved(true); setTimeout(() => closeOverlay('brief'), 600) }
  return (
    <div className="overlay modal-overlay" onClick={e => e.target===e.currentTarget && closeOverlay('brief')}>
      <div className="modal-panel">
        <div className="modal-head">
          <span className="modal-title">CLIENT BRIEF</span>
          {currentProject && <span className="modal-project">— {currentProject.name}</span>}
          <button className="modal-close" onClick={() => closeOverlay('brief')} data-hover>Close ×</button>
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
          <button className="bf-btn save" onClick={save} data-hover>{saved?'Saved ✓':'Save to project →'}</button>
        </div>
      </div>
    </div>
  )
}

// ── DIGEST ────────────────────────────────────
const DIGEST_ITEMS = [
  { group:'Approvals', items:[
    { color:'#4ADE80', text:'Producer approved Grade B on Opening Sequence', meta:'producer · 09:14' },
    { color:'#4ADE80', text:'Shot list approved for Act II', meta:'producer · 11:02' },
  ]},
  { group:'Notes', items:[
    { color:'#1E8A8A', text:'DP left a note on Scene 04 — lens choice for MoMo fraud re-enactment', meta:'dp · 08:45' },
    { color:'#F4EFD8', text:'Score provider attached two new audio references to Opening Sequence', meta:'score · 14:30' },
  ]},
  { group:'Reactions', items:[
    { color:'#F5920C', text:'Producer reacted ❤️ to the EBAN fence animation reference', meta:'producer · 16:22' },
  ]},
]
export function DigestOverlay() {
  const { closeOverlay } = useUIStore()
  return (
    <div className="overlay modal-overlay" onClick={e => e.target===e.currentTarget && closeOverlay('digest')}>
      <div className="digest-panel">
        <div className="modal-head">
          <span className="modal-title">TODAY'S DIGEST</span>
          <button className="modal-close" onClick={() => closeOverlay('digest')} data-hover>×</button>
        </div>
        <div className="digest-body">
          {DIGEST_ITEMS.map((g,i) => (
            <div key={i} className="dg">
              <div className="dg-l">{g.group}</div>
              {g.items.map((item,j) => (
                <div key={j} className="di" data-hover>
                  <div className="di-dot" style={{ background:item.color }} />
                  <div><div className="di-text">{item.text}</div><div className="di-meta">{item.meta}</div></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
