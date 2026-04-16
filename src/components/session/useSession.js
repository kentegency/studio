// useSession.js — WebRTC via Supabase Realtime signalling
// FIX: presence-based offer sequencing — host waits for guest presence before sending offer
// FIX: iceConnectionState drives 'connected' — not ontrack (which requires video)
// FIX: reconnection attempt on transient disconnect (not permanent failure)

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

const TURN_USER = import.meta.env.VITE_TURN_USERNAME
const TURN_CRED = import.meta.env.VITE_TURN_CREDENTIAL

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  ...(TURN_USER && TURN_CRED ? [{
    urls: [
      'turn:relay.metered.ca:80',
      'turn:relay.metered.ca:443',
      'turns:relay.metered.ca:443',
    ],
    username:   TURN_USER,
    credential: TURN_CRED,
  }] : []),
]

export function useSession(sessionToken, role = 'host') {
  const [state,        setState]       = useState('idle')
  const [remoteStream, setRemoteStream] = useState(null)
  const [localStream,  setLocalStream]  = useState(null)
  const [isMuted,      setIsMuted]      = useState(false)
  const [isCamOff,     setIsCamOff]     = useState(false)
  const [transcript,   setTranscript]   = useState('')
  const [duration,     setDuration]     = useState(0)
  const [iceType,      setIceType]      = useState(null) // 'host'|'srflx'|'relay'

  const pcRef          = useRef(null)
  const channelRef     = useRef(null)
  const localStreamRef = useRef(null)
  const recognitionRef = useRef(null)
  const timerRef       = useRef(null)
  const transcriptRef  = useRef('')
  const offerSentRef   = useRef(false)
  const reconnectRef   = useRef(null)

  // ── CLEANUP ─────────────────────────────────
  const cleanup = useCallback(() => {
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    channelRef.current?.unsubscribe()
    channelRef.current = null
    recognitionRef.current?.stop()
    recognitionRef.current = null
    clearInterval(timerRef.current)
    clearTimeout(reconnectRef.current)
    setLocalStream(null)
    setRemoteStream(null)
    offerSentRef.current = false
  }, [])

  // ── SIGNAL ──────────────────────────────────
  const signal = useCallback((type, payload) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: { type, payload, from: role },
    })
  }, [role])

  // ── CREATE OFFER (host only, called after guest presence) ──
  const sendOffer = useCallback(async (pc) => {
    if (offerSentRef.current) return
    offerSentRef.current = true
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      signal('offer', offer)
    } catch (err) {
      console.error('Offer error:', err)
      setState('error')
    }
  }, [signal])

  // ── BUILD PEER CONNECTION ────────────────────
  const buildPC = useCallback((stream) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pcRef.current = pc

    stream.getTracks().forEach(track => pc.addTrack(track, stream))

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0])
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) signal('ice', e.candidate)
    }

    // ── KEY FIX: ICE state drives 'connected', not ontrack ──
    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState
      if (s === 'connected' || s === 'completed') {
        setState('connected')
        clearTimeout(reconnectRef.current)
      }
      if (s === 'disconnected') {
        // Transient — give it 5s before declaring error
        reconnectRef.current = setTimeout(() => {
          if (pcRef.current?.iceConnectionState === 'disconnected') {
            setState('error')
          }
        }, 5000)
      }
      if (s === 'failed') {
        setState('error')
      }
    }

    // Track ICE candidate type for quality indicator
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        signal('ice', e.candidate)
        const t = e.candidate.type // 'host' | 'srflx' | 'relay'
        if (t === 'relay') setIceType('relay')
        else if (t === 'srflx' && iceType !== 'relay') setIceType('srflx')
        else if (!iceType) setIceType('host')
      }
    }

    return pc
  }, [signal, iceType])

  // ── START SESSION ────────────────────────────
  const start = useCallback(async () => {
    setState('joining')
    offerSentRef.current = false

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      setLocalStream(stream)

      const pc = buildPC(stream)

      // Subscribe to signalling channel
      const channel = supabase.channel(`session:${sessionToken}`, {
        config: {
          broadcast: { self: false },
          presence:  { key: role },
        }
      })
      channelRef.current = channel

      // ── KEY FIX: host sends offer only after guest presence ──
      if (role === 'host') {
        channel.on('presence', { event: 'join' }, ({ newPresences }) => {
          const guestPresent = newPresences.some(p => p.role === 'guest')
          if (guestPresent) sendOffer(pc)
        })
        // Also check if guest is already present when host joins late
        channel.on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState()
          const guestPresent = Object.values(state).flat().some(p => p.role === 'guest')
          if (guestPresent) sendOffer(pc)
        })
      }

      // Signal handler
      channel.on('broadcast', { event: 'signal' }, async ({ payload: msg }) => {
        if (!pcRef.current) return
        const { type, payload, from } = msg
        if (from === role) return

        try {
          if (type === 'offer' && role === 'guest') {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload))
            const answer = await pcRef.current.createAnswer()
            await pcRef.current.setLocalDescription(answer)
            signal('answer', answer)
          }
          if (type === 'answer' && role === 'host') {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload))
          }
          if (type === 'ice') {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload))
          }
          if (type === 'end') {
            endSession(false)
          }
          if (type === 'scene' && role === 'guest') {
            // Host broadcast their selected scene — for future shared scene view
            window.__sessionSceneUpdate?.(payload)
          }
        } catch (err) {
          // ICE candidate errors are common and non-fatal
          if (type !== 'ice') console.error('Signal handler error:', type, err)
        }
      })

      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Guest tracks presence after subscribing — this triggers host's offer
          if (role === 'guest') {
            await channel.track({ role: 'guest', joinedAt: Date.now() })
          } else {
            await channel.track({ role: 'host', joinedAt: Date.now() })
          }
        }
      })

      startTranscript()
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)

    } catch (err) {
      console.error('Session start error:', err)
      if (err.name === 'NotAllowedError') {
        setState('permission_denied')
      } else {
        setState('error')
      }
      cleanup()
    }
  }, [sessionToken, role, signal, sendOffer, buildPC, cleanup])

  // ── TRANSCRIPT ───────────────────────────────
  const startTranscript = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    recognitionRef.current = rec
    rec.continuous = true
    rec.interimResults = false
    rec.lang = 'en-GB'
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .slice(e.resultIndex)
        .filter(r => r.isFinal)
        .map(r => r[0].transcript)
        .join(' ')
      if (text) {
        transcriptRef.current += (transcriptRef.current ? ' ' : '') + text
        setTranscript(transcriptRef.current)
      }
    }
    rec.onerror = () => {}
    try { rec.start() } catch {}
  }, [])

  // ── END SESSION ──────────────────────────────
  const endSession = useCallback((notify = true) => {
    if (notify) signal('end', {})
    cleanup()
    setState('ended')
    clearInterval(timerRef.current)
  }, [signal, cleanup])

  // ── BROADCAST SELECTED SCENE (host → guest) ──
  const broadcastScene = useCallback((node) => {
    if (role === 'host') signal('scene', { id: node.id, name: node.name })
  }, [role, signal])

  // ── MIC / CAM ────────────────────────────────
  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setIsMuted(m => !m)
  }, [])

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setIsCamOff(c => !c)
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  const formatDuration = (s) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const iceLabel = { host: 'Local', srflx: 'STUN', relay: 'TURN' }[iceType] ?? null

  return {
    state, start, endSession, toggleMute, toggleCamera, broadcastScene,
    localStream, remoteStream,
    isMuted, isCamOff, iceLabel,
    transcript, duration: formatDuration(duration),
    rawTranscript: transcriptRef,
  }
}
