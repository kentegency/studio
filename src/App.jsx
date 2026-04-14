import { useEffect, useState } from 'react'
import { useUIStore, useAuthStore } from './stores'
import Cursor from './components/Cursor'
import Loader from './components/loader/Loader'
import Entry from './components/entry/Entry'
import Auth from './components/auth/Auth'
import Dashboard from './components/dashboard/Dashboard'
import Canvas from './components/Canvas'
import Window from './components/window/Window'
import ContributorView from './components/contributor/ContributorView'
import Onboarding from './components/onboarding/Onboarding'
import SessionGuest from './components/session/SessionGuest'
import { Toast, OfflineBanner } from './components/Toast'
import './styles/tokens.css'
import './components/overlays/Overlays.css'
import './components/panel/Panes.css'
import './components/auth/Auth.css'
import './components/dashboard/Dashboard.css'
import './components/window/Window.css'
import './components/contributor/Contributor.css'

export default function App() {
  const screen = useUIStore(s => s.screen)
  const { closeAll, showToast } = useUIStore()
  const [windowToken,      setWindowToken]      = useState(null)
  const [contributorToken, setContributorToken] = useState(null)
  const [sessionToken,     setSessionToken]     = useState(null)

  // Hash routing for Window, Contributor, Session pages
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash
      const wMatch = hash.match(/^#\/window\/(.+)$/)
      const cMatch = hash.match(/^#\/contributor\/(.+)$/)
      const sMatch = hash.match(/^#\/session\/(.+)$/)
      setWindowToken(wMatch ? wMatch[1] : null)
      setContributorToken(cMatch ? cMatch[1] : null)
      setSessionToken(sMatch ? sMatch[1] : null)
    }
    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') closeAll()
      // M — moodboard
      if (e.key === 'm' && !e.metaKey && !e.ctrlKey) {
        const active = document.activeElement
        if (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA') {
          e.preventDefault()
          useUIStore.getState().openOverlay('moodboard')
          return
        }
      }
      // ? — keyboard shortcuts reference
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        const active = document.activeElement
        if (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA') {
          e.preventDefault()
          window.__openShortcuts?.()
          return
        }
      }
      // Cmd+K — command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        window.__openPalette?.()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        const action = undoStack.pop()
        if (action?.undo) {
          action.undo()
          showToast(`Undone: ${action.label}`, '#4ADE80', 2500)
        } else {
          showToast('Nothing to undo.', 'var(--mute)', 1500)
        }
      }
      if ((e.key === 'o' || e.key === 'O') && !e.metaKey && !e.ctrlKey) {
        const next = !useUIStore.getState().offline
        useUIStore.getState().setOffline(next)
        showToast(next ? 'Working dark.' : 'Back online. Syncing.')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Session guest page — no auth needed
  if (sessionToken) return (
    <>
      <div className="grain" /><div className="scan" /><Cursor />
      <SessionGuest sessionToken={sessionToken} />
    </>
  )

  // Window page — no auth needed
  if (windowToken) return (
    <>
      <div className="grain" /><div className="scan" /><Cursor />
      <Window token={windowToken} />
    </>
  )

  // Contributor page — no auth needed
  if (contributorToken) return (
    <>
      <div className="grain" /><div className="scan" /><Cursor />
      <ContributorView token={contributorToken} />
    </>
  )

  return (
    <>
      <div className="grain" /><div className="scan" />
      <Cursor /><Toast /><OfflineBanner />
      <Onboarding />
      {screen === 'loader'    && <Loader />}
      {screen === 'entry'     && <Entry />}
      {screen === 'auth'      && <Auth />}
      {screen === 'dashboard' && <Dashboard />}
      {screen === 'canvas'    && <Canvas />}
    </>
  )
}
