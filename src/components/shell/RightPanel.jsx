import { useState, useEffect } from 'react'
import { useUIStore, useProjectStore } from '../../stores'
import { getVocab } from '../../lib/vocabulary'
import NodePane from '../panel/NodePane'
import { ShotsPane } from '../panel/ShotsPane'
import { TeamPane }  from '../panel/ShotsPane'
import { StylePane } from '../panel/ShotsPane'
import WindowPreview from '../panel/WindowPreview'
import BiblePane from '../bible/BiblePane'
import './RightPanel.css'


export default function RightPanel({ onUpload, onPublish, onInvite, onSettings }) {
  const { activeTab, setTab, activeRoom } = useUIStore()
  const { currentProject } = useProjectStore()
  const [visible, setVisible] = useState(false)
  const vocab = getVocab(currentProject?.type)

  const TABS = [
    { key: 'node',   label: vocab.node     },
    { key: 'shots',  label: vocab.shots    },
    { key: 'team',   label: vocab.crew     },
    { key: 'people', label: vocab.subjects },
    { key: 'style',  label: 'Identity'    },
  ]

  const switchTab = (key) => {
    setVisible(false)
    setTimeout(() => { setTab(key); setVisible(true) }, 130)
  }

  useEffect(() => { setTimeout(() => setVisible(true), 100) }, [])

  // 1–5 keys switch tabs when no input is focused
  useEffect(() => {
    const TAB_KEYS = { '1':'node', '2':'shots', '3':'team', '4':'people', '5':'style' }
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const key = TAB_KEYS[e.key]
      if (key) switchTab(key)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

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
    node:   () => <NodePane onUpload={onUpload} onPublish={onPublish} />,
    shots:  () => <ShotsPane />,
    team:   () => <TeamPane onInvite={onInvite} />,
    people: () => <BiblePane />,
    style:  () => <StylePane onOpenSettings={onSettings} />,
  }
  const ActivePane = panes[activeTab] ?? panes.node

  return (
    <aside className="right-panel">
      {activeRoom === 'meeting' && (
        <div className="rp-room-banner meeting">
          <span className="rrb-dot" style={{ background:'var(--teal)' }} />
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
