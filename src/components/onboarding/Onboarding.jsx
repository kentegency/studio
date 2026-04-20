import { useState, useEffect, useRef } from 'react'
import { useUIStore, useAuthStore } from '../../stores'
import './Onboarding.css'

const STEPS = [
  {
    id:       'welcome',
    title:    'Welcome to The Kentegency',
    body:     'This is your creative intelligence studio. Five quick steps and you will know exactly how it works.',
    target:   null,
    position: 'center',
    action:   'Begin →',
  },
  {
    id:       'project',
    title:    'Open or create a project',
    body:     'Everything lives inside a project. Create your first project from the dashboard, or open an existing one to enter the canvas.',
    target:   '.dash-card',
    position: 'bottom',
    action:   'Got it →',
  },
  {
    id:       'scene',
    title:    'Add scenes to the arc',
    body:     'The Line is your production arc. Click "+ Add Scene" to place a node. Each node is a scene — name it, set its type, position it.',
    target:   '.add-node-btn',
    position: 'bottom',
    action:   'Got it →',
  },
  {
    id:       'upload',
    title:    'Upload assets to any scene',
    body:     'Select a node on the timeline, then use the upload button to attach images, video, audio, or documents. Everything stays scoped to that scene.',
    target:   '.sbi',
    position: 'right',
    action:   'Got it →',
  },
  {
    id:       'window',
    title:    'Share your Window with the client',
    body:     'Publish content to the Window room, generate a link, and send it to your client. They open it on any browser — no login needed. They can react and approve.',
    target:   '.wl-copy',
    position: 'left',
    action:   'Start producing →',
    last:     true,
  },
]

const STORAGE_KEY = 'kentegency_onboarding_v1'

export default function Onboarding() {
  const { showToast, screen } = useUIStore()
  const { user }              = useAuthStore()

  const [stepIdx, setStepIdx] = useState(0)
  const [visible, setVisible] = useState(false)
  const [pos,     setPos]     = useState({ top: 0, left: 0 })
  const [arrow,   setArrow]   = useState('none')
  const tooltipRef = useRef(null)

  const step   = STEPS[stepIdx]
  const isDone = typeof window !== 'undefined'
    && localStorage.getItem(STORAGE_KEY) === 'true'

  // Show after login, delay so canvas renders
  useEffect(() => {
    if (!user || isDone) return
    const t = setTimeout(() => setVisible(true), 1400)
    return () => clearTimeout(t)
  }, [user])

  // Reposition on step change and resize
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(positionTooltip, 100)
    window.addEventListener('resize', positionTooltip)
    return () => { clearTimeout(t); window.removeEventListener('resize', positionTooltip) }
  }, [visible, stepIdx, screen])

  const positionTooltip = () => {
    const tooltip = tooltipRef.current
    if (!tooltip) return

    const tw = tooltip.offsetWidth  || 360
    const th = tooltip.offsetHeight || 200

    if (!step?.target) {
      // Center of screen
      setPos({
        top:  Math.round(window.innerHeight / 2 - th / 2),
        left: Math.round(window.innerWidth  / 2 - tw / 2),
      })
      setArrow('none')
      return
    }

    const target = document.querySelector(step.target)
    if (!target) {
      setPos({
        top:  Math.round(window.innerHeight / 2 - th / 2),
        left: Math.round(window.innerWidth  / 2 - tw / 2),
      })
      setArrow('none')
      return
    }

    const tr  = target.getBoundingClientRect()
    const pad = 14
    let top, left, arrowDir

    switch (step.position) {
      case 'bottom':
        top      = tr.bottom + pad
        left     = tr.left + tr.width / 2 - tw / 2
        arrowDir = 'top'
        break
      case 'top':
        top      = tr.top - th - pad
        left     = tr.left + tr.width / 2 - tw / 2
        arrowDir = 'bottom'
        break
      case 'right':
        top      = tr.top + tr.height / 2 - th / 2
        left     = tr.right + pad
        arrowDir = 'left'
        break
      case 'left':
        top      = tr.top + tr.height / 2 - th / 2
        left     = tr.left - tw - pad
        arrowDir = 'right'
        break
      default:
        top      = window.innerHeight / 2 - th / 2
        left     = window.innerWidth  / 2 - tw / 2
        arrowDir = 'none'
    }

    // Clamp inside viewport
    left = Math.max(12, Math.min(left, window.innerWidth  - tw - 12))
    top  = Math.max(60, Math.min(top,  window.innerHeight - th - 12))

    setPos({ top: Math.round(top), left: Math.round(left) })
    setArrow(arrowDir)
  }

  const next = () => {
    if (step.last) { finish(); return }
    setStepIdx(i => i + 1)
  }

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setVisible(false)
    showToast('You\'re all set. Start producing.', '#4ADE80')
  }

  const skip = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setVisible(false)
  }

  if (!visible || isDone || !user) return null

  return (
    <>
      <Spotlight target={step?.target} />

      <div
        ref={tooltipRef}
        className={`ob-tooltip ob-arrow-${arrow}`}
        style={{ top: pos.top, left: pos.left }}
      >
        {/* Progress */}
        <div className="ob-progress">
          <div className="ob-dots">
            {STEPS.map((_, i) => (
              <div key={i}
                className={`ob-dot ${i === stepIdx ? 'on' : i < stepIdx ? 'done' : ''}`} />
            ))}
          </div>
          <div className="ob-count">{stepIdx + 1} / {STEPS.length}</div>
        </div>

        <div className="ob-title">{step.title}</div>
        <div className="ob-body">{step.body}</div>

        <div className="ob-foot">
          <button className="ob-skip" onClick={skip}>Skip</button>
          <button className="ob-next" onClick={next}>{step.action ?? 'Next →'}</button>
        </div>
      </div>
    </>
  )
}

// SVG spotlight — darkens everything except target element
function Spotlight({ target }) {
  const [rect, setRect] = useState(null)

  useEffect(() => {
    const update = () => {
      if (!target) { setRect(null); return }
      const el = document.querySelector(target)
      if (!el) { setRect(null); return }
      const r = el.getBoundingClientRect()
      setRect({ top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 })
    }
    update()
    const t = setTimeout(update, 120)
    return () => clearTimeout(t)
  }, [target])

  return (
    <svg
      className="ob-spotlight"
      style={{ position:'fixed', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:8998 }}>
      <defs>
        <mask id="ob-mask">
          <rect width="100%" height="100%" fill="white" />
          {rect && <rect x={rect.left} y={rect.top} width={rect.width} height={rect.height} rx="3" fill="black" />}
        </mask>
      </defs>
      <rect width="100%" height="100%"
        fill={rect ? 'rgba(2,2,1,0.78)' : 'rgba(2,2,1,0.45)'}
        mask={rect ? 'url(#ob-mask)' : undefined} />
    </svg>
  )
}
