import { useState } from 'react'
import { useAuthStore, useUIStore } from '../../stores'
import './Auth.css'

const LOGO_PIXELS = [
  '#F4EFD8','#040402','#7A7A7A',
  'var(--accent)','#7A7A7A','#040402',
  '#7A7A7A','#040402','#F4EFD8',
]

export default function Auth() {
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const { signIn, signUp } = useAuthStore()
  const { setScreen, showToast } = useUIStore()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'login') {
      const { error: err } = await signIn(email, password)
      if (err) { setError(err.message); setLoading(false); return }
      showToast('Welcome back.')
      setScreen('dashboard')
    } else {
      if (!name.trim()) { setError('Name is required.'); setLoading(false); return }
      const { error: err } = await signUp(email, password, name)
      if (err) { setError(err.message); setLoading(false); return }
      showToast('Account created. Welcome to The Kentegency.')
      setScreen('dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="auth-screen">
      <div className="auth-atm">
        <div className="atm-v" />
        <div className="atm-o" />
        <div className="atm-t" />
        <div className="atm-lk" />
      </div>

      <div className="auth-center">
        <div className="auth-logo">
          {LOGO_PIXELS.map((c, i) => (
            <div key={i} className="auth-px" style={{ background: c }} />
          ))}
        </div>
        <div className="auth-wordmark">The Kentegency</div>
        <div className="auth-tagline">Creative Intelligence Studio</div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
            <div className="auth-field">
              <label className="auth-label">Name</label>
              <input
                className="auth-input"
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'One moment…' : mode === 'login' ? 'Enter the Studio' : 'Create Account'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>No account? <span onClick={() => { setMode('signup'); setError('') }}>Create one →</span></>
          ) : (
            <>Have an account? <span onClick={() => { setMode('login'); setError('') }}>Sign in →</span></>
          )}
        </div>
      </div>
    </div>
  )
}
