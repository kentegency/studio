import { useState } from 'react'
import { useUIStore, useProjectStore } from '../../stores'
import './Topbar.css'

export default function Topbar({ onWrap, onSettings, onActs }) {
  const { activeRoom, setRoom, openOverlay, showToast } = useUIStore()
  const { currentProject } = useProjectStore()
  const [showView,     setShowView]     = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)

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

  const projectName = currentProject?.name
  const projectType = currentProject?.type

  return (
    <header className="topbar">

      {/* Zone 1 — Project identity */}
      <div className="tb-identity">
        {projectType && (
          <div className="tb-proj-type">{projectType}</div>
        )}
        <div className="tb-proj-name">
          {projectName ?? 'Kentegency Studio'}
        </div>
      </div>

      {/* Zone divider */}
      <div className="tb-divider" />

      {/* Zone 2 — Room switcher */}
      <div className="tb-rooms">
        {rooms.map(r => (
          <button key={r}
            className={`tb-r ${activeRoom === r.toLowerCase() ? 'on' : ''}`}
            onClick={() => switchRoom(r)} data-hover>
            {r}
          </button>
        ))}
      </div>

      {/* Zone divider */}
      <div className="tb-divider" />

      {/* Zone 3 — Actions */}
      <div className="tb-actions">

        {/* View ▾ */}
        <div className="tb-view-wrap">
          <button className="tbb" onClick={() => { setShowView(v => !v); setShowGenerate(false) }} data-hover>
            View ▾
          </button>
          {showView && (
            <div className="tb-view-menu" onMouseLeave={() => setShowView(false)}>
              <button className="tb-vm-item" onClick={() => { openOverlay('moodboard'); setShowView(false) }}>
                Moodboard
                <span>All visual references</span>
              </button>
              <button className="tb-vm-item" onClick={() => { openOverlay('storyboard'); setShowView(false) }}>
                Storyboard
                <span>Panel sketches per scene</span>
              </button>
              <button className="tb-vm-item" onClick={() => { openOverlay('digest'); setShowView(false) }}>
                Digest
                <span>Project overview &amp; activity</span>
              </button>
              <button className="tb-vm-item" onClick={() => { openOverlay('brief'); setShowView(false) }}>
                Brief
                <span>Creative brief</span>
              </button>
            </div>
          )}
        </div>

        {/* Generate ▾ — primary output action */}
        <div className="tb-view-wrap">
          <button className="tbb tbb-generate" onClick={() => { setShowGenerate(v => !v); setShowView(false) }} data-hover>
            Generate ▾
          </button>
          {showGenerate && (
            <div className="tb-view-menu" onMouseLeave={() => setShowGenerate(false)}>
              <button className="tb-vm-item" onClick={() => { openOverlay('callsheet'); setShowGenerate(false) }}>
                Call Sheet
                <span>Day-of production document</span>
              </button>
              <button className="tb-vm-item" onClick={() => { onWrap?.(); setShowGenerate(false) }}>
                Wrap document
                <span>Final deliverable PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* ⌘K */}
        <button className="tbb-palette" onClick={() => window.__openPalette?.()} data-hover title="Command palette (⌘K)">
          ⌘K
        </button>
      </div>
    </header>
  )
}
