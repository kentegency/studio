import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useUIStore, useProjectStore, useNodeStore } from '../../stores'
import AssetViewer from '../viewer/Viewer'
import './Moodboard.css'

const TYPE_LABELS = { image:'Image', gif:'GIF', video:'Video', audio:'Audio', document:'Doc', reference:'Ref' }
const VISUAL_TYPES = ['image', 'gif', 'reference']

// ── FILTER BAR ────────────────────────────────────────────────
function FilterBar({ scenes, activeScene, setActiveScene, activeType, setActiveType, count }) {
  return (
    <div className="mb-filterbar">
      <div className="mb-filter-group">
        <button
          className={`mb-filter-btn ${!activeScene ? 'on' : ''}`}
          onClick={() => setActiveScene(null)}>
          All scenes
        </button>
        {scenes.map(s => (
          <button key={s.id}
            className={`mb-filter-btn ${activeScene === s.id ? 'on' : ''}`}
            onClick={() => setActiveScene(activeScene === s.id ? null : s.id)}>
            {s.name}
          </button>
        ))}
      </div>
      <div className="mb-filter-group">
        {['all', 'image', 'video', 'document'].map(t => (
          <button key={t}
            className={`mb-filter-pill ${activeType === t ? 'on' : ''}`}
            onClick={() => setActiveType(t)}>
            {t === 'all' ? 'All types' : TYPE_LABELS[t] ?? t}
          </button>
        ))}
      </div>
      <div className="mb-count">{count} asset{count !== 1 ? 's' : ''}</div>
    </div>
  )
}

// ── MOODBOARD TILE ────────────────────────────────────────────
function MoodTile({ asset, scene, onClick }) {
  const [loaded, setLoaded] = useState(false)
  const isVisual = VISUAL_TYPES.includes(asset.type ?? 'image')
  const isVideo  = asset.type === 'video'

  return (
    <div className="mb-tile" onClick={() => onClick(asset)} data-hover>
      <div className="mb-tile-img">
        {isVisual && !isVideo ? (
          <img
            src={asset.file_url}
            alt={asset.name}
            className={`mb-img ${loaded ? 'loaded' : ''}`}
            onLoad={() => setLoaded(true)}
            loading="lazy" />
        ) : isVideo ? (
          <div className="mb-tile-video">
            <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        ) : (
          <div className="mb-tile-doc">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>{asset.type?.toUpperCase() ?? 'FILE'}</span>
          </div>
        )}
        {!loaded && isVisual && !isVideo && (
          <div className="mb-tile-skeleton skeleton" />
        )}
      </div>
      <div className="mb-tile-meta">
        <span className="mb-tile-name">{asset.name?.replace(/\.[^.]+$/, '') ?? 'Asset'}</span>
        {scene && <span className="mb-tile-scene">{scene}</span>}
      </div>
    </div>
  )
}

// ── SCENE GROUP ───────────────────────────────────────────────
function SceneGroup({ scene, assets, onOpen }) {
  return (
    <div className="mb-scene-group">
      <div className="mb-scene-header">
        <div className="mb-scene-dot" />
        <span className="mb-scene-name">{scene.name}</span>
        <span className="mb-scene-count">{assets.length}</span>
      </div>
      <div className="mb-grid">
        {assets.map((asset, i) => (
          <MoodTile key={asset.id} asset={asset} onClick={onOpen} />
        ))}
      </div>
    </div>
  )
}

// ── MAIN MOODBOARD ────────────────────────────────────────────
export default function Moodboard({ onClose }) {
  const { currentProject }    = useProjectStore()
  const { nodes }             = useNodeStore()
  const { showToast }         = useUIStore()

  const [allAssets,    setAllAssets]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [activeScene,  setActiveScene]  = useState(null)
  const [activeType,   setActiveType]   = useState('all')
  const [groupByScene, setGroupByScene] = useState(true)
  const [viewerAsset,  setViewerAsset]  = useState(null)
  const [viewerList,   setViewerList]   = useState([])
  const [viewerIdx,    setViewerIdx]    = useState(0)

  // Sorted scenes for filter bar
  const sortedScenes = [...nodes].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  // Fetch ALL assets for this project in one query
  useEffect(() => {
    if (!currentProject?.id) return
    setLoading(true)
    supabase
      .from('assets')
      .select('*')
      .eq('project_id', currentProject.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setAllAssets(data ?? [])
        setLoading(false)
      })
  }, [currentProject?.id])

  // Filter
  const filtered = allAssets.filter(a => {
    if (activeScene && a.node_id !== activeScene) return false
    if (activeType !== 'all' && a.type !== activeType) return false
    return true
  })

  // Open viewer — pass current filtered list
  const openViewer = useCallback((asset) => {
    const visuals = filtered.filter(a => VISUAL_TYPES.includes(a.type ?? 'image'))
    const idx = visuals.findIndex(a => a.id === asset.id)
    setViewerList(visuals)
    setViewerIdx(Math.max(0, idx))
    setViewerAsset(asset)
  }, [filtered])

  // Keyboard Escape
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape' && !viewerAsset) onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [viewerAsset, onClose])

  // Group by scene
  const grouped = sortedScenes
    .map(scene => ({
      scene,
      assets: filtered.filter(a => a.node_id === scene.id),
    }))
    .filter(g => g.assets.length > 0)

  // Ungrouped assets (no node_id)
  const unassigned = filtered.filter(a => !a.node_id)

  const isEmpty = !loading && filtered.length === 0

  if (viewerAsset) return (
    <AssetViewer
      asset={viewerAsset}
      onClose={() => setViewerAsset(null)}
      onNext={() => {
        const i = viewerIdx + 1
        if (i < viewerList.length) { setViewerAsset(viewerList[i]); setViewerIdx(i) }
      }}
      onPrev={() => {
        const i = viewerIdx - 1
        if (i >= 0) { setViewerAsset(viewerList[i]); setViewerIdx(i) }
      }}
      hasNext={viewerIdx < viewerList.length - 1}
      hasPrev={viewerIdx > 0} />
  )

  return (
    <div className="mb-overlay">

      {/* Header */}
      <div className="mb-header">
        <div className="mb-header-left">
          <button className="mb-back" onClick={onClose}>
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
            Arc view
          </button>
          <div className="mb-title">
            Moodboard
            {currentProject && <span className="mb-project">— {currentProject.name}</span>}
          </div>
        </div>
        <div className="mb-header-right">
          {/* Group toggle */}
          <button
            className={`mb-toggle ${groupByScene ? 'on' : ''}`}
            onClick={() => setGroupByScene(g => !g)}
            title={groupByScene ? 'Switch to flat grid' : 'Group by scene'}>
            {groupByScene ? (
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="4" rx="1"/><rect x="3" y="10" width="7" height="4" rx="1"/><rect x="3" y="17" width="7" height="4" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/><rect x="14" y="10" width="7" height="4" rx="1"/><rect x="14" y="17" width="7" height="4" rx="1"/></svg>
            ) : (
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            )}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar
        scenes={sortedScenes.filter(s => allAssets.some(a => a.node_id === s.id))}
        activeScene={activeScene}
        setActiveScene={setActiveScene}
        activeType={activeType}
        setActiveType={setActiveType}
        count={filtered.length} />

      {/* Body */}
      <div className="mb-body">
        {loading ? (
          <div className="mb-loading">
            <div className="mb-loading-grid">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="skeleton mb-tile-skeleton-ph"
                  style={{ animationDelay: `${i * 0.06}s` }} />
              ))}
            </div>
          </div>
        ) : isEmpty ? (
          <div className="mb-empty">
            <div className="mb-empty-icon">
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
            <div className="mb-empty-title">
              {activeScene || activeType !== 'all' ? 'No assets match these filters' : 'No assets yet'}
            </div>
            <div className="mb-empty-body">
              Upload images, references, and documents to any scene.<br/>
              They will all appear here.
            </div>
          </div>
        ) : groupByScene ? (
          <div className="mb-grouped">
            {grouped.map(({ scene, assets }) => (
              <SceneGroup key={scene.id} scene={scene} assets={assets} onOpen={openViewer} />
            ))}
            {unassigned.length > 0 && (
              <SceneGroup
                scene={{ id: 'unassigned', name: 'No scene' }}
                assets={unassigned}
                onOpen={openViewer} />
            )}
          </div>
        ) : (
          <div className="mb-flat">
            <div className="mb-grid">
              {filtered.map(asset => {
                const scene = nodes.find(n => n.id === asset.node_id)
                return (
                  <MoodTile key={asset.id} asset={asset}
                    scene={scene?.name}
                    onClick={openViewer} />
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mb-footer">
        <span className="mb-footer-text">
          {filtered.length} asset{filtered.length !== 1 ? 's' : ''} · Click any image to open full view · Esc to close
        </span>
      </div>
    </div>
  )
}
