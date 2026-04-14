import { useEffect } from 'react'
import { useUIStore, useAuthStore } from './stores'
import Cursor from './components/Cursor'
import Loader from './components/loader/Loader'
import Entry from './components/entry/Entry'
import Auth from './components/auth/Auth'
import Dashboard from './components/dashboard/Dashboard'
import Canvas from './components/Canvas'
import { Toast, OfflineBanner } from './components/Toast'
import './styles/tokens.css'
import './components/overlays/Overlays.css'
import './components/panel/Panes.css'
import './components/auth/Auth.css'
import './components/dashboard/Dashboard.css'

export default function App() {
  const screen = useUIStore(s => s.screen)
  const { closeAll, showToast } = useUIStore()

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
