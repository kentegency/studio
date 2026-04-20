import { useState, useRef, useEffect } from 'react'
import { useUIStore } from '../../stores'
import './Sidebar.css'

const LOGO_PIXELS = [
  '#D4AA6A', '#3A3025',
  '#3A3025', '#D4AA6A',
]

const DashIcon     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
const BellIcon     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
const SketchIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><circle cx="11" cy="11" r="2" fill="none"/></svg>
const UploadIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
const PublishIcon  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
const StageIcon    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
const SettingsIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>

// Tooltip component
function Tooltip({ text, shortcut }) {
  return (
    <div className="sb-tooltip">
      <span className="sbt-text">{text}</span>
      {shortcut && <span className="sbt-key">{shortcut}</span>}
    </div>
  )
}

function SbIcon({ Icon, active, onClick, count, title, shortcut, danger }) {
  return (
    <button
      className={`sbi ${active ? 'on' : ''} ${danger ? 'danger' : ''}`}
      onClick={onClick} data-hover
      aria-label={title}>
      <Icon />
      {count > 0 && <span className="sbi-count">{count > 9 ? '9+' : count}</span>}
      <Tooltip text={title} shortcut={shortcut} />
    </button>
  )
}

export default function Sidebar({ onUpload, onPublish, onNotifs, notifCount, onSettings, onActs }) {
  const { openOverlay, showToast, setScreen } = useUIStore()
  const [active, setActive] = useState('canvas')
  const click = (key, action) => { setActive(key); if (action) action() }

  return (
    <aside className="sidebar">
      <div className="sb-logo" title="The Kentegency Studio">
        {LOGO_PIXELS.map((c, i) => <div key={i} className="sb-px" style={{ background: c }} />)}
      </div>

      <SbIcon Icon={DashIcon}   active={active==='dash'}   title="Dashboard"
        shortcut="G D"
        onClick={() => click('dash', () => setScreen('dashboard'))} />

      <SbIcon Icon={BellIcon}   active={active==='notifs'} title="Notifications"
        shortcut="G N" count={notifCount}
        onClick={() => click('notifs', () => onNotifs?.())} />

      <div className="sb-divider" />

      <SbIcon Icon={UploadIcon} active={active==='upload'} title="Upload assets"
        shortcut="U"
        onClick={() => click('upload', () => onUpload?.())} />

      <SbIcon Icon={PublishIcon} active={active==='publish'} title="Publish to rooms"
        shortcut="P"
        onClick={() => click('publish', () => onPublish?.())} />

      <SbIcon Icon={SketchIcon} active={active==='sketch'} title="Sketch — freehand annotation"
        shortcut="S"
        onClick={() => click('sketch', () => openOverlay('sketch'))} />

      <div className="sb-spacer" />

      <SbIcon Icon={StageIcon}   active={active==='stage'}   title="Stage mode — present scenes"
        shortcut="⌥ S"
        onClick={() => click('stage', () => { openOverlay('stage'); showToast('Lights up.') })} />

      <SbIcon Icon={SettingsIcon} active={active==='settings'} title="Project settings"
        onClick={() => click('settings', () => onSettings?.())} />
    </aside>
  )
}
