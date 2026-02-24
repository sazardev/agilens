import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null

// ─── Capturar el evento lo antes posible (antes de que React monte) ───────────
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    // Notificar al componente si ya está montado
    window.dispatchEvent(new CustomEvent('pwa-install-ready'))
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    window.dispatchEvent(new CustomEvent('pwa-app-installed'))
  })
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Si el evento ya llegó antes de montarnos, mostramos el banner de inmediato
    if (deferredPrompt) setVisible(true)

    const onReady = () => setVisible(true)
    const onInstalled = () => setVisible(false)

    window.addEventListener('pwa-install-ready', onReady)
    window.addEventListener('pwa-app-installed', onInstalled)

    return () => {
      window.removeEventListener('pwa-install-ready', onReady)
      window.removeEventListener('pwa-app-installed', onInstalled)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      deferredPrompt = null
      setVisible(false)
    }
    setInstalling(false)
  }, [])

  const handleDismiss = useCallback(() => {
    setVisible(false)
  }, [])

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Instalar Agilens"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 10000,
        background: 'var(--bg-2)',
        border: '1px solid var(--border-2)',
        borderRadius: 'var(--radius-lg, 12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '320px',
        animation: 'pwa-slide-in 0.2s ease',
      }}
    >
      <style>{`
        @keyframes pwa-slide-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Icon */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'var(--accent-glow)',
          border: '1px solid var(--accent-700)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent-400)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-0)',
            fontFamily: 'var(--font-ui)',
            marginBottom: '2px',
          }}
        >
          Instalar Agilens
        </div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-2)',
            fontFamily: 'var(--font-ui)',
            lineHeight: 1.4,
          }}
        >
          Accede sin navegador, funciona offline.
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
        <button
          onClick={handleInstall}
          disabled={installing}
          style={{
            padding: '5px 12px',
            background: 'var(--accent-600)',
            border: 'none',
            borderRadius: 'var(--radius-sm, 6px)',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
            cursor: installing ? 'not-allowed' : 'pointer',
            opacity: installing ? 0.7 : 1,
            transition: 'opacity 0.12s',
            whiteSpace: 'nowrap',
          }}
        >
          {installing ? 'Instalando…' : 'Instalar'}
        </button>
        <button
          onClick={handleDismiss}
          style={{
            padding: '4px 12px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-2)',
            fontSize: '11px',
            fontFamily: 'var(--font-ui)',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          Ahora no
        </button>
      </div>
    </div>
  )
}
