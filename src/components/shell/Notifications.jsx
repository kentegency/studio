import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useProjectStore, useUIStore } from '../../stores'
import './Notifications.css'

export default function Notifications({ onClose }) {
  const { currentProject } = useProjectStore()
  const { showToast }      = useUIStore()
  const [items, setItems]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentProject) { setLoading(false); return }
    fetchNotifications()

    // Real-time subscription — Sprint 3B
    const sub = supabase
      .channel(`project-${currentProject.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notes',
        filter: `project_id=eq.${currentProject.id}`,
      }, (payload) => {
        setItems(prev => [payload.new, ...prev])
        showToast('New activity on your project.')
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [currentProject?.id])

  const fetchNotifications = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('notes')
      .select('*, nodes(name)')
      .eq('project_id', currentProject.id)
      .neq('room', 'studio')
      .order('created_at', { ascending: false })
      .limit(30)
    setItems(data ?? [])
    setLoading(false)
  }

  const ROOM_COLORS = { meeting:'#1E8A8A', window:'#4ADE80', studio:'#F5920C' }

  const formatTime = (iso) => {
    if (!iso) return ''
    const diff = Date.now() - new Date(iso)
    if (diff < 60000)    return 'just now'
    if (diff < 3600000)  return `${Math.floor(diff/60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`
    return `${Math.floor(diff/86400000)}d ago`
  }

  return (
    <div className="notif-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="notif-panel">
        <div className="notif-head">
          <span className="notif-title">Activity</span>
          {currentProject && <span className="notif-project">{currentProject.name}</span>}
          <button className="notif-close" onClick={onClose} data-hover>×</button>
        </div>

        <div className="notif-body">
          {loading && (
            <div className="notif-loading">Loading activity…</div>
          )}

          {!loading && items.length === 0 && (
            <div className="notif-empty">
              <div className="ne-title">No activity yet</div>
              <div className="ne-sub">Notes, approvals, and reactions will appear here in real time.</div>
            </div>
          )}

          {items.map((item, i) => (
            <div key={item.id ?? i} className="notif-item">
              <div className="ni-dot" style={{ background: item.color ?? ROOM_COLORS[item.room] ?? '#F5920C' }} />
              <div className="ni-content">
                <div className="ni-body">{item.body}</div>
                <div className="ni-meta">
                  {item.nodes?.name && <span>{item.nodes.name} · </span>}
                  <span style={{ color: ROOM_COLORS[item.room] ?? 'var(--mute)' }}>{item.room}</span>
                  <span> · {formatTime(item.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="notif-foot">
          <span className="notif-hint">Updates in real time as your team and client interact.</span>
        </div>
      </div>
    </div>
  )
}
