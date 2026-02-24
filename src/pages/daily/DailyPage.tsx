/**
 * DailyPage — Daily Standup builder.
 * Minimal, focused, elegant.
 */
import { useState, useRef, useCallback } from 'react'
import type { JSX } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNavigate, useParams } from 'react-router-dom'
import { nanoid } from '@reduxjs/toolkit'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  addEntry,
  updateEntry,
  addSprint,
  setActiveSprint,
  updateSprint,
  deleteSprint,
} from '@/store/slices/dailySlice'
import { addNote } from '@/store/slices/notesSlice'
import { setActiveNoteId } from '@/store/slices/uiSlice'
import type { DailyEntry, Sprint, Note } from '@/types'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}
function prevDay(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}
function nextDay(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}
function formatDateLong(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
function sprintDaysInfo(sprint: Sprint): string {
  if (!sprint.startDate) return ''
  const start = new Date(sprint.startDate + 'T12:00:00')
  const today = new Date(todayISO() + 'T12:00:00')
  const daysSince = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1
  if (sprint.endDate) {
    const end = new Date(sprint.endDate + 'T12:00:00')
    const total = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
    const remaining = Math.floor((end.getTime() - today.getTime()) / 86400000)
    return remaining >= 0 ? `Dia ${daysSince}/${total} - ${remaining}d restantes` : `Finalizado`
  }
  return `Dia ${daysSince}`
}

// ─── Markdown builder ─────────────────────────────────────────────────────────

function buildMarkdown(entry: DailyEntry, notes: Note[], sprint?: Sprint): string {
  const lines: string[] = [`# Daily Standup - ${entry.date}`, '']
  if (sprint) {
    lines.push(
      `**Sprint:** ${sprint.name}${sprint.goal ? `  \n**Objetivo:** ${sprint.goal}` : ''}`,
      ''
    )
  }
  lines.push('## Hice hoy', '')
  lines.push(...(entry.did.length ? entry.did.map(i => `- ${i}`) : ['- *(nada)*']), '')
  lines.push('## Hare manana', '')
  lines.push(...(entry.will.length ? entry.will.map(i => `- ${i}`) : ['- *(nada)*']), '')
  lines.push('## Bloqueado', '')
  lines.push(
    ...(entry.blocked.length ? entry.blocked.map(i => `- ${i}`) : ['- *(sin bloqueos)*']),
    ''
  )
  if (entry.highlights?.length) {
    lines.push('## Destacados', '', ...entry.highlights.map(h => `- ${h}`), '')
  }
  if (entry.generalNotes?.trim()) {
    lines.push('## Notas', '', entry.generalNotes.trim(), '')
  }
  const linkedNotes = entry.noteIds
    .map(id => notes.find(n => n.id === id))
    .filter((n): n is Note => !!n)
  if (linkedNotes.length) {
    lines.push('## Evidencias', '', ...linkedNotes.map(n => `- [[${n.title}]]`), '')
  }
  return lines.join('\n')
}

// ─── Section config ───────────────────────────────────────────────────────────

type SectionKey = 'did' | 'will' | 'blocked' | 'highlights'

// ─── Section SVG icons ────────────────────────────────────────────────────────

const IcoCheck = ({ color }: { color: string }) => (
  <svg width="13" height="13" fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
)
const IcoNext = ({ color }: { color: string }) => (
  <svg width="13" height="13" fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="13 17 18 12 13 7" />
    <polyline points="6 17 11 12 6 7" />
  </svg>
)
const IcoBlock = ({ color }: { color: string }) => (
  <svg width="13" height="13" fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
)
const IcoStar = ({ color }: { color: string }) => (
  <svg width="13" height="13" fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)
const IcoNotes = () => (
  <svg
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="13" y1="17" x2="8" y2="17" />
  </svg>
)
const IcoLink = () => (
  <svg
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
  </svg>
)
const IcoChevronDown = () => (
  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)
const IcoChevronUp = () => (
  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="18 15 12 9 6 15" />
  </svg>
)

type SectionIconKey = 'check' | 'next' | 'block' | 'star'

const SECTION_ICON_MAP: Record<SectionIconKey, (color: string) => JSX.Element> = {
  check: color => <IcoCheck color={color} />,
  next: color => <IcoNext color={color} />,
  block: color => <IcoBlock color={color} />,
  star: color => <IcoStar color={color} />,
}

const SECTIONS: {
  key: SectionKey
  label: string
  placeholder: string
  color: string
  iconKey: SectionIconKey
  optional: boolean
}[] = [
  {
    key: 'did',
    label: 'Hice hoy',
    iconKey: 'check',
    placeholder: 'Que complete hoy...',
    color: '#22c55e',
    optional: false,
  },
  {
    key: 'will',
    label: 'Hare manana',
    iconKey: 'next',
    placeholder: 'Que planeo hacer...',
    color: '#60a5fa',
    optional: false,
  },
  {
    key: 'blocked',
    label: 'Bloqueado',
    iconKey: 'block',
    placeholder: 'Impedimentos activos...',
    color: '#f87171',
    optional: true,
  },
  {
    key: 'highlights',
    label: 'Destacados',
    iconKey: 'star',
    placeholder: 'Logro o momento clave...',
    color: '#fbbf24',
    optional: true,
  },
]

// ─── Item row ────────────────────────────────────────────────────────────────

function ItemRow({
  text,
  accentColor,
  onRemove,
  onEdit,
}: {
  text: string
  accentColor: string
  onRemove: () => void
  onEdit: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(text)

  function commit() {
    if (val.trim()) onEdit(val.trim())
    else setVal(text)
    setEditing(false)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 10px 6px 12px',
        borderRadius: '6px',
        background: 'var(--bg-1)',
        borderLeft: `2px solid ${accentColor}`,
      }}
    >
      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setVal(text)
              setEditing(false)
            }
          }}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '13px',
            color: 'var(--text-0)',
            fontFamily: 'inherit',
          }}
        />
      ) : (
        <span
          style={{
            fontSize: '13px',
            color: 'var(--text-0)',
            flex: 1,
            cursor: 'text',
            lineHeight: 1.4,
          }}
          onClick={() => setEditing(true)}
          title="Clic para editar"
        >
          {text}
        </span>
      )}
      <button
        onClick={onRemove}
        aria-label="Eliminar"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-3)',
          padding: '0 2px',
          fontSize: '14px',
          lineHeight: 1,
          flexShrink: 0,
          opacity: 0.5,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '0.5')}
      >
        x
      </button>
    </div>
  )
}

// ─── Suggestion chips ─────────────────────────────────────────────────────────

function SuggestionChips({
  items,
  used,
  onSelect,
}: {
  items: string[]
  used: Set<string>
  onSelect: (s: string) => void
}) {
  const available = items.filter(i => !used.has(i)).slice(0, 5)
  if (!available.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
      {available.map(s => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          title={`Anadir: ${s}`}
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '10px',
            border: '1px dashed var(--border-2)',
            background: 'transparent',
            color: 'var(--text-2)',
            cursor: 'pointer',
            maxWidth: '180px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.color = 'var(--accent-400)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.color = 'var(--text-2)'
          }}
        >
          + {s}
        </button>
      ))}
    </div>
  )
}

// ─── Add input ────────────────────────────────────────────────────────────────

function AddInput({
  placeholder,
  accentColor,
  onAdd,
}: {
  placeholder: string
  accentColor: string
  onAdd: (v: string) => void
}) {
  const [val, setVal] = useState('')
  return (
    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
      <input
        type="text"
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder={placeholder}
        className="input-base"
        style={{ flex: 1, fontSize: '13px' }}
        onKeyDown={e => {
          if (e.key === 'Enter' && val.trim()) {
            onAdd(val.trim())
            setVal('')
          }
        }}
      />
      <button
        className="btn btn-ghost"
        style={{
          padding: '0 12px',
          flexShrink: 0,
          color: val.trim() ? accentColor : undefined,
        }}
        disabled={!val.trim()}
        onClick={() => {
          if (val.trim()) {
            onAdd(val.trim())
            setVal('')
          }
        }}
      >
        +
      </button>
    </div>
  )
}

// ─── Note checkbox row ────────────────────────────────────────────────────────

function NoteCheckRow({
  note,
  checked,
  onChange,
}: {
  note: Note
  checked: boolean
  onChange: () => void
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        padding: '6px 10px',
        borderRadius: '6px',
        background: checked ? 'var(--accent-glow)' : 'transparent',
        border: `1px solid ${checked ? 'var(--accent-600)' : 'var(--border-1)'}`,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ accentColor: 'var(--accent-500)', flexShrink: 0 }}
      />
      <span
        style={{
          fontSize: '12px',
          color: 'var(--text-0)',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {note.title}
      </span>
      <span
        style={{
          fontSize: '10px',
          color: 'var(--text-3)',
          fontFamily: 'var(--font-mono)',
          flexShrink: 0,
        }}
      >
        {note.noteType}
      </span>
    </label>
  )
}

// ─── Main DailyPage ────────────────────────────────────────────────────────────

export default function DailyPage() {
  const navigate = useNavigate()
  const { date: urlDate } = useParams<{ date?: string }>()
  const dispatch = useAppDispatch()
  const entries = useAppSelector(s => s.daily.entries)
  const sprints = useAppSelector(s => s.daily.sprints)
  const activeSprintId = useAppSelector(s => s.daily.activeSprintId)
  const notes = useAppSelector(s => s.notes.notes)
  // Preview uses the same settings as the real note viewer
  const previewFontSize = useAppSelector(s => s.settings.editorFontSize)
  const previewLineHeight = useAppSelector(s => s.settings.lineHeight ?? 1.7)
  const previewProseFont = useAppSelector(s => s.settings.markdownPreviewFont ?? 'sans')
  const previewProseWidth = useAppSelector(s => s.settings.markdownProseWidth ?? 760)
  const previewIsDark = useAppSelector(s => s.settings.uiTheme) === 'dark'
  const PROSE_FONT_STACKS: Record<string, string> = {
    sans: 'var(--font-ui)',
    serif: 'Georgia, "Times New Roman", serif',
    mono: 'var(--font-mono)',
  }

  // ─── Resizable split ────────────────────────────────────────────────────────
  const SPLIT_KEY = 'agilens_daily_split'
  const [splitPct, setSplitPct] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(SPLIT_KEY)) || 45
    } catch {
      return 45
    }
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const handleDragStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    draggingRef.current = true
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    const el = containerRef.current
    if (!el) return
    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return
      const rect = el.getBoundingClientRect()
      const pct = Math.min(Math.max(((ev.clientX - rect.left) / rect.width) * 100, 25), 75)
      setSplitPct(pct)
      try {
        localStorage.setItem(SPLIT_KEY, String(pct))
      } catch {
        /* noop */
      }
    }
    const onUp = () => {
      draggingRef.current = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [])

  const [currentDate, setCurrentDate] = useState(() => urlDate ?? todayISO())
  const [showSprintForm, setShowSprintForm] = useState(false)
  const [sprintInput, setSprintInput] = useState('')
  const [sprintEndInput, setSprintEndInput] = useState('')
  const [sprintGoalInput, setSprintGoalInput] = useState('')
  const [editSprintId, setEditSprintId] = useState<string | null>(null)
  const [editSprintGoal, setEditSprintGoal] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)
  const [noteSearch, setNoteSearch] = useState('')
  const [showEvidences, setShowEvidences] = useState(false)
  const [hiddenOptional, setHiddenOptional] = useState<Set<SectionKey>>(
    new Set(['highlights'] as SectionKey[])
  )
  const [showPreview, setShowPreview] = useState(() => window.innerWidth >= 1080)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isToday = currentDate === todayISO()
  const entry = entries.find(e => e.date === currentDate)
  const activeSprint = sprints.find(s => s.id === activeSprintId)

  const sprintNotes: Note[] = activeSprint
    ? notes.filter(
        n =>
          n.noteType === 'task' ||
          n.noteType === 'sprint' ||
          n.tags.some(
            t =>
              activeSprint.name.toLowerCase().includes(t.toLowerCase()) ||
              t.toLowerCase().includes(activeSprint.name.split(' ')[0]?.toLowerCase() ?? '')
          )
      )
    : []
  const suggestions = sprintNotes.map(n => n.title).filter(t => t.length < 70)
  const usedItems = new Set<string>([
    ...(entry?.did ?? []),
    ...(entry?.will ?? []),
    ...(entry?.blocked ?? []),
  ])

  function flashSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSavedFlash(true)
    saveTimerRef.current = setTimeout(() => setSavedFlash(false), 1400)
  }

  function getOrCreate(): DailyEntry {
    if (entry) return entry
    const e: DailyEntry = {
      id: nanoid(),
      date: currentDate,
      did: [],
      will: [],
      blocked: [],
      highlights: [],
      noteIds: [],
      projectNoteIds: [],
      generalNotes: '',
      sprintId: activeSprintId ?? undefined,
    }
    dispatch(addEntry(e))
    return e
  }

  function updateField(fields: Partial<DailyEntry>) {
    const e = getOrCreate()
    dispatch(updateEntry({ id: e.id, ...fields }))
    flashSave()
  }

  function addItem(key: SectionKey, value: string) {
    const e = getOrCreate()
    const current = (e[key] as string[] | undefined) ?? []
    updateField({ [key]: [...current, value] })
  }

  function removeItem(key: SectionKey, i: number) {
    const arr = [...((entry?.[key] as string[] | undefined) ?? [])]
    arr.splice(i, 1)
    updateField({ [key]: arr })
  }

  function editItem(key: SectionKey, i: number, val: string) {
    const arr = [...((entry?.[key] as string[] | undefined) ?? [])]
    arr[i] = val
    updateField({ [key]: arr })
  }

  function toggleNote(noteId: string) {
    const e = getOrCreate()
    const nodeIds = e.noteIds.includes(noteId)
      ? e.noteIds.filter(id => id !== noteId)
      : [...e.noteIds, noteId]
    updateField({ noteIds: nodeIds })
  }

  const generalNotesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleGeneralNotes(value: string) {
    const e = getOrCreate()
    dispatch(updateEntry({ id: e.id, generalNotes: value }))
    if (generalNotesTimer.current) clearTimeout(generalNotesTimer.current)
    generalNotesTimer.current = setTimeout(() => flashSave(), 700)
  }

  function createSprint() {
    if (!sprintInput.trim()) return
    const sprint: Sprint = {
      id: nanoid(),
      name: sprintInput.trim(),
      startDate: currentDate,
      endDate: sprintEndInput || undefined,
      goal: sprintGoalInput.trim() || undefined,
    }
    dispatch(addSprint(sprint))
    dispatch(setActiveSprint(sprint.id))
    setSprintInput('')
    setSprintEndInput('')
    setSprintGoalInput('')
    setShowSprintForm(false)
    flashSave()
  }

  function saveSprintGoal(id: string, goal: string) {
    dispatch(updateSprint({ id, goal: goal.trim() || undefined }))
    setEditSprintId(null)
    flashSave()
  }

  const createDailyNote = useCallback(() => {
    const e = getOrCreate()
    const sprint = sprints.find(s => s.id === e.sprintId) ?? activeSprint
    const content = buildMarkdown(e, notes, sprint)
    const noteId = nanoid()
    const now = new Date().toISOString()
    dispatch(
      addNote({
        id: noteId,
        title: `Daily ${e.date}`,
        content,
        tags: ['daily', ...(sprint ? [sprint.name.toLowerCase().replace(/\s+/g, '-')] : [])],
        noteType: 'daily',
        createdAt: now,
        updatedAt: now,
        attachments: [],
      })
    )
    dispatch(setActiveNoteId(noteId))
    flashSave()
    setTimeout(() => navigate('/editor'), 120)
  }, [entry, notes, activeSprint, sprints, dispatch, navigate])

  // Evidencias: solo notas de tipo 'evidence'
  const evidenceNotes = notes.filter(n => n.noteType === 'evidence')
  const filteredEvidences = noteSearch.trim()
    ? evidenceNotes.filter(
        n =>
          n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
          n.tags.some(t => t.includes(noteSearch.toLowerCase()))
      )
    : evidenceNotes

  // Preview en tiempo real del markdown que se generará
  const previewMarkdown = buildMarkdown(
    entry ?? {
      id: '',
      date: currentDate,
      did: [],
      will: [],
      blocked: [],
      highlights: [],
      noteIds: [],
      projectNoteIds: [],
      generalNotes: '',
      sprintId: activeSprintId ?? undefined,
    },
    notes,
    activeSprint
  )

  const totalItems = (entry?.did.length ?? 0) + (entry?.will.length ?? 0)
  const blockerCount = entry?.blocked.length ?? 0

  const card: React.CSSProperties = {
    background: 'var(--bg-2)',
    border: '1px solid var(--border-1)',
    borderRadius: '10px',
    padding: '14px 16px',
  }

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', display: 'flex', overflow: 'hidden', background: 'var(--bg-0)' }}
    >
      {/* ─── Form column ─── */}
      <div
        style={{
          flex: showPreview ? `0 0 ${splitPct}%` : '1 1 auto',
          overflowY: 'auto',
          minWidth: 0,
        }}
      >
        <div
          style={{
            maxWidth: '680px',
            margin: '0 auto',
            padding: 'clamp(20px, 4vw, 36px) clamp(14px, 4vw, 28px) 64px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setCurrentDate(prevDay(currentDate))}
              aria-label="Dia anterior"
              style={{ padding: '4px 8px', fontSize: '16px', lineHeight: 1 }}
            >
              &lsaquo;
            </button>
            <div style={{ flex: 1, minWidth: 0, padding: '0 4px' }}>
              <h1
                style={{
                  fontSize: '17px',
                  fontWeight: 600,
                  color: 'var(--text-0)',
                  margin: 0,
                  textTransform: 'capitalize',
                  letterSpacing: '-0.01em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatDateLong(currentDate)}
              </h1>
              {!isToday && (
                <button
                  onClick={() => setCurrentDate(todayISO())}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: 'var(--accent-400)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  volver a hoy
                </button>
              )}
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setCurrentDate(nextDay(currentDate))}
              disabled={currentDate >= todayISO()}
              aria-label="Dia siguiente"
              style={{ padding: '4px 8px', fontSize: '16px', lineHeight: 1 }}
            >
              &rsaquo;
            </button>
            {savedFlash && (
              <span
                style={{
                  fontSize: '11px',
                  color: '#4ade80',
                  fontFamily: 'var(--font-mono)',
                  paddingRight: '4px',
                }}
              >
                guardado
              </span>
            )}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowPreview(p => !p)}
              title={showPreview ? 'Ocultar vista previa' : 'Mostrar vista previa'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                flexShrink: 0,
                color: showPreview ? 'var(--accent-400)' : undefined,
              }}
            >
              <svg
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Vista previa
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/daily/history')}
              title="Ver historial del daily"
              aria-label="Historial"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}
            >
              <svg
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="8" y1="14" x2="16" y2="14" />
                <line x1="8" y1="18" x2="13" y2="18" />
              </svg>
              Historial
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={createDailyNote}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}
            >
              <svg
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              Crear nota
            </button>
          </div>

          {/* Sprint */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Sprint
              </span>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', flex: 1 }}>
                {sprints.map(s => (
                  <button
                    key={s.id}
                    onClick={() => dispatch(setActiveSprint(s.id === activeSprintId ? null : s.id))}
                    style={{
                      padding: '2px 10px',
                      borderRadius: '20px',
                      border: '1px solid',
                      borderColor: 'var(--border-2)',
                      background: s.id === activeSprintId ? 'var(--accent-glow)' : 'transparent',
                      color: s.id === activeSprintId ? 'var(--accent-400)' : 'var(--text-1)',
                      fontSize: '12px',
                      fontWeight: s.id === activeSprintId ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {s.name}
                  </button>
                ))}
                {sprints.length === 0 && !showSprintForm && (
                  <span style={{ fontSize: '12px', color: 'var(--text-3)', fontStyle: 'italic' }}>
                    Sin sprint
                  </span>
                )}
              </div>
              {activeSprint && (
                <button
                  onClick={() => dispatch(deleteSprint(activeSprint.id))}
                  aria-label="Eliminar sprint"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-3)',
                    fontSize: '14px',
                    padding: '0 2px',
                    lineHeight: 1,
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
                  onMouseLeave={e =>
                    ((e.currentTarget as HTMLElement).style.color = 'var(--text-3)')
                  }
                >
                  x
                </button>
              )}
              {!showSprintForm && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowSprintForm(true)}
                  style={{ fontSize: '11px', padding: '2px 8px' }}
                >
                  + Nuevo
                </button>
              )}
            </div>

            {activeSprint && !showSprintForm && (
              <div
                style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-3)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {sprintDaysInfo(activeSprint)}
                  {activeSprint.endDate ? ` · hasta ${activeSprint.endDate}` : ''}
                </span>
                {editSprintId === activeSprint.id ? (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      autoFocus
                      className="input-base"
                      value={editSprintGoal}
                      onChange={e => setEditSprintGoal(e.target.value)}
                      placeholder="Objetivo del sprint..."
                      style={{ fontSize: '12px', flex: 1 }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveSprintGoal(activeSprint.id, editSprintGoal)
                        if (e.key === 'Escape') setEditSprintId(null)
                      }}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => saveSprintGoal(activeSprint.id, editSprintGoal)}
                    >
                      OK
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditSprintId(null)}>
                      x
                    </button>
                  </div>
                ) : activeSprint.goal ? (
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-1)',
                      margin: 0,
                      cursor: 'pointer',
                      fontStyle: 'italic',
                    }}
                    onClick={() => {
                      setEditSprintId(activeSprint.id)
                      setEditSprintGoal(activeSprint.goal ?? '')
                    }}
                    title="Clic para editar objetivo"
                  >
                    {activeSprint.goal}
                  </p>
                ) : (
                  <button
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-3)',
                      background: 'transparent',
                      border: '1px dashed var(--border-2)',
                      borderRadius: '6px',
                      padding: '3px 10px',
                      cursor: 'pointer',
                      width: 'fit-content',
                    }}
                    onClick={() => {
                      setEditSprintId(activeSprint.id)
                      setEditSprintGoal('')
                    }}
                  >
                    + Anadir objetivo
                  </button>
                )}
              </div>
            )}

            {showSprintForm && (
              <div
                style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}
              >
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nombre (ej: Sprint 12)"
                    value={sprintInput}
                    onChange={e => setSprintInput(e.target.value)}
                    className="input-base"
                    style={{ fontSize: '12px', flex: '2 1 130px' }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') createSprint()
                      if (e.key === 'Escape') setShowSprintForm(false)
                    }}
                  />
                  <input
                    type="date"
                    value={sprintEndInput}
                    onChange={e => setSprintEndInput(e.target.value)}
                    title="Fecha de fin"
                    className="input-base"
                    style={{ fontSize: '12px', flex: '1 1 110px' }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Objetivo (opcional)"
                  value={sprintGoalInput}
                  onChange={e => setSprintGoalInput(e.target.value)}
                  className="input-base"
                  style={{ fontSize: '12px' }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') createSprint()
                  }}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={createSprint}
                    disabled={!sprintInput.trim()}
                  >
                    Crear
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowSprintForm(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sections */}
          {SECTIONS.map(section => {
            const isHidden = section.optional && hiddenOptional.has(section.key)
            const items = (entry?.[section.key] as string[] | undefined) ?? []

            return (
              <div key={section.key} style={card}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: isHidden ? 0 : '10px',
                    cursor: section.optional ? 'pointer' : 'default',
                  }}
                  onClick={
                    section.optional
                      ? () =>
                          setHiddenOptional(prev => {
                            const next = new Set(prev)
                            if (next.has(section.key)) next.delete(section.key)
                            else next.add(section.key)
                            return next
                          })
                      : undefined
                  }
                >
                  <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    {SECTION_ICON_MAP[section.iconKey](section.color)}
                  </span>
                  <span
                    style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)', flex: 1 }}
                  >
                    {section.label}
                  </span>
                  {items.length > 0 && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        color: section.color,
                        fontWeight: 600,
                      }}
                    >
                      {items.length}
                    </span>
                  )}
                  {section.optional && (
                    <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-3)' }}>
                      {isHidden ? <IcoChevronDown /> : <IcoChevronUp />}
                    </span>
                  )}
                </div>

                {!isHidden && (
                  <>
                    {items.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          marginBottom: '8px',
                        }}
                      >
                        {items.map((item, i) => (
                          <ItemRow
                            key={i}
                            text={item}
                            accentColor={section.color}
                            onRemove={() => removeItem(section.key, i)}
                            onEdit={v => editItem(section.key, i, v)}
                          />
                        ))}
                      </div>
                    )}

                    {(section.key === 'did' || section.key === 'will') && (
                      <SuggestionChips
                        items={suggestions}
                        used={usedItems}
                        onSelect={s => addItem(section.key, s)}
                      />
                    )}

                    <AddInput
                      placeholder={section.placeholder}
                      accentColor={section.color}
                      onAdd={v => addItem(section.key, v)}
                    />
                  </>
                )}
              </div>
            )
          })}

          {/* Notas libres */}
          <div style={card}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-2)' }}>
                <IcoNotes />
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)' }}>
                Notas libres
              </span>
            </div>
            <textarea
              className="input-base"
              rows={3}
              placeholder="Ideas, contexto, reflexiones..."
              value={entry?.generalNotes ?? ''}
              onChange={e => handleGeneralNotes(e.target.value)}
              style={{
                width: '100%',
                resize: 'vertical',
                fontSize: '13px',
                lineHeight: 1.6,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Evidencias */}
          <div style={card}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => setShowEvidences(v => !v)}
            >
              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-2)' }}>
                <IcoLink />
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)', flex: 1 }}>
                Evidencias
              </span>
              {(entry?.noteIds.length ?? 0) > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--accent-400)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                  }}
                >
                  {entry!.noteIds.length}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-3)' }}>
                {showEvidences ? <IcoChevronUp /> : <IcoChevronDown />}
              </span>
            </div>

            {showEvidences && (
              <div
                style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                <input
                  type="text"
                  placeholder="Buscar evidencia..."
                  value={noteSearch}
                  onChange={e => setNoteSearch(e.target.value)}
                  className="input-base"
                  style={{ fontSize: '12px' }}
                />
                <div
                  style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  {filteredEvidences.length === 0 && (
                    <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                      {evidenceNotes.length === 0
                        ? 'Sin notas de evidencia. Crea una nota de tipo Evidencia.'
                        : 'Sin resultados.'}
                    </p>
                  )}
                  {filteredEvidences.map(note => (
                    <NoteCheckRow
                      key={note.id}
                      note={note}
                      checked={entry?.noteIds.includes(note.id) ?? false}
                      onChange={() => toggleNote(note.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '0 2px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}
            >
              {totalItems > 0 ? `${totalItems} item${totalItems !== 1 ? 's' : ''}` : 'Sin entradas'}
              {blockerCount > 0 ? ` · ${blockerCount} bloqueo${blockerCount !== 1 ? 's' : ''}` : ''}
              {activeSprint ? ` · ${activeSprint.name}` : ''}
            </span>
            <button
              className="btn btn-primary"
              onClick={createDailyNote}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              Crear nota Daily
            </button>
          </div>
        </div>
      </div>
      {/* end form column */}

      {/* ─── Resize handle ─── */}
      {showPreview && (
        <div
          className="daily-resize-handle"
          onPointerDown={handleDragStart}
          title="Arrastrar para redimensionar"
        />
      )}

      {/* ─── Preview column ─── */}
      {showPreview && (
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}
        >
          <div
            style={{
              padding: '10px 20px 8px',
              borderBottom: '1px solid var(--border-1)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            <svg
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Vista previa de nota
          </div>
          <div
            className="md-preview-root"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 28px 80px',
              fontSize: `${previewFontSize}px`,
              lineHeight: previewLineHeight,
            }}
          >
            <article
              className={`md-prose ${previewIsDark ? 'md-prose--dark' : 'md-prose--light'}`}
              style={{
                maxWidth: `${previewProseWidth}px`,
                margin: '0 auto',
                fontFamily: PROSE_FONT_STACKS[previewProseFont] ?? PROSE_FONT_STACKS.sans,
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewMarkdown}</ReactMarkdown>
            </article>
          </div>
        </div>
      )}
    </div>
  )
}
