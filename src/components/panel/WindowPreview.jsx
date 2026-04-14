import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useProjectStore, useNodeStore, useUIStore } from '../../stores'
import './Panes.css'

export default function WindowPreview({ onPublish }) {
  const { currentProject } = useProjectStore()
  const { nodes, selectedNode } = useNodeStore()
  const { showToast } = useUIStore()

  const [windowAssets, setWindowAssets] = useState([])
  const [windowNotes,  setWindowNotes]  = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedNode?.id) loadWindowContent(selectedNode.id)
  }, [selectedNode?.id])

  const loadWindowContent = async (nodeId) => {
    setLoading(true)
    const [{ data: as }, { data: no }] = await Promise.all([
      supabase.from('assets').select('*').eq('node_id', nodeId).eq('room', 'window'),
      supabase.from('notes').select('*').eq('node_id', nodeId).eq('room', 'window'),
    ])
    setWindowAssets(as ?? [])
    setWindowNotes(no ?? [])
    setLoading(false)
  }

  const windowUrl = currentProject?.window_token
    ? `${window.location.origin}/#/window/${currentProject.window_token}`
    : ''

  const copyLink = () => {
    if (!windowUrl) return
    navigator.clipboard.writeText(windowUrl)
    showToast('Window link copied. Send to your client.', '#4ADE80')
  }

  if (!currentProject) return (
    <div className="win-preview-empty">
      <div className="wpe-title">No project open</div>
      <div className="wpe-sub">Open a project from the dashboard first.</div>
    </div>
  )

  return (
    <div className="win-preview">
      {/* Header */}
      <div className="rph">
        <div className="rp-ey">Client view — Window room</div>
        <div className="rp-ti" style={{ fontSize:'18px' }}>
          {currentProject.name}
        </div>
        <div className="rp-st">
          <span className="rp-dot" style={{ background:'#4ADE80' }} />
          <span style={{ color:'#4ADE80' }}>Live</span>
        </div>
      </div>

      {/* Window link */}
      <div className="sec">
        <div className="sec-l">Client Link</div>
        <div className="wlink-box">
          <div className="wlink-url">{windowUrl || 'No token yet'}</div>
          <button className="wlink-copy" onClick={copyLink} data-hover>Copy</button>
        </div>
        <div className="wlink-hint">
          Send this link to your client. No login required. Opens on any device.
        </div>
      </div>

      {/* What client sees for selected node */}
      <div className="sec">
        <div className="sec-l">
          {selectedNode ? `${selectedNode.name} — Window content` : 'Select a node to preview'}
          <span onClick={onPublish} data-hover>+ Publish</span>
        </div>

        {loading && <div className="pub-loading">Loading…</div>}

        {!loading && selectedNode && windowAssets.length === 0 && windowNotes.length === 0 && (
          <div className="wpe-no-content">
            <div className="wpe-no-title">Nothing published yet</div>
            <div className="wpe-no-sub">
              This scene has no content in the Window room. Use Publish to share assets and notes with your client.
            </div>
            <button className="wpe-publish-btn" onClick={onPublish} data-hover>
              Open Publish Panel →
            </button>
          </div>
        )}

        {/* Published assets */}
        {windowAssets.length > 0 && (
          <div style={{ marginTop:'8px' }}>
            <div className="wpe-count">
              {windowAssets.length} asset{windowAssets.length>1?'s':''} visible to client
            </div>
            <div className="asset-grid" style={{ marginTop:'6px' }}>
              {windowAssets.map(a => (
                <div key={a.id} className="at" data-hover
                  onClick={() => window.open(a.file_url, '_blank')}>
                  {a.type === 'image' ? (
                    <img src={a.file_url} alt={a.name}
                      style={{ width:'100%',height:'100%',objectFit:'cover',borderRadius:'2px' }} />
                  ) : (
                    <div className="pub-item-type">{a.type?.slice(0,3)}</div>
                  )}
                  <span className="at-b at-window">W</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Published notes */}
        {windowNotes.length > 0 && (
          <div style={{ marginTop:'10px' }}>
            <div className="wpe-count">
              {windowNotes.length} note{windowNotes.length>1?'s':''} visible to client
            </div>
            {windowNotes.map((n,i) => (
              <div key={n.id ?? i} className="note"
                style={{ borderLeftColor: n.color ?? '#4ADE80', marginTop:'5px' }}>
                <div className="nb">{n.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scenes overview */}
      <div className="sec">
        <div className="sec-l">Scenes in this project</div>
        <div className="wpe-node-list">
          {nodes.map(n => (
            <div key={n.id} className="wpe-node-row">
              <span className="wpe-node-name">{n.name}</span>
              <span className="wpe-node-status"
                style={{ color: n.status === 'approved' ? '#4ADE80' : 'var(--mute)' }}>
                {n.status}
              </span>
            </div>
          ))}
          {nodes.length === 0 && (
            <div className="wpe-no-sub">No scenes yet — add scenes from the timeline.</div>
          )}
        </div>
      </div>
    </div>
  )
}
