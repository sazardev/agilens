/**
 * GitHubConnect — Modern, step-by-step GitHub connection wizard.
 *
 * Flow:
 *  1. Token  →  verify  →  auto-fills owner/username
 *  2. Repo   →  optional auto-create
 *  3. Connected status card with quick actions
 */
import { useState, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { setGitHubConfig } from '@/store/slices/settingsSlice'
import { verifyToken, createRepo } from '@/lib/github/api'

// ─── Icons (inline SVG) ───────────────────────────────────────────────────────

const IcoGitHub = () => (
  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
)

const IcoCheck = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    viewBox="0 0 24 24"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IcoEye = ({ show }: { show: boolean }) =>
  show ? (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )

const IcoLink = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </svg>
)

const IcoUnlink = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

const IcoSpinner = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    viewBox="0 0 24 24"
    style={{ animation: 'gh-spin 0.8s linear infinite' }}
  >
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </svg>
)

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div
      style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        border: `2px solid ${done ? 'var(--accent-500)' : active ? 'var(--accent-400)' : 'var(--border-2)'}`,
        background: done ? 'var(--accent-600)' : active ? 'var(--accent-glow)' : 'var(--bg-3)',
        color: done ? '#fff' : active ? 'var(--accent-300)' : 'var(--text-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        flexShrink: 0,
        transition: 'all 0.2s',
      }}
    >
      {done ? <IcoCheck /> : n}
    </div>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)' }}>{label}</label>
      {children}
      {hint && (
        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GitHubConnect() {
  const dispatch = useAppDispatch()
  const github = useAppSelector(s => s.settings.github)

  // ── Local state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1)
  const [token, setToken] = useState(github?.token ?? '')
  const [tokenVisible, setTokenVisible] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifiedUser, setVerifiedUser] = useState<string | null>(github ? github.owner : null)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const [owner, setOwner] = useState(github?.owner ?? '')
  const [repo, setRepo] = useState(github?.repo ?? '')
  const [branch, setBranch] = useState(github?.branch ?? 'main')
  const [autoCreate, setAutoCreate] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  const isConnected = !!github

  // ── Step 1: verify token ──────────────────────────────────────────────────
  const handleVerify = useCallback(async () => {
    if (!token.trim()) return
    setVerifying(true)
    setTokenError(null)
    setVerifiedUser(null)

    const result = await verifyToken(token.trim())

    if (result) {
      setVerifiedUser(result.login)
      setOwner(result.login)
      setStep(2)
    } else {
      setTokenError('Token inválido o sin permisos. Asegúrate de que tenga scope "repo".')
    }
    setVerifying(false)
  }, [token])

  // ── Step 2: connect (+ optional repo creation) ────────────────────────────
  const handleConnect = useCallback(async () => {
    if (!repo.trim()) return
    setConnecting(true)
    setConnectError(null)

    const config = {
      token: token.trim(),
      owner: owner.trim(),
      repo: repo.trim(),
      branch: branch.trim() || 'main',
    }

    if (autoCreate) {
      const created = await createRepo(config, {
        private: true,
        description: 'Agilens — notas de desarrollo ágil',
      })
      if (!created) {
        setConnectError(
          'No se pudo crear el repositorio. Puede que ya exista o el token no tenga permisos de creación.'
        )
        setConnecting(false)
        return
      }
    }

    dispatch(setGitHubConfig(config))
    setConnecting(false)
  }, [dispatch, token, owner, repo, branch, autoCreate])

  // ── Disconnect ────────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(() => {
    dispatch(setGitHubConfig(null))
    setStep(1)
    setVerifiedUser(null)
    setToken('')
    setOwner('')
    setRepo('')
    setConnectError(null)
    setTokenError(null)
  }, [dispatch])

  // ── Back to step 1 ────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    setStep(1)
    setVerifiedUser(null)
    setTokenError(null)
  }, [])

  // ─── Connected card ───────────────────────────────────────────────────────
  if (isConnected) {
    const repoUrl = `https://github.com/${github.owner}/${github.repo}`
    return (
      <>
        <style>{`@keyframes gh-spin { to { transform: rotate(360deg) } }`}</style>
        <div
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border-2)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-1)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#34d399',
                boxShadow: '0 0 6px rgba(52,211,153,0.6)',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)', flex: 1 }}>
              Conectado a GitHub
            </span>
            <div
              style={{
                color: 'var(--accent-400)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <IcoGitHub />
            </div>
          </div>

          {/* Info rows */}
          <div
            style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {/* User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src={`https://github.com/${github.owner}.png?size=32`}
                alt={github.owner}
                width="32"
                height="32"
                style={{ borderRadius: '50%', border: '1px solid var(--border-2)', flexShrink: 0 }}
                onError={e => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)' }}>
                  {github.owner}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Usuario de GitHub</div>
              </div>
            </div>

            {/* Repo row */}
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                background: 'var(--bg-3)',
                border: '1px solid var(--border-1)',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                color: 'var(--text-1)',
                fontSize: '12px',
                transition: 'border-color 0.15s',
              }}
            >
              <IcoLink />
              <span style={{ flex: 1, fontFamily: 'var(--font-mono)' }}>
                {github.owner}/{github.repo}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-3)',
                  background: 'var(--bg-2)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-1)',
                }}
              >
                {github.branch}
              </span>
            </a>

            {/* Token status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: 'var(--text-3)',
              }}
            >
              <svg
                width="12"
                height="12"
                fill="none"
                stroke="var(--accent-400)"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Token guardado —{' '}
              <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                {github.token.slice(0, 7)}…
              </span>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--border-1)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={handleDisconnect}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                background: 'transparent',
                border: '1px solid var(--border-2)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-2)',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <IcoUnlink />
              Desconectar
            </button>
          </div>
        </div>
      </>
    )
  }

  // ─── Wizard ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes gh-spin { to { transform: rotate(360deg) } }`}</style>
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border-2)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        {/* ── Wizard header ── */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-1)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div style={{ color: 'var(--text-2)', display: 'flex' }}>
            <IcoGitHub />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)', flex: 1 }}>
            Conectar con GitHub
          </span>
          {/* Step dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <StepDot n={1} active={step === 1} done={step > 1 || !!verifiedUser} />
            <div
              style={{
                width: '16px',
                height: '1px',
                background: step > 1 ? 'var(--accent-600)' : 'var(--border-2)',
                transition: 'background 0.2s',
              }}
            />
            <StepDot n={2} active={step === 2} done={false} />
          </div>
        </div>

        {/* ── Body ── */}
        <div
          style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          {step === 1 && (
            <>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6 }}>
                Necesitas un{' '}
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent-400)', textDecoration: 'none' }}
                >
                  Personal Access Token
                </a>{' '}
                con scope{' '}
                <code
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    background: 'var(--bg-3)',
                    padding: '1px 4px',
                    borderRadius: '3px',
                  }}
                >
                  repo
                </code>
                .
              </p>

              <Field
                label="Personal Access Token"
                hint="Nunca se envía a servidores externos. Se guarda solo en este dispositivo."
              >
                <div style={{ position: 'relative' }}>
                  <input
                    type={tokenVisible ? 'text' : 'password'}
                    value={token}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    autoComplete="off"
                    onChange={e => {
                      setToken(e.target.value)
                      setTokenError(null)
                    }}
                    onKeyDown={e => e.key === 'Enter' && void handleVerify()}
                    className="input-base"
                    style={{
                      width: '100%',
                      paddingRight: '38px',
                      borderColor: tokenError ? 'rgba(239,68,68,0.5)' : undefined,
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setTokenVisible(v => !v)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-3)',
                      padding: '2px',
                      lineHeight: 1,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <IcoEye show={tokenVisible} />
                  </button>
                </div>
              </Field>

              {tokenError && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#f87171',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 10px',
                  }}
                >
                  {tokenError}
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              {/* Verified user badge */}
              {verifiedUser && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    background: 'rgba(52,211,153,0.07)',
                    border: '1px solid rgba(52,211,153,0.25)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <img
                    src={`https://github.com/${verifiedUser}.png?size=24`}
                    alt={verifiedUser}
                    width="24"
                    height="24"
                    style={{ borderRadius: '50%', border: '1px solid rgba(52,211,153,0.3)' }}
                    onError={e => ((e.target as HTMLImageElement).style.display = 'none')}
                  />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#34d399' }}>
                      Token verificado
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-2)',
                        marginLeft: '6px',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      @{verifiedUser}
                    </span>
                  </div>
                  <button
                    onClick={handleBack}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-3)',
                      fontSize: '11px',
                      padding: '2px 6px',
                    }}
                  >
                    Cambiar
                  </button>
                </div>
              )}

              <Field label="Repositorio" hint="Nombre del repo donde se guardarán tus notas.">
                <input
                  type="text"
                  value={repo}
                  placeholder="mis-notas-agilens"
                  onChange={e => setRepo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void handleConnect()}
                  className="input-base"
                  style={{ borderColor: connectError ? 'rgba(239,68,68,0.5)' : undefined }}
                  autoFocus
                />
              </Field>

              {/* Auto-create toggle */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '9px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={autoCreate}
                  onChange={e => setAutoCreate(e.target.checked)}
                  style={{ marginTop: '2px', accentColor: 'var(--accent-500)', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-1)' }}>
                    Crear repositorio automáticamente
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.5 }}>
                    Si el repo no existe, lo crea privado en tu cuenta de GitHub.
                  </div>
                </div>
              </label>

              {/* Advanced: branch */}
              <Field label="Rama">
                <input
                  type="text"
                  value={branch}
                  placeholder="main"
                  onChange={e => setBranch(e.target.value)}
                  className="input-base"
                  style={{ maxWidth: '160px' }}
                />
              </Field>

              {connectError && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#f87171',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 10px',
                  }}
                >
                  {connectError}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer actions ── */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border-1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: 'flex-end',
          }}
        >
          {step === 1 && (
            <button
              className="btn btn-primary"
              onClick={() => void handleVerify()}
              disabled={!token.trim() || verifying}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minWidth: '120px',
                justifyContent: 'center',
              }}
            >
              {verifying ? (
                <>
                  <IcoSpinner /> Verificando…
                </>
              ) : (
                'Verificar token'
              )}
            </button>
          )}

          {step === 2 && (
            <>
              <button className="btn btn-ghost" onClick={handleBack} style={{ fontSize: '12px' }}>
                Atrás
              </button>
              <button
                className="btn btn-primary"
                onClick={() => void handleConnect()}
                disabled={!repo.trim() || connecting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minWidth: '120px',
                  justifyContent: 'center',
                }}
              >
                {connecting ? (
                  <>
                    <IcoSpinner /> Conectando…
                  </>
                ) : autoCreate ? (
                  'Crear y conectar'
                ) : (
                  'Conectar'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
