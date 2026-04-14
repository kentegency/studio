import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useProjectStore, useNodeStore, useUIStore } from '../../stores'
import './Contributor.css'

const ROLES = ['Director of Photography', 'Editor', 'Score Provider', 'Colorist', 'Sound Designer', 'Motion Designer', 'Producer', 'Researcher', 'Writer', 'Other']

export default function InvitePanel({ onClose }) {
  const { currentProject } = useProjectStore()
  const { nodes }          = useNodeStore()
  const { showToast }      = useUIStore()

  const [contributors, setContributors] = useState([])
  const [form, setForm]   = useState({ name:'', role:ROLES[0], color:'#1E8A8A', node_ids:[] })
  const [saving, setSaving] = useState(false)
  const [generated, setGenerated] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadContributors() }, [])

  const loadContributors = async () => {
    if (!currentProject) return
    setLoading(true)
    const { data } = await supabase.from('contributors')
      .select('*').eq('project_id', currentProject.id)
      .order('invited_at', { ascending: false })
    setContributors(data ?? [])
    setLoading(false)
  }

  const toggleNode = (nodeId) => {
    setForm(f => ({
      ...f,
      node_ids: f.node_ids.includes(nodeId)
        ? f.node_ids.filter(id => id !== nodeId)
        : [...f.node_ids, nodeId]
    }))
  }

  const invite = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !currentProject) return
    setSaving(true)

    const { data, error } = await supabase.from('contributors').insert({
      project_id: currentProject.id,
      name:       form.name,
      role:       form.role,
      color:      form.color,
      room:       'meeting',
      node_ids:   form.node_ids,
    }).select().single()

    setSaving(false)
    if (error) { showToast('Could not create invite.', '#E05050'); return }

    const link = `${window.location.origin}/#/contributor/${data.link_token}`
    setGenerated({ ...data, link })
    setContributors(prev => [data, ...prev])
    setForm({ name:'', role:ROLES[0], color:'#1E8A8A', node_ids:[] })
    showToast(`Invite link generated for ${data.name}.`, '#4ADE80')
  }

  const copyLink = (link) => {
    navigator.clipboard.writeText(link)
    showToast('Invite link copied.', '#4ADE80')
  }

  const revokeContributor = async (contributor) => {
    if (!window.confirm(`Remove ${contributor.name} from this project? Their link will stop working immediately.`)) return
    await supabase.from('contributors').delete().eq('id', contributor.id)
    setContributors(prev => prev.filter(c => c.id !== contributor.id))
    showToast(`${contributor.name} removed.`)
  }

  const COLORS = ['#1E8A8A','#F5920C','#4ADE80','#8B5CF6','#EC4899','#F4EFD8']

  return (
    <div className="contrib-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="contrib-panel">

        <div className="contrib-head">
          <div>
            <div className="contrib-title">Invite Contributor</div>
            <div className="contrib-sub">Generate a scoped access link for your team</div>
          </div>
          <button className="contrib-close" onClick={onClose}>×</button>
        </div>

        {/* INVITE FORM */}
        <form className="contrib-form" onSubmit={invite}>
          <div className="cf-row">
            <div className="cf-field">
              <label className="cf-label">Name</label>
              <input className="cf-input" type="text"
                placeholder="Kwame Asante"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required autoFocus />
            </div>
            <div className="cf-field">
              <label className="cf-label">Role</label>
              <select className="cf-select" value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="cf-field">
            <label className="cf-label">Colour</label>
            <div className="cf-colors">
              {COLORS.map(c => (
                <div key={c}
                  className={`cf-color ${form.color === c ? 'on' : ''}`}
                  style={{ background: c }}
                  onClick={() => setForm(f => ({ ...f, color: c }))} />
              ))}
            </div>
          </div>

          <div className="cf-field">
            <label className="cf-label">Scope — which scenes can they access?</label>
            <div className="cf-nodes">
              <div
                className={`cf-node ${form.node_ids.length === 0 ? 'on' : ''}`}
                onClick={() => setForm(f => ({ ...f, node_ids: [] }))}
                data-hover>
                All scenes
              </div>
              {nodes.map(n => (
                <div key={n.id}
                  className={`cf-node ${form.node_ids.includes(n.id) ? 'on' : ''}`}
                  onClick={() => toggleNode(n.id)}
                  data-hover>
                  {n.name}
                </div>
              ))}
            </div>
            <div className="cf-scope-hint">
              {form.node_ids.length === 0
                ? 'Full project access — they see all scenes'
                : `Scoped to ${form.node_ids.length} scene${form.node_ids.length > 1 ? 's' : ''}`}
            </div>
          </div>

          <button type="submit" className="cf-submit" disabled={saving}>
            {saving ? 'Generating…' : 'Generate invite link →'}
          </button>
        </form>

        {/* GENERATED LINK */}
        {generated && (
          <div className="cf-generated">
            <div className="cfg-label">Link generated for {generated.name}</div>
            <div className="cfg-link-row">
              <div className="cfg-link">{generated.link}</div>
              <button className="cfg-copy" onClick={() => copyLink(generated.link)} data-hover>
                Copy link
              </button>
            </div>
            <div className="cfg-hint">
              Send this link to {generated.name}. They open it in any browser — no login required. Access expires in 30 days.
            </div>
          </div>
        )}

        {/* EXISTING CONTRIBUTORS */}
        <div className="contrib-existing">
          <div className="ce-label">Current contributors — {contributors.length}</div>
          {loading && <div className="ce-loading">Loading…</div>}
          {!loading && contributors.length === 0 && (
            <div className="ce-empty">No contributors yet. Generate your first invite above.</div>
          )}
          {contributors.map(c => {
            const link = `${window.location.origin}/#/contributor/${c.link_token}`
            const expired = c.link_expires_at && new Date(c.link_expires_at) < new Date()
            return (
              <div key={c.id} className="ce-item">
                <div className="ce-avatar" style={{ background: c.color, color:'#040402' }}>
                  {c.name.slice(0,2).toUpperCase()}
                </div>
                <div className="ce-info">
                  <div className="ce-name">{c.name}</div>
                  <div className="ce-role">{c.role}</div>
                  <div className="ce-scope">
                    {c.node_ids?.length > 0
                      ? `${c.node_ids.length} scene${c.node_ids.length > 1 ? 's' : ''}`
                      : 'Full access'}
                    {expired && <span className="ce-expired"> · Expired</span>}
                  </div>
                </div>
                <div className="ce-actions">
                  <button className="ce-copy" onClick={() => copyLink(link)} data-hover>
                    Copy link
                  </button>
                  <button className="ce-revoke" onClick={() => revokeContributor(c)} data-hover>
                    Revoke
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
