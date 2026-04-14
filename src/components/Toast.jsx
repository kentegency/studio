import { useUIStore } from '../stores'

export function Toast() {
  const { toast } = useUIStore()
  return (
    <div className={`toast ${toast.visible ? 'on' : ''}`}
      style={{ borderLeftColor: toast.color }}>
      {toast.message}
    </div>
  )
}

export function OfflineBanner() {
  const offline = useUIStore(s => s.offline)
  return (
    <div className={`offline-bar ${offline ? 'on' : ''}`}>
      <div className="offline-dot" />
      Working dark — syncing when signal returns
    </div>
  )
}
