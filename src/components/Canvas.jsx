import { useState } from 'react'
import Sidebar from './shell/Sidebar'
import Topbar from './shell/Topbar'
import Timeline from './canvas/Timeline'
import Minimap from './shell/Minimap'
import RightPanel from './shell/RightPanel'
import QuickCapture from './capture/QuickCapture'
import Upload from './upload/Upload'
import PublishPanel from './publish/PublishPanel'
import SketchOverlay from './overlays/SketchOverlay'
import CompareOverlay from './overlays/CompareOverlay'
import StageOverlay from './overlays/StageOverlay'
import BriefOverlay from './overlays/BriefOverlay'
import DigestOverlay from './overlays/DigestOverlay'
import { useUIStore } from '../stores'
import './Canvas.css'
import './upload/Upload.css'
import './publish/Publish.css'

export default function Canvas() {
  const { overlays } = useUIStore()
  const [showUpload,  setShowUpload]  = useState(false)
  const [showPublish, setShowPublish] = useState(false)

  return (
    <div className="canvas-shell">
      <div className="canvas-grain" />
      <div className="canvas-scan" />

      <Sidebar
        onUpload={() => setShowUpload(true)}
        onPublish={() => setShowPublish(true)} />
      <Topbar />
      <main className="canvas-main"><Timeline /></main>
      <Minimap />
      <RightPanel
        onUpload={() => setShowUpload(true)}
        onPublish={() => setShowPublish(true)} />

      <QuickCapture />

      {showUpload   && <Upload       onClose={() => setShowUpload(false)} />}
      {showPublish  && <PublishPanel onClose={() => setShowPublish(false)} />}

      {overlays.sketch  && <SketchOverlay />}
      {overlays.compare && <CompareOverlay />}
      {overlays.stage   && <StageOverlay />}
      {overlays.brief   && <BriefOverlay />}
      {overlays.digest  && <DigestOverlay />}
    </div>
  )
}
