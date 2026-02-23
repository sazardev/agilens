import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Optional custom fallback. If omitted, renders the default error card. */
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state

    if (error) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.reset)
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: '300px',
            padding: '32px',
            gap: '16px',
            fontFamily: 'var(--font-ui, system-ui, sans-serif)',
            color: 'var(--text-0, #e2e2e2)',
          }}
        >
          <div
            style={{
              fontSize: '32px',
              lineHeight: 1,
            }}
          >
            ⚠️
          </div>
          <div
            style={{
              fontWeight: 600,
              fontSize: '15px',
              color: 'var(--text-0, #e2e2e2)',
            }}
          >
            Algo salió mal
          </div>
          <pre
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md, 6px)',
              background: 'var(--bg-2, rgba(255,60,60,0.08))',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#ef4444',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '11px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
            }}
          >
            {error.message}
          </pre>
          <button
            onClick={this.reset}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-md, 6px)',
              background: 'var(--accent-600, #4f46e5)',
              border: 'none',
              color: '#fff',
              fontSize: '13px',
              fontFamily: 'var(--font-ui, system-ui)',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
