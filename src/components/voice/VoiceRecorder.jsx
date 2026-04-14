import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore, useProjectStore, useNodeStore, useNotesStore, useUIStore } from '../../stores'
import './Voice.css'

const STATES = { idle:'idle', recording:'recording', processing:'processing', done:'done', error:'error' }

export default function VoiceRecorder({ onClose, nodeId: propNodeId }) {
  const { user }           = useAuthStore()
  const { currentProject } = useProjectStore()
  const { selectedNode }   = useNodeStore()
  const { addNote }        = useNotesStore()
  const { showToast }      = useUIStore()

  const nodeId = propNodeId ?? selectedNode?.id

  const [state,       setState]       = useState(STATES.idle)
  const [transcript,  setTranscript]  = useState('')
  const [interim,     setInterim]     = useState('')
  const [duration,    setDuration]    = useState(0)
  const [audioBlob,   setAudioBlob]   = useState(null)
  const [waveform,    setWaveform]    = useState(Array(40).fill(2))
  const [editedText,  setEditedText]  = useState('')
  const [saving,      setSaving]      = useState(false)

  const mediaRecorderRef = useRef(null)
  const recognitionRef   = useRef(null)
  const chunksRef        = useRef([])
  const timerRef         = useRef(null)
  const analyserRef      = useRef(null)
  const animFrameRef     = useRef(null)
  const streamRef        = useRef(null)

  // Cleanup on unmount
  useEffect(() => () => {
    stopAll()
    clearInterval(timerRef.current)
    cancelAnimationFrame(animFrameRef.current)
  }, [])

  const stopAll = () => {
    mediaRecorderRef.current?.stop()
    recognitionRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    cancelAnimationFrame(animFrameRef.current)
    clearInterval(timerRef.current)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      setState(STATES.recording)
      setTranscript('')
      setInterim('')
      setDuration(0)

      // MediaRecorder for audio file
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mr
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
      }
      mr.start(100)

      // Web Speech API for transcript
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        const rec = new SpeechRecognition()
        recognitionRef.current = rec
        rec.continuous     = true
        rec.interimResults = true
        rec.lang           = 'en-GB'
        rec.onresult = (e) => {
          let final = '', interimText = ''
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript
            if (e.results[i].isFinal) final += t + ' '
            else interimText += t
          }
          if (final) setTranscript(prev => prev + final)
          setInterim(interimText)
        }
        rec.onerror = () => {} // silent — not all browsers support it
        rec.start()
      }

      // Waveform animation via AnalyserNode
      const ctx = new AudioContext()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 128
      src.connect(analyser)
      analyserRef.current = analyser
      animateWaveform(analyser)

      // Duration counter
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)

    } catch (err) {
      setState(STATES.error)
      showToast('Microphone access denied.', '#E05050')
    }
  }

  const animateWaveform = (analyser) => {
    const data = new Uint8Array(analyser.frequencyBinCount)
    const frame = () => {
      analyser.getByteFrequencyData(data)
      const bars = Array.from({ length: 40 }, (_, i) => {
        const idx = Math.floor(i * data.length / 40)
        return Math.max(2, Math.round((data[idx] / 255) * 40))
      })
      setWaveform(bars)
      animFrameRef.current = requestAnimationFrame(frame)
    }
    animFrameRef.current = requestAnimationFrame(frame)
  }

  const stopRecording = () => {
    stopAll()
    setState(STATES.processing)
    setInterim('')
    // Give MediaRecorder a moment to flush
    setTimeout(() => setState(STATES.done), 400)
  }

  useEffect(() => {
    if (state === STATES.done && transcript) {
      setEditedText(transcript.trim())
    }
  }, [state, transcript])

  const formatDuration = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`

  const save = async () => {
    if (!currentProject) { showToast('Open a project first.', '#E05050'); return }
    setSaving(true)

    const finalText = editedText.trim() || 'Voice note (no transcription)'
    const timestamp = new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })

    // Upload audio to Supabase storage if we have a blob
    let audioUrl = null
    if (audioBlob) {
      const filename = `voice_${Date.now()}.webm`
      const path     = `${currentProject.id}/${filename}`
      const { data: uploadData } = await supabase.storage
        .from('assets')
        .upload(path, audioBlob, { contentType:'audio/webm' })
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('assets').getPublicUrl(path)
        audioUrl = urlData?.publicUrl
      }
    }

    // Save audio as asset if we have a URL and a node
    if (audioUrl && nodeId) {
      await supabase.from('assets').insert({
        project_id:  currentProject.id,
        node_id:     nodeId,
        uploaded_by: user?.id,
        name:        `Voice note — ${timestamp}`,
        type:        'audio',
        file_url:    audioUrl,
        room:        'studio',
      })
    }

    // Save transcript as note
    await addNote({
      project_id: currentProject.id,
      node_id:    nodeId ?? null,
      author_id:  user?.id,
      body:       `🎙 Voice note — ${timestamp}\n\n${finalText}`,
      color:      '#8B5CF6',
      room:       'studio',
    })

    setSaving(false)
    showToast('Voice note saved.', '#4ADE80')
    onClose()
  }

  const discard = () => { stopAll(); onClose() }

  return (
    <div className="voice-overlay" onClick={e => e.target === e.currentTarget && discard()}>
      <div className="voice-panel">

        {/* Header */}
        <div className="voice-head">
          <div className="voice-title">Voice Note</div>
          {nodeId && selectedNode && (
            <div className="voice-scene">{selectedNode.name}</div>
          )}
          <button className="voice-close" onClick={discard}>×</button>
        </div>

        {/* Waveform / state area */}
        <div className="voice-vis">
          {state === STATES.idle && (
            <div className="voice-idle">
              <div className="vi-icon">
                <svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </div>
              <div className="vi-label">Hold to record</div>
              <div className="vi-sub">Transcript captured automatically</div>
            </div>
          )}

          {state === STATES.recording && (
            <div className="voice-recording">
              <div className="vr-duration">{formatDuration(duration)}</div>
              <div className="vr-waveform">
                {waveform.map((h, i) => (
                  <div key={i} className="vr-bar" style={{ height:`${h}px` }} />
                ))}
              </div>
              {(transcript || interim) && (
                <div className="vr-transcript">
                  <span>{transcript}</span>
                  <span className="vr-interim">{interim}</span>
                </div>
              )}
            </div>
          )}

          {state === STATES.processing && (
            <div className="voice-idle">
              <div className="vi-spinner" />
              <div className="vi-label">Processing…</div>
            </div>
          )}

          {state === STATES.done && (
            <div className="voice-done">
              <div className="vd-label">Review transcript</div>
              <textarea
                className="vd-transcript"
                value={editedText}
                onChange={e => setEditedText(e.target.value)}
                placeholder="No speech detected — type your note here…"
                rows={5} />
              <div className="vd-meta">
                {formatDuration(duration)} · {audioBlob ? 'Audio captured' : 'No audio'} ·
                {nodeId ? ` Attached to ${selectedNode?.name ?? 'scene'}` : ' No scene selected'}
              </div>
            </div>
          )}

          {state === STATES.error && (
            <div className="voice-idle">
              <div className="vi-label" style={{ color:'var(--red)' }}>Microphone access denied</div>
              <div className="vi-sub">Allow microphone access in your browser settings</div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="voice-controls">
          {state === STATES.idle && (
            <button className="vc-record" onClick={startRecording}>
              <div className="vc-dot" />
              Start recording
            </button>
          )}
          {state === STATES.recording && (
            <button className="vc-stop" onClick={stopRecording}>
              <div className="vc-square" />
              Stop
            </button>
          )}
          {state === STATES.done && (
            <>
              <button className="vc-discard" onClick={discard}>Discard</button>
              <button className="vc-save" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save note →'}
              </button>
            </>
          )}
          {(state === STATES.error || state === STATES.processing) && (
            <button className="vc-discard" onClick={discard}>Close</button>
          )}
        </div>
      </div>
    </div>
  )
}
