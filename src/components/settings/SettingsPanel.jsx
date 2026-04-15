import { useState, useEffect, useCallback } from 'react'
import { useFocusTrap } from '../../lib/useFocusTrap'
import { supabase } from '../../lib/supabase'
import { useAuthStore, useProjectStore, useNodeStore, useUIStore } from '../../stores'
import ConfirmModal from '../ConfirmModal'
import './Settings.css'

// ── TEMPLATES — stored in localStorage, personal to this browser ──
const TEMPLATES_KEY = 'kentegency_project_templates_v1'

export function loadTemplates() {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) ?? '[]') }
  catch { return [] }
}

function saveTemplates(templates) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
}

function SaveTemplateBtn({ project }) {
  const { nodes }  = useNodeStore()
  const { acts }   = useProjectStore()
  const { showToast } = useUIStore()
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(false)

  const save = () => {
    if (!name.trim()) return
    const template = {
      id:        Date.now().toString(),
      name:      name.trim(),
      type:      project.type ?? 'film',
      savedAt:   new Date().toISOString(),
      acts:      acts.map(a => ({
        name: a.name, color: a.color,
        position: a.position, end_pos: a.end_pos, order_index: a.order_index,
      })),
      nodes: nodes
        .sort((a,b) => (a.position??0)-(b.position??0))
        .map(n => ({
          name:     n.name,
          position: n.position,
          emphasis: n.emphasis,
          type:     n.type,
          act:      n.act,
        })),
    }
    const existing = loadTemplates()
    saveTemplates([template, ...existing].slice(0, 20)) // keep 20 max
    setSaved(true)
    setName('')
    showToast(`Template "${template.name}" saved.`, '#4ADE80')
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="sf-template-save">
      <input className="sf-input" style={{ flex:1 }}
        placeholder="Template name — e.g. Documentary 3-act"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && save()} />
      <button className="sf-btn-sm" onClick={save} disabled={!name.trim()}>
        {saved ? 'Saved ✓' : 'Save template'}
      </button>
    </div>
  )
}
function VersionsTab({ projectId }) {
  const { nodes, fetchNodes } = useNodeStore()
  const { showToast } = useUIStore()
  const [versions,   setVersions]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [restoring,  setRestoring]  = useState(null)
  const [confirmV,   setConfirmV]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('versions').select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20)
    setVersions(data ?? [])
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const restore = async (version) => {
    setRestoring(version.id)
    try {
      const snap = version.snapshot_data
      if (!snap?.nodes) { showToast('Snapshot data incomplete.', '#E05050'); return }

      // Restore nodes — update positions and statuses
      for (const n of snap.nodes) {
        await supabase.from('nodes')
          .update({ position: n.position, emphasis: n.emphasis, status: n.status, name: n.name })
          .eq('id', n.id)
      }

      // Refresh stores
      await fetchNodes(projectId)

      showToast(`Restored to: ${version.description}`, '#4ADE80')
      setConfirmV(null)
    } catch (err) {
      console.error('Restore error:', err)
      showToast('Could not restore this version.', '#E05050')
    }
    setRestoring(null)
  }

  if (loading) return (
    <div className="sf-empty-msg">Loading versions…</div>
  )

  if (versions.length === 0) return (
    <div className="settings-section">
      <div className="sf-empty-msg">
        No versions saved yet. Generate a Wrap document to create your first snapshot.
      </div>
    </div>
  )

  return (
    <div className="settings-section">
      {confirmV && (
        <ConfirmModal
          title={`Restore to "${confirmV.description}"?`}
          body="This will update all scene positions and statuses to match this snapshot. Your current arc structure will change. This can be undone by restoring another version."
          confirmLabel="Restore this version →"
          onConfirm={() => restore(confirmV)}
          onCancel={() => setConfirmV(null)} />
      )}
      <div className="sf-label" style={{ marginBottom:'12px' }}>
        Version history — last 20 snapshots
      </div>
      <div className="sf-versions-list">
        {versions.map(v => {
          const date = new Date(v.created_at).toLocaleDateString('en-GB', {
            day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
          })
          const snap = v.snapshot_data ?? {}
          return (
            <div key={v.id} className="sf-version-row">
              <div className="sf-version-info">
                <div className="sf-version-label">{v.description ?? 'Snapshot'}</div>
                <div className="sf-version-meta">
                  {date}
                  {snap.nodeCount != null && ` · ${snap.nodeCount} scenes`}
                  {snap.approvedCount != null && ` · ${snap.approvedCount} approved`}
                </div>
              </div>
              <button
                className="sf-version-restore"
                disabled={restoring === v.id}
                onClick={() => setConfirmV(v)}>
                {restoring === v.id ? 'Restoring…' : 'Restore →'}
              </button>
            </div>
          )
        })}
      </div>
      <div className="sf-version-hint">
        Versions are created automatically each time you generate a Wrap document.
      </div>
    </div>
  )
}

const ACCENT_PRESETS = [
  { name:'Teal',   hex:'#1E8A8A' },
  { name:'Orange', hex:'#F5920C' },
  { name:'Purple', hex:'#8B5CF6' },
  { name:'Green',  hex:'#4ADE80' },
  { name:'Rose',   hex:'#EC4899' },
  { name:'Amber',  hex:'#EF9F27' },
  { name:'Coral',  hex:'#D85A30' },
  { name:'Blue',   hex:'#378ADD' },
  { name:'Cream',  hex:'#F4EFD8' },
  { name:'Custom', hex:null      },
]

const PROJECT_TYPES = ['film','brand','music','website','campaign','photo','other']

export default function SettingsPanel({ onClose }) {
  const panelRef = useFocusTrap(true)
  const { profile, user }    = useAuthStore()
  const { currentProject, setCurrentProject } = useProjectStore()
  const { showToast, setScreen } = useUIStore()

  const [tab,          setTab]          = useState('project')
  const [saving,       setSaving]       = useState(false)
  const [confirmDanger,setConfirmDanger]= useState(null) // 'archive' | 'delete'

  // Profile fields
  const [profileName,  setProfileName]  = useState(profile?.name ?? '')
  const [profileColor, setProfileColor] = useState(profile?.color ?? '#F5920C')

  // Project fields
  const [projName,     setProjName]     = useState(currentProject?.name ?? '')
  const [projType,     setProjType]     = useState(currentProject?.type ?? 'film')
  const [projLogline,  setProjLogline]  = useState(currentProject?.logline ?? '')
  const [projAccent,   setProjAccent]   = useState(currentProject?.accent_color ?? '#F5920C')
  const [customAccent, setCustomAccent] = useState(currentProject?.accent_color ?? '#F5920C')

  useEffect(() => {
    setProfileName(profile?.name ?? '')
    setProfileColor(profile?.color ?? '#F5920C')
  }, [profile])

  useEffect(() => {
    setProjName(currentProject?.name ?? '')
    setProjType(currentProject?.type ?? 'film')
    setProjLogline(currentProject?.logline ?? '')
    setProjAccent(currentProject?.accent_color ?? '#F5920C')
    setCustomAccent(currentProject?.accent_color ?? '#F5920C')
  }, [currentProject?.id])

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('profiles')
      .update({ name: profileName, color: profileColor })
      .eq('id', user.id)
    setSaving(false)
    if (error) { showToast('Could not save profile.', '#E05050'); return }
    showToast('Profile saved.', '#4ADE80')
  }

  const saveProject = async () => {
    if (!currentProject) return
    setSaving(true)
    const { data, error } = await supabase.from('projects')
      .update({
        name:         projName,
        type:         projType,
        logline:      projLogline,
        accent_color: projAccent,
      })
      .eq('id', currentProject.id)
      .select().single()
    setSaving(false)
    if (error) { showToast('Could not save project settings.', '#E05050'); return }
    if (data) setCurrentProject(data)
    showToast('Project settings saved.', '#4ADE80')
  }

  const regenerateWindowToken = async () => {
    if (!currentProject) return
    const newToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2,'0')).join('')
    const { data, error } = await supabase.from('projects')
      .update({ window_token: newToken })
      .eq('id', currentProject.id)
      .select().single()
    if (!error && data) {
      setCurrentProject(data)
      showToast('Window link regenerated. Old link is now invalid.', '#4ADE80')
    }
  }

  const archiveProject = async () => {
    if (!currentProject) return
    await supabase.from('projects')
      .update({ status: 'archived' })
      .eq('id', currentProject.id)
    showToast('Project archived.', '#4ADE80')
    setConfirmDanger(null)
    setScreen('dashboard')
    onClose()
  }

  const deleteProject = async () => {
    if (!currentProject) return
    await supabase.from('projects').delete().eq('id', currentProject.id)
    showToast('Project deleted permanently.', '#E05050')
    setConfirmDanger(null)
    setScreen('dashboard')
    onClose()
  }

  const resetOnboarding = () => {
    localStorage.removeItem('kentegency_onboarding_v1')
    showToast('Onboarding reset. Refresh the page to replay the tour.')
    onClose()
  }

  return (
    <div className="settings-overlay" onClick={e => e.target === e.currentTarget && onClose()}>

      {confirmDanger && (
        <ConfirmModal
          title={confirmDanger === 'archive' ? `Archive "${currentProject?.name}"?` : `Delete "${currentProject?.name}" permanently?`}
          body={confirmDanger === 'archive'
            ? <>This project will be hidden from your dashboard. You can restore it later.</>
            : <><strong>This cannot be undone.</strong> All scenes, shots, notes, and assets will be permanently deleted.</>}
          confirmLabel={confirmDanger === 'archive' ? 'Archive project' : 'Delete permanently'}
          danger
          onConfirm={confirmDanger === 'archive' ? archiveProject : deleteProject}
          onCancel={() => setConfirmDanger(null)} />
      )}

      <div className="settings-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label="Project settings">
        <div className="settings-head">
          <div className="settings-title">Settings</div>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div className="settings-tabs">
          {[
            { key:'project',  label:'Project' },
            { key:'profile',  label:'Profile' },
            { key:'versions', label:'Versions' },
            { key:'danger',   label:'Danger zone' },
          ].map(t => (
            <button key={t.key}
              className={`st-tab ${tab === t.key ? 'on' : ''} ${t.key === 'danger' ? 'danger' : ''}`}
              onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="settings-body">

          {/* PROJECT TAB */}
          {tab === 'project' && currentProject && (
            <div className="settings-section">
              <div className="sf-field">
                <label className="sf-label">Project name</label>
                <input className="sf-input" value={projName}
                  onChange={e => setProjName(e.target.value)}
                  placeholder="Project name" />
              </div>

              <div className="sf-field">
                <label className="sf-label">Type</label>
                <select className="sf-select" value={projType}
                  onChange={e => setProjType(e.target.value)}>
                  {PROJECT_TYPES.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="sf-field">
                <label className="sf-label">Logline</label>
                <textarea className="sf-textarea" rows={3}
                  value={projLogline}
                  onChange={e => setProjLogline(e.target.value)}
                  placeholder="One sentence that captures the entire project…" />
              </div>

              <div className="sf-field">
                <label className="sf-label">Accent colour</label>
                <div className="sf-accent-grid">
                  {ACCENT_PRESETS.map(p => (
                    p.hex ? (
                      <button key={p.name}
                        className={`sf-accent-swatch ${projAccent === p.hex ? 'on' : ''}`}
                        style={{ background: p.hex }}
                        title={p.name}
                        onClick={() => setProjAccent(p.hex)} />
                    ) : (
                      <div key="custom" className="sf-accent-custom">
                        <input type="color" value={customAccent}
                          onChange={e => { setCustomAccent(e.target.value); setProjAccent(e.target.value) }} />
                        <span>Custom</span>
                      </div>
                    )
                  ))}
                </div>
                <div className="sf-accent-preview" style={{ borderLeftColor: projAccent }}>
                  Canvas accent will use <span style={{ color: projAccent }}>{projAccent}</span>
                </div>
              </div>

              <div className="sf-field">
                <label className="sf-label">Window link</label>
                <div className="sf-link-row">
                  <div className="sf-link-url">
                    {window.location.origin}/#/window/{currentProject.window_token?.slice(0,16)}…
                  </div>
                  <button className="sf-btn-sm" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/#/window/${currentProject.window_token}`)
                    showToast('Window link copied.', '#4ADE80')
                  }}>Copy</button>
                  <button className="sf-btn-sm danger" onClick={regenerateWindowToken}>Regenerate</button>
                </div>
              </div>

              <button className="sf-save" onClick={saveProject} disabled={saving}
                style={{ borderColor: projAccent, color: projAccent }}>
                {saving ? 'Saving…' : 'Save project settings →'}
              </button>

              <div className="sf-template-section">
                <div className="sf-label" style={{ marginBottom:'6px' }}>Templates</div>
                <div className="sf-label-sub">
                  Save this project's arc structure as a reusable template — act zones and scene positions, not content.
                </div>
                <SaveTemplateBtn project={currentProject} />
              </div>
            </div>
          )}

          {tab === 'project' && !currentProject && (
            <div className="sf-empty">No project open. Open a project from the dashboard to edit its settings.</div>
          )}

          {/* PROFILE TAB */}
          {tab === 'profile' && (
            <div className="settings-section">
              <div className="sf-field">
                <label className="sf-label">Display name</label>
                <input className="sf-input" value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  placeholder="E. Nii Ayi Solomon" />
              </div>

              <div className="sf-field">
                <label className="sf-label">Profile colour</label>
                <div className="sf-accent-grid">
                  {['#F5920C','#1E8A8A','#4ADE80','#8B5CF6','#EC4899','#378ADD','#F4EFD8'].map(c => (
                    <button key={c}
                      className={`sf-accent-swatch ${profileColor === c ? 'on' : ''}`}
                      style={{ background: c }}
                      onClick={() => setProfileColor(c)} />
                  ))}
                </div>
              </div>

              <div className="sf-avatar-preview">
                <div className="sf-avatar" style={{ background: profileColor, color:'#040402' }}>
                  {(profileName || 'CD').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize:'13px', color:'var(--cream)', fontWeight:500 }}>{profileName || 'Your name'}</div>
                  <div style={{ fontSize:'12px', color:'var(--mute)', marginTop:'3px' }}>Creative Director</div>
                </div>
              </div>

              <div className="sf-field">
                <label className="sf-label">Onboarding</label>
                <button className="sf-btn-outline" onClick={resetOnboarding}>
                  Reset tour — show it again on next refresh
                </button>
              </div>

              <button className="sf-save" onClick={saveProfile} disabled={saving}>
                {saving ? 'Saving…' : 'Save profile →'}
              </button>
            </div>
          )}

          {/* VERSIONS TAB */}
          {tab === 'versions' && currentProject && (
            <VersionsTab projectId={currentProject.id} />
          )}
          {tab === 'versions' && !currentProject && (
            <div className="sf-empty-msg">Open a project to view its version history.</div>
          )}

          {/* DANGER ZONE TAB */}
          {tab === 'danger' && (
            <div className="settings-section">
              <div className="sf-danger-item">
                <div>
                  <div className="sf-danger-title">Archive project</div>
                  <div className="sf-danger-sub">Hides the project from your dashboard. All data is preserved and the project can be restored.</div>
                </div>
                <button className="sf-danger-btn" onClick={() => setConfirmDanger('archive')}>
                  Archive
                </button>
              </div>
              <div className="sf-danger-item">
                <div>
                  <div className="sf-danger-title">Delete project permanently</div>
                  <div className="sf-danger-sub">Deletes all scenes, shots, notes, assets, and contributors. This cannot be undone.</div>
                </div>
                <button className="sf-danger-btn red" onClick={() => setConfirmDanger('delete')}>
                  Delete
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
