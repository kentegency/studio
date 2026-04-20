// ProductionPane.jsx — Scene-level production data
// Tier 1: scene elements, location, shoot day, equipment list, post flags
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useNodeStore, useProjectStore, useUIStore } from '../../stores'
import './ProductionPane.css'

// ── DEFAULTS ──────────────────────────────────────────────────
const EMPTY = {
  shoot_day:   null,
  elements: {
    int_ext:       'INT',
    time_of_day:   'DAY',
    cast:          [],
    props:         [],
    special:       [],
  },
  location: {
    name:     '',
    address:  '',
    gps:      '',
    contact:  '',
    phone:    '',
    parking:  '',
    access:   '',
    permits:  '',
  },
  equipment: [],  // [{ id, item, quantity, confirmed }]
  post: {
    adr:       false,
    vfx:       false,
    grade:     false,
    sound_mix: false,
    delivered: false,
  },
}

function mergeData(saved) {
  if (!saved) return EMPTY
  return {
    ...EMPTY,
    ...saved,
    elements:  { ...EMPTY.elements,  ...(saved.elements  ?? {}) },
    location:  { ...EMPTY.location,  ...(saved.location  ?? {}) },
    post:      { ...EMPTY.post,      ...(saved.post       ?? {}) },
    equipment: saved.equipment ?? [],
  }
}

// ── CHIP INPUT — comma/enter to add tags ──────────────────────
function ChipInput({ label, values, onChange, placeholder }) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setInput('')
  }
  return (
    <div className="chip-field">
      <div className="prod-label">{label}</div>
      <div className="chip-wrap">
        {values.map((v, i) => (
          <span key={i} className="chip">
            {v}
            <button onClick={() => onChange(values.filter((_,j) => j !== i))}>×</button>
          </span>
        ))}
        <input
          className="chip-input"
          value={input}
          placeholder={placeholder}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
            if (e.key === 'Backspace' && !input && values.length) {
              onChange(values.slice(0, -1))
            }
          }}
          onBlur={add}
        />
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function ProductionPane() {
  const { selectedNode, updateNode, nodes } = useNodeStore()
  const { currentProject }                  = useProjectStore()
  const { showToast }                       = useUIStore()

  const [data,    setData]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [section, setSection] = useState('elements') // elements|location|equipment|post
  const saveTimer = useRef(null)

  // Load when scene changes
  useEffect(() => {
    if (!selectedNode) return
    setData(mergeData(selectedNode.production_data))
  }, [selectedNode?.id])

  // Auto-save with 800ms debounce
  const persist = useCallback(async (next) => {
    if (!selectedNode) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await supabase
        .from('nodes')
        .update({ production_data: next })
        .eq('id', selectedNode.id)
      // Sync to store so arc badges update
      updateNode(selectedNode.id, { production_data: next })
      setSaving(false)
    }, 800)
  }, [selectedNode?.id, updateNode])

  const update = useCallback((patch) => {
    const next = { ...data, ...patch }
    setData(next)
    persist(next)
  }, [data, persist])

  const updateNested = useCallback((key, patch) => {
    const next = { ...data, [key]: { ...data[key], ...patch } }
    setData(next)
    persist(next)
  }, [data, persist])

  // Equipment helpers
  const addEquipment = () => {
    const eq = [...(data.equipment ?? []), { id: Date.now(), item: '', quantity: 1, confirmed: false }]
    update({ equipment: eq })
  }
  const updateEquipment = (id, patch) => {
    const eq = (data.equipment ?? []).map(e => e.id === id ? { ...e, ...patch } : e)
    update({ equipment: eq })
  }
  const removeEquipment = (id) => {
    const eq = (data.equipment ?? []).filter(e => e.id !== id)
    update({ equipment: eq })
  }

  if (!selectedNode) return (
    <div className="prod-empty">
      <div className="prod-empty-title">No scene selected</div>
      <div className="prod-empty-sub">Click a node on the arc to view its production details.</div>
    </div>
  )

  // Derive shoot days for the project
  const usedDays = [...new Set(
    nodes.filter(n => n.production_data?.shoot_day).map(n => n.production_data.shoot_day)
  )].sort((a,b) => a-b)
  const maxDay = usedDays.length > 0 ? Math.max(...usedDays) : 0

  // Post flag counts for badge
  const postCount = Object.values(data.post).filter(Boolean).length

  const SECTIONS = [
    { key:'elements',  label:'Scene' },
    { key:'location',  label:'Location' },
    { key:'equipment', label:'Equipment' },
    { key:'post',      label:'Post' },
  ]

  return (
    <div className="prod-pane">
      {/* Header */}
      <div className="rph">
        <div className="rp-ey">{selectedNode.act ?? 'Production'}</div>
        <div className="rp-ti" style={{ fontSize:'18px' }}>{selectedNode.name}</div>
        <div className="prod-shoot-day-row">
          <span className="prod-label">Shoot day</span>
          <div className="prod-day-controls">
            <button className="prod-day-btn"
              onClick={() => update({ shoot_day: Math.max(1, (data.shoot_day ?? 1) - 1) })}>−</button>
            <span className="prod-day-val">
              {data.shoot_day ? `Day ${data.shoot_day}` : '— Unscheduled'}
            </span>
            <button className="prod-day-btn"
              onClick={() => update({ shoot_day: (data.shoot_day ?? 0) + 1 })}>+</button>
            {data.shoot_day && (
              <button className="prod-day-clear" onClick={() => update({ shoot_day: null })}>×</button>
            )}
          </div>
        </div>
        {saving && <div className="scene-desc-saving">saving…</div>}
      </div>

      {/* Section tabs */}
      <div className="prod-tabs">
        {SECTIONS.map(s => (
          <button key={s.key}
            className={`prod-tab ${section === s.key ? 'on' : ''}`}
            onClick={() => setSection(s.key)}>
            {s.label}
            {s.key === 'post' && postCount > 0 && (
              <span className="prod-tab-badge">{postCount}</span>
            )}
            {s.key === 'equipment' && (data.equipment?.length ?? 0) > 0 && (
              <span className="prod-tab-badge">{data.equipment.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="prod-body">

        {/* ── SCENE ELEMENTS ── */}
        {section === 'elements' && (
          <div className="prod-section">
            <div className="prod-row-2">
              <div className="prod-field">
                <div className="prod-label">Interior / Exterior</div>
                <div className="prod-seg">
                  {['INT','EXT','INT/EXT'].map(v => (
                    <button key={v}
                      className={`prod-seg-btn ${data.elements.int_ext === v ? 'on' : ''}`}
                      onClick={() => updateNested('elements', { int_ext: v })}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="prod-field">
                <div className="prod-label">Time of day</div>
                <div className="prod-seg">
                  {['DAY','NIGHT','DAWN','DUSK','N/A'].map(v => (
                    <button key={v}
                      className={`prod-seg-btn ${data.elements.time_of_day === v ? 'on' : ''}`}
                      onClick={() => updateNested('elements', { time_of_day: v })}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <ChipInput
              label="Cast in scene"
              values={data.elements.cast ?? []}
              onChange={v => updateNested('elements', { cast: v })}
              placeholder="Add name, press Enter…"
            />
            <ChipInput
              label="Props"
              values={data.elements.props ?? []}
              onChange={v => updateNested('elements', { props: v })}
              placeholder="Add prop, press Enter…"
            />
            <ChipInput
              label="Special requirements"
              values={data.elements.special ?? []}
              onChange={v => updateNested('elements', { special: v })}
              placeholder="Drone, rain cover, permits…"
            />
          </div>
        )}

        {/* ── LOCATION ── */}
        {section === 'location' && (
          <div className="prod-section">
            <div className="prod-field">
              <div className="prod-label">Location name</div>
              <input className="prod-input" placeholder="e.g. NITA Building, Accra"
                value={data.location.name}
                onChange={e => updateNested('location', { name: e.target.value })} />
            </div>
            <div className="prod-field">
              <div className="prod-label">Address</div>
              <input className="prod-input" placeholder="Street address"
                value={data.location.address}
                onChange={e => updateNested('location', { address: e.target.value })} />
            </div>
            <div className="prod-row-2">
              <div className="prod-field">
                <div className="prod-label">GPS coordinates</div>
                <input className="prod-input prod-input-mono" placeholder="5.6037° N, 0.1870° W"
                  value={data.location.gps}
                  onChange={e => updateNested('location', { gps: e.target.value })} />
              </div>
              {data.location.gps && (
                <div className="prod-field prod-field-center">
                  <a className="prod-map-btn"
                    href={`https://maps.google.com/?q=${encodeURIComponent(data.location.gps || data.location.address)}`}
                    target="_blank" rel="noreferrer">
                    ↗ Open in Maps
                  </a>
                </div>
              )}
            </div>
            <div className="prod-row-2">
              <div className="prod-field">
                <div className="prod-label">Location contact</div>
                <input className="prod-input" placeholder="Contact name"
                  value={data.location.contact}
                  onChange={e => updateNested('location', { contact: e.target.value })} />
              </div>
              <div className="prod-field">
                <div className="prod-label">Phone</div>
                <input className="prod-input prod-input-mono" placeholder="+233 …"
                  value={data.location.phone}
                  onChange={e => updateNested('location', { phone: e.target.value })} />
              </div>
            </div>
            <div className="prod-field">
              <div className="prod-label">Parking / access</div>
              <textarea className="prod-textarea" rows={2}
                placeholder="Parking details, building access, gate codes…"
                value={data.location.parking}
                onChange={e => updateNested('location', { parking: e.target.value })} />
            </div>
            <div className="prod-field">
              <div className="prod-label">Permits status</div>
              <input className="prod-input" placeholder="e.g. Permit required — contact comms dept"
                value={data.location.permits}
                onChange={e => updateNested('location', { permits: e.target.value })} />
            </div>
          </div>
        )}

        {/* ── EQUIPMENT ── */}
        {section === 'equipment' && (
          <div className="prod-section">
            {(data.equipment ?? []).length === 0 && (
              <div className="prod-eq-empty">No equipment added yet. Add items needed for this scene.</div>
            )}
            <div className="prod-eq-list">
              {(data.equipment ?? []).map(eq => (
                <div key={eq.id} className={`prod-eq-row ${eq.confirmed ? 'confirmed' : ''}`}>
                  <button className={`prod-eq-check ${eq.confirmed ? 'on' : ''}`}
                    onClick={() => updateEquipment(eq.id, { confirmed: !eq.confirmed })}
                    title={eq.confirmed ? 'Mark unconfirmed' : 'Mark confirmed'}>
                    {eq.confirmed ? '✓' : '○'}
                  </button>
                  <input className="prod-eq-input" placeholder="Equipment item…"
                    value={eq.item}
                    onChange={e => updateEquipment(eq.id, { item: e.target.value })} />
                  <input className="prod-eq-qty" type="number" min={1} max={99}
                    value={eq.quantity}
                    onChange={e => updateEquipment(eq.id, { quantity: parseInt(e.target.value)||1 })}
                    title="Quantity" />
                  <button className="prod-eq-del"
                    onClick={() => removeEquipment(eq.id)}>×</button>
                </div>
              ))}
            </div>
            <button className="prod-eq-add" onClick={addEquipment}>+ Add equipment item</button>

            {/* Quick add presets */}
            <div className="prod-eq-presets">
              <div className="prod-label" style={{ marginBottom:'6px' }}>Quick add</div>
              <div className="prod-eq-preset-row">
                {[
                  ['Camera package', 'Sony FX3 / Canon C70'],
                  ['Lens set', '24mm, 50mm, 85mm'],
                  ['Tripod', 'Fluid head'],
                  ['Gimbal', 'DJI RS3 Pro'],
                  ['Drone', 'DJI Mavic 3 Cinema'],
                  ['LED panel', 'Aputure 300D II'],
                  ['Reflector kit', '5-in-1'],
                  ['Boom mic', 'Sennheiser MKH 416'],
                  ['Lav mics', '×2 Rode Wireless'],
                  ['Audio recorder', 'Sound Devices MixPre-6'],
                  ['Monitor', 'Atomos Ninja V'],
                  ['ND filters', 'Variable ND'],
                ].map(([label, note]) => (
                  <button key={label} className="prod-eq-preset"
                    onClick={() => {
                      const eq = [...(data.equipment ?? []), { id: Date.now(), item: label, quantity: 1, confirmed: false }]
                      update({ equipment: eq })
                    }}
                    title={note}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── POST PRODUCTION ── */}
        {section === 'post' && (
          <div className="prod-section">
            <div className="prod-label" style={{ marginBottom:'10px' }}>Post production status for this scene</div>
            {[
              { key:'adr',       label:'ADR required',        sub:'Dialogue needs re-recording in studio',         icon:'🎙' },
              { key:'vfx',       label:'VFX / motion graphics', sub:'Requires visual effects or animated graphics', icon:'✦' },
              { key:'grade',     label:'Colour grade done',   sub:'Scene has been colour graded',                  icon:'◉' },
              { key:'sound_mix', label:'Sound mix done',      sub:'Scene audio has been mixed',                    icon:'◎' },
              { key:'delivered', label:'Delivered',           sub:'Scene has been delivered to client',             icon:'✓' },
            ].map(f => (
              <div key={f.key}
                className={`prod-post-row ${data.post[f.key] ? 'on' : ''}`}
                onClick={() => updateNested('post', { [f.key]: !data.post[f.key] })}>
                <div className="prod-post-icon">{f.icon}</div>
                <div className="prod-post-info">
                  <div className="prod-post-label">{f.label}</div>
                  <div className="prod-post-sub">{f.sub}</div>
                </div>
                <div className={`prod-post-toggle ${data.post[f.key] ? 'on' : ''}`} />
              </div>
            ))}

            {/* Post summary */}
            {Object.values(data.post).some(Boolean) && (
              <div className="prod-post-summary">
                {data.post.adr       && <span className="prod-post-badge adr">ADR</span>}
                {data.post.vfx       && <span className="prod-post-badge vfx">VFX</span>}
                {data.post.grade     && <span className="prod-post-badge grade">Graded</span>}
                {data.post.sound_mix && <span className="prod-post-badge mix">Mixed</span>}
                {data.post.delivered && <span className="prod-post-badge delivered">Delivered</span>}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
