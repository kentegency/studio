import { useEffect, useState } from 'react'
import { useUIStore, useAuthStore } from './stores'
import Cursor from './components/Cursor'
import Loader from './components/loader/Loader'
import Entry from './components/entry/Entry'
import Auth from './components/auth/Auth'
import Dashboard from './components/dashboard/Dashboard'
import Canvas from './components/Canvas'
import Window from './components/window/Window'
import { Toast, OfflineBanner } from './components/Toast'
import './styles/tokens.css'
import './components/overlays/Overlays.css'
import './components/panel/Panes.css'
import './components/auth/Auth.css'
import './components/dashboard/Dashboard.css'
import './components/window/Window.css'

export default function App() {
  const screen = useUIStore(s => s.screen)
  const { closeAll, showToast } = useUIStore()

  // Hash-based routing for Window page
  const [windowToken, setWindowToken] = useState(null)

  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash
      const match = hash.match(/^#\/window\/(.+)$/)
      setWindowToken(match ? match[1] : null)
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
  if (windowToken) {
    return (
      <>
        <div className="grain" />
        <div className="scan" />
        <Cursor />
        <Window token={windowToken} />
      </>
    )
  }

  return (
    <>
      <div className="grain" />
      <div className="scan" />
      <Cursor />
      <Toast />
      <OfflineBanner />
      {screen === 'loader'    && <Loader />}
      {screen === 'entry'     && <Entry />}
      {screen === 'auth'      && <Auth />}
      {screen === 'dashboard' && <Dashboard />}
      {screen === 'canvas'    && <Canvas />}
    </>
  )
}
