/**
 * DailyPage — Daily Standup builder.
 * Minimal, focused, elegant.
 */
import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import type { JSX } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNavigate, useParams } from 'react-router-dom'
import { nanoid } from '@reduxjs/toolkit'
import { useAppDispatch, useAppSelector } from '@/store'
import { useMobile } from '@/hooks/useMobile'
import {
  addEntry,
  updateEntry,
  addSprint,
  setActiveSprint,
  updateSprint,
  setEntryProjects,
} from '@/store/slices/dailySlice'
import { addNote } from '@/store/slices/notesSlice'
import { addImpediment } from '@/store/slices/impedimentsSlice'
import { setActiveNoteId } from '@/store/slices/uiSlice'
import type { DailyEntry, Sprint, Note } from '@/types'
import ProjectPicker from '@/components/projects/ProjectPicker'

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
    const TYPE_MD_LABEL: Record<string, string> = {
      task: 'Tareas',
      research: 'Investigacion',
      meeting: 'Reuniones',
      evidence: 'Evidencias',
      note: 'Notas',
      technical: 'Tecnicas',
      sprint: 'Sprint notas',
      daily: 'Daily',
    }
    const byType: Record<string, Note[]> = {}
    for (const n of linkedNotes) {
      const t = n.noteType ?? 'note'
      if (!byType[t]) byType[t] = []
      byType[t].push(n)
    }
    for (const [type, tNotes] of Object.entries(byType)) {
      lines.push(
        `## ${TYPE_MD_LABEL[type] ?? type}`,
        '',
        ...tNotes.map(n => `- [[${n.title}]]`),
        ''
      )
    }
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

// ─── Linked note type meta ──────────────────────────────────────────────────

const LINKED_TYPE_META: Record<string, { label: string; color: string }> = {
  task: { label: 'Tarea', color: '#facc15' },
  research: { label: 'Investigación', color: '#22d3ee' },
  meeting: { label: 'Reunión', color: '#fb923c' },
  evidence: { label: 'Evidencia', color: '#a78bfa' },
  note: { label: 'Nota', color: '#94a3b8' },
  technical: { label: 'Técnica', color: '#34d399' },
  sprint: { label: 'Sprint', color: '#f472b6' },
  daily: { label: 'Daily', color: '#60a5fa' },
}

const LINKED_TYPE_FILTERS: { value: string; label: string; color: string }[] = [
  { value: 'all', label: 'Todas', color: 'var(--accent-400)' },
  { value: 'task', label: 'Tareas', color: '#facc15' },
  { value: 'research', label: 'Investigación', color: '#22d3ee' },
  { value: 'meeting', label: 'Reuniones', color: '#fb923c' },
  { value: 'evidence', label: 'Evidencias', color: '#a78bfa' },
  { value: 'note', label: 'Notas', color: '#94a3b8' },
  { value: 'technical', label: 'Técnicas', color: '#34d399' },
]

const LINKABLE_NOTE_TYPES = [
  'task',
  'research',
  'meeting',
  'evidence',
  'note',
  'technical',
  'sprint',
]

type SortOption = 'updatedAt' | 'createdAt' | 'title' | 'type'

// ─── Note Picker Modal ────────────────────────────────────────────────────────

function NotePickerModal({
  notes,
  sprints,
  linkedIds,
  onToggle,
  onClose,
  onOpenNote,
  initialTypeFilter = 'all',
}: {
  notes: Note[]
  sprints: Sprint[]
  linkedIds: string[]
  onToggle: (id: string) => void
  onClose: () => void
  onOpenNote: (id: string) => void
  initialTypeFilter?: string
}) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState(initialTypeFilter)
  const [sprintFilter, setSprintFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('')
  const [sort, setSort] = useState<SortOption>('updatedAt')
  const [showLinked, setShowLinked] = useState<'all' | 'linked' | 'unlinked'>('all')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const linkableNotes = notes.filter(n => LINKABLE_NOTE_TYPES.includes(n.noteType))

  const allTags = useMemo(() => {
    const s = new Set<string>()
    linkableNotes.forEach(n => n.tags.forEach(t => s.add(t)))
    return [...s].sort()
  }, [linkableNotes])

  const filtered = useMemo(() => {
    let r = linkableNotes
    if (typeFilter !== 'all') r = r.filter(n => n.noteType === typeFilter)
    if (sprintFilter === '__none__') r = r.filter(n => !n.sprintId)
    else if (sprintFilter !== 'all') r = r.filter(n => n.sprintId === sprintFilter)
    if (tagFilter) r = r.filter(n => n.tags.includes(tagFilter))
    if (showLinked === 'linked') r = r.filter(n => linkedIds.includes(n.id))
    else if (showLinked === 'unlinked') r = r.filter(n => !linkedIds.includes(n.id))
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(
        n =>
          n.title.toLowerCase().includes(q) ||
          n.tags.some(t => t.toLowerCase().includes(q)) ||
          (n.content ?? '').toLowerCase().slice(0, 400).includes(q)
      )
    }
    return [...r].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title, 'es')
      if (sort === 'type') return a.noteType.localeCompare(b.noteType)
      if (sort === 'createdAt') return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
      return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
    })
  }, [linkableNotes, typeFilter, sprintFilter, tagFilter, showLinked, search, sort, linkedIds])

  const linkedCount = linkedIds.length

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.62)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--border-1)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
        }}
      >
        {/* Header */}
        <div
          style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IcoLink />
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-0)', flex: 1 }}>
              Vincular notas al daily
            </span>
            {linkedCount > 0 && (
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--accent-400)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                }}
              >
                {linkedCount} vinculada{linkedCount !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={onClose}
              title="Cerrar (Esc)"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-3)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar por título, etiqueta o contenido..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-base"
            style={{ fontSize: '13px' }}
          />
        </div>

        {/* Filters */}
        <div
          style={{
            padding: '10px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            borderBottom: '1px solid var(--border-1)',
          }}
        >
          {/* Tipo */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {LINKED_TYPE_FILTERS.map(f => {
              const cnt =
                f.value === 'all'
                  ? linkableNotes.length
                  : linkableNotes.filter(n => n.noteType === f.value).length
              const active = typeFilter === f.value
              return (
                <button
                  key={f.value}
                  onClick={() => setTypeFilter(f.value)}
                  style={{
                    padding: '2px 9px',
                    borderRadius: '99px',
                    border: '1px solid',
                    borderColor: active ? f.color : 'var(--border-2)',
                    background: active ? f.color + '18' : 'transparent',
                    color: active ? f.color : 'var(--text-2)',
                    fontSize: '11px',
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {f.label}
                  <span style={{ opacity: 0.6, fontFamily: 'var(--font-mono)' }}>{cnt}</span>
                </button>
              )
            })}
          </div>
          {/* Fila 2: sprint, etiqueta, orden, vinc filter */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={sprintFilter}
              onChange={e => setSprintFilter(e.target.value)}
              className="input-base"
              style={{ fontSize: '11px', padding: '3px 8px', width: 'auto', height: 'auto' }}
            >
              <option value="all">Todos los sprints</option>
              {sprints.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              <option value="__none__">Sin sprint</option>
            </select>
            <select
              value={tagFilter}
              onChange={e => setTagFilter(e.target.value)}
              className="input-base"
              style={{ fontSize: '11px', padding: '3px 8px', width: 'auto', height: 'auto' }}
            >
              <option value="">Todas las etiquetas</option>
              {allTags.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortOption)}
              className="input-base"
              style={{ fontSize: '11px', padding: '3px 8px', width: 'auto', height: 'auto' }}
            >
              <option value="updatedAt">Más recientes</option>
              <option value="createdAt">Más antiguas</option>
              <option value="title">A → Z</option>
              <option value="type">Por tipo</option>
            </select>
            <div style={{ display: 'flex', gap: '3px', marginLeft: 'auto' }}>
              {(['all', 'linked', 'unlinked'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setShowLinked(v)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-2)',
                    background: showLinked === v ? 'var(--accent-glow)' : 'transparent',
                    color: showLinked === v ? 'var(--accent-400)' : 'var(--text-3)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: showLinked === v ? 600 : 400,
                  }}
                >
                  {v === 'all' ? 'Todas' : v === 'linked' ? 'Vinculadas' : 'Sin vincular'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px' }}>
          {filtered.length === 0 && (
            <div
              style={{
                padding: '32px',
                textAlign: 'center' as const,
                color: 'var(--text-3)',
                fontSize: '13px',
              }}
            >
              {linkableNotes.length === 0
                ? 'Crea tareas, investigaciones o reuniones para vincularlas.'
                : 'Sin resultados para los filtros actuales.'}
            </div>
          )}
          {filtered.map(note => {
            const meta = LINKED_TYPE_META[note.noteType] ?? LINKED_TYPE_META.note
            const isLinked = linkedIds.includes(note.id)
            const noteSprint = sprints.find(s => s.id === note.sprintId)
            return (
              <div
                key={note.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-md)',
                  background: isLinked ? 'var(--accent-glow)' : 'transparent',
                  border: `1px solid ${isLinked ? 'var(--accent-600)' : 'transparent'}`,
                  marginBottom: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
                onClick={() => onToggle(note.id)}
              >
                <input
                  type="checkbox"
                  checked={isLinked}
                  onChange={() => onToggle(note.id)}
                  onClick={e => e.stopPropagation()}
                  style={{ accentColor: meta.color, flexShrink: 0 }}
                />
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: '99px',
                    background: meta.color + '20',
                    color: meta.color,
                    fontSize: '10px',
                    fontWeight: 600,
                    flexShrink: 0,
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  {meta.label}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-0)',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  {note.title}
                </span>
                {noteSprint && (
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#f472b6',
                      fontFamily: 'var(--font-mono)',
                      flexShrink: 0,
                    }}
                  >
                    {noteSprint.name}
                  </span>
                )}
                {note.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                    {note.tags.slice(0, 3).map(t => (
                      <span
                        key={t}
                        style={{
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: '99px',
                          background: 'var(--bg-3)',
                          color: 'var(--text-3)',
                          cursor: 'pointer',
                        }}
                        onClick={e => {
                          e.stopPropagation()
                          setTagFilter(t)
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-3)',
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                  }}
                >
                  {note.updatedAt?.split('T')[0] ?? ''}
                </span>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onOpenNote(note.id)
                  }}
                  title="Abrir en editor"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-3)',
                    padding: '2px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                    transition: 'color 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-400)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
                >
                  <svg
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border-1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            {linkedCount > 0 && ` · ${linkedCount} vinculada${linkedCount !== 1 ? 's' : ''}`}
          </span>
          <button className="btn btn-primary" onClick={onClose}>
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}

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
  const [confirmDelete, setConfirmDelete] = useState(false)

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
        borderRadius: 'var(--radius-md)',
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
        onClick={() => {
          if (confirmDelete) {
            onRemove()
            setConfirmDelete(false)
          } else setConfirmDelete(true)
        }}
        onMouseLeave={() => setConfirmDelete(false)}
        aria-label={confirmDelete ? '¿Confirmar?' : 'Eliminar'}
        title={confirmDelete ? '¿Confirmar borrar?' : 'Eliminar'}
        style={{
          background: confirmDelete ? 'rgba(239,68,68,0.15)' : 'none',
          border: confirmDelete ? '1px solid rgba(239,68,68,0.35)' : '1px solid transparent',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          color: confirmDelete ? '#ef4444' : 'var(--text-3)',
          padding: '2px 5px',
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          fontSize: '11px',
          lineHeight: 1,
          flexShrink: 0,
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
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
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
        {confirmDelete && <span>Borrar</span>}
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
            borderRadius: '999px',
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

// ─── Main DailyPage ────────────────────────────────────────────────────────────

export default function DailyPage() {
  const navigate = useNavigate()
  const { date: urlDate } = useParams<{ date?: string }>()
  const dispatch = useAppDispatch()
  const entries = useAppSelector(s => s.daily.entries)
  const sprints = useAppSelector(s => s.daily.sprints)
  const activeSprintId = useAppSelector(s => s.daily.activeSprintId)
  const notes = useAppSelector(s => s.notes.notes)
  const _allProjects = useAppSelector(s => s.projects.projects)
  const projects = useMemo(() => _allProjects.filter(p => !p.archived), [_allProjects])
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

  const isMobile = useMobile()

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
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteModalInitialType, setNoteModalInitialType] = useState<string>('all')
  const [showProjects, setShowProjects] = useState(true)
  const [hiddenOptional, setHiddenOptional] = useState<Set<SectionKey>>(
    new Set(['highlights'] as SectionKey[])
  )
  const [showPreview, setShowPreview] = useState(() => window.innerWidth >= 1080)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isToday = currentDate === todayISO()
  const entry = entries.find(e => e.date === currentDate)
  const activeSprint = sprints.find(s => s.id === activeSprintId)

  // Entry más reciente anterior a currentDate que tenga proyectos (para heredarlos)
  const prevEntryWithProjects = useMemo(() => {
    return (
      [...entries]
        .filter(e => e.date < currentDate && (e.projectIds?.length ?? 0) > 0)
        .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
    )
  }, [entries, currentDate])

  // IDs efectivos: los del entry actual si existe, si no los del día anterior (sugerencia visual)
  const effectiveProjectIds = entry?.projectIds?.length
    ? entry.projectIds
    : (prevEntryWithProjects?.projectIds ?? [])

  // Sugerencias: SOLO tareas directamente asignadas al sprint activo
  const suggestions = activeSprint
    ? notes
        .filter(n => n.noteType === 'task' && n.sprintId === activeSprint.id)
        .map(n => n.title)
        .filter(t => t.length < 70)
    : []
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
      // Hereda proyectos del día anterior automáticamente
      projectIds: prevEntryWithProjects?.projectIds?.length
        ? [...prevEntryWithProjects.projectIds]
        : undefined,
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
    // Registrar automáticamente en el log de impedimentos
    if (key === 'blocked') {
      dispatch(
        addImpediment({
          id: nanoid(),
          title: value,
          status: 'open',
          severity: 'medium',
          openedAt: currentDate,
          linkedEntryIds: [e.id],
        })
      )
    }
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
        sprintId: sprint?.id,
        projectIds: e.projectIds?.length ? e.projectIds : undefined,
        createdAt: now,
        updatedAt: now,
        attachments: [],
      })
    )
    dispatch(setActiveNoteId(noteId))
    flashSave()
    setTimeout(() => navigate('/editor'), 120)
  }, [entry, notes, activeSprint, sprints, dispatch, navigate])

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
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
  }

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', display: 'flex', overflow: 'hidden', background: 'var(--bg-0)' }}
    >
      {/* ─── Note Picker Modal ─── */}
      {showNoteModal && (
        <NotePickerModal
          notes={notes}
          sprints={sprints}
          linkedIds={entry?.noteIds ?? []}
          onToggle={toggleNote}
          onClose={() => setShowNoteModal(false)}
          onOpenNote={id => {
            dispatch(setActiveNoteId(id))
            navigate('/editor')
          }}
          initialTypeFilter={noteModalInitialType}
        />
      )}

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
              {!isMobile && 'Vista previa'}
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
              {!isMobile && 'Historial'}
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
                      borderRadius: 'var(--radius-sm)',
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
                  {(section.key === 'did' || section.key === 'will') && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setNoteModalInitialType('task')
                        setShowNoteModal(true)
                      }}
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '99px',
                        border: '1px solid var(--border-2)',
                        background: 'transparent',
                        color: 'var(--text-2)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                        transition: 'all 0.12s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.borderColor = '#facc15'
                        el.style.color = '#facc15'
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.borderColor = 'var(--border-2)'
                        el.style.color = 'var(--text-2)'
                      }}
                    >
                      <svg
                        width="11"
                        height="11"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <polyline points="9 11 12 14 22 4" />
                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                      </svg>
                      Vincular tarea
                    </button>
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
                        onSelect={s => {
                          // Añadir el texto al daily
                          const e = getOrCreate()
                          const currentItems = (e[section.key] as string[] | undefined) ?? []
                          if (!currentItems.includes(s)) {
                            dispatch(updateEntry({ id: e.id, [section.key]: [...currentItems, s] }))
                          }
                          // Auto-vincular la tarea que coincida con esta sugerencia
                          const matchedNote = notes.find(
                            n => n.noteType === 'task' && n.title === s
                          )
                          if (matchedNote && !e.noteIds.includes(matchedNote.id)) {
                            dispatch(
                              updateEntry({ id: e.id, noteIds: [...e.noteIds, matchedNote.id] })
                            )
                          }
                          flashSave()
                        }}
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

          {/* Notas vinculadas */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-2)' }}>
                <IcoLink />
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)', flex: 1 }}>
                Notas vinculadas
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
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowNoteModal(true)}
                style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <svg
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Vincular notas
              </button>
            </div>

            {/* Pills de notas vinculadas con botón de desvincular */}
            {(entry?.noteIds.length ?? 0) > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '10px' }}>
                {entry!.noteIds.map(nid => {
                  const n = notes.find(x => x.id === nid)
                  if (!n) return null
                  const meta = LINKED_TYPE_META[n.noteType] ?? LINKED_TYPE_META.note
                  return (
                    <span
                      key={nid}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px 2px 8px',
                        borderRadius: '99px',
                        background: meta.color + '18',
                        border: `1px solid ${meta.color}33`,
                        color: meta.color,
                        fontSize: '11px',
                        fontWeight: 500,
                      }}
                    >
                      <span
                        style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '2px',
                          background: meta.color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          cursor: 'pointer',
                          maxWidth: '140px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap' as const,
                        }}
                        onClick={() => {
                          dispatch(setActiveNoteId(nid))
                          navigate('/editor')
                        }}
                        title={n.title}
                      >
                        {n.title}
                      </span>
                      <button
                        onClick={() => toggleNote(nid)}
                        title="Desvincular"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: meta.color,
                          opacity: 0.6,
                          padding: '0 2px',
                          display: 'flex',
                          alignItems: 'center',
                          lineHeight: 1,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {(entry?.noteIds.length ?? 0) === 0 && (
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-3)',
                  margin: '8px 0 0',
                  fontStyle: 'italic',
                }}
              >
                Sin notas vinculadas — tareas, investigaciones, reuniones, evidencias...
              </p>
            )}
          </div>

          {/* Proyectos */}
          <div style={card}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => setShowProjects(v => !v)}
            >
              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-2)' }}>
                <svg
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
                </svg>
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)', flex: 1 }}>
                Proyectos
              </span>
              {(entry?.projectIds?.length ?? 0) > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--accent-400)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                  }}
                >
                  {entry!.projectIds!.length}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-3)' }}>
                {showProjects ? <IcoChevronUp /> : <IcoChevronDown />}
              </span>
            </div>

            {/* Selected project pills (always visible) */}
            {(entry?.projectIds?.length ?? 0) > 0 && !showProjects && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                {(entry!.projectIds ?? []).map(pid => {
                  const proj = projects.find(p => p.id === pid)
                  if (!proj) return null
                  return (
                    <span
                      key={pid}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 7px',
                        borderRadius: '99px',
                        background: proj.color + '18',
                        border: `1px solid ${proj.color}33`,
                        color: proj.color,
                        fontSize: '11px',
                        fontWeight: 500,
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '2px',
                          background: proj.color,
                          flexShrink: 0,
                        }}
                      />
                      {proj.name}
                    </span>
                  )
                })}
              </div>
            )}

            {showProjects && (
              <div style={{ marginTop: '10px' }}>
                <ProjectPicker
                  selectedIds={effectiveProjectIds}
                  onChange={ids => {
                    const e = getOrCreate()
                    dispatch(setEntryProjects({ entryId: e.id, projectIds: ids }))
                    flashSave()
                  }}
                  mode="multi"
                  placeholder="Buscar o vincular proyectos…"
                  fullWidth
                />
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
              padding: '4px 2px 0',
              flexWrap: 'wrap',
              borderTop: '1px solid var(--border-1)',
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: 'var(--radius-md)',
              }}
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
              Guardar como nota Daily
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
