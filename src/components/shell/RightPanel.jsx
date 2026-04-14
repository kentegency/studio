import { useState, useEffect } from 'react'
import { useUIStore } from '../../stores'
import NodePane from '../panel/NodePane'
import { ShotsPane } from '../panel/ShotsPane'
import { TeamPane }  from '../panel/ShotsPane'
import { StylePane } from '../panel/ShotsPane'
import WindowPreview from '../panel/WindowPreview'
import './RightPanel.css'

const TABS = [
  { key: 'node',   label: 'Node'   },
  { key: 'shots',  label: 'Shots'  },
  { key: 'team',   label: 'Team'   },
  { key: 'style',  label: 'Style'  },
]

export default function RightPanel({ onUpload, onPublish, onInvite }) {
  const { activeTab, setTab, activeRoom } = useUIStore()
  const [visible, setVisible] = useState(false)

  const switchTab = (key) => {
    setVisible(false)
    setTimeout(() => { setTab(key); setVisible(true) }, 130)
  }

  useEffect(() => { setTimeout(() => setVisible(true), 100) }, [])

  // Window room shows a preview of what client sees
  if (activeRoom === 'window') {
    return (
      <aside className="right-panel">
        <div className="rp-room-banner window">
          <span className="rrb-dot" style={{ background:'#4ADE80' }} />
          Window — Client view
        </div>
        <div className={`pane-wrap ${visible ? 'visible' : ''}`}>
          <WindowPreview onPublish={onPublish} />
        </div>
      </aside>
    )
  }

  // Meeting room banner
  const panes = {
    node:  () => <NodePane onUpload={onUpload} onPublish={onPublish} />,
    shots: () => <ShotsPane />,
    team:  () => <TeamPane onInvite={onInvite} />,
    style: () => <StylePane />,
  }
  const ActivePane = panes[activeTab] ?? panes.node

  return (
    <aside className="right-panel">
      {activeRoom === 'meeting' && (
        <div className="rp-room-banner meeting">
          <span className="rrb-dot" style={{ background:'#1E8A8A' }} />
          Meeting — Contributor view
        </div>
      )}
      <div className="rp-tabs">
        {TABS.map(t => (
          <button key={t.key}
            className={`rp-tab ${activeTab === t.key ? 'on' : ''}`}
            onClick={() => switchTab(t.key)} data-hover>
            {t.label}
          </button>
        ))}
      </div>
      <div className={`pane-wrap ${visible ? 'visible' : ''}`}>
        <ActivePane />
      </div>
    </aside>
  )
}
