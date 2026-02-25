/**
 * LockScreen — Pantalla de bloqueo con PIN/contraseña.
 * Se muestra cuando lockEnabled=true y la sesión ha expirado o se cerró la app.
 */
import { useState, useEffect, useRef } from 'react'
import AgilensLogo from '@/components/layout/AgilensLogo'

// ── Helpers ────────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(password))
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Lock-timestamp helpers (used by App.tsx) ──────────────────────────────────

const LOCK_TS_KEY = 'agilens_last_active'

export function touchActivity() {
  localStorage.setItem(LOCK_TS_KEY, String(Date.now()))
}

export function getLastActivity(): number {
  return parseInt(localStorage.getItem(LOCK_TS_KEY) ?? '0', 10)
}

export function clearActivity() {
  localStorage.removeItem(LOCK_TS_KEY)
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const IcoEye = ({ show }: { show: boolean }) =>
  show ? (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )

const IcoLock = () => (
  <svg
    width="28"
    height="28"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
    <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
  </svg>
)

// ── Lock Screen ───────────────────────────────────────────────────────────────

interface Props {
  passwordHash: string
  onUnlock: () => void
}

export default function LockScreen({ passwordHash, onUnlock }: Props) {
  const [value, setValue] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [checking, setChecking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    setChecking(true)
    const hash = await hashPassword(value)
    setChecking(false)
    if (hash === passwordHash) {
      touchActivity()
      onUnlock()
    } else {
      setError('Contraseña incorrecta')
      setShake(true)
      setValue('')
      setTimeout(() => setShake(false), 600)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        flexDirection: 'column',
        gap: '32px',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {/* Animated background gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 30%, var(--accent-glow) 0%, transparent 60%)',
          pointerEvents: 'none',
          opacity: 0.6,
        }}
      />

      {/* Card */}
      <div
        style={{
          position: 'relative',
          background: 'var(--bg-1)',
          border: '1px solid var(--border-1)',
          borderRadius: 'var(--radius-xl, 16px)',
          padding: '36px 36px 32px',
          width: '100%',
          maxWidth: '360px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* Logo + lock icon */}
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
        >
          <AgilensLogo size={42} />
          <div style={{ color: 'var(--text-2)', opacity: 0.7 }}>
            <IcoLock />
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '17px',
              fontWeight: 700,
              color: 'var(--text-0)',
              marginBottom: '4px',
            }}
          >
            Sesión bloqueada
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
            Ingresa tu contraseña para continuar
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            animation: shake ? 'agilens-shake 0.5s ease' : 'none',
          }}
        >
          <style>{`
            @keyframes agilens-shake {
              0%,100% { transform: translateX(0); }
              20%,60% { transform: translateX(-8px); }
              40%,80% { transform: translateX(8px); }
            }
          `}</style>

          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              type={showPwd ? 'text' : 'password'}
              value={value}
              onChange={e => {
                setValue(e.target.value)
                setError('')
              }}
              placeholder="Contraseña"
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '10px 40px 10px 14px',
                background: 'var(--bg-2)',
                border: `1px solid ${error ? '#ef4444' : 'var(--border-2)'}`,
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-0)',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPwd(s => !s)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-3)',
                display: 'flex',
                padding: '2px',
              }}
            >
              <IcoEye show={!showPwd} />
            </button>
          </div>

          {error && (
            <div style={{ fontSize: '12px', color: '#ef4444', textAlign: 'center' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={checking || !value.trim()}
            style={{
              padding: '10px',
              background: 'var(--accent-600)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: checking || !value.trim() ? 'not-allowed' : 'pointer',
              opacity: checking || !value.trim() ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {checking ? 'Verificando…' : 'Desbloquear'}
          </button>
        </form>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--text-3)', position: 'relative' }}>
        Agilens · Sesión protegida
      </div>
    </div>
  )
}
