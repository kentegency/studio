import { useUIStore, useProjectStore } from '../../stores'
import './Topbar.css'

export default function Topbar({ onPublish }) {
  const { activeRoom, setRoom, openOverlay, showToast } = useUIStore()
  const { currentProject } = useProjectStore()

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
        <span>&nbsp;· {activeRoom.charAt(0).toUpperCase() + activeRoom.slice(1)}</span>
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
        <button className="tbb act" onClick={() => openOverlay('digest')} data-hover>Digest</button>
        <button className="tbb" onClick={() => openOverlay('brief')} data-hover>Brief</button>
        <button className="tbb"
          onClick={() => { openOverlay('stage'); showToast('Lights up.') }} data-hover>
          Stage ↗
        </button>
        <button className="tbb pr"
          onClick={() => showToast('Wrap it coming in Sprint 3D.')} data-hover>
          Wrap it
        </button>
      </div>
    </header>
  )
}
