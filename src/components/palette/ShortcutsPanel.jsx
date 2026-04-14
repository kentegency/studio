import './Shortcuts.css'

const SHORTCUTS = [
  { section: 'Global' },
  { key: '⌘ K',      label: 'Command palette — access anything' },
  { key: '⌘ Z',      label: 'Undo last action' },
  { key: '?',         label: 'Show keyboard shortcuts' },
  { key: 'Esc',       label: 'Close panel / modal / scene' },

  { section: 'Canvas' },
  { key: 'Z',         label: 'Zoom in on arc' },
  { key: 'X',         label: 'Zoom out on arc' },
  { key: 'F',         label: 'Fit arc to canvas' },
  { key: 'S',         label: 'Advance status on selected scene' },
  { key: 'Click node', label: 'Open scene inspector' },

  { section: 'Scene mode' },
  { key: '←',         label: 'Previous scene' },
  { key: '→',         label: 'Next scene' },
  { key: 'Esc',       label: 'Back to arc view' },

  { section: 'Views' },
  { key: 'M',         label: 'Open Moodboard — all visual references' },
  { key: '⌥ S',       label: 'Open Stage mode — present scenes' },
  { key: 'S',         label: 'Advance status on selected scene' },
  { key: 'G D',       label: 'Go to dashboard' },
  { key: 'G N',       label: 'Go to notifications' },
  { key: 'U',         label: 'Upload assets' },
  { key: 'P',         label: 'Publish to rooms' },
  { key: 'S',         label: 'Open sketch canvas' },
  { key: '⌥ S',       label: 'Open Stage mode' },
]

export default function ShortcutsPanel({ onClose }) {
  return (
    <div className="kbs-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="kbs-panel">
        <div className="kbs-head">
          <div>
            <div className="kbs-title">Keyboard shortcuts</div>
            <div className="kbs-sub">Press ? anywhere to show this panel</div>
          </div>
          <button className="kbs-close" onClick={onClose}>×</button>
        </div>
        <div className="kbs-body">
          {SHORTCUTS.map((s, i) => (
            s.section ? (
              <div key={i} className="kbs-section">{s.section}</div>
            ) : (
              <div key={i} className="kbs-row">
                <span className="kbs-label">{s.label}</span>
                <span className="kbs-key">{s.key}</span>
              </div>
            )
          ))}
        </div>
        <div className="kbs-footer">
          More shortcuts coming in Sprint 8B
        </div>
      </div>
    </div>
  )
}
