import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useProjectStore, useUIStore, useNodeStore } from '../../stores'
import './Notifications.css'

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso)
  if (diff < 60000)    return 'just now'
  if (diff < 3600000)  return `${Math.floor(diff/60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`
  return `${Math.floor(diff/86400000)}d ago`
}

const ROOM_COLORS = {
  meeting: 'var(--teal)',
  window:  'var(--green)',
  studio:  'var(--accent)',
}

export default function Notifications({ onClose }) {
  const { currentProject }        = useProjectStore()
  const { nodes, selectNode }     = useNodeStore()
  const { showToast, setTab }     = useUIStore()
  const [items,   setItems]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter,  setFilter]      = useState('all') // all | approvals | comments | activity

  useEffect(() => {
    if (!currentProject) { setLoading(false); return }
    fetchAll()

    // Real-time — watch notes (comments + approvals) and node status changes
    const sub = supabase
      .channel(`notifs:${currentProject.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notes',
        filter: `project_id=eq.${currentProject.id}`,
      }, (payload) => {
        const note = payload.new
        const node = nodes.find(n => n.id === note.node_id)
        addItem({
          id:       note.id,
          type:     note.body?.startsWith('Client approved') ? 'approval' : 'comment',
          body:     note.body,
          scene:    node?.name,
          nodeId:   note.node_id,
          room:     note.room,
          time:     note.created_at,
          color:    note.color,
        })
        showToast(note.body?.startsWith('Client approved') ? '✓ Client approved a scene.' : 'New comment added.')
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'nodes',
        filter: `project_id=eq.${currentProject.id}`,
      }, (payload) => {
        const n = payload.new
        const old = payload.old
        if (n.status !== old.status) {
          addItem({
            id:    `status-${n.id}-${Date.now()}`,
            type:  'status',
            body:  `${n.name} moved to ${n.status}`,
            scene: n.name,
            nodeId:n.id,
            room:  'studio',
            time:  new Date().toISOString(),
            color: null,
          })
        }
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [currentProject?.id])

  const addItem = (item) => setItems(prev => [item, ...prev])

  const fetchAll = async () => {
    setLoading(true)
    const { data: notes } = await supabase
      .from('notes')
      .select('*, nodes(name)')
      .eq('project_id', currentProject.id)
      .order('created_at', { ascending: false })
      .limit(40)

    const mapped = (notes ?? []).map(n => ({
      id:     n.id,
      type:   n.body?.startsWith('Client approved') ? 'approval'
            : n.room === 'window' ? 'client'
            : 'comment',
      body:   n.body,
      scene:  n.nodes?.name,
      nodeId: n.node_id,
      room:   n.room,
      time:   n.created_at,
      color:  n.color,
    }))

    setItems(mapped)
    setLoading(false)
  }

  const filtered = items.filter(i => {
    if (filter === 'all')       return true
    if (filter === 'approvals') return i.type === 'approval'
    if (filter === 'comments')  return i.type === 'comment' || i.type === 'client'
    if (filter === 'activity')  return i.type === 'status'
    return true
  })

  const TYPE_ICON = {
    approval: '✓',
    client:   '⬡',
    comment:  '◈',
    status:   '◐',
  }
  const TYPE_COLOR = {
    approval: 'var(--green)',
    client:   'var(--teal)',
    comment:  'var(--accent)',
    status:   'var(--ghost)',
  }

  const jumpToScene = (nodeId) => {
    if (!nodeId) return
    const node = nodes.find(n => n.id === nodeId)
    if (node) { selectNode(node); setTab('node'); onClose() }
  }

  return (
    <div className="notif-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="notif-panel">

        {/* Header */}
        <div className="notif-head">
          <div>
            <span className="notif-title">Activity</span>
            {currentProject && <span className="notif-project">{currentProject.name}</span>}
          </div>
          <button className="notif-close" onClick={onClose} data-hover>×</button>
        </div>

        {/* Filter tabs */}
        <div className="notif-filters">
          {[
            { k:'all',       label:'All' },
            { k:'approvals', label:'Approvals' },
            { k:'comments',  label:'Comments' },
            { k:'activity',  label:'Status' },
          ].map(f => (
            <button key={f.k}
              className={`nf-tab ${filter === f.k ? 'on' : ''}`}
              onClick={() => setFilter(f.k)}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Feed */}
        <div className="notif-body">
          {loading && (
            <div className="notif-loading">Loading activity…</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="notif-empty">
              <div className="ne-title">No {filter === 'all' ? '' : filter} activity yet</div>
              <div className="ne-sub">
                {filter === 'approvals' ? 'Client approvals will appear here.' :
                 filter === 'comments'  ? 'Comments from your team and client appear here.' :
                 filter === 'activity'  ? 'Scene status changes appear here.' :
                 'Notes, approvals, and status changes appear here in real time.'}
              </div>
            </div>
          )}

          {filtered.map((item) => (
            <div key={item.id}
              className={`notif-item ${item.nodeId ? 'clickable' : ''}`}
              onClick={() => jumpToScene(item.nodeId)}>
              <div className="ni-icon" style={{ color: TYPE_COLOR[item.type] ?? 'var(--accent)' }}>
                {TYPE_ICON[item.type] ?? '◉'}
              </div>
              <div className="ni-content">
                <div className="ni-body">{item.body?.slice(0, 100)}{item.body?.length > 100 ? '…' : ''}</div>
                <div className="ni-meta">
                  {item.scene && <span className="ni-scene">{item.scene}</span>}
                  {item.scene && <span> · </span>}
                  <span style={{ color: ROOM_COLORS[item.room] ?? 'var(--mute)' }}>
                    {item.room}
                  </span>
                  <span> · {timeAgo(item.time)}</span>
                </div>
              </div>
              {item.nodeId && <div className="ni-arrow">→</div>}
            </div>
          ))}
        </div>

        <div className="notif-foot">
          <span className="notif-hint">Click any item to jump to that scene.</span>
        </div>
      </div>
    </div>
  )
}
