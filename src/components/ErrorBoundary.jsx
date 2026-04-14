import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', gap: '16px',
          padding: '40px', textAlign: 'center',
          fontFamily: 'var(--font-ui)', color: 'var(--mute)',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--dim)', letterSpacing: '.04em' }}>
            Something broke
          </div>
          <div style={{ fontSize: '13px', lineHeight: 1.65, maxWidth: '320px', color: 'var(--mute)' }}>
            This section encountered an error. Your project data is safe.
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              fontSize: '12px', letterSpacing: '.14em', padding: '8px 20px',
              textTransform: 'uppercase', color: 'var(--orange)',
              border: '.5px solid rgba(245,146,12,.28)', borderRadius: '2px',
              background: 'transparent', fontFamily: 'var(--font-mono)',
              cursor: 'none',
            }}>
            Try again →
          </button>
          {process.env.NODE_ENV === 'development' && (
            <pre style={{ fontSize: '10px', color: 'var(--ghost)', maxWidth: '400px', overflow: 'auto', textAlign: 'left' }}>
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
