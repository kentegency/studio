import { useState, useEffect } from 'react'
import { useFocusTrap } from '../../lib/useFocusTrap'
import { supabase } from '../../lib/supabase'
import { useAuthStore, useProjectStore, useUIStore } from '../../stores'
import ConfirmModal from '../ConfirmModal'
import './Settings.css'

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
            { key:'project', label:'Project' },
            { key:'profile', label:'Profile' },
            { key:'danger',  label:'Danger zone' },
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
                  placeholder="EBAN — Ghana's Cybersecurity Journey" />
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
