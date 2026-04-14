import { useRef, useEffect } from 'react'
import { useSession } from './useSession'
import './Session.css'
import './SessionGuest.css'

const MicOn  = () => <svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
const MicOff = () => <svg viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
const CamOn  = () => <svg viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
const CamOff = () => <svg viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06A3 3 0 0 1 9 15a3 3 0 0 1-1.5-5.5"/></svg>

export default function SessionGuest({ sessionToken }) {
  const {
    state, start, endSession, toggleMute, toggleCamera,
    localStream, remoteStream,
    isMuted, isCamOff, duration,
  } = useSession(sessionToken, 'guest')

  const localRef  = useRef(null)
  const remoteRef = useRef(null)

  useEffect(() => {
    if (localRef.current  && localStream)  localRef.current.srcObject  = localStream
    if (remoteRef.current && remoteStream) remoteRef.current.srcObject = remoteStream
  }, [localStream, remoteStream])

  return (
    <div className="sg-wrap">
      {/* Grain */}
      <div className="grain" />

      <div className="sg-inner">
        {/* Brand */}
        <div className="sg-brand">
          <div className="sg-logo">
            {['#F4EFD8','#040402','#7A7A7A','#F5920C','#7A7A7A','#040402','#7A7A7A','#040402','#F4EFD8'].map((c,i) => (
              <div key={i} style={{ background:c, width:6, height:6, borderRadius:1 }} />
            ))}
          </div>
          <span className="sg-name">The Kentegency</span>
        </div>

        {/* State: idle / joining / connected / ended */}
        {state === 'idle' && (
          <div className="sg-lobby">
            <div className="sg-lobby-title">You have been invited to a session</div>
            <div className="sg-lobby-sub">The Creative Director will see you when you join.</div>
            <button className="sg-join-btn" onClick={start}>
              Join session →
            </button>
          </div>
        )}

        {state === 'joining' && (
          <div className="sg-lobby">
            <div className="sg-connecting-dot" />
            <div className="sg-lobby-title">Connecting…</div>
            <div className="sg-lobby-sub">Waiting for the host to respond.</div>
          </div>
        )}

        {state === 'connected' && (
          <div className="sg-session">
            {/* Remote — main, full width */}
            <div className="sg-remote-wrap">
              <video ref={remoteRef} className="sg-remote" autoPlay playsInline muted={false} />
              <div className="sg-duration">{duration}</div>
            </div>

            {/* Local — small PiP */}
            <div className="sg-local-wrap">
              <video ref={localRef} className="sg-local" autoPlay playsInline muted />
            </div>

            {/* Controls */}
            <div className="sg-controls">
              <button className={`sgc-btn ${isMuted ? 'off' : ''}`} onClick={toggleMute}>
                {isMuted ? <MicOff /> : <MicOn />}
                <span>{isMuted ? 'Unmuted' : 'Mute'}</span>
              </button>
              <button className={`sgc-btn ${isCamOff ? 'off' : ''}`} onClick={toggleCamera}>
                {isCamOff ? <CamOff /> : <CamOn />}
                <span>{isCamOff ? 'Camera on' : 'Camera off'}</span>
              </button>
              <button className="sgc-btn end" onClick={() => endSession(true)}>
                <svg viewBox="0 0 24 24" style={{width:14,height:14,stroke:'currentColor',fill:'none',strokeWidth:1.5}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                <span>Leave</span>
              </button>
            </div>
          </div>
        )}

        {(state === 'ended') && (
          <div className="sg-lobby">
            <div className="sg-lobby-title">Session ended</div>
            <div className="sg-lobby-sub">The recording has been saved by the Creative Director.</div>
            <button className="sg-join-btn" onClick={() => window.history.back()}>
              ← Close
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="sg-lobby">
            <div className="sg-lobby-title" style={{ color:'var(--red)' }}>Connection failed</div>
            <div className="sg-lobby-sub">Check your camera and microphone permissions, then try again.</div>
            <button className="sg-join-btn" onClick={start}>Retry →</button>
          </div>
        )}
      </div>
    </div>
  )
}
