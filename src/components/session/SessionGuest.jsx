import { useRef, useEffect, useCallback, useState } from 'react'
import { useSession } from './useSession'
import { supabase } from '../../lib/supabase'
import './Session.css'
import './SessionGuest.css'

const MicOn  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
const MicOff = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
const CamOn  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
const CamOff = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06A3 3 0 0 1 9 15a3 3 0 0 1-1.5-5.5"/></svg>

export default function SessionGuest({ sessionToken }) {
  const {
    state, start, endSession, toggleMute, toggleCamera,
    localStream, remoteStream,
    isMuted, isCamOff, iceLabel, duration,
  } = useSession(sessionToken, 'guest')

  // ── STREAMS ──────────────────────────────────────────────
  // Keep latest stream refs so callback refs can attach them immediately on mount
  const localStreamRef  = useRef(null)
  const remoteStreamRef = useRef(null)

  // Store registered video elements so we can push streams to them as they arrive
  const localEls  = useRef(new Set())
  const remoteEls = useRef(new Set())

  // Sync refs when streams change, push to all registered elements
  useEffect(() => {
    localStreamRef.current = localStream
    localEls.current.forEach(el => {
      if (el && el.srcObject !== localStream) el.srcObject = localStream
    })
  }, [localStream])

  useEffect(() => {
    remoteStreamRef.current = remoteStream
    remoteEls.current.forEach(el => {
      if (el && el.srcObject !== remoteStream) el.srcObject = remoteStream
    })
  }, [remoteStream])

  // Callback ref factories — attach stream immediately when element mounts
  const makeLocalRef = useCallback(() => (el) => {
    if (!el) return
    localEls.current.add(el)
    if (localStreamRef.current && el.srcObject !== localStreamRef.current) {
      el.srcObject = localStreamRef.current
    }
  }, [])

  const makeRemoteRef = useCallback(() => (el) => {
    if (!el) return
    remoteEls.current.add(el)
    if (remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
      el.srcObject = remoteStreamRef.current
    }
  }, [])

  // ── PROJECT INFO ─────────────────────────────────────────
  const [project,    setProject]    = useState(null)
  const [activeScene,setActiveScene]= useState(null)
  const [mediaReady, setMediaReady] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('projects')
        .select('name, type, accent_color, logline')
        .eq('session_token', sessionToken)
        .single()
      if (data) setProject(data)
    }
    load()
  }, [sessionToken])

  useEffect(() => {
    window.__sessionSceneUpdate = (node) => setActiveScene(node)
    return () => { delete window.__sessionSceneUpdate }
  }, [])

  // Pre-join camera test — attach to the preview element
  const testMedia = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video:true, audio:true })
      localStreamRef.current = s
      localEls.current.forEach(el => { if (el) el.srcObject = s })
      setMediaReady(true)
      addDebug('● camera test OK')
    } catch (e) {
      addDebug('✗ camera test failed: ' + e.message)
    }
  }

  const accent = project?.accent_color ?? 'var(--accent)'

  const stateMsg = {
    idle:             { title:'You\'re invited to a session',    sub:'Check your camera and microphone, then join.' },
    joining:          { title:'Connecting…',                     sub:'Establishing a secure connection.' },
    connected:        { title:'Connected',                       sub:'' },
    ended:            { title:'Session ended',                   sub:'The transcript has been saved by the Creative Director.' },
    error:            { title:'Connection failed',               sub:'Check your camera and microphone permissions and try again.' },
    permission_denied:{ title:'Camera access required',          sub:'Allow camera and microphone access in your browser, then try again.' },
  }[state] ?? { title: state, sub: '' }

  return (
    <div className="sg-wrap" style={{ '--session-accent': accent }}>

      {/* TOP BAR */}
      <div className="sg-topbar">
        <div className="sg-logo-row">
          {['#ECEAE4','#0E0E11','#8A8680',accent,'#8A8680','#0E0E11','#8A8680','#0E0E11','#ECEAE4'].map((c,i) => (
            <div key={i} style={{ background:c, width:5, height:5, borderRadius:1 }} />
          ))}
          <span className="sg-brand-name">The Kentegency</span>
        </div>
        {project && (
          <div className="sg-proj-info">
            <span className="sg-proj-name" style={{ color: accent }}>{project.name}</span>
            {project.type && <span className="sg-proj-type">{project.type}</span>}
          </div>
        )}
        {state === 'connected' && iceLabel && (
          <div className={`sg-ice-badge sg-ice-${iceLabel.toLowerCase()}`}>
            <span className="sg-ice-dot" />
            {iceLabel}
          </div>
        )}
      </div>

      {/* MAIN */}
      <div className="sg-main">

        {/* IDLE / ERROR */}
        {(state === 'idle' || state === 'error' || state === 'permission_denied') && (
          <div className="sg-lobby">
            {project?.logline && (
              <div className="sg-logline">"{project.logline}"</div>
            )}
            <div className="sg-lobby-title">{stateMsg.title}</div>
            <div className="sg-lobby-sub">{stateMsg.sub}</div>

            {/* Preview — callback ref attaches stream immediately on mount */}
            <div className="sg-preview-wrap">
              <video ref={makeLocalRef()} className="sg-preview-video"
                autoPlay playsInline muted />
              {!mediaReady && (
                <div className="sg-preview-placeholder">
                  <CamOn />
                  <span>No camera preview</span>
                </div>
              )}
            </div>

            <button className="sg-join-btn" style={{ borderColor:accent, color:accent }}
              onClick={start}>
              {state === 'error' || state === 'permission_denied' ? 'Try again →' : 'Join session →'}
            </button>
            <button className="sg-check-btn" onClick={testMedia}>
              Test camera &amp; mic
            </button>
          </div>
        )}

        {/* JOINING */}
        {state === 'joining' && (
          <div className="sg-lobby">
            <div className="sg-joining-anim">
              <div className="sg-joining-ring" style={{ borderTopColor: accent }} />
            </div>
            <div className="sg-lobby-title">{stateMsg.title}</div>
            <div className="sg-lobby-sub">{stateMsg.sub}</div>
            {/* Preview during joining — same callback ref pattern */}
            <div className="sg-preview-wrap sg-preview-sm">
              <video ref={makeLocalRef()} className="sg-preview-video"
                autoPlay playsInline muted />
            </div>
          </div>
        )}

        {/* CONNECTED — full session */}
        {state === 'connected' && (
          <div className="sg-session">

            {/* Remote video — HOST feed */}
            <div className="sg-remote-wrap">
              {/* Callback ref attaches remoteStream the instant this element mounts */}
              <video ref={makeRemoteRef()} className="sg-remote"
                autoPlay playsInline />
              <div className="sg-duration">
                <span className="sg-duration-dot" style={{ background: accent }} />
                {duration}
              </div>
              {activeScene && (
                <div className="sg-scene-badge">
                  <span className="sg-scene-label">Host viewing</span>
                  <span className="sg-scene-name" style={{ color:accent }}>{activeScene.name}</span>
                </div>
              )}
            </div>

            {/* Guest local PiP — callback ref attaches localStream on mount */}
            <div className="sg-local-wrap">
              <video ref={makeLocalRef()} className="sg-local"
                autoPlay playsInline muted />
              <span className="sg-local-label">You</span>
            </div>

            {/* Controls */}
            <div className="sg-controls">
              <button className={`sgc-btn ${isMuted ? 'off' : ''}`} onClick={toggleMute}>
                {isMuted ? <MicOff /> : <MicOn />}
                <span>{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>
              <button className={`sgc-btn ${isCamOff ? 'off' : ''}`} onClick={toggleCamera}>
                {isCamOff ? <CamOff /> : <CamOn />}
                <span>{isCamOff ? 'Cam on' : 'Cam off'}</span>
              </button>
              <button className="sgc-btn end" onClick={() => endSession(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                <span>Leave</span>
              </button>
            </div>
          </div>
        )}

        {/* ENDED */}
        {state === 'ended' && (
          <div className="sg-lobby">
            <div className="sg-lobby-title">{stateMsg.title}</div>
            <div className="sg-lobby-sub">{stateMsg.sub}</div>
            <button className="sg-join-btn" style={{ borderColor:accent, color:accent }}
              onClick={() => window.history.back()}>
              ← Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
