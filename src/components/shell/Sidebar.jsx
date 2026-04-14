import { useState } from 'react'
import { useUIStore } from '../../stores'
import './Sidebar.css'

const LOGO_PIXELS = [
  '#F4EFD8','#040402','#7A7A7A',
  '#F5920C','#7A7A7A','#040402',
  '#7A7A7A','#040402','#F4EFD8',
]

const DashIcon    = () => <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
const ProjIcon    = () => <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
const BellIcon    = () => <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
const SketchIcon  = () => <svg viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
const CompareIcon = () => <svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="18" rx="1"/><rect x="13" y="3" width="8" height="18" rx="1"/></svg>
const UploadIcon  = () => <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
const PublishIcon = () => <svg viewBox="0 0 24 24"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg>
const StageIcon   = () => <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
const SettingsIcon= () => <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>

function SbIcon({ Icon, active, onClick, count, title }) {
  return (
    <button className={`sbi ${active ? 'on' : ''}`}
      onClick={onClick} data-hover title={title}>
      <Icon />
      {count > 0 && <span className="sbi-count">{count > 9 ? '9+' : count}</span>}
    </button>
  )
}

export default function Sidebar({ onUpload, onPublish, onNotifs, notifCount }) {
  const { openOverlay, showToast, setScreen } = useUIStore()
  const [active, setActive] = useState('projects')
  const click = (key, action) => { setActive(key); if (action) action() }

  return (
    <aside className="sidebar">
      <div className="sb-logo">
        {LOGO_PIXELS.map((c, i) => <div key={i} className="sb-px" style={{ background: c }} />)}
      </div>

      <SbIcon Icon={DashIcon}    active={active==='dash'}    title="Dashboard"
        onClick={() => click('dash', () => setScreen('dashboard'))} />
      <SbIcon Icon={ProjIcon}    active={active==='projects'} title="Projects"
        onClick={() => click('projects')} />
      <SbIcon Icon={BellIcon}    active={active==='notifs'}   title="Notifications"
        count={notifCount}
        onClick={() => click('notifs', () => onNotifs?.())} />
      <SbIcon Icon={SketchIcon}  active={active==='sketch'}   title="Sketch"
        onClick={() => click('sketch',  () => openOverlay('sketch'))} />
      <SbIcon Icon={CompareIcon} active={active==='compare'}  title="Compare assets"
        onClick={() => click('compare', () => openOverlay('compare'))} />
      <SbIcon Icon={UploadIcon}  active={active==='upload'}   title="Upload assets"
        onClick={() => click('upload',  () => onUpload?.())} />
      <SbIcon Icon={PublishIcon} active={active==='publish'}  title="Publish to rooms"
        onClick={() => click('publish', () => onPublish?.())} />

      <div className="sb-spacer" />

      <SbIcon Icon={StageIcon}   active={active==='stage'}    title="Stage mode"
        onClick={() => click('stage', () => { openOverlay('stage'); showToast('Lights up.') })} />
      <SbIcon Icon={SettingsIcon}active={active==='settings'} title="Settings"
        onClick={() => click('settings', () => showToast('Settings coming in next sprint.'))} />
    </aside>
  )
}
