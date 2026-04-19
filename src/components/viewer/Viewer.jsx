import { useState, useEffect } from 'react'
import './Viewer.css'

const TYPE_ICONS = {
  pdf:      <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h6M9 17h6M9 9h1"/></svg>,
  image:    <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  gif:      <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  video:    <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  audio:    <svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  document: <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
}

export default function AssetViewer({ asset, onClose, onNext, onPrev, hasNext, hasPrev }) {
  const [loaded,    setLoaded]    = useState(false)
  const [zoom,      setZoom]      = useState(1)
  const [editName,  setEditName]  = useState(false)
  const [nameVal,   setNameVal]   = useState(asset?.name ?? '')
  const [saving,    setSaving]    = useState(false)

  useEffect(() => {
    setLoaded(false)
    setZoom(1)
    setEditName(false)
    setNameVal(asset?.name ?? '')
    const handler = (e) => {
      if (e.key === 'Escape')    { if (editName) { setEditName(false); return } onClose() }
      if (e.key === 'ArrowRight' && hasNext && !editName) onNext()
      if (e.key === 'ArrowLeft'  && hasPrev && !editName) onPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [asset, editName])

  const saveName = async () => {
    if (!nameVal.trim() || nameVal === asset.name) { setEditName(false); return }
    setSaving(true)
    const { supabase } = await import('../../lib/supabase')
    await supabase.from('assets').update({ name: nameVal.trim() }).eq('id', asset.id)
    asset.name = nameVal.trim() // update in-place for immediate UI
    setSaving(false)
    setEditName(false)
  }

  const type = asset.type ?? 'document'
  const name = asset.name ?? 'Asset'
  const url  = asset.file_url

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB`
    return `${(bytes/(1024*1024)).toFixed(1)} MB`
  }

  return (
    <div className="viewer-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      {/* Header */}
      <div className="viewer-header">
        <div className="viewer-nav">
          <button className="vn-btn" onClick={onPrev} disabled={!hasPrev} data-hover>← Prev</button>
          <button className="vn-btn" onClick={onNext} disabled={!hasNext} data-hover>Next →</button>
        </div>
        <div className="viewer-meta">
          <div className="viewer-icon">{TYPE_ICONS[type] ?? TYPE_ICONS.document}</div>
          <div>
            {editName ? (
              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <input
                  className="viewer-name-input"
                  value={nameVal}
                  onChange={e => setNameVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName() }}
                  autoFocus
                />
                <button className="va-btn" onClick={saveName} disabled={saving}>
                  {saving ? '…' : 'Save'}
                </button>
                <button className="va-btn" onClick={() => setEditName(false)}>Cancel</button>
              </div>
            ) : (
              <div className="viewer-name"
                onClick={() => setEditName(true)}
                title="Click to rename"
                style={{ cursor:'text' }}>
                {nameVal}
                <span style={{ fontSize:'10px', color:'var(--ghost)', marginLeft:'6px' }}>✎</span>
              </div>
            )}
            <div className="viewer-info">
              {type} {asset.size_bytes ? `· ${formatSize(asset.size_bytes)}` : ''}
              {asset.room ? ` · ${asset.room}` : ''}
            </div>
          </div>
        </div>
        <div className="viewer-actions">
          {type === 'image' && (
            <>
              <button className="va-btn" onClick={() => setZoom(z => Math.min(z + 0.25, 3))} data-hover>+ Zoom</button>
              <button className="va-btn" onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} data-hover>− Zoom</button>
              <button className="va-btn" onClick={() => setZoom(1)} data-hover>Reset</button>
            </>
          )}
          <a className="va-btn" href={url} target="_blank" rel="noreferrer" data-hover>
            ↗ Open original
          </a>
          <button className="va-close" onClick={onClose} data-hover>× Close</button>
        </div>
      </div>

      {/* Content */}
      <div className="viewer-body">
        {!loaded && (
          <div className="viewer-loading">
            <div className="vl-spinner" />
            <div className="vl-text">Loading {name}…</div>
          </div>
        )}

        {/* PDF — native browser renderer in iframe */}
        {(type === 'pdf' || type === 'document') && url?.endsWith('.pdf') && (
          <iframe
            src={`${url}#toolbar=1&navpanes=1&scrollbar=1`}
            className="viewer-pdf"
            onLoad={() => setLoaded(true)}
            title={name}
          />
        )}

        {/* Non-PDF document */}
        {type === 'document' && !url?.endsWith('.pdf') && (
          <div className="viewer-nodoc" style={{ display: loaded ? 'none' : 'flex' }}>
            {TYPE_ICONS.document}
            <div className="vnd-name">{name}</div>
            <div className="vnd-sub">This file type cannot be previewed in-app.</div>
            <a className="vnd-open" href={url} target="_blank" rel="noreferrer" data-hover>
              Open in new tab →
            </a>
          </div>
        )}
        {type === 'document' && !url?.endsWith('.pdf') && !loaded && setLoaded(true) && null}

        {/* Image */}
        {(type === 'image' || type === 'gif') && (
          <div className="viewer-img-wrap" style={{ overflow: zoom > 1 ? 'auto' : 'hidden' }}>
            <img
              src={url} alt={name}
              className="viewer-img"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              onLoad={() => setLoaded(true)}
            />
          </div>
        )}

        {/* Video */}
        {type === 'video' && (
          <div className="viewer-video-wrap">
            <video
              src={url}
              className="viewer-video"
              controls autoPlay={false}
              onLoadedData={() => setLoaded(true)}
            />
          </div>
        )}

        {/* Audio */}
        {type === 'audio' && (
          <div className="viewer-audio-wrap" style={{ opacity: loaded ? 1 : 0 }}>
            <div className="viewer-audio-icon">{TYPE_ICONS.audio}</div>
            <div className="viewer-audio-name">{name}</div>
            <audio
              src={url} controls
              className="viewer-audio"
              onLoadedData={() => setLoaded(true)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
