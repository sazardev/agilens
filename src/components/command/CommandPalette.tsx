/**
 * CommandPalette — Super buscador / lanzador de acciones global (Ctrl+K).
 *
 * Ámbitos cubiertos:
 *  • Notas    — busca por título / tags / tipo
 *  • Sprints  — busca por nombre / estado
 *  • Daily    — busca por fecha
 *  • Bloqueos — busca por título / severidad
 *  • Acciones — crear nota (por tipo), crear sprint, abrir daily
 *  • Navegar  — todas las rutas de la app
 *  • Ordenar / filtrar / modo de agrupación de notas
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store'
import { addNote } from '@/store/slices/notesSlice'
import { setNotesGroupBy, setNotesTypeFilter, setSidebarOpen } from '@/store/slices/uiSlice'
import type { NoteType, NotesGroupBy } from '@/types'
import { NOTE_TYPE_META } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Category =
  | 'note'
  | 'sprint'
  | 'daily'
  | 'impediment'
  | 'action'
  | 'navigate'
  | 'filter'
  | 'sort'

interface Command {
  id: string
  label: string
  subtitle?: string
  category: Category
  icon: JSX.Element
  keywords?: string[]
  badge?: string
  badgeColor?: string
  action: () => void
}

// ─── Category metadata ────────────────────────────────────────────────────────

const CAT_META: Record<Category, { label: string; color: string }> = {
  note: { label: 'Notas', color: '#94a3b8' },
  sprint: { label: 'Sprints', color: '#f472b6' },
  daily: { label: 'Daily', color: '#60a5fa' },
  impediment: { label: 'Bloqueos', color: '#ef4444' },
  action: { label: 'Acciones', color: '#a78bfa' },
  navigate: { label: 'Navegar', color: '#34d399' },
  filter: { label: 'Filtrar', color: '#fb923c' },
  sort: { label: 'Ordenar', color: '#fbbf24' },
}

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

const IcoNote = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
)
const IcoDaily = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const IcoSprint = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)
const IcoImpediment = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)
const IcoGit = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <circle cx="18" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <path d="M6 21V9a9 9 0 009 9" />
  </svg>
)
const IcoSettings = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M20 12h2M2 12h2M12 20v2M12 2v2" />
  </svg>
)
const IcoFilter = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
)
const IcoSort = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
)
const IcoGroup = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
)
const IcoSearch = () => (
  <svg
    width="15"
    height="15"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    viewBox="0 0 24 24"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const IcoMap = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
)
const IcoHistory = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
  </svg>
)
const IcoEvidence = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
  </svg>
)
const IcoTask = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
)
const IcoMeeting = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
)
const IcoTechnical = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
)

const NOTE_ICONS: Record<NoteType, JSX.Element> = {
  note: <IcoNote />,
  daily: <IcoDaily />,
  evidence: <IcoEvidence />,
  technical: <IcoTechnical />,
  meeting: <IcoMeeting />,
  sprint: <IcoSprint />,
  task: <IcoTask />,
  research: <IcoTask />,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function newId() {
  return crypto.randomUUID()
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function score(text: string, q: string): number {
  const t = text.toLowerCase()
  const query = q.toLowerCase()
  if (t === query) return 100
  if (t.startsWith(query)) return 80
  if (t.includes(query)) return 60
  return 0
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const notes = useAppSelector(s => s.notes.notes)
  const sprints = useAppSelector(s => s.daily.sprints)
  const entries = useAppSelector(s => s.daily.entries)
  const impediments = useAppSelector(s => s.impediments.impediments)

  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const q = query.trim().toLowerCase()

  // ── Auto-focus on open ────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  // ── Close on Escape ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // ── Actions ───────────────────────────────────────────────────────────────
  const go = useCallback(
    (path: string) => {
      navigate(path)
      onClose()
    },
    [navigate, onClose]
  )

  const createNote = useCallback(
    (type: NoteType) => {
      const title = `Nueva ${NOTE_TYPE_META[type].label}`
      const id = newId()
      dispatch(
        addNote({
          id,
          title,
          content: `# ${title}\n\n`,
          tags: [],
          noteType: type,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          attachments: [],
        })
      )
      navigate(`/editor/${id}`)
      onClose()
    },
    [dispatch, navigate, onClose]
  )

  // ── Build command list ────────────────────────────────────────────────────
  const commands = useMemo<Command[]>(() => {
    const list: Command[] = []

    // ── Navigation ──────────────────────────────────────────────────────────
    const navItems: Array<{
      id: string
      label: string
      subtitle: string
      icon: JSX.Element
      path: string
      keywords?: string[]
    }> = [
      {
        id: 'nav-notes',
        label: 'Mapa de Notas',
        subtitle: 'Ver todas las notas',
        icon: <IcoMap />,
        path: '/notes-map',
        keywords: ['notas', 'mapa', 'lista'],
      },
      {
        id: 'nav-daily',
        label: 'Daily standup',
        subtitle: 'Registro de hoy',
        icon: <IcoDaily />,
        path: '/daily',
        keywords: ['daily', 'standup', 'hoy'],
      },
      {
        id: 'nav-history',
        label: 'Historial Daily',
        subtitle: 'Calendar de dailys pasados',
        icon: <IcoHistory />,
        path: '/daily/history',
        keywords: ['historial', 'calendario'],
      },
      {
        id: 'nav-sprints',
        label: 'Sprints',
        subtitle: 'Gestión de sprints',
        icon: <IcoSprint />,
        path: '/sprints',
        keywords: ['sprints', 'iteraciones'],
      },
      {
        id: 'nav-impediments',
        label: 'Bloqueos',
        subtitle: 'Impedimentos del equipo',
        icon: <IcoImpediment />,
        path: '/impediments',
        keywords: ['bloqueos', 'impedimentos'],
      },
      {
        id: 'nav-git',
        label: 'Git',
        subtitle: 'Commits y historial git',
        icon: <IcoGit />,
        path: '/git',
        keywords: ['git', 'commits'],
      },
      {
        id: 'nav-settings',
        label: 'Ajustes',
        subtitle: 'Preferencias de la app',
        icon: <IcoSettings />,
        path: '/settings',
        keywords: ['ajustes', 'configuracion', 'settings'],
      },
    ]
    for (const item of navItems) {
      if (!q || score(item.label, q) > 0 || (item.keywords ?? []).some(k => k.includes(q))) {
        list.push({
          id: item.id,
          label: item.label,
          subtitle: item.subtitle,
          category: 'navigate',
          icon: item.icon,
          keywords: item.keywords,
          action: () => go(item.path),
        })
      }
    }

    // ── Actions: crear nota por tipo ─────────────────────────────────────────
    const noteTypes: NoteType[] = [
      'note',
      'evidence',
      'technical',
      'meeting',
      'sprint',
      'task',
      'daily',
    ]
    for (const type of noteTypes) {
      const meta = NOTE_TYPE_META[type]
      const label = `Crear ${meta.label}`
      if (
        !q ||
        label.toLowerCase().includes(q) ||
        type.includes(q) ||
        'crear'.includes(q) ||
        'nueva'.includes(q) ||
        'nuevo'.includes(q)
      ) {
        list.push({
          id: `create-${type}`,
          label,
          subtitle: `Nueva nota de tipo ${meta.label}`,
          category: 'action',
          icon: NOTE_ICONS[type],
          badgeColor: meta.color,
          action: () => createNote(type),
        })
      }
    }

    // ── Actions: daily de hoy ────────────────────────────────────────────────
    const todayEntry = entries.find(e => e.date === todayISO())
    if (!q || 'daily hoy standup hoy'.includes(q)) {
      list.push({
        id: 'action-today-daily',
        label: todayEntry ? 'Abrir Daily de hoy' : 'Crear Daily de hoy',
        subtitle: fmtDate(todayISO()),
        category: 'action',
        icon: <IcoDaily />,
        action: () => go('/daily'),
      })
    }

    // ── Filtrar por tipo ──────────────────────────────────────────────────────
    // Clear filter command
    if (!q || 'limpiar filtro todos tipos'.includes(q)) {
      list.push({
        id: 'filter-clear',
        label: 'Filtrar: Todos los tipos',
        subtitle: 'Quitar filtro de tipo en la barra lateral',
        category: 'filter',
        icon: <IcoFilter />,
        action: () => {
          dispatch(setNotesTypeFilter(null))
          go('/notes-map')
        },
      })
    }
    for (const type of noteTypes) {
      const meta = NOTE_TYPE_META[type]
      const label = `Filtrar: ${meta.label}`
      if (!q || label.toLowerCase().includes(q) || 'filtrar'.includes(q) || type.includes(q)) {
        list.push({
          id: `filter-${type}`,
          label,
          subtitle: `Mostrar solo notas de tipo ${meta.label} en la barra lateral`,
          category: 'filter',
          icon: <IcoFilter />,
          badgeColor: meta.color,
          badge: meta.label,
          action: () => {
            dispatch(setNotesTypeFilter(type))
            dispatch(setSidebarOpen(true))
            go('/notes-map')
          },
        })
      }
    }

    // ── Ordenar notas ─────────────────────────────────────────────────────────
    const sortOptions: Array<{ id: string; label: string; groupBy: NotesGroupBy }> = [
      { id: 'sort-updated', label: 'Ordenar: Más recientes', groupBy: 'none' },
      { id: 'sort-alpha', label: 'Ordenar: A → Z', groupBy: 'alpha' },
    ]
    for (const s of sortOptions) {
      if (!q || s.label.toLowerCase().includes(q) || 'ordenar'.includes(q)) {
        list.push({
          id: s.id,
          label: s.label,
          subtitle: 'Cambia agrupación en la barra lateral',
          category: 'sort',
          icon: <IcoSort />,
          action: () => {
            dispatch(setNotesGroupBy(s.groupBy))
            dispatch(setSidebarOpen(true))
            onClose()
          },
        })
      }
    }

    // ── Agrupar notas ─────────────────────────────────────────────────────────
    const groupOptions: Array<{ id: string; label: string; groupBy: NotesGroupBy }> = [
      { id: 'group-none', label: 'Agrupar: Sin agrupación', groupBy: 'none' },
      { id: 'group-type', label: 'Agrupar: Por tipo', groupBy: 'type' },
      { id: 'group-tag', label: 'Agrupar: Por etiqueta', groupBy: 'tag' },
      { id: 'group-sprint', label: 'Agrupar: Por sprint', groupBy: 'sprint' },
      { id: 'group-alpha', label: 'Agrupar: Alfabético', groupBy: 'alpha' },
    ]
    for (const g of groupOptions) {
      if (!q || g.label.toLowerCase().includes(q) || 'agrupar'.includes(q)) {
        list.push({
          id: g.id,
          label: g.label,
          subtitle: 'Cambia agrupación en la barra lateral',
          category: 'filter',
          icon: <IcoGroup />,
          action: () => {
            dispatch(setNotesGroupBy(g.groupBy))
            dispatch(setSidebarOpen(true))
            onClose()
          },
        })
      }
    }

    // ── Buscar notas ──────────────────────────────────────────────────────────
    if (q) {
      const matched = notes
        .map(n => ({
          n,
          s: Math.max(
            score(n.title, q),
            n.tags.some(t => t.toLowerCase().includes(q)) ? 50 : 0,
            n.noteType.includes(q) ? 40 : 0,
            NOTE_TYPE_META[n.noteType].label.toLowerCase().includes(q) ? 40 : 0
          ),
        }))
        .filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 8)

      for (const { n } of matched) {
        list.push({
          id: `note-${n.id}`,
          label: n.title,
          subtitle: [NOTE_TYPE_META[n.noteType].label, n.tags.slice(0, 2).join(', ')]
            .filter(Boolean)
            .join(' · '),
          category: 'note',
          icon: NOTE_ICONS[n.noteType],
          badgeColor: NOTE_TYPE_META[n.noteType].color,
          badge: NOTE_TYPE_META[n.noteType].label,
          action: () => go(`/editor/${n.id}`),
        })
      }
    }

    // ── Buscar sprints ────────────────────────────────────────────────────────
    if (q) {
      const matched = sprints
        .filter(s => s.name.toLowerCase().includes(q) || (s.goal ?? '').toLowerCase().includes(q))
        .slice(0, 5)
      for (const s of matched) {
        list.push({
          id: `sprint-${s.id}`,
          label: s.name,
          subtitle: [s.goal, s.status].filter(Boolean).join(' · '),
          category: 'sprint',
          icon: <IcoSprint />,
          badge: s.status ?? 'sprint',
          badgeColor:
            s.status === 'active' ? '#34d399' : s.status === 'completed' ? '#a78bfa' : '#60a5fa',
          action: () => go('/sprints'),
        })
      }
    }

    // ── Buscar daily entries ──────────────────────────────────────────────────
    if (q) {
      const matched = entries
        .filter(
          e =>
            e.date.includes(q) ||
            e.did.some(d => d.toLowerCase().includes(q)) ||
            e.will.some(w => w.toLowerCase().includes(q)) ||
            e.blocked.some(b => b.toLowerCase().includes(q))
        )
        .slice(0, 5)
      for (const e of matched) {
        list.push({
          id: `daily-${e.id}`,
          label: `Daily ${fmtDate(e.date)}`,
          subtitle: e.did.slice(0, 1).join('') || e.date,
          category: 'daily',
          icon: <IcoDaily />,
          action: () => go(`/daily/${e.date}`),
        })
      }
    }

    // ── Buscar impedimentos ───────────────────────────────────────────────────
    if (q) {
      const matched = impediments
        .filter(
          i =>
            i.title.toLowerCase().includes(q) ||
            (i.description ?? '').toLowerCase().includes(q) ||
            i.severity.includes(q) ||
            i.status.includes(q)
        )
        .slice(0, 5)
      for (const i of matched) {
        list.push({
          id: `imp-${i.id}`,
          label: i.title,
          subtitle: `${i.severity} · ${i.status}`,
          category: 'impediment',
          icon: <IcoImpediment />,
          badge: i.severity,
          badgeColor:
            i.severity === 'critical'
              ? '#ef4444'
              : i.severity === 'high'
                ? '#f97316'
                : i.severity === 'medium'
                  ? '#fbbf24'
                  : '#34d399',
          action: () => go('/impediments'),
        })
      }
    }

    return list
  }, [q, notes, sprints, entries, impediments, go, createNote, dispatch])

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, commands.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commands[activeIdx]?.action()
    }
  }

  // ── Scroll active item into view ──────────────────────────────────────────
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  // ── Group commands by category ─────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<Category, Command[]>()
    for (const cmd of commands) {
      if (!map.has(cmd.category)) map.set(cmd.category, [])
      map.get(cmd.category)!.push(cmd)
    }
    return map
  }, [commands])

  // ── Build flat index map (for active highlighting) ────────────────────────
  const flatCommands = commands

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="cp-backdrop" onClick={onClose} />

      {/* Dialog */}
      <div className="cp-dialog" role="dialog" aria-modal="true" aria-label="Paleta de comandos">
        {/* Search input */}
        <div className="cp-input-wrap">
          <span className="cp-input-icon">
            <IcoSearch />
          </span>
          <input
            ref={inputRef}
            className="cp-input"
            type="text"
            placeholder="Buscar notas, acciones, rutas, sprints…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button className="cp-clear" onClick={() => setQuery('')} aria-label="Limpiar">
              <svg
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          <kbd className="cp-esc-kbd">Esc</kbd>
        </div>

        {/* Results */}
        <div className="cp-list" ref={listRef}>
          {commands.length === 0 && (
            <div className="cp-empty">
              <IcoSearch />
              <span>Sin resultados para &ldquo;{query}&rdquo;</span>
            </div>
          )}

          {Array.from(grouped.entries()).map(([cat, cmds]) => {
            const meta = CAT_META[cat]
            return (
              <div key={cat} className="cp-group">
                <div className="cp-group-label" style={{ color: meta.color }}>
                  {meta.label}
                </div>
                {cmds.map(cmd => {
                  const idx = flatCommands.indexOf(cmd)
                  const isActive = idx === activeIdx
                  return (
                    <button
                      key={cmd.id}
                      data-idx={idx}
                      className={`cp-item${isActive ? ' cp-item--active' : ''}`}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={cmd.action}
                      tabIndex={-1}
                    >
                      <span className="cp-item-icon" style={{ color: meta.color }}>
                        {cmd.icon}
                      </span>
                      <span className="cp-item-body">
                        <span className="cp-item-label">{cmd.label}</span>
                        {cmd.subtitle && <span className="cp-item-sub">{cmd.subtitle}</span>}
                      </span>
                      {cmd.badge && (
                        <span
                          className="cp-item-badge"
                          style={{
                            color: cmd.badgeColor,
                            borderColor: cmd.badgeColor + '44',
                            background: cmd.badgeColor + '18',
                          }}
                        >
                          {cmd.badge}
                        </span>
                      )}
                      {isActive && (
                        <span className="cp-item-enter">
                          <svg
                            width="11"
                            height="11"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <polyline points="9 10 4 15 9 20" />
                            <path d="M20 4v7a4 4 0 01-4 4H4" />
                          </svg>
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Footer hints */}
        <div className="cp-footer">
          <span>
            <kbd>↑↓</kbd> navegar
          </span>
          <span>
            <kbd>Enter</kbd> ejecutar
          </span>
          <span>
            <kbd>Esc</kbd> cerrar
          </span>
          <span className="cp-footer-tip">
            <kbd>Ctrl</kbd>+<kbd>K</kbd> re-abrir
          </span>
          <span className="cp-footer-count">
            {commands.length} resultado{commands.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </>
  )
}
