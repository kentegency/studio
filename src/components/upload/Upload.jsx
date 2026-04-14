import { useState, useRef, useCallback } from 'react'
import { useAssetsStore, useNodeStore, useAuthStore, useUIStore, useProjectStore } from '../../stores'
import './Upload.css'

const ACCEPT = 'image/*,video/*,audio/*,.pdf,.doc,.docx'

const TYPE_FROM_MIME = (mime) => {
  if (mime.startsWith('image/gif'))   return 'gif'
  if (mime.startsWith('image/'))      return 'image'
  if (mime.startsWith('video/'))      return 'video'
  if (mime.startsWith('audio/'))      return 'audio'
  if (mime.includes('pdf'))           return 'document'
  if (mime.includes('word'))          return 'document'
  return 'reference'
}

export default function Upload({ onClose }) {
  const { uploadAsset } = useAssetsStore()
  const selectedNode    = useNodeStore(s => s.selectedNode)
  const { profile }     = useAuthStore()
  const { currentProject } = useProjectStore()
  const { showToast }   = useUIStore()

  const [dragging, setDragging]   = useState(false)
  const [files, setFiles]         = useState([])   // { file, progress, done, error }
  const inputRef = useRef()

  const addFiles = (incoming) => {
    const newFiles = Array.from(incoming).map(f => ({
      file: f, progress: 0, done: false, error: null, id: Math.random()
    }))
    setFiles(prev => [...prev, ...newFiles])
    newFiles.forEach(item => upload(item))
  }

  const upload = async (item) => {
    if (!currentProject || !selectedNode) {
      showToast('Select a node on the timeline first.', '#E05050')
      return
    }
    setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: 20 } : f))

    const payload = {
      project_id:   currentProject.id,
      node_id:      selectedNode.id,
      uploaded_by:  profile?.id,
      name:         item.file.name,
      type:         TYPE_FROM_MIME(item.file.type),
      size_bytes:   item.file.size,
      room:         'studio',
    }

    setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: 50 } : f))

    const { error } = await uploadAsset(item.file, payload)

    if (error) {
      setFiles(prev => prev.map(f => f.id === item.id
        ? { ...f, progress: 0, error: error.message } : f))
      showToast(`Upload failed: ${item.file.name}`, '#E05050')
    } else {
      setFiles(prev => prev.map(f => f.id === item.id
        ? { ...f, progress: 100, done: true } : f))
      showToast(`${item.file.name} uploaded.`, '#4ADE80')
    }
  }

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [currentProject, selectedNode])

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  const formatSize = (bytes) => {
    if (bytes < 1024)        return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes/1024).toFixed(1) + ' KB'
    return (bytes/(1024*1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="upload-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="upload-panel">
        <div className="upload-head">
          <span className="upload-title">Upload Assets</span>
          <span className="upload-node">
            {selectedNode ? `→ ${selectedNode.label ?? selectedNode.name}` : 'No node selected'}
          </span>
          <button className="upload-close" onClick={onClose}>×</button>
        </div>

        {/* DROP ZONE */}
        <div
          className={`drop-zone ${dragging ? 'dragging' : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef} type="file"
            multiple accept={ACCEPT}
            style={{ display:'none' }}
            onChange={e => addFiles(e.target.files)}
          />
          <div className="dz-icon">
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <div className="dz-label">Drop files here or click to browse</div>
          <div className="dz-sub">Images · Video · Audio · PDF · Documents</div>
        </div>

        {/* FILE LIST */}
        {files.length > 0 && (
          <div className="upload-list">
            {files.map(item => (
              <div key={item.id} className={`upload-item ${item.done ? 'done' : ''} ${item.error ? 'err' : ''}`}>
                <div className="ui-info">
                  <div className="ui-name">{item.file.name}</div>
                  <div className="ui-meta">
                    {formatSize(item.file.size)} · {TYPE_FROM_MIME(item.file.type)}
                  </div>
                </div>
                <div className="ui-right">
                  {item.error && (
                    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                      <span className="ui-error">Failed</span>
                      <button className="ui-retry" onClick={() => uploadFile(item)}
                        data-hover title="Retry upload">
                        ↩ Retry
                      </button>
                    </div>
                  )}
                  {item.done  && <span className="ui-done">✓</span>}
                  {!item.done && !item.error && (
                    <div className="ui-bar">
                      <div className="ui-fill" style={{ width: `${item.progress}%` }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="upload-foot">
          <span className="upload-hint">
            {!selectedNode
              ? 'Click a node on the timeline first, then upload.'
              : `Files upload to ${selectedNode.label ?? selectedNode.name} in Studio room.`}
          </span>
          <button className="upload-done-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
