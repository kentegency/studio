import { useState } from 'react'
import { useUIStore, useNotesStore, useAuthStore, useProjectStore, useNodeStore } from '../../stores'
import './QuickCapture.css'

const COLORS = ['#F5920C','#1E8A8A','#F4EFD8','#4ADE80','#8B5CF6','#E05050']

export default function QuickCapture({ onVoice }) {
  const { overlays, openOverlay, closeOverlay, showToast } = useUIStore()
  const { addNote }        = useNotesStore()
  const { user }           = useAuthStore()
  const { currentProject } = useProjectStore()
  const { selectedNode }   = useNodeStore()

  const open = overlays.quickCapture

  const [color, setColor] = useState(0)
  const [text,  setText]  = useState('')
  const [saving,setSaving]= useState(false)

  const toggle = () => open ? closeOverlay('quickCapture') : openOverlay('quickCapture')

  const send = async () => {
    if (!text.trim() || !currentProject) return
    setSaving(true)
    await addNote({
      project_id: currentProject.id,
      node_id:    selectedNode?.id ?? null,
      author_id:  user?.id,
      body:       text.trim(),
      color:      COLORS[color],
      room:       'studio',
    })
    setSaving(false)
    showToast(`Captured${selectedNode ? ` → ${selectedNode.name}` : ''}`)
    setText('')
    closeOverlay('quickCapture')
  }

  return (
    <div className="qc-wrap">
      {/* Floating action button */}
      <div className="qc-fab-group">
        {/* Voice note shortcut */}
        <button className="qc-fab-secondary" onClick={() => { closeOverlay('quickCapture'); onVoice?.() }}
          data-hover title="Voice note">
          <svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        </button>
        {/* Main capture button */}
        <button className="qc-btn" onClick={toggle} data-hover title="Quick capture">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>

      <div className={`qc-panel ${open ? 'on' : ''}`}>
        <div className="qcp-head">
          <span className="qcp-title">Quick Capture</span>
          <span className="qcp-scene">{selectedNode?.name ?? 'No scene selected'}</span>
          <button className="qcp-close" onClick={() => closeOverlay('quickCapture')} data-hover>×</button>
        </div>

        <div className="qcp-body">
          <textarea
            className="qcp-input"
            placeholder="What are you thinking? Cmd+Enter to capture."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && e.metaKey && send()}
            autoFocus={open}
            rows={4}
          />
          <div className="qcp-footer">
            <div className="qcp-colors">
              {COLORS.map((c, i) => (
                <div key={i}
                  className={`qcp-cs ${color === i ? 'on' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(i)} data-hover />
              ))}
            </div>
            <div className="qcp-actions">
              <button className="qcp-voice-btn" onClick={() => { closeOverlay('quickCapture'); onVoice?.() }} data-hover>
                <svg viewBox="0 0 24 24" style={{width:'13px',height:'13px',stroke:'currentColor',fill:'none',strokeWidth:'1.5'}}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                Voice
              </button>
              <button className="qcp-send" onClick={send} disabled={saving || !text.trim()} data-hover>
                {saving ? '…' : 'Capture'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
