import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useProjectStore, useUIStore } from '../../stores'
import './Acts.css'

const ACT_COLORS = [
  { name:'Teal',   value:'teal',   hex:'var(--teal)' },
  { name:'Orange', value:'orange', hex:'var(--accent)' },
  { name:'Red',    value:'red',    hex:'#B43C1E' },
  { name:'Purple', value:'purple', hex:'#8B5CF6' },
  { name:'Green',  value:'green',  hex:'#4ADE80' },
  { name:'Amber',  value:'amber',  hex:'#EF9F27' },
]

export default function ActsPanel({ onClose }) {
  const { currentProject, acts, setActs } = useProjectStore()
  const { showToast } = useUIStore()

  const [localActs, setLocalActs] = useState([])
  const [adding,    setAdding]    = useState(false)
  const [newAct,    setNewAct]    = useState({ name:'', color:'teal', position:0, end_pos:0.33 })
  const [saving,    setSaving]    = useState(false)

  useEffect(() => {
    setLocalActs([...acts].sort((a,b) => a.order_index - b.order_index))
  }, [acts])

  const addAct = async (e) => {
    e.preventDefault()
    if (!currentProject || !newAct.name.trim()) return
    setSaving(true)
    const order = localActs.length + 1
    const { data, error } = await supabase.from('acts').insert({
      project_id:  currentProject.id,
      name:        newAct.name,
      color:       newAct.color,
      position:    parseFloat(newAct.position),
      end_pos:     parseFloat(newAct.end_pos),
      order_index: order,
    }).select().single()
    setSaving(false)
    if (error) { showToast('Could not add act.', '#E05050'); return }
    const updated = [...localActs, data]
    setLocalActs(updated)
    setActs(updated)
    setAdding(false)
    setNewAct({ name:'', color:'teal', position:0, end_pos:0.33 })
    showToast(`${data.name} added to timeline.`, '#4ADE80')
  }

  const deleteAct = async (act) => {
    if (!window.confirm(`Remove "${act.name}" from the timeline? Scenes within this act will not be deleted.`)) return
    await supabase.from('acts').delete().eq('id', act.id)
    const updated = localActs.filter(a => a.id !== act.id)
    setLocalActs(updated)
    setActs(updated)
    showToast(`${act.name} removed.`)
  }

  const updateAct = async (act, changes) => {
    const { data } = await supabase.from('acts')
      .update(changes).eq('id', act.id).select().single()
    if (data) {
      const updated = localActs.map(a => a.id === act.id ? data : a)
      setLocalActs(updated)
      setActs(updated)
      showToast('Act updated.')
    }
  }

  const getHex = (colorName) => ACT_COLORS.find(c => c.value === colorName)?.hex ?? 'var(--teal)'

  return (
    <div className="acts-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="acts-panel">
        <div className="acts-head">
          <div>
            <div className="acts-title">Act Zones</div>
            <div className="acts-sub">Hover any act zone on the arc to edit it directly</div>
          </div>
          <button className="acts-close" onClick={onClose}>×</button>
        </div>

        {/* Existing acts */}
        <div className="acts-list">
          {localActs.length === 0 && (
            <div className="acts-empty">
              No acts yet. Add your first act zone to structure the timeline into parts.
            </div>
          )}
          {localActs.map(act => (
            <div key={act.id} className="act-item">
              <div className="act-color-dot" style={{ background: getHex(act.color) }} />
              <div className="act-info">
                <input className="act-name-input"
                  defaultValue={act.name}
                  onBlur={e => {
                    if (e.target.value !== act.name) updateAct(act, { name: e.target.value })
                  }} />
                <div className="act-range">
                  {Math.round(act.position * 100)}% → {Math.round(act.end_pos * 100)}%
                </div>
              </div>
              <div className="act-color-row">
                {ACT_COLORS.map(c => (
                  <button key={c.value}
                    className={`act-color-swatch ${act.color === c.value ? 'on' : ''}`}
                    style={{ background: c.hex }}
                    title={c.name}
                    onClick={() => updateAct(act, { color: c.value })} />
                ))}
              </div>
              <button className="act-delete" onClick={() => deleteAct(act)} title="Remove act">×</button>
            </div>
          ))}
        </div>

        {/* Timeline preview */}
        <div className="acts-preview">
          <div className="ap-label">Timeline preview</div>
          <div className="ap-track">
            {localActs.map(act => (
              <div key={act.id} className="ap-zone"
                style={{
                  left:  `${act.position * 100}%`,
                  width: `${(act.end_pos - act.position) * 100}%`,
                  background: `${getHex(act.color)}30`,
                  border: `.5px solid ${getHex(act.color)}50`,
                }}>
                <span style={{ color: getHex(act.color) }}>
                  {act.name.split('—')[0].trim()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Add act form */}
        {adding ? (
          <form className="act-add-form" onSubmit={addAct}>
            <div className="aaf-row">
              <input className="sf-input" placeholder="e.g. Act I, Intro, Problem, Hero…"
                value={newAct.name}
                onChange={e => setNewAct(a => ({ ...a, name: e.target.value }))}
                required autoFocus />
            </div>
            <div className="aaf-row">
              <div className="aaf-range">
                <label className="sf-label" style={{ fontSize:'11px' }}>Start %</label>
                <input type="number" min="0" max="99" step="1" className="sf-input aaf-num"
                  value={Math.round(newAct.position * 100)}
                  onChange={e => setNewAct(a => ({ ...a, position: parseInt(e.target.value)/100 }))} />
              </div>
              <div className="aaf-range">
                <label className="sf-label" style={{ fontSize:'11px' }}>End %</label>
                <input type="number" min="1" max="100" step="1" className="sf-input aaf-num"
                  value={Math.round(newAct.end_pos * 100)}
                  onChange={e => setNewAct(a => ({ ...a, end_pos: parseInt(e.target.value)/100 }))} />
              </div>
              <div className="aaf-colors">
                {ACT_COLORS.map(c => (
                  <button type="button" key={c.value}
                    className={`act-color-swatch ${newAct.color === c.value ? 'on' : ''}`}
                    style={{ background: c.hex }}
                    onClick={() => setNewAct(a => ({ ...a, color: c.value }))} />
                ))}
              </div>
            </div>
            <div className="nn-foot">
              <button type="button" className="nn-cancel" onClick={() => setAdding(false)}>Cancel</button>
              <button type="submit" className="nn-save" disabled={saving}>
                {saving ? 'Adding…' : 'Add act →'}
              </button>
            </div>
          </form>
        ) : (
          <div className="acts-foot">
            <button className="acts-add-btn" onClick={() => setAdding(true)}>
              + Add act zone
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
