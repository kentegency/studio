// MobileSheet.jsx — slide-up bottom sheet for mobile CD canvas
// Shows core scene actions when a node is tapped on mobile
// Replaces the hidden right panel for essential on-location actions
import { useState, useEffect } from 'react'
import { useNodeStore, useNotesStore, useAuthStore, useProjectStore, useUIStore } from '../../stores'
import { supabase } from '../../lib/supabase'
import './MobileSheet.css'

const STATUS_LABELS = {
  concept:  { label: 'Concept',  color: '#3A3828' },
  progress: { label: 'In Progress', color: 'var(--accent)' },
  review:   { label: 'In Review',   color: '#C07010' },
  approved: { label: 'Approved',    color: '#4ADE80' },
  locked:   { label: 'Locked',      color: '#4ADE80' },
}
const STATUS_ORDER = ['concept','progress','review','approved','locked']

export default function MobileSheet({ onUpload }) {
  const { selectedNode, updateNode, nodes } = useNodeStore()
  const { addNote }        = useNotesStore()
  const { user }           = useAuthStore()
  const { currentProject } = useProjectStore()
  const { showToast, setTab } = useUIStore()

  const [open,    setOpen]    = useState(false)
  const [note,    setNote]    = useState('')
  const [adding,  setAdding]  = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [assetCount, setAssetCount] = useState(0)
  const [shotCount,  setShotCount]  = useState(0)

  // Open when a node is selected on mobile
  useEffect(() => {
    if (selectedNode) {
      setOpen(true)
      setAdding(false)
      setNote('')
      // Fetch counts
      if (currentProject) {
        supabase.from('assets').select('id', { count: 'exact' })
          .eq('node_id', selectedNode.id)
          .then(({ count }) => setAssetCount(count ?? 0))
        supabase.from('shots').select('id', { count: 'exact' })
          .eq('node_id', selectedNode.id)
          .then(({ count }) => setShotCount(count ?? 0))
      }
    } else {
      setOpen(false)
    }
  }, [selectedNode?.id])

  if (!selectedNode) return null

  const status     = selectedNode.status ?? 'concept'
  const statusInfo = STATUS_LABELS[status] ?? STATUS_LABELS.concept
  const nextStatus = STATUS_ORDER[(STATUS_ORDER.indexOf(status) + 1) % STATUS_ORDER.length]

  const cycleStatus = async () => {
    await updateNode(selectedNode.id, { status: nextStatus })
    showToast(`Status → ${nextStatus}`)
  }

  const saveNote = async () => {
    if (!note.trim() || !currentProject) return
    setSaving(true)
    await addNote({
      project_id: currentProject.id,
      node_id:    selectedNode.id,
      author_id:  user?.id,
      body:       note.trim(),
      color:      'var(--accent)',
      room:       'studio',
    })
    setSaving(false)
    setNote('')
    setAdding(false)
    showToast('Note saved.')
  }

  const prod = selectedNode.production_data ?? {}

  return (
    <>
      {/* Backdrop — tap to close */}
      {open && (
        <div className="ms-backdrop" onClick={() => setOpen(false)} />
      )}

      <div className={`ms-sheet ${open ? 'open' : ''}`}>
        {/* Handle */}
        <div className="ms-handle-wrap" onClick={() => setOpen(o => !o)}>
          <div className="ms-handle" />
        </div>

        {/* Scene header */}
        <div className="ms-header">
          <div className="ms-scene-name">{selectedNode.name}</div>
          <div className="ms-scene-meta">
            {prod.elements?.int_ext && (
              <span className="ms-badge">{prod.elements.int_ext}</span>
            )}
            {prod.shoot_day && (
              <span className="ms-badge ms-badge-day">Day {prod.shoot_day}</span>
            )}
            {prod.location?.name && (
              <span className="ms-badge">{prod.location.name}</span>
            )}
          </div>
        </div>

        {/* Status row */}
        <div className="ms-status-row">
          <div className="ms-status-info">
            <div className="ms-status-dot" style={{ background: statusInfo.color }} />
            <span style={{ color: statusInfo.color }}>{statusInfo.label}</span>
          </div>
          <button className="ms-cycle-btn" onClick={cycleStatus}>
            Advance to {STATUS_LABELS[nextStatus]?.label} →
          </button>
        </div>

        {/* Quick stats */}
        <div className="ms-stats">
          <div className="ms-stat">
            <span className="ms-stat-val">{shotCount}</span>
            <span className="ms-stat-label">shots</span>
          </div>
          <div className="ms-stat">
            <span className="ms-stat-val">{assetCount}</span>
            <span className="ms-stat-label">assets</span>
          </div>
          {prod.post && Object.values(prod.post).some(Boolean) && (
            <div className="ms-stat">
              <span className="ms-stat-val">{Object.values(prod.post).filter(Boolean).length}</span>
              <span className="ms-stat-label">post flags</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {!adding ? (
          <div className="ms-actions">
            <button className="ms-action" onClick={() => setAdding(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add note
            </button>
            <button className="ms-action" onClick={() => onUpload?.()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload
            </button>
            {prod.location?.gps || prod.location?.address ? (
              <a className="ms-action"
                href={`https://maps.google.com/?q=${encodeURIComponent(prod.location.gps || prod.location.address)}`}
                target="_blank" rel="noreferrer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                Location
              </a>
            ) : null}
          </div>
        ) : (
          <div className="ms-note-form">
            <textarea
              className="ms-note-input"
              placeholder="What are you thinking about this scene?"
              value={note}
              onChange={e => setNote(e.target.value)}
              autoFocus
              rows={3}
            />
            <div className="ms-note-actions">
              <button className="ms-note-save" onClick={saveNote} disabled={saving || !note.trim()}>
                {saving ? 'Saving…' : 'Save note'}
              </button>
              <button className="ms-note-cancel" onClick={() => { setAdding(false); setNote('') }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
