import { useEffect, useRef, useState, type ReactElement } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { updateNote } from '@/store/slices/notesSlice'
import { GIT_DIR } from '@/store/slices/gitSlice'
import { getNoteLog, getFileContentAtCommit } from '@/lib/git/client'
import type { GitCommit } from '@/types'

// ─── Line diff (Myers / LCS) ──────────────────────────────────────────────────

type DiffOp = { type: 'equal' | 'add' | 'remove'; text: string }

function computeLineDiff(oldText: string, newText: string): DiffOp[] {
  const a = oldText.split('\n')
  const b = newText.split('\n')
  const m = a.length
  const n = b.length

  // LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = 1 + dp[i + 1][j + 1]
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const ops: DiffOp[] = []
  let i = 0,
    j = 0
  while (i < m || j < n) {
    if (i < m && j < n && a[i] === b[j]) {
      ops.push({ type: 'equal', text: a[i] })
      i++
      j++
    } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
      ops.push({ type: 'add', text: b[j] })
      j++
    } else {
      ops.push({ type: 'remove', text: a[i] })
      i++
    }
  }
  return ops
}

// ─── Diff modal ───────────────────────────────────────────────────────────────

function DiffModal({
  commit,
  currentContent,
  oldContent,
  onClose,
  onRestore,
  compareLabel,
  versionLabel,
  baseLabel,
  restoreLabel,
}: {
  commit: GitCommit
  currentContent: string
  oldContent: string
  onClose: () => void
  onRestore: () => void
  compareLabel?: string
  versionLabel?: string
  baseLabel?: string
  restoreLabel?: string
}) {
  const diff = computeLineDiff(oldContent, currentContent)
  const added = diff.filter(d => d.type === 'add').length
  const removed = diff.filter(d => d.type === 'remove').length

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onMouseDown={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(3px)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '82vh',
          background: 'var(--bg-1)',
          border: '1px solid var(--border-2)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-1)',
            flexShrink: 0,
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              viewBox="0 0 24 24"
              style={{ color: 'var(--accent-400)', flexShrink: 0 }}
            >
              <circle cx="18" cy="18" r="3" />
              <circle cx="6" cy="6" r="3" />
              <path d="M13 6h3a2 2 0 012 2v7" />
              <line x1="6" y1="9" x2="6" y2="21" />
            </svg>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-0)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Comparando {compareLabel ?? 'ACTUAL'} vs {commit.oid.slice(0, 7)}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--text-3)',
                  }}
                >
                  {relativeTime(commit.timestamp)} · {commit.message}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Stats */}
            {added > 0 && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#4ade80',
                  background: 'rgba(74,222,128,0.1)',
                  padding: '2px 7px',
                  borderRadius: '4px',
                }}
              >
                +{added}
              </span>
            )}
            {removed > 0 && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#f87171',
                  background: 'rgba(248,113,113,0.1)',
                  padding: '2px 7px',
                  borderRadius: '4px',
                }}
              >
                −{removed}
              </span>
            )}
            {/* Restore from here */}
            <button
              onClick={onRestore}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--accent-600)',
                background: 'var(--accent-glow)',
                color: 'var(--accent-400)',
                fontFamily: 'var(--font-ui)',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {restoreLabel ?? 'Restaurar esta versión'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-3)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '16px',
                lineHeight: 1,
              }}
              onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--text-1)')}
              onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--text-3)')}
            >
              ×
            </button>
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            padding: '6px 16px',
            borderBottom: '1px solid var(--border-1)',
            background: 'var(--bg-2)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#4ade80' }}>
            {versionLabel ?? '+ versión a restaurar (antigua)'}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#f87171' }}>
            {baseLabel ?? '− versión actual'}
          </span>
        </div>

        {/* Diff body — context-only view (±3 lines around each change) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
          {diff.length === 0 || (added === 0 && removed === 0) ? (
            <div
              style={{
                padding: '32px',
                textAlign: 'center',
                color: 'var(--text-3)',
                fontFamily: 'var(--font-ui)',
                fontSize: '12px',
              }}
            >
              Sin diferencias entre las versiones.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <tbody>
                {(() => {
                  const CONTEXT = 3

                  // ── 1. Compute cumulative line numbers for every op ──────────
                  let ol = 0,
                    nl = 0
                  const lineNums = diff.map(op => {
                    if (op.type === 'equal') {
                      ol++
                      nl++
                    } else if (op.type === 'remove') {
                      ol++
                    } else {
                      nl++
                    }
                    return { old: ol, new: nl }
                  })

                  // ── 2. Mark indices that are visible (changed ± context) ─────
                  const visible = new Set<number>()
                  diff.forEach((op, i) => {
                    if (op.type !== 'equal') {
                      for (
                        let k = Math.max(0, i - CONTEXT);
                        k <= Math.min(diff.length - 1, i + CONTEXT);
                        k++
                      ) {
                        visible.add(k)
                      }
                    }
                  })

                  // ── 3. Build ordered list: rows or separator placeholders ────
                  const rows: ReactElement[] = []
                  let prev = -1

                  Array.from(visible)
                    .sort((a, b) => a - b)
                    .forEach(i => {
                      // Gap → separator
                      if (prev !== -1 && i > prev + 1) {
                        const hidden = i - prev - 1
                        rows.push(
                          <tr key={`sep-${i}`} style={{ background: 'var(--bg-2)' }}>
                            <td
                              colSpan={4}
                              style={{
                                padding: '3px 12px',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '10px',
                                color: 'var(--text-3)',
                                borderTop: '1px solid var(--border-1)',
                                borderBottom: '1px solid var(--border-1)',
                                userSelect: 'none',
                              }}
                            >
                              ·· {hidden} línea{hidden !== 1 ? 's' : ''} sin cambios oculta
                              {hidden !== 1 ? 's' : ''} ··
                            </td>
                          </tr>
                        )
                      }
                      prev = i

                      const op = diff[i]
                      const nums = lineNums[i]
                      const lineNumOld = op.type === 'add' ? '' : String(nums.old)
                      const lineNumNew = op.type === 'remove' ? '' : String(nums.new)
                      const bg =
                        op.type === 'add'
                          ? 'rgba(74,222,128,0.10)'
                          : op.type === 'remove'
                            ? 'rgba(248,113,113,0.10)'
                            : 'transparent'
                      const prefix = op.type === 'add' ? '+' : op.type === 'remove' ? '−' : ' '
                      const prefixColor =
                        op.type === 'add'
                          ? '#4ade80'
                          : op.type === 'remove'
                            ? '#f87171'
                            : 'var(--text-3)'

                      rows.push(
                        <tr key={i} style={{ background: bg }}>
                          <td
                            style={{
                              width: '36px',
                              padding: '1px 6px',
                              textAlign: 'right',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              color: 'var(--text-3)',
                              opacity: 0.5,
                              userSelect: 'none',
                              borderRight: '1px solid var(--border-1)',
                            }}
                          >
                            {lineNumOld}
                          </td>
                          <td
                            style={{
                              width: '36px',
                              padding: '1px 6px',
                              textAlign: 'right',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              color: 'var(--text-3)',
                              opacity: 0.5,
                              userSelect: 'none',
                              borderRight: '1px solid var(--border-1)',
                            }}
                          >
                            {lineNumNew}
                          </td>
                          <td
                            style={{
                              width: '18px',
                              padding: '1px 4px',
                              textAlign: 'center',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              color: prefixColor,
                              fontWeight: 700,
                              userSelect: 'none',
                              borderRight: '1px solid var(--border-1)',
                            }}
                          >
                            {prefix}
                          </td>
                          <td
                            style={{
                              padding: '1px 10px',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              color:
                                op.type === 'equal'
                                  ? 'var(--text-2)'
                                  : op.type === 'add'
                                    ? '#86efac'
                                    : '#fca5a5',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                            }}
                          >
                            {op.text || '\u200b'}
                          </td>
                        </tr>
                      )
                    })

                  return rows
                })()}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '6px 16px',
            borderTop: '1px solid var(--border-1)',
            display: 'flex',
            justifyContent: 'flex-end',
            flexShrink: 0,
            background: 'var(--bg-2)',
          }}
        >
          <span
            style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)' }}
          >
            Esc para cerrar
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Relative time ────────────────────────────────────────────────────────────

function relativeTime(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  if (diff < 86400 * 7) return `hace ${Math.floor(diff / 86400)} días`
  return new Date(unixSeconds * 1000).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ─── History panel ────────────────────────────────────────────────────────────

function HistoryPanel({
  noteId,
  noteTitle,
  onClose,
}: {
  noteId: string
  noteTitle: string
  onClose: () => void
}) {
  const dispatch = useAppDispatch()
  const initialized = useAppSelector(s => s.git.initialized)
  const lastAutoCommitAt = useAppSelector(s => s.git.lastAutoCommitAt)
  const currentContent = useAppSelector(
    s => s.notes.notes.find(n => n.id === noteId)?.content ?? ''
  )
  const [commits, setCommits] = useState<GitCommit[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [restoredOid, setRestoredOid] = useState<string | null>(null)
  const [diffCommit, setDiffCommit] = useState<GitCommit | null>(null)
  const [diffContent, setDiffContent] = useState<string | null>(null)
  const [diffCurrentOverride, setDiffCurrentOverride] = useState<string | null>(null)
  const [diffCompareLabel, setDiffCompareLabel] = useState<string>('ACTUAL')
  const [diffLoading, setDiffLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)

  // Fetch commits for this note (re-fetches when auto-commit fires)
  useEffect(() => {
    if (!initialized) {
      setLoading(false)
      setCommits([])
      return
    }
    setLoading(true)
    getNoteLog(GIT_DIR, noteId)
      .then(setCommits)
      .catch(() => setCommits([]))
      .finally(() => setLoading(false))
  }, [noteId, initialized, lastAutoCommitAt])

  // Close on click-outside (skip when DiffModal is visible)
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (diffCommit) return // DiffModal handles its own click-outside
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [onClose, diffCommit])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleRestore(commit: GitCommit) {
    if (restoring) return
    setRestoring(commit.oid)
    try {
      const content = await getFileContentAtCommit(GIT_DIR, commit.oid, `notes/${noteId}.md`)
      if (content) {
        const title = content.match(/^#+ (.+)/m)?.[1] ?? noteTitle
        dispatch(updateNote({ id: noteId, content, title }))
        setRestoredOid(commit.oid)
        setTimeout(() => setRestoredOid(null), 2500)
      }
    } finally {
      setRestoring(null)
    }
  }

  async function handleDiff(commit: GitCommit) {
    if (diffLoading) return
    setDiffLoading(commit.oid)
    try {
      const content = await getFileContentAtCommit(GIT_DIR, commit.oid, `notes/${noteId}.md`)
      setDiffContent(content ?? '')
      setDiffCurrentOverride(null)
      setDiffCompareLabel('ACTUAL')
      setDiffCommit(commit)
    } finally {
      setDiffLoading(null)
    }
  }

  /** Compare commit vs the immediately older version */
  async function handleDiffVsAnterior(newerCommit: GitCommit, olderCommit: GitCommit) {
    if (diffLoading) return
    setDiffLoading(newerCommit.oid + '-prev')
    try {
      const [newerContent, olderContent] = await Promise.all([
        getFileContentAtCommit(GIT_DIR, newerCommit.oid, `notes/${noteId}.md`),
        getFileContentAtCommit(GIT_DIR, olderCommit.oid, `notes/${noteId}.md`),
      ])
      // oldContent (red) = olderCommit, currentContent (green) = newerCommit
      setDiffContent(olderContent ?? '')
      setDiffCurrentOverride(newerContent ?? '')
      setDiffCompareLabel(newerCommit.oid.slice(0, 7))
      setDiffCommit(olderCommit)
    } finally {
      setDiffLoading(null)
    }
  }

  async function handleRestoreFromDiff(commit: GitCommit) {
    await handleRestore(commit)
    setDiffCommit(null)
    setDiffContent(null)
    setDiffCurrentOverride(null)
  }

  return (
    <>
      {diffCommit && diffContent !== null && (
        <DiffModal
          commit={diffCommit}
          currentContent={diffCurrentOverride ?? currentContent}
          oldContent={diffContent}
          compareLabel={diffCompareLabel}
          versionLabel={
            diffCurrentOverride !== null
              ? '+ añadido en esta versión'
              : '+ versión a restaurar (antigua)'
          }
          baseLabel={
            diffCurrentOverride !== null ? '− eliminado en esta versión' : '− versión actual'
          }
          restoreLabel={
            diffCurrentOverride !== null ? 'Restaurar a versión base' : 'Restaurar esta versión'
          }
          onClose={() => {
            setDiffCommit(null)
            setDiffContent(null)
            setDiffCurrentOverride(null)
          }}
          onRestore={() => void handleRestoreFromDiff(diffCommit)}
        />
      )}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          bottom: 'var(--statusbar-h)',
          right: '12px',
          width: '360px',
          maxHeight: '440px',
          background: 'var(--bg-1)',
          border: '1px solid var(--border-2)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 200,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: '1px solid var(--border-1)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <svg
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              viewBox="0 0 24 24"
              style={{ color: 'var(--accent-400)', flexShrink: 0 }}
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-0)',
              }}
            >
              Historial de versiones
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-3)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '15px',
              lineHeight: 1,
            }}
            onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--text-1)')}
            onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--text-3)')}
          >
            ×
          </button>
        </div>

        {/* Note subtitle */}
        <div
          style={{
            padding: '5px 14px',
            borderBottom: '1px solid var(--border-1)',
            flexShrink: 0,
            background: 'var(--bg-2)',
          }}
        >
          <span
            style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)' }}
          >
            {noteTitle}
          </span>
        </div>

        {/* Search bar */}
        <div
          style={{
            padding: '6px 10px',
            borderBottom: '1px solid var(--border-1)',
            flexShrink: 0,
          }}
        >
          <input
            type="text"
            placeholder="Buscar en historial…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-2)',
              border: '1px solid var(--border-1)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 8px',
              fontFamily: 'var(--font-ui)',
              fontSize: '11px',
              color: 'var(--text-1)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!initialized ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: 'var(--text-3)',
                fontFamily: 'var(--font-ui)',
                fontSize: '12px',
                lineHeight: 1.6,
              }}
            >
              Git no inicializado.
              <br />
              Configúralo en Ajustes → Git.
            </div>
          ) : loading ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: 'var(--text-3)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
              }}
            >
              Cargando historial…
            </div>
          ) : commits.length === 0 ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: 'var(--text-3)',
                fontFamily: 'var(--font-ui)',
                fontSize: '12px',
                lineHeight: 1.6,
              }}
            >
              Sin versiones guardadas aún.
              <br />
              Los cambios se versionan automáticamente.
            </div>
          ) : (
            (() => {
              const filteredCommits = searchQuery.trim()
                ? commits.filter(
                    c =>
                      c.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      c.oid.slice(0, 7).includes(searchQuery.toLowerCase()) ||
                      relativeTime(c.timestamp).toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : commits
              if (filteredCommits.length === 0) {
                return (
                  <div
                    style={{
                      padding: '24px 16px',
                      textAlign: 'center',
                      color: 'var(--text-3)',
                      fontFamily: 'var(--font-ui)',
                      fontSize: '12px',
                    }}
                  >
                    Sin resultados para «{searchQuery}»
                  </div>
                )
              }
              return filteredCommits.map((commit, i) => {
                const realIdx = commits.indexOf(commit)
                const olderCommit = realIdx < commits.length - 1 ? commits[realIdx + 1] : null
                return (
                  <div
                    key={commit.oid}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 14px',
                      borderBottom:
                        i < filteredCommits.length - 1 ? '1px solid var(--border-1)' : 'none',
                    }}
                    onMouseEnter={e =>
                      ((e.currentTarget as HTMLElement).style.background = 'var(--bg-2)')
                    }
                    onMouseLeave={e =>
                      ((e.currentTarget as HTMLElement).style.background = 'transparent')
                    }
                  >
                    {/* Timeline dot */}
                    <div
                      style={{
                        marginTop: '5px',
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: realIdx === 0 ? 'var(--accent-500)' : 'var(--border-3)',
                        flexShrink: 0,
                      }}
                    />

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-ui)',
                          fontSize: '12px',
                          color: 'var(--text-0)',
                          fontWeight: realIdx === 0 ? 500 : 400,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginBottom: '4px',
                        }}
                        title={commit.message}
                      >
                        {realIdx === 0 && (
                          <span
                            style={{
                              display: 'inline-block',
                              marginRight: '5px',
                              padding: '1px 5px',
                              borderRadius: 'var(--radius-xs)',
                              background: 'var(--accent-glow)',
                              border: '1px solid var(--accent-600)',
                              color: 'var(--accent-400)',
                              fontSize: '9px',
                              fontWeight: 700,
                              letterSpacing: '0.06em',
                              verticalAlign: 'middle',
                            }}
                          >
                            ACTUAL
                          </span>
                        )}
                        {commit.message}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            color: 'var(--text-3)',
                          }}
                        >
                          {relativeTime(commit.timestamp)}
                        </span>
                        <span style={{ color: 'var(--border-3)', fontSize: '10px' }}>·</span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9px',
                            color: 'var(--text-3)',
                            opacity: 0.7,
                          }}
                        >
                          {commit.oid.slice(0, 7)}
                        </span>
                      </div>
                    </div>

                    {/* Actions — only for past commits */}
                    {realIdx > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          flexShrink: 0,
                        }}
                      >
                        {/* Diff vs actual */}
                        <button
                          onClick={() => void handleDiff(commit)}
                          disabled={!!diffLoading}
                          title="Ver diferencias respecto al actual"
                          style={{
                            padding: '3px 9px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-2)',
                            background: 'var(--bg-2)',
                            color: 'var(--text-2)',
                            fontFamily: 'var(--font-ui)',
                            fontSize: '10px',
                            cursor: diffLoading === commit.oid ? 'wait' : 'pointer',
                            transition: 'all 0.1s',
                          }}
                          onMouseEnter={e => {
                            ;(e.currentTarget as HTMLElement).style.background =
                              'rgba(96,165,250,0.12)'
                            ;(e.currentTarget as HTMLElement).style.color = '#60a5fa'
                            ;(e.currentTarget as HTMLElement).style.borderColor =
                              'rgba(96,165,250,0.3)'
                          }}
                          onMouseLeave={e => {
                            ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-2)'
                            ;(e.currentTarget as HTMLElement).style.color = 'var(--text-2)'
                            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)'
                          }}
                        >
                          {diffLoading === commit.oid ? '…' : 'diff'}
                        </button>
                        {/* Diff vs previous version */}
                        {olderCommit && (
                          <button
                            onClick={() => void handleDiffVsAnterior(commit, olderCommit)}
                            disabled={!!diffLoading}
                            title="Ver diferencias respecto a la versión anterior"
                            style={{
                              padding: '3px 9px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-2)',
                              background: 'var(--bg-2)',
                              color: 'var(--text-2)',
                              fontFamily: 'var(--font-ui)',
                              fontSize: '10px',
                              cursor: diffLoading === commit.oid + '-prev' ? 'wait' : 'pointer',
                              transition: 'all 0.1s',
                            }}
                            onMouseEnter={e => {
                              ;(e.currentTarget as HTMLElement).style.background =
                                'rgba(167,139,250,0.12)'
                              ;(e.currentTarget as HTMLElement).style.color = '#a78bfa'
                              ;(e.currentTarget as HTMLElement).style.borderColor =
                                'rgba(167,139,250,0.3)'
                            }}
                            onMouseLeave={e => {
                              ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-2)'
                              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-2)'
                              ;(e.currentTarget as HTMLElement).style.borderColor =
                                'var(--border-2)'
                            }}
                          >
                            {diffLoading === commit.oid + '-prev' ? '…' : 'vs ant'}
                          </button>
                        )}
                        {/* Restore button */}
                        <button
                          onClick={() => void handleRestore(commit)}
                          disabled={!!restoring}
                          title="Restaurar esta versión"
                          style={{
                            padding: '3px 9px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-2)',
                            background:
                              restoredOid === commit.oid ? 'var(--accent-glow)' : 'var(--bg-2)',
                            color:
                              restoredOid === commit.oid ? 'var(--accent-400)' : 'var(--text-2)',
                            fontFamily: 'var(--font-ui)',
                            fontSize: '10px',
                            cursor: restoring === commit.oid ? 'wait' : 'pointer',
                            transition: 'all 0.1s',
                          }}
                          onMouseEnter={e => {
                            if (!restoring && restoredOid !== commit.oid) {
                              ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-3)'
                              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-0)'
                            }
                          }}
                          onMouseLeave={e => {
                            if (restoredOid !== commit.oid) {
                              ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-2)'
                              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-2)'
                            }
                          }}
                        >
                          {restoring === commit.oid
                            ? '…'
                            : restoredOid === commit.oid
                              ? '✓ ok'
                              : 'restaurar'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            })()
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '6px 14px',
            borderTop: '1px solid var(--border-1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            background: 'var(--bg-2)',
          }}
        >
          <span
            style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)' }}
          >
            {searchQuery.trim()
              ? `${commits.filter(c => c.message.toLowerCase().includes(searchQuery.toLowerCase()) || c.oid.slice(0, 7).includes(searchQuery.toLowerCase())).length} de ${commits.length}`
              : commits.length}{' '}
            versión{commits.length !== 1 ? 'es' : ''}
          </span>
          <span
            style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)' }}
          >
            Esc para cerrar
          </span>
        </div>
      </div>
    </>
  )
}

// ─── Main bar ─────────────────────────────────────────────────────────────────

export default function StatusBar() {
  const activeNoteId = useAppSelector(s => s.ui.activeNoteId)
  const note = useAppSelector(s => s.notes.notes.find(n => n.id === activeNoteId))
  const branch = useAppSelector(s => s.git.currentBranch)
  const initialized = useAppSelector(s => s.git.initialized)
  const mode = useAppSelector(s => s.ui.editorPreviewMode)

  const [historyOpen, setHistoryOpen] = useState(false)

  // Close history when the user switches notes
  useEffect(() => {
    setHistoryOpen(false)
  }, [activeNoteId])

  const wordCount = note
    ? note.content
        .replace(/```[\s\S]*?```/g, '')
        .trim()
        .split(/\s+/)
        .filter(Boolean).length
    : 0

  const saved = note
    ? new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <>
      {historyOpen && note && (
        <HistoryPanel
          noteId={note.id}
          noteTitle={note.title}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      <footer
        style={{
          height: 'var(--statusbar-h)',
          backgroundColor: 'var(--accent-700)',
          borderTop: '1px solid var(--accent-600)',
          color: 'rgba(255,255,255,0.75)',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          gap: '16px',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        {/* Left — branch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {initialized ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>⎇</span>
              <span>{branch}</span>
            </span>
          ) : (
            <span style={{ opacity: 0.5 }}>git: no init</span>
          )}
        </div>

        {/* Center — note title */}
        <div
          style={{
            flex: 1,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {note ? note.title : 'Agilens'}
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
          {note && (
            <>
              <span>{wordCount} palabras</span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{mode}</span>
              {saved && (
                <>
                  <span style={{ opacity: 0.4 }}>|</span>
                  <span>guardado {saved}</span>
                </>
              )}
              <span style={{ opacity: 0.4 }}>|</span>

              {/* History button */}
              <button
                title="Historial de versiones"
                onClick={() => setHistoryOpen(v => !v)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: historyOpen ? 'rgba(255,255,255,0.18)' : 'transparent',
                  border: 'none',
                  borderRadius: '3px',
                  color: historyOpen ? '#fff' : 'rgba(255,255,255,0.75)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  padding: '1px 5px',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => {
                  if (!historyOpen)
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'
                }}
                onMouseLeave={e => {
                  if (!historyOpen)
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                <svg
                  width="10"
                  height="10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                historial
              </button>
            </>
          )}
          <span style={{ opacity: 0.4 }}>|</span>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>v{__APP_VERSION__}</span>
        </div>
      </footer>
    </>
  )
}

declare const __APP_VERSION__: string
