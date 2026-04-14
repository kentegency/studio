import './EmptyState.css'

export default function EmptyState({ icon, title, body, action, onAction, compact = false }) {
  return (
    <div className={`empty-state ${compact ? 'compact' : ''}`}>
      {icon && <div className="es-icon">{icon}</div>}
      <div className="es-title">{title}</div>
      {body && <div className="es-body">{body}</div>}
      {action && onAction && (
        <button className="es-action" onClick={onAction} data-hover>
          {action}
        </button>
      )}
    </div>
  )
}
