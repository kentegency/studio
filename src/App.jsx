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

  // Hash routing for Window and Contributor pages
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash
      const wMatch = hash.match(/^#\/window\/(.+)$/)
      const cMatch = hash.match(/^#\/contributor\/(.+)$/)
      setWindowToken(wMatch ? wMatch[1] : null)
      setContributorToken(cMatch ? cMatch[1] : null)
    }
    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') closeAll()
      if ((e.key === 'o' || e.key === 'O') && !e.metaKey && !e.ctrlKey) {
        const next = !useUIStore.getState().offline
        useUIStore.getState().setOffline(next)
        showToast(next ? 'Working dark.' : 'Back online. Syncing.')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

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
