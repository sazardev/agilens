/**
 * GitPage — rich Git tracking view for Agilens.
 *
 * Features:
 *  - Stats bar (commits, pending changes, last commit)
 *  - Status panel with note-title resolution + commit/push actions
 *  - Commit timeline with word-delta badges and file-change summaries
 *  - Inline diff panel: line-by-line diff with word-level highlighting
 *  - Writing stats (words added/removed per session)
 */
import { useAppSelector, useAppDispatch } from '@/store'
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  gitInit,
  gitRefresh,
  gitCommit,
  gitPush,
  gitCheckout,
  gitCreateBranch,
  GIT_DIR,
} from '@/store/slices/gitSlice'
import {
  getChangedFilesInCommit,
  getFileContentAtCommit,
  getParentCommitOid,
  type CommitFileChange,
} from '@/lib/git/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiffLine {
  type: 'same' | 'add' | 'remove'
  text: string
  numBefore: number | null
  numAfter: number | null
}

interface FileDiffData {
  path: string
  status: 'added' | 'modified' | 'deleted'
  before: string
  after: string
  lines: DiffLine[]
  wordsAdded: number
  wordsRemoved: number
}

interface CommitDiffData {
  oid: string
  files: FileDiffData[]
  totalWordsAdded: number
  totalWordsRemoved: number
}

// ─── Diff algorithm (LCS-based line diff) ─────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function computeLineDiff(before: string, after: string): DiffLine[] {
  const bl = before === '' ? [] : before.split('\n')
  const al = after === '' ? [] : after.split('\n')
  const m = bl.length
  const n = al.length

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] =
        bl[i - 1] === al[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])

  const result: DiffLine[] = []
  let i = m
  let j = n
  let bi = m
  let ai = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && bl[i - 1] === al[j - 1]) {
      result.unshift({ type: 'same', text: bl[i - 1], numBefore: i, numAfter: j })
      i--
      j--
      bi--
      ai--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'add', text: al[j - 1], numBefore: null, numAfter: ai-- })
      j--
    } else {
      result.unshift({ type: 'remove', text: bl[i - 1], numBefore: bi--, numAfter: null })
      i--
    }
  }
  return result
}

function wordDiffSegments(
  text: string,
  other: string
): Array<{ text: string; highlight: boolean }> {
  const words = text.split(/(\s+)/)
  const otherWords = new Set(other.split(/(\s+)/))
  return words.map(w => ({ text: w, highlight: /\S/.test(w) && !otherWords.has(w) }))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(timestamp: number): string {
  const secs = Math.floor(Date.now() / 1000 - timestamp)
  if (secs < 60) return 'hace un momento'
  if (secs < 3600) return `hace ${Math.floor(secs / 60)} min`
  if (secs < 86400) return `hace ${Math.floor(secs / 3600)} h`
  if (secs < 604800) return `hace ${Math.floor(secs / 86400)} d`
  return new Date(timestamp * 1000).toLocaleDateString('es')
}

const COMMIT_TYPE_RE =
  /^(feat|fix|docs|style|refactor|chore|note|daily|task|sprint|evidence)(\(.+?\))?:/i
const COMMIT_TYPE_COLOR: Record<string, string> = {
  feat: '#22c55e',
  fix: '#ef4444',
  docs: '#60a5fa',
  style: '#a78bfa',
  refactor: '#fb923c',
  chore: '#6b7280',
  note: '#a78bfa',
  daily: '#60a5fa',
  task: '#facc15',
  sprint: '#f472b6',
  evidence: '#a78bfa',
}

function getCommitType(msg: string): { label: string; color: string } | null {
  const m = COMMIT_TYPE_RE.exec(msg)
  if (!m) return null
  const t = m[1].toLowerCase()
  return { label: t, color: COMMIT_TYPE_COLOR[t] ?? '#6b7280' }
}

function noteIdFromPath(path: string): string | null {
  const m = /notes\/([^/]+)\.md$/.exec(path)
  return m ? m[1] : null
}

function fileLabel(path: string, noteTitle?: string): string {
  if (noteTitle) return noteTitle
  const parts = path.split('/')
  return parts[parts.length - 1]
}

// ─── Status badge colours ─────────────────────────────────────────────────────
const SC: Record<string, string> = {
  modified: '#f59e0b',
  added: '#22c55e',
  deleted: '#ef4444',
  untracked: '#6b7280',
}
const SL: Record<string, string> = { modified: 'M', added: 'A', deleted: 'D', untracked: '?' }

// ─── Sub-components ───────────────────────────────────────────────────────────

function WordDelta({ added, removed }: { added: number; removed: number }) {
  if (added === 0 && removed === 0) return null
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
      {added > 0 && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: '#22c55e',
            background: 'rgba(34,197,94,0.1)',
            padding: '1px 5px',
            borderRadius: '3px',
          }}
        >
          +{added}
        </span>
      )}
      {removed > 0 && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: '#ef4444',
            background: 'rgba(239,68,68,0.1)',
            padding: '1px 5px',
            borderRadius: '3px',
          }}
        >
          -{removed}
        </span>
      )}
    </span>
  )
}

function LineDiffRow({ line, pairLine }: { line: DiffLine; pairLine?: DiffLine }) {
  const bg =
    line.type === 'add'
      ? 'rgba(34,197,94,0.07)'
      : line.type === 'remove'
        ? 'rgba(239,68,68,0.07)'
        : 'transparent'
  const marker = line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' '
  const markerColor =
    line.type === 'add' ? '#22c55e' : line.type === 'remove' ? '#ef4444' : 'var(--text-3)'

  let content: React.ReactNode = line.text
  if ((line.type === 'add' || line.type === 'remove') && pairLine) {
    const hlBg = line.type === 'add' ? 'rgba(34,197,94,0.30)' : 'rgba(239,68,68,0.30)'
    content = wordDiffSegments(line.text, pairLine.text).map((seg, idx) => (
      <span key={idx} style={seg.highlight ? { background: hlBg, borderRadius: '2px' } : {}}>
        {seg.text}
      </span>
    ))
  }

  return (
    <div style={{ display: 'flex', minHeight: '18px', background: bg }}>
      <span
        style={{
          width: '32px',
          flexShrink: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-3)',
          padding: '0 4px',
          textAlign: 'right',
          userSelect: 'none',
          borderRight: '1px solid var(--border-1)',
        }}
      >
        {line.numBefore ?? ''}
      </span>
      <span
        style={{
          width: '32px',
          flexShrink: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-3)',
          padding: '0 4px',
          textAlign: 'right',
          userSelect: 'none',
          borderRight: '1px solid var(--border-1)',
        }}
      >
        {line.numAfter ?? ''}
      </span>
      <span
        style={{
          width: '16px',
          flexShrink: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: markerColor,
          textAlign: 'center',
          userSelect: 'none',
          borderRight: '1px solid var(--border-1)',
        }}
      >
        {marker}
      </span>
      <span
        style={{
          flex: 1,
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--text-1)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          padding: '0 8px',
        }}
      >
        {content || '\u00a0'}
      </span>
    </div>
  )
}

function FileDiffViewer({ file }: { file: FileDiffData }) {
  const pairMap = new Map<number, number>()
  for (let i = 0; i < file.lines.length - 1; i++) {
    if (file.lines[i].type === 'remove' && file.lines[i + 1].type === 'add') {
      pairMap.set(i, i + 1)
      pairMap.set(i + 1, i)
    }
  }
  const statusColor =
    file.status === 'added' ? '#22c55e' : file.status === 'deleted' ? '#ef4444' : '#f59e0b'
  return (
    <div
      style={{
        border: '1px solid var(--border-2)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        marginBottom: '12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '7px 10px',
          background: 'var(--bg-2)',
          borderBottom: '1px solid var(--border-2)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontWeight: 700,
            color: statusColor,
            background: `${statusColor}18`,
            padding: '1px 5px',
            borderRadius: '3px',
            flexShrink: 0,
          }}
        >
          {file.status === 'added' ? 'NUEVO' : file.status === 'deleted' ? 'ELIMINADO' : 'MOD'}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-1)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {file.path}
        </span>
        <WordDelta added={file.wordsAdded} removed={file.wordsRemoved} />
      </div>
      <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
        {file.lines.length === 0 ? (
          <div
            style={{
              padding: '12px',
              fontSize: '12px',
              color: 'var(--text-3)',
              fontStyle: 'italic',
            }}
          >
            Sin cambios de texto
          </div>
        ) : (
          file.lines.map((line, idx) => (
            <LineDiffRow
              key={idx}
              line={line}
              pairLine={pairMap.has(idx) ? file.lines[pairMap.get(idx)!] : undefined}
            />
          ))
        )}
      </div>
    </div>
  )
}

function FileRow({ path, status, title }: { path: string; status: string; title: string | null }) {
  const isAttachment = path.startsWith('attachments/')
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        padding: '5px 12px',
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
          color: SC[status] ?? '#6b7280',
          width: '13px',
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        {SL[status] ?? '?'}
      </span>
      {isAttachment ? (
        <svg
          width="11"
          height="11"
          fill="none"
          stroke="var(--text-3)"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
          style={{ flexShrink: 0 }}
        >
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
        </svg>
      ) : (
        <svg
          width="11"
          height="11"
          fill="none"
          stroke="var(--text-3)"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
          style={{ flexShrink: 0 }}
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-1)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title ?? path.split('/').pop()}
        </div>
        {title && (
          <div
            style={{
              fontSize: '10px',
              color: 'var(--text-3)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {path}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── GitPage (main) ────────────────────────────────────────────────────────────

export default function GitPage() {
  const dispatch = useAppDispatch()
  const { initialized, status, log, branches, currentBranch, loading, error, pushStatus } =
    useAppSelector(s => s.git)
  const settings = useAppSelector(s => s.settings)
  const notes = useAppSelector(s => s.notes.notes)
  const [commitMsg, setCommitMsg] = useState('')
  const [newBranch, setNewBranch] = useState('')
  const [showBranches, setShowBranches] = useState(false)
  const [selectedOid, setSelectedOid] = useState<string | null>(null)
  const [diffData, setDiffData] = useState<CommitDiffData | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [activeFileIdx, setActiveFileIdx] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (initialized) void dispatch(gitRefresh(GIT_DIR))
  }, [initialized, dispatch])

  useEffect(() => {
    if (!selectedOid) {
      setDiffData(null)
      return
    }
    let cancelled = false
    setDiffLoading(true)
    setActiveFileIdx(0)

    async function loadDiff() {
      const changed = await getChangedFilesInCommit(GIT_DIR, selectedOid!)
      const parentOid = await getParentCommitOid(GIT_DIR, selectedOid!)
      const files: FileDiffData[] = await Promise.all(
        changed.map(async (cf: CommitFileChange) => {
          const [after, before] = await Promise.all([
            getFileContentAtCommit(GIT_DIR, selectedOid!, cf.path),
            parentOid ? getFileContentAtCommit(GIT_DIR, parentOid, cf.path) : Promise.resolve(''),
          ])
          const lines = computeLineDiff(before, after)
          const wordsAdded = lines
            .filter(l => l.type === 'add')
            .reduce((s, l) => s + countWords(l.text), 0)
          const wordsRemoved = lines
            .filter(l => l.type === 'remove')
            .reduce((s, l) => s + countWords(l.text), 0)
          return {
            path: cf.path,
            status: cf.status,
            before,
            after,
            lines,
            wordsAdded,
            wordsRemoved,
          }
        })
      )
      if (!cancelled) {
        setDiffData({
          oid: selectedOid!,
          files,
          totalWordsAdded: files.reduce((s, f) => s + f.wordsAdded, 0),
          totalWordsRemoved: files.reduce((s, f) => s + f.wordsRemoved, 0),
        })
        setDiffLoading(false)
      }
    }
    void loadDiff().catch(() => {
      if (!cancelled) setDiffLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [selectedOid])

  function handleInit() {
    void dispatch(
      gitInit({
        name: settings.userName || 'Agilens User',
        email: settings.userEmail || 'dev@agilens.app',
        notes,
      })
    )
  }
  function handleCommit() {
    if (!commitMsg.trim()) return
    void dispatch(
      gitCommit({
        dir: GIT_DIR,
        message: commitMsg.trim(),
        name: settings.userName || 'Agilens User',
        email: settings.userEmail || 'dev@agilens.app',
        notes,
      })
    )
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

  const resolveName = useCallback(
    (path: string) => {
      const id = noteIdFromPath(path)
      if (!id) return null
      return notes.find(n => n.id === id)?.title ?? null
    },
    [notes]
  )

  const selectedCommit = log.find(c => c.oid === selectedOid) ?? null

  // ── Onboarding ────────────────────────────────────────────────────────────
  if (!initialized) {
    const missingConfig = !settings.userName || !settings.userEmail
    const isBufferError = error?.includes('Buffer') || error?.includes('buffer')
    return (
      <div
        style={{
          height: '100%',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          padding: '40px 24px',
        }}
      >
        <svg
          width="44"
          height="44"
          fill="none"
          stroke="var(--accent-400)"
          strokeWidth="1.2"
          viewBox="0 0 24 24"
          style={{ opacity: 0.7 }}
        >
          <circle cx="18" cy="6" r="3" />
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M6 9v3a3 3 0 003 3h6" />
        </svg>
        <div style={{ textAlign: 'center', maxWidth: '380px' }}>
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text-0)',
              margin: '0 0 8px',
              letterSpacing: '-0.02em',
            }}
          >
            Versiona tus notas con Git
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.65, margin: 0 }}>
            Crea un repositorio Git <strong>dentro del navegador</strong>. Tus notas quedan
            versionadas localmente con historial completo de cambios, diffs y estadísticas de
            escritura.
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: '420px',
          }}
        >
          {[
            { n: '1', label: 'Inicializa', desc: 'Crea el repo local en el navegador' },
            { n: '2', label: 'Haz commits', desc: 'Snapshots de tus notas con diffs' },
            { n: '3', label: 'Analiza', desc: 'Ve qué cambió, cuánto escribiste' },
          ].map(step => (
            <div
              key={step.n}
              style={{
                flex: '1 1 110px',
                background: 'var(--bg-2)',
                border: '1px solid var(--border-2)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'var(--accent-glow)',
                  border: '1px solid var(--accent-600)',
                  color: 'var(--accent-400)',
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 6px',
                }}
              >
                {step.n}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-0)' }}>
                {step.label}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                {step.desc}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            background: 'var(--bg-2)',
            border: `1px solid ${missingConfig ? 'rgba(251,146,60,0.4)' : 'var(--border-2)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            maxWidth: '380px',
            width: '100%',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-3)',
              marginBottom: '4px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Autor del repositorio
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-1)' }}>
            <strong style={{ color: 'var(--text-0)' }}>
              {settings.userName || 'Agilens User'}
            </strong>{' '}
            &lt;{settings.userEmail || 'dev@agilens.app'}&gt;
          </div>
          {missingConfig && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#fb923c' }}>
              Usando valores por defecto.{' '}
              <button
                onClick={() => navigate('/settings')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-400)',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '12px',
                  textDecoration: 'underline',
                }}
              >
                Configura tu nombre y email en Ajustes
              </button>
            </div>
          )}
        </div>
        {error && (
          <div
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              maxWidth: '380px',
              width: '100%',
            }}
          >
            {isBufferError ? (
              <>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#ef4444',
                    marginBottom: '4px',
                  }}
                >
                  Error de compatibilidad
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                  <button
                    onClick={() => window.location.reload()}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-400)',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '12px',
                      textDecoration: 'underline',
                    }}
                  >
                    Recarga la página
                  </button>{' '}
                  e inténtalo de nuevo.
                </div>
              </>
            ) : (
              <div style={{ fontSize: '12px', color: '#f87171' }}>{error}</div>
            )}
          </div>
        )}
        <button
          className="btn btn-primary"
          onClick={handleInit}
          disabled={loading}
          style={{ minWidth: '180px' }}
        >
          {loading ? 'Inicializando…' : 'Inicializar repositorio'}
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ── Main 3-panel view ─────────────────────────────────────────────────────
  const noteFiles = status.filter(f => f.path.startsWith('notes/'))
  const attachFiles = status.filter(f => f.path.startsWith('attachments/'))
  const otherFiles = status.filter(
    f => !f.path.startsWith('notes/') && !f.path.startsWith('attachments/')
  )
  const lastCommit = log[0]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Stats bar */}
      <div
        style={{
          flexShrink: 0,
          borderBottom: '1px solid var(--border-1)',
          display: 'flex',
          alignItems: 'center',
          height: 'var(--toolbar-h)',
          overflowX: 'auto',
          overflowY: 'hidden',
        }}
      >
        {(
          [
            { label: 'Commits', value: String(log.length) },
            { label: 'Pendientes', value: String(status.length) },
            { label: 'Notas', value: String(noteFiles.length) },
            { label: 'Adjuntos', value: String(attachFiles.length) },
            { label: 'Rama', value: currentBranch },
            ...(lastCommit ? [{ label: 'Último', value: timeAgo(lastCommit.timestamp) }] : []),
          ] as Array<{ label: string; value: string }>
        ).map((stat, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 14px',
              borderRight: '1px solid var(--border-1)',
              height: '100%',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{stat.label}</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-0)',
              }}
            >
              {stat.value}
            </span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-ghost"
          style={{ margin: '0 8px', padding: '3px 10px', fontSize: '11px', flexShrink: 0 }}
          disabled={loading}
          onClick={() => void dispatch(gitRefresh(GIT_DIR))}
        >
          {loading ? '⟳ Actualizando…' : '⟳ Actualizar'}
        </button>
      </div>

      {/* 3-panel body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Panel 1: Status + Actions */}
        <div
          style={{
            width: '240px',
            flexShrink: 0,
            borderRight: '1px solid var(--border-1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Branch */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid var(--border-1)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg
                width="11"
                height="11"
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
                  textAlign: 'left',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
                onClick={() => setShowBranches(v => !v)}
              >
                {currentBranch} ▾
              </button>
            </div>
            {showBranches && branches.length > 0 && (
              <div
                style={{
                  position: 'absolute',
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
                      textAlign: 'left',
                      padding: '7px 12px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: b.isCurrent ? 600 : 400,
                      color: b.isCurrent ? 'var(--accent-400)' : 'var(--text-1)',
                      background: b.isCurrent ? 'var(--accent-glow)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {b.isCurrent ? '✓ ' : '\u00a0\u00a0'}
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Changed files */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {status.length === 0 ? (
              <div
                style={{
                  padding: '16px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--text-3)',
                }}
              >
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ fontSize: '12px' }}>Árbol limpio</span>
              </div>
            ) : (
              <>
                {noteFiles.length > 0 && (
                  <>
                    <div
                      style={{
                        padding: '8px 12px 4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: 'var(--text-3)',
                      }}
                    >
                      Notas · {noteFiles.length}
                    </div>
                    {noteFiles.map(f => (
                      <FileRow
                        key={f.path}
                        path={f.path}
                        status={f.status}
                        title={resolveName(f.path)}
                      />
                    ))}
                  </>
                )}
                {attachFiles.length > 0 && (
                  <>
                    <div
                      style={{
                        padding: '8px 12px 4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: 'var(--text-3)',
                      }}
                    >
                      Adjuntos · {attachFiles.length}
                    </div>
                    {attachFiles.map(f => (
                      <FileRow key={f.path} path={f.path} status={f.status} title={null} />
                    ))}
                  </>
                )}
                {otherFiles.length > 0 && (
                  <>
                    <div
                      style={{
                        padding: '8px 12px 4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: 'var(--text-3)',
                      }}
                    >
                      Otros · {otherFiles.length}
                    </div>
                    {otherFiles.map(f => (
                      <FileRow key={f.path} path={f.path} status={f.status} title={null} />
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          {/* Commit form */}
          <div
            style={{
              padding: '10px',
              borderTop: '1px solid var(--border-1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            {error && (
              <p style={{ fontSize: '11px', color: '#ef4444', wordBreak: 'break-word', margin: 0 }}>
                {error}
              </p>
            )}
            <textarea
              placeholder="Mensaje de commit…"
              value={commitMsg}
              onChange={e => setCommitMsg(e.target.value)}
              className="input-base"
              rows={2}
              style={{ fontSize: '12px', resize: 'none', fontFamily: 'var(--font-ui)' }}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleCommit()
              }}
            />
            <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
              Tip: <code style={{ fontFamily: 'var(--font-mono)' }}>feat:</code>{' '}
              <code style={{ fontFamily: 'var(--font-mono)' }}>fix:</code>{' '}
              <code style={{ fontFamily: 'var(--font-mono)' }}>docs:</code>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={!commitMsg.trim() || loading}
              onClick={handleCommit}
            >
              {loading
                ? 'Procesando…'
                : `Commit · ${status.length} archivo${status.length !== 1 ? 's' : ''}`}
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
                    ? '✗ Error'
                    : settings.github
                      ? '↑ Push a GitHub'
                      : 'Configura GitHub primero'}
            </button>
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
                  void dispatch(gitCreateBranch({ dir: GIT_DIR, name: newBranch.trim() }))
                  setNewBranch('')
                }}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Panel 2: Commit timeline */}
        <div
          style={{
            flex: selectedOid ? '0 0 340px' : '1',
            minWidth: 0,
            overflowY: 'auto',
            borderRight: selectedOid ? '1px solid var(--border-1)' : 'none',
          }}
        >
          <div
            style={{
              padding: '10px 14px 4px',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--text-2)',
            }}
          >
            Historial · {log.length} commit{log.length !== 1 ? 's' : ''}
          </div>
          {log.length === 0 && (
            <div style={{ padding: '24px 14px', fontSize: '13px', color: 'var(--text-3)' }}>
              Sin commits aún. Haz tu primer commit.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0 20px' }}>
            {log.map((commit, i) => {
              const isSelected = commit.oid === selectedOid
              const isHead = i === 0
              const ct = getCommitType(commit.message)
              const date = new Date(commit.timestamp * 1000)
              return (
                <button
                  key={commit.oid}
                  onClick={() => setSelectedOid(isSelected ? null : commit.oid)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '10px 14px',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    background: isSelected ? 'var(--accent-glow)' : 'transparent',
                    borderLeft: `3px solid ${isSelected ? 'var(--accent-500)' : 'transparent'}`,
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected)
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)'
                  }}
                  onMouseLeave={e => {
                    if (!isSelected)
                      (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <code
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'var(--accent-400)',
                        flexShrink: 0,
                      }}
                    >
                      {commit.oid.slice(0, 7)}
                    </code>
                    {isHead && (
                      <span
                        className="tag tag-accent"
                        style={{ fontSize: '9px', padding: '1px 5px' }}
                      >
                        HEAD
                      </span>
                    )}
                    {ct && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: ct.color,
                          background: `${ct.color}18`,
                          padding: '1px 5px',
                          borderRadius: '3px',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {ct.label}
                      </span>
                    )}
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: 'var(--text-3)',
                        flexShrink: 0,
                      }}
                    >
                      {timeAgo(commit.timestamp)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-0)',
                      fontWeight: isHead ? 500 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {commit.message}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                    {commit.author} ·{' '}
                    {date.toLocaleDateString('es', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    {date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {isSelected && diffData?.oid === commit.oid && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '2px',
                      }}
                    >
                      <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                        {diffData.files.length} archivo{diffData.files.length !== 1 ? 's' : ''}
                      </span>
                      <WordDelta
                        added={diffData.totalWordsAdded}
                        removed={diffData.totalWordsRemoved}
                      />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Panel 3: Diff viewer */}
        {selectedOid && (
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                flexShrink: 0,
                padding: '8px 14px',
                borderBottom: '1px solid var(--border-1)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              {selectedCommit && (
                <>
                  <code
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: 'var(--accent-400)',
                    }}
                  >
                    {selectedCommit.oid.slice(0, 12)}
                  </code>
                  <span
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-0)',
                      fontWeight: 500,
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {selectedCommit.message}
                  </span>
                  {diffData && (
                    <WordDelta
                      added={diffData.totalWordsAdded}
                      removed={diffData.totalWordsRemoved}
                    />
                  )}
                  <button
                    onClick={() => setSelectedOid(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-3)',
                      fontSize: '16px',
                      padding: '0 4px',
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </>
              )}
            </div>
            {/* File tabs */}
            {diffData && diffData.files.length > 0 && (
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  borderBottom: '1px solid var(--border-1)',
                  overflowX: 'auto',
                }}
              >
                {diffData.files.map((f, idx) => {
                  const title = resolveName(f.path)
                  const label = fileLabel(f.path, title ?? undefined)
                  const statusColor =
                    f.status === 'added'
                      ? '#22c55e'
                      : f.status === 'deleted'
                        ? '#ef4444'
                        : '#f59e0b'
                  return (
                    <button
                      key={f.path}
                      onClick={() => setActiveFileIdx(idx)}
                      style={{
                        padding: '6px 14px',
                        border: 'none',
                        borderBottom: `2px solid ${activeFileIdx === idx ? 'var(--accent-500)' : 'transparent'}`,
                        cursor: 'pointer',
                        background: activeFileIdx === idx ? 'var(--bg-2)' : 'transparent',
                        fontSize: '12px',
                        color: activeFileIdx === idx ? 'var(--text-0)' : 'var(--text-2)',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: statusColor,
                        }}
                      >
                        {SL[f.status] ?? '?'}
                      </span>
                      {label}
                      {(f.wordsAdded > 0 || f.wordsRemoved > 0) && (
                        <WordDelta added={f.wordsAdded} removed={f.wordsRemoved} />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
              {diffLoading && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--text-3)',
                    fontSize: '13px',
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ animation: 'spin 1s linear infinite' }}
                  >
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0" strokeLinecap="round" />
                  </svg>
                  Cargando diff…
                </div>
              )}
              {!diffLoading && diffData && diffData.files.length === 0 && (
                <div style={{ color: 'var(--text-3)', fontSize: '13px' }}>
                  Sin archivos modificados en este commit.
                </div>
              )}
              {!diffLoading && diffData && diffData.files[activeFileIdx] && (
                <>
                  {/* Summary */}
                  <div
                    style={{
                      background: 'var(--bg-2)',
                      border: '1px solid var(--border-2)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: 'var(--text-3)',
                        marginBottom: '8px',
                      }}
                    >
                      Estadísticas
                    </div>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      {[
                        {
                          label: 'Palabras +',
                          val: `+${diffData.files[activeFileIdx].wordsAdded}`,
                          color: '#22c55e',
                        },
                        {
                          label: 'Palabras −',
                          val: `-${diffData.files[activeFileIdx].wordsRemoved}`,
                          color: '#ef4444',
                        },
                        {
                          label: 'Líneas total',
                          val: String(diffData.files[activeFileIdx].lines.length),
                          color: 'var(--text-1)',
                        },
                        {
                          label: 'Líneas +',
                          val: String(
                            diffData.files[activeFileIdx].lines.filter(l => l.type === 'add').length
                          ),
                          color: '#22c55e',
                        },
                        {
                          label: 'Líneas −',
                          val: String(
                            diffData.files[activeFileIdx].lines.filter(l => l.type === 'remove')
                              .length
                          ),
                          color: '#ef4444',
                        },
                      ].map(s => (
                        <div
                          key={s.label}
                          style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
                        >
                          <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                            {s.label}
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '14px',
                              fontWeight: 700,
                              color: s.color,
                            }}
                          >
                            {s.val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <FileDiffViewer file={diffData.files[activeFileIdx]} />
                </>
              )}
            </div>
          </div>
        )}

        {/* Placeholder */}
        {!selectedOid && log.length > 0 && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              color: 'var(--text-3)',
              padding: '40px',
            }}
          >
            <svg
              width="32"
              height="32"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              viewBox="0 0 24 24"
              style={{ opacity: 0.4 }}
            >
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M6 9v3a3 3 0 003 3h6" />
            </svg>
            <span style={{ fontSize: '13px' }}>Selecciona un commit para ver el diff</span>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
