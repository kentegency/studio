import { useEffect } from 'react'
import { useFocusTrap } from '../lib/useFocusTrap'
import './Confirm.css'

export default function ConfirmModal({ title, body, confirmLabel, confirmColor, onConfirm, onCancel, danger = false }) {
  const panelRef = useFocusTrap(true)

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onCancel])

  return (
    <div className="confirm-overlay"
      role="dialog" aria-modal="true" aria-labelledby="confirm-title"
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="confirm-panel" ref={panelRef}>
        <div className="confirm-head">
          {danger && <div className="confirm-danger-dot" />}
          <div className="confirm-title" id="confirm-title">{title}</div>
        </div>
        {body && <div className="confirm-body">{body}</div>}
        <div className="confirm-foot">
          <button className="confirm-cancel" onClick={onCancel}>Cancel</button>
          <button
            className="confirm-btn"
            style={{
              color: confirmColor ?? (danger ? '#E05050' : '#F5920C'),
              borderColor: `${confirmColor ?? (danger ? '#E05050' : '#F5920C')}40`,
            }}
            onClick={onConfirm}>
            {confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
