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
import SketchOverlay from './overlays/SketchOverlay'
import CompareOverlay from './overlays/CompareOverlay'
import StageOverlay from './overlays/StageOverlay'
import BriefOverlay from './overlays/BriefOverlay'
import DigestOverlay from './overlays/DigestOverlay'
import { useUIStore, useProjectStore } from '../stores'
import { supabase } from '../lib/supabase'
import './Canvas.css'
import './upload/Upload.css'
import './publish/Publish.css'
import './shell/Notifications.css'

export default function Canvas() {
  const { overlays } = useUIStore()
  const { currentProject } = useProjectStore()
  const [showUpload,  setShowUpload]  = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [showNotifs,  setShowNotifs]  = useState(false)
  const [notifCount,  setNotifCount]  = useState(0)

  // Real-time notification count
  useEffect(() => {
    if (!currentProject) return
    fetchUnread()

    const sub = supabase
      .channel(`notif-count-${currentProject.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notes',
        filter: `project_id=eq.${currentProject.id}`,
      }, (payload) => {
        if (payload.new.room !== 'studio') {
          setNotifCount(n => n + 1)
        }
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [currentProject?.id])

  const fetchUnread = async () => {
    const { count } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', currentProject.id)
      .neq('room', 'studio')
      .gte('created_at', new Date(Date.now() - 86400000).toISOString())
    setNotifCount(count ?? 0)
  }

  const openNotifs = () => {
    setShowNotifs(true)
    setNotifCount(0)
  }

  return (
    <div className="canvas-shell">
      <div className="canvas-grain" />
      <div className="canvas-scan" />

      <Sidebar
        onUpload={() => setShowUpload(true)}
        onPublish={() => setShowPublish(true)}
        onNotifs={openNotifs}
        notifCount={notifCount} />
      <Topbar />
      <main className="canvas-main"><Timeline /></main>
      <Minimap />
      <RightPanel
        onUpload={() => setShowUpload(true)}
        onPublish={() => setShowPublish(true)} />

      <QuickCapture />

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
