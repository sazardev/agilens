import { useAppSelector, useAppDispatch } from '@/store'
import { useState, useEffect } from 'react'
import {
  gitInit,
  gitRefresh,
  gitCommit,
  gitPush,
  gitCheckout,
  GIT_DIR,
} from '@/store/slices/gitSlice'

const SC: Record<string, string> = {
  modified: '#f59e0b',
  added: '#22c55e',
  deleted: '#ef4444',
  untracked: '#6b7280',
}
const SL: Record<string, string> = { modified: 'M', added: 'A', deleted: 'D', untracked: '?' }

export default function GitPage() {
  const dispatch = useAppDispatch()
  const { initialized, status, log, branches, currentBranch, loading, error, pushStatus } =
    useAppSelector(s => s.git)
  const settings = useAppSelector(s => s.settings)
  const notes = useAppSelector(s => s.notes.notes)
  const [commitMsg, setCommitMsg] = useState('')
  const [newBranch, setNewBranch] = useState('')
  const [showBranches, setShowBranches] = useState(false)

  // Refresh on mount when already initialized
  useEffect(() => {
    if (initialized) {
      void dispatch(gitRefresh(GIT_DIR))
    }
  }, [initialized, dispatch])

  function handleInit() {
    const name = settings.userName || 'Agilens User'
    const email = settings.userEmail || 'dev@agilens.app'
    void dispatch(gitInit({ name, email, notes }))
  }

  function handleCommit() {
    if (!commitMsg.trim()) return
    const name = settings.userName || 'Agilens User'
    const email = settings.userEmail || 'dev@agilens.app'
    void dispatch(gitCommit({ dir: GIT_DIR, message: commitMsg.trim(), name, email, notes }))
    setCommitMsg('')
  }

  function handlePush() {
    if (!settings.github) return
    void dispatch(gitPush({ dir: GIT_DIR, config: settings.github }))
  }

  function handleCheckout(ref: string) {
    void dispatch(gitCheckout({ dir: GIT_DIR, ref }))
    setShowBranches(false)
  }

  if (!initialized) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '32px',
          textAlign: 'center' as const,
        }}
      >
        <svg
          width="48"
          height="48"
          fill="none"
          stroke="var(--text-3)"
          strokeWidth="1"
          viewBox="0 0 24 24"
          style={{ opacity: 0.35 }}
        >
          <circle cx="18" cy="6" r="3" />
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M6 9v3a3 3 0 003 3h6" />
        </svg>
        <div>
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-0)',
              margin: '0 0 6px',
              letterSpacing: '-0.02em',
            }}
          >
            Git no inicializado
          </h2>
          <p
            style={{ fontSize: '13px', color: 'var(--text-2)', maxWidth: '300px', lineHeight: 1.6 }}
          >
            Inicializa un repositorio local en el navegador (LightningFS). Tus notas quedan
            versionadas con isomorphic-git, sin servidor.
          </p>
          {error && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '8px' }}>{error}</p>}
        </div>
        <button className="btn btn-primary" onClick={handleInit} disabled={loading}>
          {loading ? 'Inicializando…' : 'Inicializar repositorio'}
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        overflow: 'hidden',
      }}
    >
      {/* Layout: side panel + log — stacks on mobile */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', flexWrap: 'wrap' as const }}>
        {/* Status panel */}
        <div
          style={{
            width: 'clamp(200px, 30%, 260px)',
            minWidth: '200px',
            flexShrink: 0,
            borderRight: '1px solid var(--border-1)',
            display: 'flex',
            flexDirection: 'column' as const,
            overflow: 'hidden',
          }}
        >
          {/* Branch header */}
          <div style={{ position: 'relative' as const, flexShrink: 0 }}>
            <div
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--border-1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                height: 'var(--toolbar-h)',
                boxSizing: 'border-box' as const,
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
                <line x1="6" y1="3" x2="6" y2="15" />
                <circle cx="18" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" />
                <path d="M18 9a9 9 0 01-9 9" />
              </svg>
              <button
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--accent-400)',
                  fontWeight: 600,
                  flex: 1,
                  textAlign: 'left' as const,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' as const,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
                title="Cambiar rama"
                onClick={() => setShowBranches(v => !v)}
              >
                {currentBranch} ▾
              </button>
              {loading && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--text-3)',
                  }}
                >
                  syncing…
                </span>
              )}
            </div>
            {/* Branch dropdown */}
            {showBranches && branches.length > 0 && (
              <div
                style={{
                  position: 'absolute' as const,
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border-2)',
                  borderRadius: 'var(--radius-md)',
                  zIndex: 10,
                  boxShadow: 'var(--shadow-md)',
                  overflow: 'hidden',
                }}
              >
                {branches.map(b => (
                  <button
                    key={b.name}
                    onClick={() => handleCheckout(b.name)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left' as const,
                      padding: '7px 14px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: b.isCurrent ? 600 : 400,
                      color: b.isCurrent ? 'var(--accent-400)' : 'var(--text-1)',
                      background: b.isCurrent ? 'var(--accent-glow)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {b.isCurrent ? '✓ ' : '  '}
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* File list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
            <p
              style={{
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase' as const,
                color: 'var(--text-2)',
                marginBottom: '2px',
              }}
            >
              Cambios · {status.length}
            </p>
            {status.length === 0 && (
              <p style={{ padding: '4px 14px', fontSize: '12px', color: 'var(--text-3)' }}>
                Árbol limpio
              </p>
            )}
            {status.map(f => (
              <div
                key={f.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 14px',
                  cursor: 'default',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-2)'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: SC[f.status] ?? '#6b7280',
                    width: '14px',
                    textAlign: 'center' as const,
                    flexShrink: 0,
                  }}
                >
                  {SL[f.status] ?? '?'}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: 'var(--text-1)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  {f.path}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div
            style={{
              padding: '10px 12px',
              borderTop: '1px solid var(--border-1)',
              display: 'flex',
              flexDirection: 'column' as const,
              gap: '6px',
              flexShrink: 0,
            }}
          >
            {error && (
              <p style={{ fontSize: '11px', color: '#ef4444', wordBreak: 'break-word' as const }}>
                {error}
              </p>
            )}
            <input
              type="text"
              placeholder="Mensaje de commit…"
              value={commitMsg}
              onChange={e => setCommitMsg(e.target.value)}
              className="input-base"
              style={{ fontSize: '12px' }}
              onKeyDown={e => e.key === 'Enter' && handleCommit()}
            />
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={!commitMsg.trim() || loading}
              onClick={handleCommit}
            >
              {loading ? 'Procesando…' : 'Commit'}
            </button>
            <button
              className="btn btn-ghost"
              style={{ width: '100%' }}
              disabled={!settings.github || pushStatus === 'pushing'}
              onClick={handlePush}
            >
              {pushStatus === 'pushing'
                ? 'Enviando…'
                : pushStatus === 'success'
                  ? '✓ Push OK'
                  : pushStatus === 'error'
                    ? '✗ Error push'
                    : settings.github
                      ? 'Push a GitHub'
                      : 'Configura GitHub primero'}
            </button>
            {/* New branch */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <input
                type="text"
                placeholder="Nueva rama…"
                value={newBranch}
                onChange={e => setNewBranch(e.target.value)}
                className="input-base"
                style={{ fontSize: '12px', flex: 1 }}
              />
              <button
                className="btn btn-ghost"
                disabled={!newBranch.trim()}
                style={{ padding: '0 10px', flexShrink: 0 }}
                onClick={() => {
                  if (!newBranch.trim()) return
                  // just create, don't checkout yet
                  import('@/store/slices/gitSlice').then(m => {
                    void dispatch(m.gitCreateBranch({ dir: GIT_DIR, name: newBranch.trim() }))
                    setNewBranch('')
                  })
                }}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Commit log */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', minWidth: 0 }}>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase' as const,
              color: 'var(--text-2)',
              marginBottom: '10px',
            }}
          >
            Historial
          </p>
          {log.length === 0 && (
            <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>Sin commits aún</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '2px' }}>
            {log.map((commit, i) => (
              <div
                key={commit.oid}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: i === 0 ? 'var(--bg-2)' : 'transparent',
                  border: `1px solid ${i === 0 ? 'var(--border-2)' : 'transparent'}`,
                  transition: 'background var(--transition-fast)',
                  cursor: 'default',
                }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-2)'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLElement).style.background =
                    i === 0 ? 'var(--bg-2)' : 'transparent'
                }}
              >
                <code
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--accent-400)',
                    flexShrink: 0,
                    marginTop: '2px',
                    minWidth: '44px',
                  }}
                >
                  {commit.oid.slice(0, 7)}
                </code>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-0)',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' as const,
                      fontWeight: i === 0 ? 500 : 400,
                    }}
                  >
                    {commit.message}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--text-3)',
                      margin: '3px 0 0',
                    }}
                  >
                    {commit.author} · {new Date(commit.timestamp * 1000).toLocaleDateString()}
                  </p>
                </div>
                {i === 0 && (
                  <span className="tag tag-accent" style={{ flexShrink: 0 }}>
                    HEAD
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
