import { useState, useEffect, useRef } from 'react'
import { useUIStore } from '../stores'
import { undoStack } from '../lib/undo'
import './Toast.css'

// TOAST — shows message + optional undo button
export function Toast() {
  const { toast } = useUIStore()
  const [undoable, setUndoable] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    const unsub = undoStack.subscribe(stack => {
      setUndoable(stack[0] ?? null)
    })
    return unsub
  }, [])

  if (!toast.visible) return null

  const handleUndo = async () => {
    const action = undoStack.pop()
    if (action?.undo) {
      await action.undo()
      useUIStore.getState().showToast(`Undone: ${action.label}`, '#4ADE80')
    }
  }

  return (
    <div className={`toast-bar ${toast.visible ? 'in' : 'out'}`}>
      <div className="toast-dot" style={{ background: toast.color ?? '#F5920C' }} />
      <span className="toast-msg">{toast.message}</span>
      {undoable && (
        <button className="toast-undo" onClick={handleUndo}>
          ↩ Undo
        </button>
      )}
    </div>
  )
}

// OFFLINE BANNER
export function OfflineBanner() {
  const { offline } = useUIStore()
  if (!offline) return null
  return (
    <div className="offline-banner">
      Working dark — changes will sync when reconnected
    </div>
  )
}
