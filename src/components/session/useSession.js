// useSession.js — WebRTC peer connection via Supabase Realtime signalling
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

// ICE servers — STUN always + TURN if env var configured
// Free TURN: sign up at metered.ca, set VITE_TURN_USERNAME + VITE_TURN_CREDENTIAL
const TURN_USER = import.meta.env.VITE_TURN_USERNAME
const TURN_CRED = import.meta.env.VITE_TURN_CREDENTIAL

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // TURN — required for corporate networks with symmetric NAT
  ...(TURN_USER && TURN_CRED ? [
    {
      urls: [
        'turn:relay.metered.ca:80',
        'turn:relay.metered.ca:443',
        'turns:relay.metered.ca:443',
      ],
      username:   TURN_USER,
      credential: TURN_CRED,
    }
  ] : []),
]

export function useSession(sessionToken, role = 'host') {
  // role: 'host' (CD in canvas) | 'guest' (George in Window)

  const [state,       setState]      = useState('idle')
  // idle | joining | connected | ended | error
  const [remoteStream, setRemoteStream] = useState(null)
  const [localStream,  setLocalStream]  = useState(null)
  const [isMuted,      setIsMuted]      = useState(false)
  const [isCamOff,     setIsCamOff]     = useState(false)
  const [transcript,   setTranscript]   = useState('')
  const [duration,     setDuration]     = useState(0)

  const pcRef          = useRef(null)
  const channelRef     = useRef(null)
  const localStreamRef = useRef(null)
  const recognitionRef = useRef(null)
  const timerRef       = useRef(null)
  const transcriptRef  = useRef('')

  // ── CLEANUP ───────────────────────────────────
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
    setLocalStream(null)
    setRemoteStream(null)
  }, [])

  // ── SIGNALLING — send via Supabase channel ────
  const signal = useCallback((type, payload) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: { type, payload, from: role },
    })
  }, [role])

  // ── START SESSION ─────────────────────────────
  const start = useCallback(async () => {
    setState('joining')

    try {
      // Get local media
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      setLocalStream(stream)

      // Create peer connection
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pcRef.current = pc

      // Add local tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      // Handle remote stream
      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0])
        setState('connected')
      }

      // ICE candidates — send via channel
      pc.onicecandidate = (e) => {
        if (e.candidate) signal('ice', e.candidate)
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setState('error')
        }
      }

      // Subscribe to signalling channel
      const channel = supabase.channel(`session:${sessionToken}`, {
        config: { broadcast: { self: false } }
      })
      channelRef.current = channel

      channel.on('broadcast', { event: 'signal' }, async ({ payload: msg }) => {
        if (!pcRef.current) return
        const { type, payload, from } = msg
        if (from === role) return // ignore own messages

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
          try { await pcRef.current.addIceCandidate(new RTCIceCandidate(payload)) } catch {}
        }
        if (type === 'end') {
          endSession(false) // remote ended
        }
      })

      await channel.subscribe()

      // Host creates and sends offer
      if (role === 'host') {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        signal('offer', offer)
      }

      // Start transcript
      startTranscript()

      // Duration timer
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)

    } catch (err) {
      console.error('Session error:', err)
      setState('error')
      cleanup()
    }
  }, [sessionToken, role, signal, cleanup])

  // ── TRANSCRIPT ────────────────────────────────
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
    try { rec.start() } catch {}
  }, [])

  // ── END SESSION ───────────────────────────────
  const endSession = useCallback((notify = true) => {
    if (notify) signal('end', {})
    cleanup()
    setState('ended')
    clearInterval(timerRef.current)
  }, [signal, cleanup])

  // ── MUTE / CAM TOGGLE ─────────────────────────
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    stream.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setIsMuted(m => !m)
  }, [])

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    stream.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setIsCamOff(c => !c)
  }, [])

  // Cleanup on unmount
  useEffect(() => () => cleanup(), [cleanup])

  const formatDuration = (s) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return {
    state, start, endSession, toggleMute, toggleCamera,
    localStream, remoteStream,
    isMuted, isCamOff,
    transcript, duration: formatDuration(duration),
    rawTranscript: transcriptRef,
  }
}
