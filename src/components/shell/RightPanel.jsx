import { useState, useEffect } from 'react'
import { useUIStore } from '../../stores'
import NodePane from '../panel/NodePane'
import { ShotsPane } from '../panel/ShotsPane'
import { TeamPane }  from '../panel/ShotsPane'
import { StylePane } from '../panel/ShotsPane'
import './RightPanel.css'

const TABS = [
  { key: 'node',  label: 'Node'  },
  { key: 'shots', label: 'Shots' },
  { key: 'team',  label: 'Team'  },
  { key: 'style', label: 'Style' },
]

export default function RightPanel({ onUpload }) {
  const { activeTab, setTab } = useUIStore()
  const [visible, setVisible] = useState(false)

  const switchTab = (key) => {
    setVisible(false)
    setTimeout(() => { setTab(key); setVisible(true) }, 130)
  }

  useEffect(() => { setTimeout(() => setVisible(true), 100) }, [])

  const panes = {
    node:  () => <NodePane onUpload={onUpload} />,
    shots: () => <ShotsPane />,
    team:  () => <TeamPane />,
    style: () => <StylePane />,
  }
  const ActivePane = panes[activeTab] ?? panes.node

  return (
    <aside className="right-panel">
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
