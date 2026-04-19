import { useState, useEffect, useRef, useCallback } from 'react'
import { useUIStore, useProjectStore, useNodeStore, useAuthStore } from '../../stores'
import { getVocab } from '../../lib/vocabulary'
import './Palette.css'

// ── COMMAND REGISTRY ─────────────────────────────────────────
function useCommands({ onUpload, onInvite, onSettings, onWrap, onActs, onVoice, onClose }) {
  const { openOverlay, setRoom, setTab, setScreen, showToast } = useUIStore()
  const { currentProject }                                      = useProjectStore()
  const { nodes, selectNode }                                   = useNodeStore()
  const vocab = getVocab(currentProject?.type)

  return [
    // ── NAVIGATION
    { id:'dashboard',   group:'Navigate',  label:'Go to dashboard',          shortcut:'G D', icon:'⌂',
      action: () => { setScreen('dashboard'); onClose() } },
    { id:'studio',      group:'Navigate',  label:'Switch to Studio room',     shortcut:'',    icon:'◈',
      action: () => { setRoom('studio');  showToast('Studio — your private view.'); onClose() } },
    { id:'meeting',     group:'Navigate',  label:'Switch to Meeting room',    shortcut:'',    icon:'◈',
      action: () => { setRoom('meeting'); showToast('Meeting — shared with contributors.'); onClose() } },
    { id:'window',      group:'Navigate',  label:'Switch to Window room',     shortcut:'',    icon:'◈',
      action: () => { setRoom('window');  showToast('Window — what your client sees.'); onClose() } },

    // ── VIEWS
    { id:'stage',       group:'View',      label:'Open Stage mode',           shortcut:'⌥ S', icon:'▶',
      action: () => { openOverlay('stage'); onClose() } },
    { id:'moodboard',   group:'View',      label:'Open Moodboard — all references', shortcut:'M', icon:'⊡',
      action: () => { openOverlay('moodboard'); onClose() } },
    { id:'storyboard',  group:'View',      label:'Open Storyboard — panel sketches', shortcut:'B', icon:'▦',
      action: () => { openOverlay('storyboard'); onClose() } },
    { id:'brief',       group:'View',      label:'Open Creative Brief',       shortcut:'',    icon:'☰',
      action: () => { openOverlay('brief'); onClose() } },
    { id:'digest',      group:'View',      label:'Open Project Digest',       shortcut:'',    icon:'◎',
      action: () => { openOverlay('digest'); onClose() } },
    { id:'sketch',      group:'View',      label:'Open Sketch canvas',        shortcut:'S',   icon:'✏',
      action: () => { openOverlay('sketch'); onClose() } },
    { id:'listview',    group:'View',      label:`Toggle list / arc view`,    shortcut:'L',   icon:'≡',
      action: () => { showToast('Press L on the canvas to toggle list view.'); onClose() } },

    // ── GENERATE
    { id:'callsheet',   group:'Generate',  label:'Generate call sheet',       shortcut:'',    icon:'☰',
      action: () => { openOverlay('callsheet'); onClose() } },
    { id:'wrap',        group:'Generate',  label:'Generate Wrap document',    shortcut:'',    icon:'⊡',
      action: () => { onWrap?.(); onClose() } },

    // ── ACTIONS
    { id:'upload',      group:'Action',    label:'Upload assets to scene',    shortcut:'U',   icon:'↑',
      action: () => { onUpload?.(); onClose() } },
    { id:'publish',     group:'Action',    label:'Publish to rooms',          shortcut:'P',   icon:'→',
      action: () => { openOverlay('publish'); onClose() } },
    { id:'voice',       group:'Action',    label:'Record voice note',         shortcut:'',    icon:'◉',
      action: () => { onVoice?.(); onClose() } },
    { id:'acts',        group:'Action',    label:'Manage act zones',          shortcut:'',    icon:'⋮',
      action: () => { onActs?.(); onClose() } },
    { id:'settings',    group:'Action',    label:'Open project settings',     shortcut:'',    icon:'⚙',
      action: () => { onSettings?.(); onClose() } },
    { id:'invite',      group:'Action',    label:'Invite contributor',        shortcut:'',    icon:'⊕',
      action: () => { onInvite?.(); onClose() } },

    // ── PANEL TABS — vocabulary-aware labels
    { id:'tab-node',    group:'Panel',     label:`Switch to ${vocab.node} tab`,     shortcut:'1', icon:'◇',
      action: () => { setTab('node');   onClose() } },
    { id:'tab-shots',   group:'Panel',     label:`Switch to ${vocab.shots} tab`,    shortcut:'2', icon:'◇',
      action: () => { setTab('shots');  onClose() } },
    { id:'tab-team',    group:'Panel',     label:`Switch to ${vocab.crew} tab`,     shortcut:'3', icon:'◇',
      action: () => { setTab('team');   onClose() } },
    { id:'tab-people',  group:'Panel',     label:`Switch to ${vocab.subjects} tab`, shortcut:'4', icon:'◇',
      action: () => { setTab('people'); onClose() } },
    { id:'tab-style',   group:'Panel',     label:'Switch to Identity tab',          shortcut:'5', icon:'◇',
      action: () => { setTab('style');  onClose() } },

    // ── SCENES (dynamic)
    ...nodes.slice(0, 12).map(n => ({
      id:    `scene-${n.id}`,
      group: vocab.nodes,
      label: `Open ${vocab.node.toLowerCase()}: ${n.name}`,
      shortcut: '',
      icon:  '○',
      status: n.status,
      action: () => {
        selectNode(n)
        onClose()
        showToast(n.name)
      },
    })),
  ]
}

// ── FUZZY MATCH ───────────────────────────────────────────────
function fuzzyMatch(query, text) {
  if (!query) return { match: true, score: 0, indices: [] }
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (t.includes(q)) {
    return { match: true, score: 100 - t.indexOf(q), indices: [] }
  }
  // Character-by-character fuzzy
  let qi = 0, score = 0, indices = []
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) { indices.push(ti); score += (qi === 0 ? 10 : 5); qi++ }
  }
  return { match: qi === q.length, score, indices }
}

// ── HIGHLIGHT ─────────────────────────────────────────────────
function Highlight({ text, query }) {
  if (!query) return <span>{text}</span>
  const { indices } = fuzzyMatch(query, text)
  if (!indices.length) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx !== -1) {
      return <>
        <span>{text.slice(0, idx)}</span>
        <span className="pal-match">{text.slice(idx, idx + query.length)}</span>
        <span>{text.slice(idx + query.length)}</span>
      </>
    }
    return <span>{text}</span>
  }
  const parts = []
  let last = 0
  indices.forEach(i => {
    if (i > last) parts.push(<span key={`t${i}`}>{text.slice(last, i)}</span>)
    parts.push(<span key={`m${i}`} className="pal-match">{text[i]}</span>)
    last = i + 1
  })
  if (last < text.length) parts.push(<span key="end">{text.slice(last)}</span>)
  return <>{parts}</>
}

const STATUS_COLOR = { concept:'#3A3020', progress:'var(--accent)', review:'#C07010', approved:'#4ADE80', locked:'#4ADE80' }

// ── PALETTE ───────────────────────────────────────────────────
export default function CommandPalette({ onClose, onUpload, onInvite, onSettings, onWrap, onActs, onVoice }) {
  const [query,     setQuery]     = useState('')
  const [selected,  setSelected]  = useState(0)
  const inputRef  = useRef(null)
  const listRef   = useRef(null)

  const commands = useCommands({ onUpload, onInvite, onSettings, onWrap, onActs, onVoice, onClose })

  // Filter + score
  const filtered = query
    ? commands
        .map(cmd => ({ cmd, ...fuzzyMatch(query, cmd.label) }))
        .filter(({ match }) => match)
        .sort((a, b) => b.score - a.score)
        .map(({ cmd }) => cmd)
    : commands

  // Group results
  const groups = filtered.reduce((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = []
    acc[cmd.group].push(cmd)
    return acc
  }, {})

  // Flat list for keyboard nav
  const flat = filtered

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { setSelected(0) }, [query])

  const execute = useCallback((cmd) => {
    cmd.action()
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected(s => Math.min(s + 1, flat.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected(s => Math.max(s - 1, 0))
      }
      if (e.key === 'Enter' && flat[selected]) {
        e.preventDefault()
        execute(flat[selected])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [flat, selected, execute, onClose])

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  let flatIdx = 0

  return (
    <div className="pal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pal-panel">
        {/* Search input */}
        <div className="pal-input-wrap">
          <svg className="pal-search-icon" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            className="pal-input"
            placeholder="Search commands, scenes, tools…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck="false" />
          <div className="pal-esc">Esc</div>
        </div>

        {/* Results */}
        <div className="pal-list" ref={listRef}>
          {flat.length === 0 && (
            <div className="pal-empty">No commands match "{query}"</div>
          )}
          {Object.entries(groups).map(([group, cmds]) => (
            <div key={group} className="pal-group">
              <div className="pal-group-label">{group}</div>
              {cmds.map(cmd => {
                const idx = flat.indexOf(cmd)
                const isSelected = idx === selected
                return (
                  <button key={cmd.id}
                    className={`pal-item ${isSelected ? 'selected' : ''}`}
                    data-idx={idx}
                    onClick={() => execute(cmd)}
                    onMouseEnter={() => setSelected(idx)}>
                    <span className="pal-icon">{cmd.icon}</span>
                    <span className="pal-label">
                      <Highlight text={cmd.label} query={query} />
                    </span>
                    {cmd.status && (
                      <span className="pal-status-dot"
                        style={{ background: STATUS_COLOR[cmd.status] ?? '#3A3020' }} />
                    )}
                    {cmd.shortcut && (
                      <span className="pal-shortcut">{cmd.shortcut}</span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pal-footer">
          <span>↑↓ navigate</span>
          <span>↵ execute</span>
          <span>Esc dismiss</span>
        </div>
      </div>
    </div>
  )
}
