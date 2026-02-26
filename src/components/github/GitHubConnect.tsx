/**
 * GitHubConnect — Conexión con GitHub en dos fases independientes.
 *
 * Fase 1 — Cuenta: Token → Verificar → guarda token+owner inmediatamente.
 * Fase 2 — Repo  : Configura repo/rama desde la tarjeta de cuenta conectada.
 *
 * El repo es opcional: la cuenta queda vinculada solo con el token verificado.
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

const IcoCheck = () => (
  <svg
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    viewBox="0 0 24 24"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IcoRepo = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" />
  </svg>
)

const IcoEdit = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const IcoUnlink = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

// ─── Main component ───────────────────────────────────────────────────────────

export default function GitHubConnect() {
  const dispatch = useAppDispatch()
  const github = useAppSelector(s => s.settings.github)

  // ── Estado: fase "no conectado" ─────────────────────────────────────────
  const [token, setToken] = useState(github?.token ?? '')
  const [tokenVisible, setTokenVisible] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)

  // ── Estado: formulario de repo (tarjeta conectada) ──────────────────────
  const hasRepo = !!github?.repo
  const [showRepoForm, setShowRepoForm] = useState(false)
  const [repoInput, setRepoInput] = useState(github?.repo ?? '')
  const [branchInput, setBranchInput] = useState(github?.branch ?? 'main')
  const [autoCreate, setAutoCreate] = useState(false)
  const [savingRepo, setSavingRepo] = useState(false)
  const [repoError, setRepoError] = useState<string | null>(null)
  const [repoSaved, setRepoSaved] = useState(false)

  // ── Fase 1: verificar token → guardar cuenta INMEDIATAMENTE ────────────
  const handleVerify = useCallback(async () => {
    if (!token.trim()) return
    setVerifying(true)
    setTokenError(null)
    const result = await verifyToken(token.trim())
    if (result) {
      dispatch(
        setGitHubConfig({
          token: token.trim(),
          owner: result.login,
          repo: github?.repo ?? '',
          branch: github?.branch ?? 'main',
        })
      )
    } else {
      setTokenError('Token inválido o sin permisos. Asegúrate de usar scope "repo".')
    }
    setVerifying(false)
  }, [token, dispatch, github])

  // ── Fase 2: guardar repo desde la tarjeta ──────────────────────────────
  const handleSaveRepo = useCallback(async () => {
    if (!github || !repoInput.trim()) return
    setSavingRepo(true)
    setRepoError(null)
    const newConfig = {
      ...github,
      repo: repoInput.trim(),
      branch: branchInput.trim() || 'main',
    }
    if (autoCreate) {
      const created = await createRepo(newConfig, {
        private: true,
        description: 'Agilens — notas de desarrollo ágil',
      })
      if (!created) {
        setRepoError('No se pudo crear el repositorio. Puede que ya exista o falten permisos.')
        setSavingRepo(false)
        return
      }
    }
    dispatch(setGitHubConfig(newConfig))
    setRepoSaved(true)
    setShowRepoForm(false)
    setSavingRepo(false)
  }, [github, repoInput, branchInput, autoCreate, dispatch])

  // ── Desconectar ────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(() => {
    dispatch(setGitHubConfig(null))
    setToken('')
    setTokenError(null)
    setRepoInput('')
    setBranchInput('main')
    setRepoSaved(false)
  }, [dispatch])

  // ─── TARJETA CONECTADA ────────────────────────────────────────────────
  if (github) {
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
          {/* ── Header ── */}
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
            <span style={{ color: 'var(--accent-400)', display: 'flex' }}>
              <IcoGitHub />
            </span>
          </div>

          {/* ── Info de cuenta ── */}
          <div
            style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {/* Usuario */}
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
                  @{github.owner}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-3)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {github.token.slice(0, 10)}…
                </div>
              </div>
            </div>

            {/* ── Sección de repositorio ── */}
            <div
              style={{
                border: '1px solid var(--border-1)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              {/* Encabezado repo */}
              <div
                style={{
                  padding: '8px 10px',
                  background: 'var(--bg-3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  borderBottom: hasRepo || showRepoForm ? '1px solid var(--border-1)' : undefined,
                }}
              >
                <span style={{ color: 'var(--text-3)', display: 'flex' }}>
                  <IcoRepo />
                </span>
                <span
                  style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', flex: 1 }}
                >
                  Repositorio de notas
                </span>
                {hasRepo && !showRepoForm && (
                  <button
                    onClick={() => {
                      setRepoInput(github.repo)
                      setBranchInput(github.branch)
                      setShowRepoForm(true)
                      setRepoSaved(false)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'none',
                      border: '1px solid var(--border-2)',
                      borderRadius: '4px',
                      color: 'var(--text-3)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      padding: '2px 7px',
                    }}
                  >
                    <IcoEdit /> Editar
                  </button>
                )}
                {repoSaved && (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      color: '#34d399',
                    }}
                  >
                    <IcoCheck /> Guardado
                  </span>
                )}
              </div>

              {/* Repo vinculado (sin formulario) */}
              {hasRepo && !showRepoForm && (
                <a
                  href={`https://github.com/${github.owner}/${github.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 10px',
                    textDecoration: 'none',
                    color: 'var(--text-1)',
                    fontSize: '12px',
                  }}
                >
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
              )}

              {/* Sin repo y sin formulario → botón para configurar */}
              {!hasRepo && !showRepoForm && (
                <button
                  onClick={() => setShowRepoForm(true)}
                  style={{
                    width: '100%',
                    padding: '12px 10px',
                    background: 'none',
                    border: 'none',
                    borderTop: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-3)',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <IcoRepo />
                  Configura un repositorio →
                </button>
              )}

              {/* Formulario de repo */}
              {showRepoForm && (
                <div
                  style={{
                    padding: '12px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)' }}>
                      Nombre del repositorio
                    </label>
                    <input
                      type="text"
                      value={repoInput}
                      placeholder="mis-notas-agilens"
                      autoFocus
                      onChange={e => {
                        setRepoInput(e.target.value)
                        setRepoError(null)
                      }}
                      onKeyDown={e => e.key === 'Enter' && void handleSaveRepo()}
                      className="input-base"
                      style={{ borderColor: repoError ? 'rgba(239,68,68,0.5)' : undefined }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)' }}>
                      Rama
                    </label>
                    <input
                      type="text"
                      value={branchInput}
                      placeholder="main"
                      onChange={e => setBranchInput(e.target.value)}
                      className="input-base"
                      style={{ maxWidth: '160px' }}
                    />
                  </div>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
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
                        Crear repositorio si no existe
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.5 }}>
                        Lo crea privado en tu cuenta de GitHub.
                      </div>
                    </div>
                  </label>

                  {repoError && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#f87171',
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '7px 9px',
                      }}
                    >
                      {repoError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {hasRepo && (
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: '12px' }}
                        onClick={() => {
                          setShowRepoForm(false)
                          setRepoError(null)
                        }}
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      className="btn btn-primary"
                      onClick={() => void handleSaveRepo()}
                      disabled={!repoInput.trim() || savingRepo}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        minWidth: '110px',
                        justifyContent: 'center',
                        fontSize: '12px',
                      }}
                    >
                      {savingRepo ? (
                        <>
                          <IcoSpinner /> Guardando…
                        </>
                      ) : autoCreate ? (
                        'Crear y guardar'
                      ) : (
                        'Guardar repositorio'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
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
              }}
            >
              <IcoUnlink /> Desconectar cuenta
            </button>
          </div>
        </div>
      </>
    )
  }

  // ─── FORMULARIO TOKEN (no conectado) ─────────────────────────────────────
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
          <span style={{ color: 'var(--text-2)', display: 'flex' }}>
            <IcoGitHub />
          </span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)' }}>
            Conectar con GitHub
          </span>
        </div>

        {/* Body */}
        <div
          style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
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
            . Tu cuenta queda vinculada en cuanto verifiques el token.
          </p>

          {/* Input token */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)' }}>
              Personal Access Token
            </label>
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
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.5 }}>
              Nunca se envía a servidores externos. Se guarda solo en este dispositivo.
            </p>
          </div>

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
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border-1)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            className="btn btn-primary"
            onClick={() => void handleVerify()}
            disabled={!token.trim() || verifying}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minWidth: '130px',
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
        </div>
      </div>
    </>
  )
}
