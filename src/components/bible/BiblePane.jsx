import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useProjectStore, useNodeStore, useUIStore } from '../../stores'
import './Bible.css'

// ── ICONS ────────────────────────────────────────────────────
const AddIcon    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const PersonIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const ChevronIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
const BackIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
const CloseIcon  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>

// ── STATUS CONFIG ─────────────────────────────────────────────
const CONTACT_STATUS = {
  prospect:  { label: 'Prospect',  color: '#6A6258' },
  contacted: { label: 'Contacted', color: 'var(--accent)' },
  confirmed: { label: 'Confirmed', color: 'var(--teal)' },
  filmed:    { label: 'Filmed',    color: '#4ADE80' },
  declined:  { label: 'Declined',  color: '#E05050' },
}

const SUBJECT_CATEGORIES = [
  'Artist', 'Director', 'Producer', 'Academic', 'Executive',
  'Politician', 'Cultural', 'Institutional', 'Talent', 'Other',
]

// ── AVATAR ────────────────────────────────────────────────────
function Avatar({ name, color, size = 32 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="bible-avatar" style={{ width: size, height: size, background: `${color}22`, border: `.5px solid ${color}44`, color }}>
      {initials}
    </div>
  )
}

// ── SUBJECT FORM ──────────────────────────────────────────────
function SubjectForm({ subject, nodes, onSave, onClose }) {
  const [form, setForm] = useState({
    name:        subject?.name        ?? '',
    title:       subject?.title       ?? '',
    organisation:subject?.organisation?? '',
    category:    subject?.category    ?? 'Other',
    contact_status: subject?.contact_status ?? 'prospect',
    contact_info:subject?.contact_info ?? '',
    node_ids:    subject?.node_ids    ?? [],
    notes:       subject?.notes       ?? '',
    color:       subject?.color       ?? 'var(--teal)',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const COLORS = ['var(--teal)','var(--accent)','#8B5CF6','#4ADE80','#E05050','#F4EFD8','#A09890']

  const toggleNode = (id) => set('node_ids',
    form.node_ids.includes(id)
      ? form.node_ids.filter(n => n !== id)
      : [...form.node_ids, id]
  )

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
    onClose()
  }

  return (
    <div className="sf-wrap">
      <div className="sf-head">
        <button className="sf-back" onClick={onClose}><BackIcon /></button>
        <span className="sf-title">{subject ? 'Edit subject' : 'New subject'}</span>
      </div>

      <div className="sf-body">
        {/* Colour picker */}
        <div className="sf-colors">
          {COLORS.map(c => (
            <div key={c} className={`sf-color ${form.color === c ? 'on' : ''}`}
              style={{ background: c }} onClick={() => set('color', c)} />
          ))}
        </div>

        {/* Core fields */}
        <input className="sf-input" placeholder="Full name *" value={form.name}
          onChange={e => set('name', e.target.value)} autoFocus />
        <input className="sf-input" placeholder="Title / role" value={form.title}
          onChange={e => set('title', e.target.value)} />
        <input className="sf-input" placeholder="Organisation" value={form.organisation}
          onChange={e => set('organisation', e.target.value)} />

        <div className="sf-row">
          <select className="sf-select" value={form.category}
            onChange={e => set('category', e.target.value)}>
            {SUBJECT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="sf-select" value={form.contact_status}
            onChange={e => set('contact_status', e.target.value)}>
            {Object.entries(CONTACT_STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <input className="sf-input" placeholder="Contact — email / phone / agent"
          value={form.contact_info} onChange={e => set('contact_info', e.target.value)} />

        {/* Scene assignments */}
        {nodes.length > 0 && (
          <div className="sf-section">
            <div className="sf-section-label">Scene assignments</div>
            <div className="sf-nodes">
              {nodes.map(n => (
                <button key={n.id}
                  className={`sf-node-btn ${form.node_ids.includes(n.id) ? 'on' : ''}`}
                  onClick={() => toggleNode(n.id)}>
                  {n.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="sf-section">
          <div className="sf-section-label">Research notes</div>
          <textarea className="sf-textarea" rows={3}
            placeholder="Background, key talking points, access notes…"
            value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        <button className="sf-save" onClick={handleSave} disabled={saving || !form.name.trim()}>
          {saving ? 'Saving…' : subject ? 'Save changes →' : 'Add subject →'}
        </button>
      </div>
    </div>
  )
}

// ── SUBJECT DETAIL ────────────────────────────────────────────
function SubjectDetail({ subject, nodes, onEdit, onClose, onDelete, onStatusCycle }) {
  const sc = CONTACT_STATUS[subject.contact_status] ?? CONTACT_STATUS.prospect
  const assignedNodes = nodes.filter(n => (subject.node_ids ?? []).includes(n.id))

  return (
    <div className="sd-wrap">
      <div className="sd-head">
        <button className="sf-back" onClick={onClose}><BackIcon /></button>
        <button className="sd-edit" onClick={onEdit}>Edit</button>
      </div>
      <div className="sd-body">
        <div className="sd-hero">
          <Avatar name={subject.name} color={subject.color ?? 'var(--teal)'} size={44} />
          <div className="sd-hero-info">
            <div className="sd-name">{subject.name}</div>
            <div className="sd-title">{subject.title}</div>
            {subject.organisation && <div className="sd-org">{subject.organisation}</div>}
          </div>
        </div>

        <div className="sd-meta-row">
          <span className="sd-cat">{subject.category}</span>
          <button className="sd-status-btn" style={{ color: sc.color, borderColor: `${sc.color}33` }}
            onClick={() => onStatusCycle(subject)}>
            <div className="sd-sdot" style={{ background: sc.color }} />
            {sc.label}
            <span className="sd-cycle-hint">↻</span>
          </button>
        </div>

        {subject.contact_info && (
          <div className="sd-section">
            <div className="sd-section-label">Contact</div>
            <div className="sd-contact">{subject.contact_info}</div>
          </div>
        )}

        {assignedNodes.length > 0 && (
          <div className="sd-section">
            <div className="sd-section-label">Appears in</div>
            <div className="sd-node-pills">
              {assignedNodes.map(n => (
                <span key={n.id} className="sd-node-pill">{n.name}</span>
              ))}
            </div>
          </div>
        )}

        {subject.notes && (
          <div className="sd-section">
            <div className="sd-section-label">Research notes</div>
            <div className="sd-notes">{subject.notes}</div>
          </div>
        )}

        <button className="sd-delete" onClick={() => onDelete(subject.id)}>
          Remove subject
        </button>
      </div>
    </div>
  )
}

// ── MAIN BIBLE PANE ───────────────────────────────────────────
export default function BiblePane() {
  const { currentProject } = useProjectStore()
  const { nodes }          = useNodeStore()
  const { showToast }      = useUIStore()
  const { selectedNode }   = useNodeStore()

  const [subjects,  setSubjects]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [view,      setView]      = useState('list') // list | form | detail
  const [selected,  setSelected]  = useState(null)
  const [filter,    setFilter]    = useState('all')
  const [search,    setSearch]    = useState('')

  useEffect(() => {
    if (currentProject?.id) fetchSubjects()
  }, [currentProject?.id])

  const fetchSubjects = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .eq('project_id', currentProject.id)
      .order('name')
    setSubjects(data ?? [])
    setLoading(false)
  }

  const saveSubject = async (form) => {
    if (!currentProject?.id) return
    if (selected) {
      const { error } = await supabase
        .from('subjects').update(form).eq('id', selected.id)
      if (!error) {
        setSubjects(ss => ss.map(s => s.id === selected.id ? { ...s, ...form } : s))
        showToast(`${form.name} updated.`, '#4ADE80')
      }
    } else {
      const { data, error } = await supabase
        .from('subjects').insert({ ...form, project_id: currentProject.id })
        .select().single()
      if (!error && data) {
        setSubjects(ss => [...ss, data])
        showToast(`${form.name} added.`, '#4ADE80')
      }
    }
  }

  const deleteSubject = async (id) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id)
    if (!error) {
      setSubjects(ss => ss.filter(s => s.id !== id))
      setView('list')
      showToast('Subject removed.')
    }
  }

  const cycleStatus = async (subject) => {
    const keys = Object.keys(CONTACT_STATUS)
    const next = keys[(keys.indexOf(subject.contact_status ?? 'prospect') + 1) % keys.length]
    const { error } = await supabase
      .from('subjects').update({ contact_status: next }).eq('id', subject.id)
    if (!error) {
      setSubjects(ss => ss.map(s => s.id === subject.id ? { ...s, contact_status: next } : s))
      setSelected(s => s ? { ...s, contact_status: next } : s)
      showToast(`${subject.name} → ${CONTACT_STATUS[next].label}`)
    }
  }

  // Filter by current scene if one is selected
  const sceneFiltered = filter === 'scene' && selectedNode
    ? subjects.filter(s => (s.node_ids ?? []).includes(selectedNode.id))
    : subjects

  const displayed = sceneFiltered.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.organisation?.toLowerCase().includes(search.toLowerCase())
  )

  // Stats
  const stats = Object.entries(CONTACT_STATUS).map(([k, v]) => ({
    key: k, ...v, count: subjects.filter(s => s.contact_status === k).length
  })).filter(s => s.count > 0)

  if (!currentProject) return (
    <div className="bible-empty">
      <PersonIcon />
      <div>Open a project to manage subjects.</div>
    </div>
  )

  if (view === 'form') return (
    <SubjectForm
      subject={selected}
      nodes={nodes}
      onSave={saveSubject}
      onClose={() => { setView('list'); setSelected(null) }} />
  )

  if (view === 'detail' && selected) return (
    <SubjectDetail
      subject={selected}
      nodes={nodes}
      onEdit={() => setView('form')}
      onClose={() => { setView('list'); setSelected(null) }}
      onDelete={deleteSubject}
      onStatusCycle={cycleStatus} />
  )

  return (
    <div className="bible-wrap">
      {/* Header */}
      <div className="bible-head">
        <div className="bible-title-row">
          <span className="bible-title">People — {subjects.length}</span>
          <button className="bible-add" onClick={() => { setSelected(null); setView('form') }}>
            <AddIcon />
          </button>
        </div>

        {/* Status bar */}
        {stats.length > 0 && (
          <div className="bible-stats">
            {stats.map(s => (
              <div key={s.key} className="bs-pill">
                <div className="bs-dot" style={{ background: s.color }} />
                <span className="bs-count">{s.count}</span>
                <span className="bs-label">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Search + filter */}
        {subjects.length > 0 && (
          <div className="bible-controls">
            <input className="bible-search" placeholder="Search people…"
              value={search} onChange={e => setSearch(e.target.value)} />
            {selectedNode && (
              <button className={`bible-filter-btn ${filter === 'scene' ? 'on' : ''}`}
                onClick={() => setFilter(f => f === 'scene' ? 'all' : 'scene')}>
                {filter === 'scene' ? '× This scene' : 'This scene'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* List */}
      <div className="bible-list">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="skeleton skeleton-block" style={{ margin:'4px 0' }} />)
        ) : displayed.length === 0 ? (
          <div className="bible-empty-state">
            {subjects.length === 0 ? (
              <>
                <div className="bes-icon"><PersonIcon /></div>
                <div className="bes-title">No subjects yet</div>
                <div className="bes-body">Add interview subjects, contributors, and key people for this project.</div>
                <button className="bes-action" onClick={() => { setSelected(null); setView('form') }}>
                  Add first subject →
                </button>
              </>
            ) : (
              <div className="bes-title">No results</div>
            )}
          </div>
        ) : (
          displayed.map(subject => {
            const sc = CONTACT_STATUS[subject.contact_status] ?? CONTACT_STATUS.prospect
            const sceneCount = (subject.node_ids ?? []).length
            return (
              <button key={subject.id} className="bible-row" data-hover
                onClick={() => { setSelected(subject); setView('detail') }}>
                <Avatar name={subject.name} color={subject.color ?? 'var(--teal)'} size={32} />
                <div className="br-info">
                  <div className="br-name">{subject.name}</div>
                  <div className="br-meta">
                    {subject.title && <span>{subject.title}</span>}
                    {subject.title && subject.category && <span className="br-sep">·</span>}
                    {subject.category && <span>{subject.category}</span>}
                  </div>
                </div>
                <div className="br-right">
                  {sceneCount > 0 && (
                    <span className="br-scenes">{sceneCount} scene{sceneCount !== 1 ? 's' : ''}</span>
                  )}
                  <div className="br-status-dot" style={{ background: sc.color }}
                    title={sc.label} />
                  <ChevronIcon />
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
