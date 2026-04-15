import { useState, useEffect } from 'react'
import { useProjectStore, useAuthStore, useUIStore, useNodeStore } from '../../stores'
import { loadTemplates } from '../settings/SettingsPanel'
import './Dashboard.css'

const PROJECT_TYPES = ['film','brand','music','website','campaign','photo','other']
const TYPE_COLORS = {
  film:     'var(--teal)',
  brand:    'var(--accent)',
  music:    '#8B5CF6',
  website:  '#4ADE80',
  campaign: '#F59E0B',
  photo:    '#EC4899',
  other:    '#7A7268',
}

const LOGO_PIXELS = [
  '#F4EFD8','#040402','#7A7A7A',
  'var(--accent)','#7A7A7A','#040402',
  '#7A7A7A','#040402','#F4EFD8',
]

export default function Dashboard() {
  const { projects, fetchProjects, createProject, setCurrentProject, loading } = useProjectStore()
  const { profile, user, signOut } = useAuthStore()
  const { setScreen, showToast } = useUIStore()
  const { fetchNodes } = useNodeStore()

  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name:'', logline:'', type:'film', accent_color:'var(--teal)' })
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [templates, setTemplates] = useState([])

  useEffect(() => { fetchProjects() }, [])
  useEffect(() => {
    if (creating) setTemplates(loadTemplates())
  }, [creating])

  const openProject = async (project) => {
    await setCurrentProject(project)
    await fetchNodes(project.id)
    showToast(`Opening ${project.name}`)
    setScreen('canvas')
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setCreateError('')

    const ownerId = profile?.id ?? user?.id
    if (!ownerId) {
      setCreateError('Not logged in. Please sign in again.')
      setSaving(false)
      return
    }

    const { data, error } = await createProject({
      ...form,
      owner_id: ownerId,
      _template: selectedTemplate, // passed to store for act/node seeding
    })

    if (error) {
      console.error('Create project error:', error)
      setCreateError(error.message ?? 'Could not create project. Check Supabase schema is set up.')
      setSaving(false)
      return
    }

    // If a template was selected, apply its nodes after project creation
    if (selectedTemplate && data?.id) {
      const { supabase } = await import('../../lib/supabase')
      const nodeInserts = selectedTemplate.nodes.map((n, i) => ({
        project_id: data.id,
        name:       n.name,
        position:   n.position,
        emphasis:   n.emphasis ?? 1,
        type:       n.type ?? 'scene',
        status:     'concept',
        act:        n.act ?? '',
      }))
      if (nodeInserts.length > 0) {
        await supabase.from('nodes').insert(nodeInserts)
      }
    }

    setSaving(false)
    setCreating(false)
    setCreateError('')
    setSelectedTemplate(null)
    setForm({ name:'', logline:'', type:'film', accent_color:'var(--teal)' })
    showToast(`${data.name} created.`)
  }

  return (
    <div className="dash">
      <div className="dash-atm">
        <div className="atm-v" />
        <div className="atm-o" />
        <div className="atm-t" />
      </div>

      {/* HEADER */}
      <header className="dash-header">
        <div className="dash-logo">
          {LOGO_PIXELS.map((c,i) => <div key={i} className="dash-px" style={{ background:c }}/>)}
        </div>
        <div className="dash-wordmark">The Kentegency</div>
        <div style={{ flex:1 }} />
        <div className="dash-profile">
          <span className="dash-name">{profile?.name ?? user?.email ?? 'Studio'}</span>
          <button className="dash-signout" onClick={() => { signOut(); setScreen('auth') }}>
            Sign out
          </button>
        </div>
      </header>

      {/* MAIN */}
      <div className="dash-main">
        <div className="dash-top">
          <div>
            <div className="dash-greeting">
              {greeting()}, {profile?.name?.split(' ')[0] ?? 'CD'}.
            </div>
            <div className="dash-sub">Your projects.</div>
          </div>
          <button className="dash-new" onClick={() => { setCreating(true); setCreateError('') }}>
            + New Project
          </button>
        </div>

        {/* CREATE FORM */}
        {creating && (
          <form className="dash-create-form" onSubmit={save}>
            <div className="dcf-head">
              <span className="dcf-title">New Project</span>
              <button type="button" className="dcf-close"
                onClick={() => { setCreating(false); setCreateError('') }}>×</button>
            </div>

            <div className="dcf-fields">
              <div className="dcf-field">
                <label className="dcf-label">Project Name</label>
                <input className="dcf-input" type="text"
                  placeholder="e.g. Adansi · Brand film for a Ghanaian coffee brand"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required autoFocus />
              </div>

              <div className="dcf-field">
                <label className="dcf-label">Logline</label>
                <input className="dcf-input" type="text"
                  placeholder="One sentence. What is this project about?"
                  value={form.logline}
                  onChange={e => setForm(f => ({ ...f, logline: e.target.value }))} />
              </div>

              <div className="dcf-row">
                <div className="dcf-field">
                  <label className="dcf-label">Type</label>
                  <select className="dcf-select"
                    value={form.type}
                    onChange={e => setForm(f => ({
                      ...f,
                      type: e.target.value,
                      accent_color: TYPE_COLORS[e.target.value] ?? 'var(--accent)'
                    }))}>
                    {PROJECT_TYPES.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div className="dcf-field">
                  <label className="dcf-label">Accent Color</label>
                  <div className="dcf-color-row">
                    {Object.values(TYPE_COLORS).map((c,i) => (
                      <div key={i}
                        className={`dcf-swatch ${form.accent_color === c ? 'on' : ''}`}
                        style={{ background: c }}
                        onClick={() => setForm(f => ({ ...f, accent_color: c }))} />
                    ))}
                  </div>
                </div>
              </div>

              {/* TEMPLATE PICKER — shown when templates exist */}
              {templates.length > 0 && (
                <div className="dcf-field">
                  <label className="dcf-label">Start from template</label>
                  <div className="dcf-template-row">
                    <button
                      type="button"
                      className={`dcf-template-opt ${!selectedTemplate ? 'on' : ''}`}
                      onClick={() => setSelectedTemplate(null)}>
                      Blank
                    </button>
                    {templates.map(t => (
                      <button key={t.id}
                        type="button"
                        className={`dcf-template-opt ${selectedTemplate?.id === t.id ? 'on' : ''}`}
                        onClick={() => {
                          setSelectedTemplate(t)
                          setForm(f => ({
                            ...f,
                            type: t.type,
                            accent_color: TYPE_COLORS[t.type] ?? f.accent_color,
                          }))
                        }}>
                        {t.name}
                        <span>{t.nodes?.length ?? 0} scenes</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ERROR MESSAGE */}
              {createError && (
                <div className="dcf-error">{createError}</div>
              )}
            </div>

            <div className="dcf-foot">
              <button type="button" className="dcf-cancel"
                onClick={() => { setCreating(false); setCreateError('') }}>Cancel</button>
              <button type="submit" className="dcf-save" disabled={saving}>
                {saving ? 'Creating…' : 'Create Project →'}
              </button>
            </div>
          </form>
        )}

        {/* PROJECT GRID */}
        {loading && <div className="dash-loading">Loading your projects…</div>}

        {!loading && projects.length === 0 && !creating && (
          <div className="dash-empty">
            <div className="dash-empty-title">No projects yet.</div>
            <div className="dash-empty-sub">Create your first project to begin.</div>
          </div>
        )}

        <div className="dash-grid">
          {projects.map(p => (
            <div key={p.id} className="dash-card" onClick={() => openProject(p)}>
              <div className="dc-accent" style={{ background: p.accent_color ?? 'var(--accent)' }} />
              <div className="dc-body">
                <div className="dc-type" style={{ color: p.accent_color ?? 'var(--accent)' }}>
                  {p.type}
                </div>
                <div className="dc-name">{p.name}</div>
                {p.logline && <div className="dc-logline">{p.logline}</div>}
              </div>
              <div className="dc-foot">
                <div className={`dc-status ${p.status}`}>{p.status}</div>
                <div className="dc-date">{formatDate(p.updated_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', {
    day:'numeric', month:'short', year:'numeric'
  })
}
