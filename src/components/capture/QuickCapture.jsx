import { useState } from 'react'
import { useUIStore } from '../../stores'
import './QuickCapture.css'

const COLORS = ['#F5920C','#1E8A8A','#F4EFD8','#4ADE80','#8B5CF6','#E05050']
const MODES  = ['Text','Voice','Reference']

export default function QuickCapture() {
  const { overlays, openOverlay, closeOverlay, showToast } = useUIStore()
  const open = overlays.quickCapture

  const [mode,  setMode]  = useState('Text')
  const [color, setColor] = useState(0)
  const [text,  setText]  = useState('')

  const toggle = () => open ? closeOverlay('quickCapture') : openOverlay('quickCapture')

  const send = () => {
    if (!text.trim()) return
    showToast('Captured → Opening Sequence')
    setText('')
    closeOverlay('quickCapture')
  }

  return (
    <div className="qc-wrap">
      <button className="qc-btn" onClick={toggle} data-hover>
        <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>

      <div className={`qc-panel ${open ? 'on' : ''}`}>
        <div className="qcp-head">
          <span className="qcp-title">Quick Capture</span>
          <button className="qcp-close" onClick={() => closeOverlay('quickCapture')} data-hover>×</button>
        </div>

        <div className="qcp-modes">
          {MODES.map(m => (
            <button key={m}
              className={`qcp-mode ${mode === m ? 'on' : ''}`}
              onClick={() => setMode(m)} data-hover>
              {m}
            </button>
          ))}
        </div>

        <div className="qcp-body">
          <textarea
            className="qcp-input"
            placeholder="What are you thinking?"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && e.metaKey && send()}
          />
          <div className="qcp-colors">
            {COLORS.map((c, i) => (
              <div key={i}
                className={`qcp-cs ${color === i ? 'on' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(i)} data-hover />
            ))}
          </div>
        </div>

        <div className="qcp-foot">
          <span className="qcp-tag">→ Opening Sequence</span>
          <button className="qcp-send" onClick={send} data-hover>Capture</button>
        </div>
      </div>
    </div>
  )
}
