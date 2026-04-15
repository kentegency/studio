import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useUIStore, useProjectStore, useNodeStore } from '../../stores'
import './Publish.css'

const ROOM_INFO = {
  studio:  { label: 'Studio',  color: 'var(--accent)', desc: 'Only you — private thinking layer' },
  meeting: { label: 'Meeting', color: 'var(--teal)', desc: 'Contributors — your working team'  },
  window:  { label: 'Window',  color: '#4ADE80', desc: 'Client — what they see on their tablet' },
}

export default function PublishPanel({ onClose }) {
  const { activeRoom, showToast } = useUIStore()
  const { currentProject, acts }  = useProjectStore()
  const { nodes, selectedNode }   = useNodeStore()

  const [assets,    setAssets]    = useState([])
  const [notes,     setNotes]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState({}) // assetId/noteId -> bool
  const [publishing,setPublishing]= useState(false)
  const [targetRoom,setTargetRoom]= useState('window')
  const [filterNode,setFilterNode]= useState(selectedNode?.id ?? 'all')

  useEffect(() => { loadContent() }, [filterNode])

  const loadContent = async () => {
    if (!currentProject) return
    setLoading(true)

    let aq = supabase.from('assets').select('*').eq('project_id', currentProject.id)
    let nq = supabase.from('notes').select('*').eq('project_id', currentProject.id)
    if (filterNode !== 'all') {
      aq = aq.eq('node_id', filterNode)
      nq = nq.eq('node_id', filterNode)
    }

    const [{ data: as }, { data: no }] = await Promise.all([aq, nq])
    setAssets(as ?? [])
    setNotes(no ?? [])
    setLoading(false)
  }

  const toggle = (id) => setSelected(s => ({ ...s, [id]: !s[id] }))
  const toggleAll = (items) => {
    const allIds = items.map(i => i.id)
    const allSelected = allIds.every(id => selected[id])
    const next = {}
    allIds.forEach(id => { next[id] = !allSelected })
    setSelected(s => ({ ...s, ...next }))
  }

  const publish = async () => {
    const selectedIds = Object.entries(selected).filter(([,v]) => v).map(([k]) => k)
    if (selectedIds.length === 0) {
      showToast('Select items to publish first.', '#E05050')
      return
    }
    setPublishing(true)

    const assetIds = assets.filter(a => selectedIds.includes(a.id)).map(a => a.id)
    const noteIds  = notes.filter(n => selectedIds.includes(n.id)).map(n => n.id)

    const ops = []
    if (assetIds.length > 0) ops.push(
      supabase.from('assets').update({ room: targetRoom }).in('id', assetIds)
    )
    if (noteIds.length > 0) ops.push(
      supabase.from('notes').update({ room: targetRoom }).in('id', noteIds)
    )

    await Promise.all(ops)
    setPublishing(false)
    setSelected({})
    await loadContent()

    const roomLabel = ROOM_INFO[targetRoom].label
    showToast(`${selectedIds.length} item${selectedIds.length>1?'s':''} published to ${roomLabel}.`, ROOM_INFO[targetRoom].color)
  }

  const selectedCount = Object.values(selected).filter(Boolean).length
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n.name]))

  return (
    <div className="publish-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="publish-panel">

        {/* HEADER */}
        <div className="pub-head">
          <div>
            <div className="pub-title">Publish Content</div>
            <div className="pub-sub">Move assets and notes between rooms</div>
          </div>
          <button className="pub-close" onClick={onClose}>×</button>
        </div>

        {/* TARGET ROOM */}
        <div className="pub-target">
          <div className="pub-target-label">Publish to</div>
          <div className="pub-rooms">
            {Object.entries(ROOM_INFO).map(([key, info]) => (
              <button key={key}
                className={`pub-room-btn ${targetRoom === key ? 'on' : ''}`}
                style={targetRoom === key ? { borderColor: info.color, color: info.color } : {}}
                onClick={() => setTargetRoom(key)} data-hover>
                <span className="prb-label">{info.label}</span>
                <span className="prb-desc">{info.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* FILTER BY NODE */}
        <div className="pub-filter">
          <div className="pub-filter-label">Filter by scene</div>
          <select className="pub-select"
            value={filterNode}
            onChange={e => setFilterNode(e.target.value)}>
            <option value="all">All scenes</option>
            {nodes.map(n => (
              <option key={n.id} value={n.id}>{n.name}</option>
            ))}
          </select>
        </div>

        {/* CONTENT LIST */}
        <div className="pub-content">
          {loading ? (
            <div className="pub-loading">Loading content…</div>
          ) : (
            <>
              {/* ASSETS */}
              {assets.length > 0 && (
                <div className="pub-section">
                  <div className="pub-section-head">
                    <span className="pub-section-label">Assets — {assets.length}</span>
                    <button className="pub-select-all"
                      onClick={() => toggleAll(assets)} data-hover>
                      {assets.every(a => selected[a.id]) ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  {assets.map(a => (
                    <div key={a.id}
                      className={`pub-item ${selected[a.id] ? 'on' : ''}`}
                      onClick={() => toggle(a.id)} data-hover>
                      <div className="pub-check">{selected[a.id] ? '✓' : ''}</div>
                      <div className="pub-item-thumb">
                        {a.type === 'image' ? (
                          <img src={a.file_url} alt={a.name}
                            style={{ width:'100%',height:'100%',objectFit:'cover' }} />
                        ) : (
                          <div className="pub-item-type">{a.type?.slice(0,3) ?? 'doc'}</div>
                        )}
                      </div>
                      <div className="pub-item-info">
                        <div className="pub-item-name">{a.name}</div>
                        <div className="pub-item-meta">
                          {a.type} · {nodeMap[a.node_id] ?? 'No scene'} · Currently in
                          <span style={{ color: ROOM_INFO[a.room]?.color ?? 'var(--dim)' }}>
                            {' '}{ROOM_INFO[a.room]?.label ?? a.room}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* NOTES */}
              {notes.length > 0 && (
                <div className="pub-section">
                  <div className="pub-section-head">
                    <span className="pub-section-label">Notes — {notes.length}</span>
                    <button className="pub-select-all"
                      onClick={() => toggleAll(notes)} data-hover>
                      {notes.every(n => selected[n.id]) ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  {notes.map(n => (
                    <div key={n.id}
                      className={`pub-item ${selected[n.id] ? 'on' : ''}`}
                      onClick={() => toggle(n.id)} data-hover>
                      <div className="pub-check">{selected[n.id] ? '✓' : ''}</div>
                      <div className="pub-note-color" style={{ background: n.color ?? 'var(--accent)' }} />
                      <div className="pub-item-info">
                        <div className="pub-item-name">{n.body.slice(0, 60)}{n.body.length > 60 ? '…' : ''}</div>
                        <div className="pub-item-meta">
                          Note · {nodeMap[n.node_id] ?? 'No scene'} · Currently in
                          <span style={{ color: ROOM_INFO[n.room]?.color ?? 'var(--dim)' }}>
                            {' '}{ROOM_INFO[n.room]?.label ?? n.room}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {assets.length === 0 && notes.length === 0 && (
                <div className="pub-empty">
                  No content yet. Upload assets or write notes first.
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="pub-foot">
          <div className="pub-count">
            {selectedCount > 0
              ? `${selectedCount} item${selectedCount>1?'s':''} selected`
              : 'Select items to publish'}
          </div>
          <div className="pub-foot-actions">
            <button className="pub-cancel" onClick={onClose} data-hover>Cancel</button>
            <button className="pub-publish"
              onClick={publish} disabled={publishing || selectedCount === 0}
              style={{ borderColor: ROOM_INFO[targetRoom].color, color: ROOM_INFO[targetRoom].color }}
              data-hover>
              {publishing
                ? 'Publishing…'
                : `Publish to ${ROOM_INFO[targetRoom].label} →`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
