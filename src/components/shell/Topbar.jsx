import { useState } from 'react'
import { useUIStore, useProjectStore } from '../../stores'
import './Topbar.css'

export default function Topbar({ onWrap, onSettings, onActs }) {
  const { activeRoom, setRoom, openOverlay, showToast } = useUIStore()
  const { currentProject } = useProjectStore()
  const [showView, setShowView] = useState(false)

  const rooms = ['Studio', 'Meeting', 'Window']

  const switchRoom = (r) => {
    setRoom(r.toLowerCase())
    const msgs = {
      studio:  'Studio — your private view.',
      meeting: 'Meeting — shared with contributors.',
      window:  'Window — what your client sees.',
    }
    showToast(msgs[r.toLowerCase()])
  }

  return (
    <header className="topbar">
      <div className="tb-proj">
        <em>▸</em>
        {currentProject?.name ?? 'The Kentegency'}
        <span className="tb-room-badge">{activeRoom.charAt(0).toUpperCase() + activeRoom.slice(1)}</span>
      </div>

      <div className="tb-rooms">
        {rooms.map(r => (
          <button key={r}
            className={`tb-r ${activeRoom === r.toLowerCase() ? 'on' : ''}`}
            onClick={() => switchRoom(r)} data-hover>
            {r}
          </button>
        ))}
      </div>

      <div className="tb-actions">
        {/* View dropdown — Digest + Brief consolidated here */}
        <div className="tb-view-wrap">
          <button className="tbb" onClick={() => setShowView(v => !v)} data-hover>
            View ▾
          </button>
          {showView && (
            <div className="tb-view-menu" onMouseLeave={() => setShowView(false)}>
              <button className="tb-vm-item" onClick={() => { openOverlay('digest'); setShowView(false) }}>
                Digest
                <span>Project overview</span>
              </button>
              <button className="tb-vm-item" onClick={() => { openOverlay('brief'); setShowView(false) }}>
                Brief
                <span>Creative brief</span>
              </button>
            </div>
          )}
        </div>

        <button className="tbb" onClick={() => onActs?.()} data-hover title="Manage act zones">Acts</button>
        <button className="tbb"
          onClick={() => { openOverlay('stage'); showToast('Lights up.') }} data-hover>
          Stage ↗
        </button>
        <button className="tbb pr" onClick={() => onWrap?.()} data-hover>
          Wrap it
        </button>
        <button className="tbb-palette" onClick={() => window.__openPalette?.()} data-hover title="Command palette (⌘K)">
          ⌘K
        </button>
      </div>
    </header>
  )
}
