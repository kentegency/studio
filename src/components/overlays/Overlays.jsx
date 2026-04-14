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
    if (tool === 'eraser') {
      ctx.clearRect(e.nativeEvent.offsetX - 12, e.nativeEvent.offsetY - 12, 24, 24)
      return
    }
    ctx.lineWidth   = tool === 'marker' ? 8 : 2.5
    ctx.lineCap     = 'round'
    ctx.globalAlpha = tool === 'marker' ? 0.4 : 1
    ctx.strokeStyle = color
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
  }

  const startDraw = (e) => {
    setDrawing(true)
    ctxRef.current.beginPath()
    ctxRef.current.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
  }

  const COLORS = ['#F5920C','#1E8A8A','#F4EFD8','#4ADE80','#E05050','#8B5CF6']
  const TOOLS  = [
    { key:'pen',    label:'Pen',    icon:<svg viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><circle cx="11" cy="11" r="2"/></svg> },
    { key:'marker', label:'Mark',  icon:<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
    { key:'eraser', label:'Erase', icon:<svg viewBox="0 0 24 24"><path d="M20 20H7L3 16l10-10 7 7-3.5 3.5"/></svg> },
  ]

  return (
    <div className="overlay sketch-overlay">
      <div className="ov-bar">
        <span className="ov-label">Sketch — Visual Thinking</span>
        <div className="sk-tools">
          {TOOLS.map(t => (
            <button key={t.key} className={`sk-tool ${tool === t.key ? 'on' : ''}`}
              onClick={() => setTool(t.key)} data-hover title={t.label}>{t.icon}</button>
          ))}
        </div>
        <div className="sk-colors">
          {COLORS.map((c, i) => (
            <div key={i} className={`sk-col ${color === c ? 'on' : ''}`}
              style={{ background: c }}
              onClick={() => { setColor(c); setTool('pen') }} data-hover />
          ))}
        </div>
        <button className="ov-close-btn" data-hover
          onClick={() => { closeOverlay('sketch'); showToast('Sketch saved.') }}>
          Save & Close
        </button>
      </div>
      <canvas
        ref={canvasRef} className="sk-canvas"
        onMouseDown={startDraw} onMouseMove={draw}
        onMouseUp={() => setDrawing(false)}
        onMouseLeave={() => setDrawing(false)}
      />
    </div>
  )
}

// ── COMPARE ───────────────────────────────────
export function CompareOverlay() {
  const { closeOverlay, showToast } = useUIStore()
  const assets = useNodeStore ? [] : []
  const select = (grade) => {
    showToast(`${grade} selected and locked.`, '#4ADE80')
    closeOverlay('compare')
  }
  return (
    <div className="overlay">
      <div className="ov-bar">
        <span className="ov-label teal">Compare — Side by Side</span>
        <button className="ov-close-btn" onClick={() => closeOverlay('compare')} data-hover>Close ×</button>
      </div>
      <div className="cmp-body">
        <div className="cmp-side">
          <span className="cmp-side-label">Option A</span>
          <div className="cmp-asset teal-asset">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span>Upload an asset to compare</span>
          </div>
          <button className="cmp-sel teal-sel" onClick={() => select('Option A')} data-hover>Select Option A →</button>
        </div>
        <div className="cmp-side">
          <span className="cmp-side-label">Option B</span>
          <div className="cmp-asset orange-asset">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span>Upload an asset to compare</span>
          </div>
          <button className="cmp-sel orange-sel" onClick={() => select('Option B')} data-hover>Select Option B →</button>
        </div>
      </div>
    </div>
  )
}

// ── STAGE — fully wired ───────────────────────
const STAGE_NODES = [
  { id:'cn0', title:'OPENING\nSEQUENCE',   act:'Act I — Scene 01', next:'Pioneers',       desc:'The invisible war begins before anyone understands what war is. Every tap. Every click. Every transfer — an act of trust.' },
  { id:'cn1', title:'PIONEERS',             act:'Act I — Scene 02', next:'First Cracks',   desc:'Before cybersecurity had a name, a small group of people in Ghana saw the risk coming. They built protection with nothing but intuition and belief.' },
  { id:'cn2', title:'FIRST\nCRACKS',        act:'Act I — Scene 03', next:'Battles',        desc:'The earliest digital crimes were small. A forged email. A manipulated record. A misplaced trust. They did not always look like crime.' },
  { id:'cn3', title:'BATTLES &\nBREACHES',  act:'Act II — Scene 01', next:'Fraud Vectors', desc:'Today Ghana is more connected than ever before. Money moves in seconds. Messages cross borders instantly. But convenience has a cost.' },
  { id:'cn4', title:'FRAUD\nVECTORS',       act:'Act II — Scene 02', next:'The Human Cost', desc:'Today\'s fraud rarely looks like crime. It sounds polite. Professional. Convincing. Social engineering has become the most effective weapon.' },
  { id:'cn5', title:'THE HUMAN\nCOST',      act:'Act II — Scene 03', next:'Resilience',    desc:'Cybercrime does not only steal money. It steals peace of mind. It makes the heart bleed and can shatter confidence and dignity.' },
  { id:'cn6', title:'RESILIENCE',           act:'Act III — Scene 01', next:'Youth',        desc:'Every moment of crisis carries a choice — to retreat, or to respond. For Ghana, the choice is clear. The digital future is something to prepare for.' },
  { id:'cn7', title:'YOUTH\nDEFENDERS',     act:'Act III — Scene 02', next:'The Future',   desc:'Ghana\'s greatest cybersecurity asset is not software. It is its people. With the right skills, the next generation can turn risk into resilience.' },
  { id:'cn8', title:'THE FUTURE\nARC',      act:'Act III — Scene 03', next:'End',          desc:'The future will bring new threats, new technologies, new possibilities. But it will also bring new choices — to learn, to adapt, and to protect.' },
]

const MINI_NODES = [
  { cx:28,  cy:23, r:7,  fill:'#1E8A8A' },
  { cx:102, cy:23, r:4,  fill:'#123A3A' },
  { cx:182, cy:23, r:4,  fill:'#123A3A' },
  { cx:298, cy:23, r:8,  fill:'#C07010' },
  { cx:380, cy:23, r:4,  fill:'#5A3808' },
  { cx:460, cy:23, r:5,  fill:'#6A4008' },
  { cx:576, cy:23, r:4,  fill:'#481008' },
  { cx:672, cy:23, r:7,  fill:'#621408' },
  { cx:778, cy:23, r:4,  fill:'#3A0A04' },
]

export function StageOverlay() {
  const { closeOverlay, showToast } = useUIStore()
  const [idx, setIdx]           = useState(0)
  const [showLine, setShowLine] = useState(false)
  const [animKey, setAnimKey]   = useState(0)

  const current = STAGE_NODES[idx]

  const advance = () => {
    if (idx < STAGE_NODES.length - 1) {
      setIdx(i => i + 1)
      setAnimKey(k => k + 1)
    } else {
      showToast('End of presentation.')
    }
  }

  const back = () => {
    if (idx > 0) {
      setIdx(i => i - 1)
      setAnimKey(k => k + 1)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') advance()
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   back()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [idx])

  const lines = current.title.split('\n')

  return (
    <div className="overlay stage-overlay">
      <div className="atm">
        <div className="atm-v" />
        <div className="atm-o" style={{ opacity:.95 }} />
        <div className="atm-t" style={{ opacity:.95 }} />
        <div className="atm-lk" />
      </div>

      <div className="stage-screen">
        {/* Progress dots */}
        <div className="stage-progress">
          {STAGE_NODES.map((_, i) => (
            <div key={i}
              className={`sp-dot ${i === idx ? 'on' : ''} ${i < idx ? 'done' : ''}`}
              onClick={() => { setIdx(i); setAnimKey(k => k + 1) }}
              data-hover />
          ))}
        </div>

        <div key={animKey} className="stage-content">
          <div className="st-eye">{current.act}</div>
          <div className="st-title">
            {lines.map((l, i) => <div key={i}>{l}</div>)}
          </div>
          <div className="st-rule" />
          <div className="st-desc">{current.desc}</div>
        </div>

        {showLine && (
          <div className="st-line">
            <svg viewBox="0 0 800 48" preserveAspectRatio="none"
              style={{ width:'100%', height:'48px', overflow:'visible' }}>
              <rect x="0"   y="12" width="222" height="22" rx="1.5"
                fill="rgba(30,138,138,0.08)" stroke="rgba(30,138,138,0.16)" strokeWidth="0.5"/>
              <rect x="232" y="12" width="262" height="22" rx="1.5"
                fill="rgba(245,146,12,0.06)" stroke="rgba(245,146,12,0.14)" strokeWidth="0.5"/>
              <rect x="504" y="12" width="290" height="22" rx="1.5"
                fill="rgba(90,18,10,0.07)" stroke="rgba(120,38,22,0.14)" strokeWidth="0.5"/>
              <line x1="0" y1="23" x2="800" y2="23" stroke="#141210" strokeWidth="1"/>
              {MINI_NODES.map((n, i) => (
                <circle key={i} cx={n.cx} cy={n.cy} r={n.r} fill={n.fill}
                  stroke={i === idx ? 'rgba(245,146,12,0.8)' : 'none'}
                  strokeWidth={i === idx ? 2 : 0}
                  onClick={() => { setIdx(i); setAnimKey(k => k+1) }}
                  style={{ cursor:'pointer' }} />
              ))}
            </svg>
          </div>
        )}
      </div>

      <div className="stage-ctrl">
        <div>
          <div className="stc-l">Now presenting</div>
          <div className="stc-n">{lines.join(' ')}</div>
          <div className="stc-prog">{idx + 1} of {STAGE_NODES.length}</div>
        </div>
        <div className="stc-next">
          Next
          <em>{idx < STAGE_NODES.length - 1 ? STAGE_NODES[idx+1].title.replace('\n',' ') : '—'}</em>
        </div>
        <div style={{ flex:1 }} />
        <button className="stc-btn adv" onClick={advance} data-hover>
          {idx < STAGE_NODES.length - 1 ? 'Advance →' : 'End →'}
        </button>
        <button className="stc-btn" onClick={back} disabled={idx === 0} data-hover>← Back</button>
        <button className="stc-btn" onClick={() => setShowLine(s => !s)} data-hover>
          {showLine ? 'Hide line' : 'Show line'}
        </button>
        <button className="stc-btn ex"
          onClick={() => { closeOverlay('stage'); showToast('Stage off.') }} data-hover>
          Exit stage
        </button>
      </div>
    </div>
  )
}

// ── BRIEF ─────────────────────────────────────
const BRIEF_QS = {
  Film:    ['What is the core story in one sentence?','Who is the primary audience?','What is the emotional tone — documentary, narrative, observational?','What does success look like for this film?','Reference films that capture the feeling you want?'],
  Brand:   ['What does your brand feel like in three words?','Who is your primary customer — describe them specifically?','Three brands you admire and why?','One brand that is everything you are not?','What does success look like 12 months after launch?'],
  Music:   ['What three songs have made you cry and why?','How do you want people to feel after a show?','Who is the fan you are making this for?','What does your album cover look like in your head?','What does your music give people nothing else can?'],
  Website: ['What is the primary action a visitor should take?','What feeling should the site give in the first 3 seconds?','Three websites you love and why?','What content do you have ready right now?','What does a successful website do for you?'],
}

export function BriefOverlay() {
  const { closeOverlay, showToast } = useUIStore()
  const { currentProject } = useProjectStore()
  const [type, setType]       = useState('Film')
  const [answers, setAnswers] = useState({})
  const [saved, setSaved]     = useState(false)
  const types = Object.keys(BRIEF_QS)

  const save = () => {
    showToast('Brief saved to project.', '#4ADE80')
    setSaved(true)
    setTimeout(() => closeOverlay('brief'), 800)
  }

  return (
    <div className="overlay modal-overlay"
      onClick={(e) => e.target === e.currentTarget && closeOverlay('brief')}>
      <div className="modal-panel">
        <div className="modal-head">
          <span className="modal-title">CLIENT BRIEF</span>
          {currentProject && (
            <span className="modal-project">— {currentProject.name}</span>
          )}
          <button className="modal-close" onClick={() => closeOverlay('brief')} data-hover>Close ×</button>
        </div>
        <div className="brief-types">
          {types.map(t => (
            <button key={t} className={`bt ${type === t ? 'on' : ''}`}
              onClick={() => setType(t)} data-hover>{t}</button>
          ))}
        </div>
        <div className="brief-qs">
          {BRIEF_QS[type].map((q, i) => (
            <div key={`${type}-${i}`} className="bq">
              <div className="bq-label">{i + 1}. {q}</div>
              <textarea className="bq-input" rows={2}
                placeholder="Your answer…"
                value={answers[`${type}-${i}`] ?? ''}
                onChange={e => setAnswers(a => ({ ...a, [`${type}-${i}`]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div className="modal-foot">
          <button className="bf-btn cancel" onClick={() => closeOverlay('brief')} data-hover>Cancel</button>
          <button className="bf-btn save" onClick={save} data-hover>
            {saved ? 'Saved ✓' : 'Save to project →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DIGEST ────────────────────────────────────
const DIGEST_ITEMS = [
  { group:'Approvals', items:[
    { color:'#4ADE80', text:'Producer approved Grade B on Opening Sequence', meta:'producer · 09:14' },
    { color:'#4ADE80', text:'Shot list approved for Act II',                  meta:'producer · 11:02' },
  ]},
  { group:'Notes', items:[
    { color:'#1E8A8A', text:'DP left a note on Scene 04 — lens choice for MoMo fraud re-enactment', meta:'dp · 08:45' },
    { color:'#F4EFD8', text:'Score provider attached two new audio references to Opening Sequence',  meta:'score · 14:30' },
  ]},
  { group:'Reactions', items:[
    { color:'#F5920C', text:'Producer reacted ❤️ to the EBAN fence animation reference', meta:'producer · 16:22' },
  ]},
]

export function DigestOverlay() {
  const { closeOverlay } = useUIStore()
  return (
    <div className="overlay modal-overlay"
      onClick={(e) => e.target === e.currentTarget && closeOverlay('digest')}>
      <div className="digest-panel">
        <div className="modal-head">
          <span className="modal-title">TODAY'S DIGEST</span>
          <button className="modal-close" onClick={() => closeOverlay('digest')} data-hover>×</button>
        </div>
        <div className="digest-body">
          {DIGEST_ITEMS.map((g, i) => (
            <div key={i} className="dg">
              <div className="dg-l">{g.group}</div>
              {g.items.map((item, j) => (
                <div key={j} className="di" data-hover>
                  <div className="di-dot" style={{ background: item.color }} />
                  <div>
                    <div className="di-text">{item.text}</div>
                    <div className="di-meta">{item.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
