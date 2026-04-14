import { useState, useEffect } from 'react'
import Sidebar from './shell/Sidebar'
import Topbar from './shell/Topbar'
import Timeline from './canvas/Timeline'
import Minimap from './shell/Minimap'
import RightPanel from './shell/RightPanel'
import QuickCapture from './capture/QuickCapture'
import Upload from './upload/Upload'
import PublishPanel from './publish/PublishPanel'
import Notifications from './shell/Notifications'
import AssetViewer from './viewer/Viewer'
import SettingsPanel from './settings/SettingsPanel'
import ActsPanel from './settings/ActsPanel'
import VoiceRecorder from './voice/VoiceRecorder'
import SketchOverlay from './overlays/SketchOverlay'
import CompareOverlay from './overlays/CompareOverlay'
import StageOverlay from './overlays/StageOverlay'
import BriefOverlay from './overlays/BriefOverlay'
import DigestOverlay from './overlays/DigestOverlay'
import InvitePanel from './contributor/InvitePanel'
import WrapPanel from './wrap/WrapPanel'
import './wrap/Wrap.css'
import './settings/Settings.css'
import './settings/Acts.css'
import './contributor/Contributor.css'
import CommandPalette from './palette/CommandPalette'
import ShortcutsPanel from './palette/ShortcutsPanel'
import ErrorBoundary from './ErrorBoundary'
import { useUIStore, useProjectStore } from '../stores'
import { supabase } from '../lib/supabase'
import './Canvas.css'
import './upload/Upload.css'
import './publish/Publish.css'
import './shell/Notifications.css'
import './viewer/Viewer.css'

export default function Canvas() {
  const { overlays } = useUIStore()
  const { currentProject } = useProjectStore()

  // Inject project accent colour as CSS variable
  useEffect(() => {
    const accent = currentProject?.accent_color ?? '#F5920C'
    document.documentElement.style.setProperty('--project-accent', accent)
    return () => document.documentElement.style.removeProperty('--project-accent')
  }, [currentProject?.accent_color])
  const [showUpload,   setShowUpload]   = useState(false)
  const [showPublish,  setShowPublish]  = useState(false)
  const [showNotifs,   setShowNotifs]   = useState(false)
  const [showInvite,   setShowInvite]   = useState(false)
  const [showWrap,     setShowWrap]     = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showActs,     setShowActs]     = useState(false)
  const [showVoice,    setShowVoice]    = useState(false)
  const [showPalette,   setShowPalette]   = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [notifCount,   setNotifCount]   = useState(0)
  const [viewerAsset,  setViewerAsset]  = useState(null)
  const [viewerList,   setViewerList]   = useState([])
  const [viewerIdx,    setViewerIdx]    = useState(0)

  // Expose viewer opener globally so NodePane can trigger it
  useEffect(() => {
    window.__openViewer = (asset, list, idx) => {
      setViewerAsset(asset)
      setViewerList(list)
      setViewerIdx(idx)
    }
    window.__openVoice    = () => setShowVoice(true)
    window.__openPalette  = () => setShowPalette(true)
    window.__openShortcuts= () => setShowShortcuts(true)
    return () => {
      delete window.__openViewer
      delete window.__openVoice
      delete window.__openPalette
      delete window.__openShortcuts
    }
  }, [])

  // Real-time notification count
  useEffect(() => {
    if (!currentProject) return
    fetchUnread()
    const sub = supabase
      .channel(`notif-count-${currentProject.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notes',
        filter: `project_id=eq.${currentProject.id}`,
      }, (payload) => {
        if (payload.new.room !== 'studio') setNotifCount(n => n + 1)
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [currentProject?.id])

  const fetchUnread = async () => {
    const { count } = await supabase.from('notes')
      .select('*', { count:'exact', head:true })
      .eq('project_id', currentProject.id)
      .neq('room', 'studio')
      .gte('created_at', new Date(Date.now() - 86400000).toISOString())
    setNotifCount(count ?? 0)
  }

  const closeViewer = () => setViewerAsset(null)
  const nextAsset   = () => { const i = viewerIdx + 1; if (i < viewerList.length) { setViewerAsset(viewerList[i]); setViewerIdx(i) } }
  const prevAsset   = () => { const i = viewerIdx - 1; if (i >= 0) { setViewerAsset(viewerList[i]); setViewerIdx(i) } }

  return (
    <div className="canvas-shell">
      <div className="canvas-grain" />
      <div className="canvas-scan" />

      <Sidebar
        onUpload={() => setShowUpload(true)}
        onPublish={() => setShowPublish(true)}
        onInvite={() => setShowInvite(true)}
        onWrap={() => setShowWrap(true)}
        onNotifs={() => { setShowNotifs(true); setNotifCount(0) }}
        notifCount={notifCount}
        onSettings={() => setShowSettings(true)}
        onActs={() => setShowActs(true)} />
      <Topbar onWrap={() => setShowWrap(true)} onSettings={() => setShowSettings(true)} onActs={() => setShowActs(true)} />
      <main className="canvas-main"><ErrorBoundary><Timeline /></ErrorBoundary></main>
      <Minimap />
      <RightPanel
        onUpload={() => setShowUpload(true)}
        onPublish={() => setShowPublish(true)}
        onInvite={() => setShowInvite(true)}
        onSettings={() => setShowSettings(true)} />

      <QuickCapture onVoice={() => setShowVoice(true)} />

      {/* Full-screen overlays — render at top level */}
      {viewerAsset  && <AssetViewer asset={viewerAsset} onClose={closeViewer}
        onNext={nextAsset} onPrev={prevAsset}
        hasNext={viewerIdx < viewerList.length - 1}
        hasPrev={viewerIdx > 0} />}

      {showWrap     && <WrapPanel     onClose={() => setShowWrap(false)} />}
      {showInvite   && <InvitePanel   onClose={() => setShowInvite(false)} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showActs     && <ActsPanel     onClose={() => setShowActs(false)} />}
      {showVoice    && <VoiceRecorder onClose={() => setShowVoice(false)} />}
      {showPalette  && (
        <CommandPalette
          onClose={() => setShowPalette(false)}
          onUpload={() => setShowUpload(true)}
          onInvite={() => setShowInvite(true)}
          onSettings={() => setShowSettings(true)}
          onWrap={() => setShowWrap(true)}
          onActs={() => setShowActs(true)}
          onVoice={() => setShowVoice(true)} />
      )}
      {showShortcuts && <ShortcutsPanel onClose={() => setShowShortcuts(false)} />}
      {showUpload   && <Upload       onClose={() => setShowUpload(false)} />}
      {showPublish  && <PublishPanel onClose={() => setShowPublish(false)} />}
      {showNotifs   && <Notifications onClose={() => setShowNotifs(false)} />}

      {overlays.sketch  && <SketchOverlay />}
      {overlays.compare && <CompareOverlay />}
      {overlays.stage   && <StageOverlay />}
      {overlays.brief   && <BriefOverlay />}
      {overlays.digest  && <DigestOverlay />}
    </div>
  )
}
