import { useUIStore } from '../../stores'
import './Topbar.css'

export default function Topbar() {
  const { activeRoom, setRoom, openOverlay, showToast } = useUIStore()

  const rooms = ['Studio', 'Meeting', 'Window']

  const switchRoom = (r) => {
    setRoom(r.toLowerCase())
    showToast(`Switched to ${r} room`)
  }

  return (
    <header className="topbar">
      <div className="tb-proj">
        <em>▸</em>
        EBAN — Ghana's Cybersecurity Journey
        <span>&nbsp;· {activeRoom.charAt(0).toUpperCase() + activeRoom.slice(1)}</span>
      </div>

      <div className="tb-rooms">
        {rooms.map(r => (
          <button
            key={r}
            className={`tb-r ${activeRoom === r.toLowerCase() ? 'on' : ''}`}
            onClick={() => switchRoom(r)}
            data-hover
          >
            {r}
          </button>
        ))}
      </div>

      <div className="tb-actions">
        <button className="tbb act" onClick={() => openOverlay('digest')} data-hover>
          Digest
        </button>
        <button className="tbb" onClick={() => openOverlay('brief')} data-hover>
          Brief
        </button>
        <button className="tbb"
          onClick={() => { openOverlay('stage'); showToast('Lights up.') }}
          data-hover>
          Stage ↗
        </button>
        <button className="tbb pr"
          onClick={() => showToast('Preparing your wrap…')}
          data-hover>
          Wrap it
        </button>
      </div>
    </header>
  )
}
