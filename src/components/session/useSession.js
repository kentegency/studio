// useSession.js — WebRTC via Supabase Realtime signalling
// FIXES APPLIED:
// 1. newPresences is an object {presenceRef: [entry]}, not array — use Object.values().flat()
// 2. presenceState() same shape — Object.values().flat()
// 3. presence key must be unique per client (role+timestamp), not just role
// 4. ICE state drives 'connected', not ontrack
// 5. No double onicecandidate assignment
// 6. Reconnection on transient disconnect

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

// Flatten Supabase presence state object → array of entries
// presenceState() returns { [presenceKey]: [{presence_ref, ...userData}] }
const flattenPresence = (obj) => Object.values(obj || {}).flat()

export function useSession(sessionToken, role = 'host') {
  const [state,        setState]       = useState('idle')
  const [remoteStream, setRemoteStream] = useState(null)
  const [localStream,  setLocalStream]  = useState(null)
  const [isMuted,      setIsMuted]      = useState(false)
  const [isCamOff,     setIsCamOff]     = useState(false)
  const [transcript,   setTranscript]   = useState('')
  const [duration,     setDuration]     = useState(0)
  const [iceLabel,     setIceLabel]     = useState(null)

  const pcRef          = useRef(null)
  const channelRef     = useRef(null)
  const localStreamRef = useRef(null)
  const recognitionRef = useRef(null)
  const timerRef       = useRef(null)
  const transcriptRef  = useRef('')
  const offerSentRef   = useRef(false)
  const reconnectRef   = useRef(null)

  // ── CLEANUP ────────────────────────────────────────────
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

  // ── SIGNAL via broadcast ───────────────────────────────
  const signal = useCallback((type, payload) => {
    channelRef.current?.send({
      type:    'broadcast',
      event:   'signal',
      payload: { type, payload, from: role },
    })
  }, [role])

  // ── SEND OFFER — host only, called once when guest arrives ──
  const sendOffer = useCallback(async (pc) => {
    if (offerSentRef.current) return
    offerSentRef.current = true
    console.log('[session] host sending offer')
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      signal('offer', offer)
    } catch (err) {
      console.error('[session] offer error:', err)
      setState('error')
    }
  }, [signal])

  // ── START ──────────────────────────────────────────────
  const start = useCallback(async () => {
    setState('joining')
    offerSentRef.current = false

    try {
      // 1. Get media
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      setLocalStream(stream)

      // 2. Create peer connection — single onicecandidate handler
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pcRef.current = pc

      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      pc.ontrack = (e) => {
        console.log('[session] remote track received')
        setRemoteStream(e.streams[0])
      }

      // ICE candidate → signal to peer + track quality
      pc.onicecandidate = (e) => {
        if (!e.candidate) return
        signal('ice', e.candidate)
        const t = e.candidate.type
        setIceLabel(prev => {
          if (prev === 'TURN') return prev
          if (t === 'relay') return 'TURN'
          if (t === 'srflx') return 'STUN'
          return prev ?? 'Local'
        })
      }

      // ICE connection state → drives UI state
      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState
        console.log('[session] ICE state:', s)
        if (s === 'connected' || s === 'completed') {
          setState('connected')
          clearTimeout(reconnectRef.current)
        } else if (s === 'disconnected') {
          // Transient — wait 6s before declaring error
          reconnectRef.current = setTimeout(() => {
            if (pcRef.current?.iceConnectionState === 'disconnected') {
              setState('error')
            }
          }, 6000)
        } else if (s === 'failed') {
          setState('error')
        }
      }

      pc.onconnectionstatechange = () => {
        console.log('[session] connection state:', pc.connectionState)
      }

      // 3. Create channel — unique presence key per client
      // Using role+timestamp ensures no key collision if multiple guests
      const presenceKey = role === 'host' ? 'host' : `guest-${Date.now()}`
      const channel = supabase.channel(`session:${sessionToken}`, {
        config: {
          broadcast: { self: false },
          presence:  { key: presenceKey },
        }
      })
      channelRef.current = channel

      // 4. Host: wait for guest presence BEFORE sending offer
      if (role === 'host') {
        channel.on('presence', { event: 'join' }, ({ newPresences }) => {
          // FIX: newPresences is { [ref]: [{...userData}] }, not an array
          const entries = flattenPresence(newPresences)
          console.log('[session] host presence join entries:', entries)
          const guestJoined = entries.some(p => p.role === 'guest')
          if (guestJoined) sendOffer(pc)
        })

        // Sync fires when local state is reconciled — catch case where
        // host joins AFTER guest (e.g. host page refresh)
        channel.on('presence', { event: 'sync' }, () => {
          if (offerSentRef.current) return
          const state = channel.presenceState()
          // FIX: presenceState() is same shape — flatten it
          const entries = flattenPresence(state)
          console.log('[session] host presence sync entries:', entries)
          const guestPresent = entries.some(p => p.role === 'guest')
          if (guestPresent) sendOffer(pc)
        })
      }

      // 5. Signal handler — offer/answer/ICE/end
      channel.on('broadcast', { event: 'signal' }, async ({ payload: msg }) => {
        if (!pcRef.current) return
        const { type, payload, from } = msg
        if (from === role) return // ignore own messages

        console.log('[session] signal received:', type, 'from:', from)

        try {
          if (type === 'offer' && role === 'guest') {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload))
            const answer = await pcRef.current.createAnswer()
            await pcRef.current.setLocalDescription(answer)
            signal('answer', answer)
          } else if (type === 'answer' && role === 'host') {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload))
          } else if (type === 'ice') {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(payload))
            } catch {
              // ICE candidate errors are common and non-fatal — ignore
            }
          } else if (type === 'end') {
            endSession(false)
          } else if (type === 'scene' && role === 'guest') {
            window.__sessionSceneUpdate?.(payload)
          }
        } catch (err) {
          console.error('[session] signal handler error:', type, err)
        }
      })

      // 6. Subscribe — then track presence
      // IMPORTANT: register all listeners BEFORE subscribe()
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Channel subscribe timeout')), 10000)
        channel.subscribe((status) => {
          console.log('[session] channel status:', status)
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout)
            // Track presence AFTER subscribe confirms — this is what triggers host's offer
            channel.track({ role, joinedAt: Date.now() })
              .then(() => {
                console.log('[session] presence tracked, role:', role)
                resolve()
              })
              .catch(reject)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timeout)
            reject(new Error(`Channel ${status}`))
          }
        })
      })

      // 7. Start transcript + timer
      startTranscript()
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)

    } catch (err) {
      console.error('[session] start error:', err)
      if (err.name === 'NotAllowedError') {
        setState('permission_denied')
      } else {
        setState('error')
      }
      cleanup()
    }
  }, [sessionToken, role, signal, sendOffer, cleanup])

  // ── TRANSCRIPT ─────────────────────────────────────────
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
    rec.onerror = () => {} // Non-fatal
    try { rec.start() } catch {}
  }, [])

  // ── END SESSION ────────────────────────────────────────
  const endSession = useCallback((notify = true) => {
    if (notify) signal('end', {})
    cleanup()
    setState('ended')
    clearInterval(timerRef.current)
  }, [signal, cleanup])

  // ── BROADCAST SCENE (host → guest) ────────────────────
  const broadcastScene = useCallback((node) => {
    if (role === 'host') signal('scene', { id: node.id, name: node.name })
  }, [role, signal])

  // ── MIC / CAM ──────────────────────────────────────────
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

  return {
    state, start, endSession, toggleMute, toggleCamera, broadcastScene,
    localStream, remoteStream,
    isMuted, isCamOff, iceLabel,
    transcript, duration: formatDuration(duration),
    rawTranscript: transcriptRef,
  }
}
