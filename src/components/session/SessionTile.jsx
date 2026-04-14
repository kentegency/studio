import { useState, useRef, useEffect, useCallback } from 'react'
import { useSession } from './useSession'
import { useAuthStore, useProjectStore, useNodeStore, useNotesStore, useUIStore } from '../../stores'
import './Session.css'

// ── MIC ICON ──────────────────────────────────
const MicOn  = () => <svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
const MicOff = () => <svg viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
const CamOn  = () => <svg viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
const CamOff = () => <svg viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06A3 3 0 0 1 9 15a3 3 0 0 1-1.5-5.5"/></svg>
const EndIcon = () => <svg viewBox="0 0 24 24"><path d="M3 3h18v18H3z"/></svg>

export default function SessionTile({ sessionToken, onEnd, onSaveTranscript }) {
  const { user }           = useAuthStore()
  const { currentProject } = useProjectStore()
  const { selectedNode }   = useNodeStore()
  const { addNote }        = useNotesStore()
  const { showToast }      = useUIStore()

  const {
    state, start, endSession, toggleMute, toggleCamera,
    localStream, remoteStream,
    isMuted, isCamOff,
    transcript, duration,
    rawTranscript,
  } = useSession(sessionToken, 'host')

  const localVideoRef  = useRef(null)
  const remoteVideoRef = useRef(null)
  const tileRef        = useRef(null)

  // Drag state
  const [pos,      setPos]      = useState({ x: 20, y: 80 })
  const [dragging, setDragging] = useState(false)
  const [minimised,setMinimised]= useState(false)
  const dragStart = useRef(null)

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current  && localStream)  localVideoRef.current.srcObject  = localStream
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream
  }, [localStream, remoteStream])

  // Auto-start
  useEffect(() => { start() }, [])

  // Dragging
  const onMouseDown = useCallback((e) => {
    if (e.target.closest('.st-controls')) return
    setDragging(true)
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
  }, [pos])

  useEffect(() => {
    if (!dragging) return
    const move = (e) => {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - 180, e.clientX - dragStart.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 140, e.clientY - dragStart.current.y)),
      })
    }
    const up = () => setDragging(false)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [dragging])

  const handleEnd = async () => {
    endSession()
    // Save transcript as a Meeting room note
    const text = rawTranscript.current?.trim()
    if (text && currentProject?.id && user?.id) {
      await addNote({
        project_id: currentProject.id,
        node_id:    selectedNode?.id ?? null,
        author_id:  user.id,
        body:       `📞 Session transcript — ${duration}\n\n${text}`,
        color:      '#8B5CF6',
        room:       'meeting',
      })
      showToast('Session transcript saved to Meeting room.', '#4ADE80')
    }
    onEnd?.()
  }

  const stateLabel = {
    idle:      'Starting…',
    joining:   'Connecting…',
    connected: `Live · ${duration}`,
    ended:     'Session ended',
    error:     'Connection failed',
  }[state] ?? state

  return (
    <div
      ref={tileRef}
      className={`session-tile ${minimised ? 'minimised' : ''} ${dragging ? 'dragging' : ''}`}
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={onMouseDown}>

      {/* Header bar */}
      <div className="st-header">
        <div className="st-state">
          <div className={`st-state-dot ${state === 'connected' ? 'live' : ''}`} />
          <span>{stateLabel}</span>
        </div>
        <button className="st-minimise" onClick={() => setMinimised(m => !m)} title={minimised ? 'Expand' : 'Minimise'}>
          {minimised ? '▲' : '▼'}
        </button>
      </div>

      {!minimised && (
        <>
          {/* Video area */}
          <div className="st-video-area">
            {/* Remote — main view */}
            <video ref={remoteVideoRef} className="st-remote" autoPlay playsInline muted={false} />
            {state !== 'connected' && (
              <div className="st-waiting">
                <div className="st-waiting-dot" />
                <span>{state === 'joining' ? 'Waiting for guest…' : stateLabel}</span>
              </div>
            )}
            {/* Local — picture-in-picture */}
            <video ref={localVideoRef} className="st-local" autoPlay playsInline muted />
          </div>

          {/* Live transcript strip */}
          {transcript && (
            <div className="st-transcript">
              <span className="st-transcript-text">
                {transcript.slice(-120)}
              </span>
            </div>
          )}

          {/* Controls */}
          <div className="st-controls">
            <button className={`stc-btn ${isMuted ? 'off' : ''}`} onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? <MicOff /> : <MicOn />}
            </button>
            <button className={`stc-btn ${isCamOff ? 'off' : ''}`} onClick={toggleCamera}
              title={isCamOff ? 'Camera on' : 'Camera off'}>
              {isCamOff ? <CamOff /> : <CamOn />}
            </button>
            <button className="stc-btn end" onClick={handleEnd} title="End session">
              <EndIcon />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
