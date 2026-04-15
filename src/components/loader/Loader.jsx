import { useEffect, useState } from 'react'
import { useUIStore, useAuthStore } from '../../stores'
import './Loader.css'

const PIXELS = [
  { color: '#F4EFD8' }, { color: '#040402' }, { color: '#7A7A7A' },
  { color: 'var(--accent)' }, { color: '#7A7A7A' }, { color: '#040402' },
  { color: '#7A7A7A' }, { color: '#040402' }, { color: '#F4EFD8' },
]
const SEQ = [3, 0, 6, 4, 1, 7, 2, 5, 8]

export default function Loader() {
  const [visible, setVisible]   = useState(Array(9).fill(false))
  const [wordmark, setWordmark] = useState(false)
  const setScreen = useUIStore(s => s.setScreen)

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i < SEQ.length) {
        setVisible(v => v.map((b, j) => j === SEQ[i] ? true : b))
        i++
      } else {
        clearInterval(interval)
        setTimeout(() => setWordmark(true), 100)
        setTimeout(async () => {
          // Wait for auth to resolve then route
          const { init } = useAuthStore.getState()
          await init()
          const { user } = useAuthStore.getState()
          setScreen(user ? 'dashboard' : 'auth')
        }, 1000)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="loader">
      <div className="loader-grid">
        {PIXELS.map((px, i) => (
          <div key={i}
            className={`loader-px ${visible[i] ? 'on' : ''}`}
            style={{ background: px.color }}
          />
        ))}
      </div>
      <div className={`loader-wordmark ${wordmark ? 'on' : ''}`}>
        The Kentegency
      </div>
    </div>
  )
}
