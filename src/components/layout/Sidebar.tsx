import type { JSX } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/store'
import AgilensLogo from '@/components/layout/AgilensLogo'
import {
  toggleSidebar,
  setSidebarOpen,
  setSidebarWidth,
  setSidebarAutoHide,
  setNotesGroupBy,
  setNotesTypeFilter,
  setAutoOrganizeMode,
} from '@/store/slices/uiSlice'
import { addNote, deleteNote, bulkSetNoteFolders } from '@/store/slices/notesSlice'
import { setActiveNoteId } from '@/store/slices/uiSlice'
import type { Note, NoteType, NotesGroupBy, AutoOrganizeMode } from '@/types'
import { NOTE_TYPE_META } from '@/types'
import { nanoid } from 'nanoid'
import { useEffect, useRef, useState } from 'react'
import { expandTemplate } from '@/store/slices/templatesSlice'
import { NOTE_TYPE_ICONS } from '@/lib/noteIcons'
import FolderTree from '@/components/notes/FolderTree'
import { autoOrganize, buildAutoFolders } from '@/store/slices/foldersSlice'

const IconNotes = () => (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
)
const IconDaily = () => (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const IconGit = () => (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <line x1="6" y1="3" x2="6" y2="15" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 01-9 9" />
  </svg>
)
const IconSettings = () => (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
)
const IconSprints = () => (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <polyline points="13 17 18 12 13 7" />
    <polyline points="6 17 11 12 6 7" />
  </svg>
)
const IconKanban = () => (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <rect x="3" y="3" width="5" height="18" rx="1" />
    <rect x="10" y="3" width="5" height="12" rx="1" />
    <rect x="17" y="3" width="5" height="15" rx="1" />
  </svg>
)
const IconImpediments = () => (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)
const IconPlus = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    viewBox="0 0 24 24"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const IconChevronLeft = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)
const IconChevronRight = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

// ─── GroupBy icon components ──────────────────────────────────────────────────
const IconGroupNone = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
)
const IconGroupType = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)
const IconGroupTag = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
)
const IconGroupSprint = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="13 17 18 12 13 7" />
    <polyline points="6 17 11 12 6 7" />
  </svg>
)
const IconGroupAlpha = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
)

const IconProjects = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
)

const NAV_ITEMS = [
  { to: '/notes-map', label: 'Notas', Icon: IconNotes },
  { to: '/daily', label: 'Daily', Icon: IconDaily },
  { to: '/projects', label: 'Proyectos', Icon: IconProjects },
  { to: '/sprints', label: 'Sprints', Icon: IconSprints },
  { to: '/kanban', label: 'Kanban', Icon: IconKanban },
  { to: '/impediments', label: 'Bloqueos', Icon: IconImpediments },
  { to: '/git', label: 'Git', Icon: IconGit },
  { to: '/settings', label: 'Ajustes', Icon: IconSettings },
]

type GroupBy = NotesGroupBy

const GROUP_BY_OPTIONS: { value: GroupBy; Icon: () => JSX.Element; title: string }[] = [
  { value: 'none', Icon: IconGroupNone, title: 'Sin agrupar (recientes)' },
  { value: 'type', Icon: IconGroupType, title: 'Por tipo de nota' },
  { value: 'tag', Icon: IconGroupTag, title: 'Por etiqueta' },
  { value: 'sprint', Icon: IconGroupSprint, title: 'Por sprint' },
  { value: 'alpha', Icon: IconGroupAlpha, title: 'Alfabético' },
]

const W_CLOSED = 52
// ─── Pin icon ─────────────────────────────────────────────────────────────────
const IconPin = ({ active }: { active: boolean }) => (
  <svg
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17" />
    {active && <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="1.8" />}
  </svg>
)

export default function Sidebar() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const isOpen = useAppSelector(s => s.ui.sidebarOpen)
  const sidebarWidth = useAppSelector(s => s.ui.sidebarWidth)
  const sidebarAutoHide = useAppSelector(s => s.ui.sidebarAutoHide)
  const notes = useAppSelector(s => s.notes.notes)
  const activeNoteId = useAppSelector(s => s.ui.activeNoteId)
  const sprints = useAppSelector(s => s.daily.sprints)
  const groupBy = useAppSelector(s => s.ui.notesGroupBy)
  const notesTypeFilter = useAppSelector(s => s.ui.notesTypeFilter)
  const autoOrganizeMode = useAppSelector(s => s.ui.autoOrganizeMode)
  const folders = useAppSelector(s => s.folders.folders)
  const [isMobile, setIsMobile] = useState(false)
  const [query, setQuery] = useState('')
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null)
  const [showTypeMenu, setShowTypeMenu] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  function handleSetAutoOrganize(mode: AutoOrganizeMode) {
    dispatch(setAutoOrganizeMode(mode))
    if (mode !== 'off') {
      const { assignments } = buildAutoFolders(folders, notes, sprints, mode)
      dispatch(autoOrganize({ notes, sprints, mode }))
      dispatch(bulkSetNoteFolders(assignments))
    }
  }
  const [sidebarTab, setSidebarTab] = useState<'list' | 'folders'>('folders')
  // ── Resize drag ────────────────────────────────────────────────────────────
  const resizingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  // ── Auto-hide float state ──────────────────────────────────────────────────
  const [floatOpen, setFloatOpen] = useState(false)
  const floatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Effective open: when auto-hide mode, driven by hover; otherwise by Redux
  const effectiveOpen = sidebarAutoHide ? floatOpen : isOpen

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
      if (e.matches) dispatch(setSidebarOpen(false))
    }
    setIsMobile(mq.matches)
    if (mq.matches) dispatch(setSidebarOpen(false))
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [dispatch])

  // ── Resize drag handlers ───────────────────────────────────────────────────
  function startResize(e: React.MouseEvent) {
    resizingRef.current = true
    startXRef.current = e.clientX
    startWidthRef.current = sidebarWidth
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return
      const delta = ev.clientX - startXRef.current
      const clamped = Math.min(520, Math.max(180, startWidthRef.current + delta))
      dispatch(setSidebarWidth(clamped))
    }
    const onUp = () => {
      resizingRef.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    e.preventDefault()
  }

  // ── Auto-hide hover handlers ────────────────────────────────────────────
  function handleSidebarEnter() {
    if (!sidebarAutoHide) return
    if (floatTimerRef.current) clearTimeout(floatTimerRef.current)
    setFloatOpen(true)
  }
  function handleSidebarLeave() {
    if (!sidebarAutoHide) return
    floatTimerRef.current = setTimeout(() => setFloatOpen(false), 350)
  }
  function toggleAutoHide() {
    const next = !sidebarAutoHide
    dispatch(setSidebarAutoHide(next))
    if (next) {
      // entering auto-hide: ensure float tracks current open state
      setFloatOpen(isOpen)
    } else {
      // leaving auto-hide: sync Redux open to float state
      dispatch(setSidebarOpen(floatOpen))
    }
  }

  const defaultTemplateId = useAppSelector(s => s.templates.defaultTemplateId)
  const allTemplates = useAppSelector(s => s.templates.templates)

  function createNoteOfType(type: NoteType) {
    const tpl =
      allTemplates.find(t => t.type === type && t.id === defaultTemplateId) ??
      allTemplates.find(t => t.type === type) ??
      allTemplates[0]
    const now = new Date().toISOString()
    const label = NOTE_TYPE_META[type]?.label ?? 'Nota'
    const title = `${label} ${new Date().toLocaleDateString('es', { day: '2-digit', month: 'short' })}`
    const content = tpl ? expandTemplate(tpl.content, title) : `# ${title}\n\n`
    const note: Note = {
      id: nanoid(),
      title,
      content,
      tags: [],
      attachments: [],
      createdAt: now,
      updatedAt: now,
      noteType: type,
      templateId: tpl?.id,
    }
    dispatch(addNote(note))
    dispatch(setActiveNoteId(note.id))
    navigate(`/editor/${note.id}`)
  }

  function handleNewNote() {
    createNoteOfType('note')
  }

  function handleDelete(n: Note) {
    if (deleteConfirmId === n.id) {
      dispatch(deleteNote(n.id))
      if (activeNoteId === n.id) {
        dispatch(setActiveNoteId(null))
        navigate('/editor')
      }
      setDeleteConfirmId(null)
      setHoveredNoteId(null)
    } else {
      setDeleteConfirmId(n.id)
    }
  }

  function handleDuplicate(n: Note) {
    const now = new Date().toISOString()
    const copy: Note = {
      ...n,
      id: nanoid(),
      title: n.title + ' (copia)',
      content: n.content.replace(/^(#+ .+)/m, m => m + ' (copia)'),
      createdAt: now,
      updatedAt: now,
      commitHash: undefined,
    }
    dispatch(addNote(copy))
    dispatch(setActiveNoteId(copy.id))
    navigate(`/editor/${copy.id}`)
  }

  return (
    <>
      {/* No modal needed — type picker is now inline */}

      {/* Mobile backdrop */}
      {isMobile && isOpen && (
        <div
          onClick={() => dispatch(setSidebarOpen(false))}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 19,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}
      <motion.aside
        animate={{
          width: isMobile
            ? isOpen
              ? sidebarWidth
              : 0
            : sidebarAutoHide
              ? floatOpen
                ? sidebarWidth
                : W_CLOSED
              : isOpen
                ? sidebarWidth
                : W_CLOSED,
          x: isMobile && !isOpen ? -sidebarWidth : 0,
        }}
        transition={{ duration: 0.18, ease: 'easeInOut' }}
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: 'calc(100dvh - var(--statusbar-h))',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--border-1)',
          background: 'var(--bg-1)',
          zIndex: sidebarAutoHide && floatOpen ? 25 : 20,
          overflow: 'hidden',
          boxShadow:
            (isMobile && isOpen) || (sidebarAutoHide && floatOpen) ? 'var(--shadow-lg)' : 'none',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 10px',
            height: '44px',
            borderBottom: '1px solid var(--border-1)',
            flexShrink: 0,
          }}
        >
          <AnimatePresence initial={false}>
            {effectiveOpen ? (
              <motion.div
                key="logo-open"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <AgilensLogo size={24} showWordmark variant="color" />
              </motion.div>
            ) : (
              <motion.div
                key="logo-icon"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <AgilensLogo size={24} variant="color" />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {effectiveOpen && (
              <motion.button
                key="pin-btn"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.1 }}
                onClick={toggleAutoHide}
                title={
                  sidebarAutoHide
                    ? 'Fijar panel (modo normal)'
                    : 'Ocultar panel automáticamente (hover)'
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '26px',
                  height: '26px',
                  borderRadius: '4px',
                  border: 'none',
                  background: sidebarAutoHide ? 'var(--accent-glow)' : 'transparent',
                  color: sidebarAutoHide ? 'var(--accent-400)' : 'var(--text-2)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  marginLeft: '4px',
                  transition: 'color var(--transition-fast), background var(--transition-fast)',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.color = 'var(--text-0)'
                  el.style.background = 'var(--bg-3)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.color = sidebarAutoHide ? 'var(--accent-400)' : 'var(--text-2)'
                  el.style.background = sidebarAutoHide ? 'var(--accent-glow)' : 'transparent'
                }}
              >
                <IconPin active={!sidebarAutoHide} />
              </motion.button>
            )}
          </AnimatePresence>
          <button
            onClick={() => dispatch(toggleSidebar())}
            aria-label="Toggle sidebar"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: '4px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-2)',
              cursor: 'pointer',
              flexShrink: 0,
              marginLeft: 'auto',
              transition: 'color var(--transition-fast), background var(--transition-fast)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.color = 'var(--text-0)'
              el.style.background = 'var(--bg-3)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.color = 'var(--text-2)'
              el.style.background = 'transparent'
            }}
          >
            {isOpen ? <IconChevronLeft /> : <IconChevronRight />}
          </button>
        </div>

        {/* New note button — split: quick create + type picker */}
        <div style={{ padding: '8px 8px 0', flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              border: '1px solid var(--accent-500)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
            }}
          >
            {/* Primary button */}
            <button
              onClick={handleNewNote}
              title="Nueva nota"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: effectiveOpen ? 'flex-start' : 'center',
                gap: '6px',
                padding: effectiveOpen ? '7px 10px' : '7px',
                border: 'none',
                background: 'var(--accent-600)',
                color: '#fff',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.01em',
                transition: 'background var(--transition-fast)',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.background = 'var(--accent-500)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.background = 'var(--accent-600)'
              }}
            >
              <IconPlus />
              <AnimatePresence initial={false}>
                {effectiveOpen && (
                  <motion.span
                    key="new-label"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.1 }}
                    style={{ overflow: 'hidden', display: 'block' }}
                  >
                    Nueva nota
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Dropdown chevron — opens type picker */}
            <AnimatePresence initial={false}>
              {effectiveOpen && (
                <motion.button
                  key="type-chevron"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: '26px' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => setShowTypeMenu(p => !p)}
                  title="Elegir tipo de nota"
                  style={{
                    flexShrink: 0,
                    width: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderLeft: '1px solid rgba(255,255,255,0.18)',
                    borderTop: 'none',
                    borderRight: 'none',
                    borderBottom: 'none',
                    background: showTypeMenu ? 'var(--accent-700)' : 'var(--accent-600)',
                    color: 'rgba(255,255,255,0.85)',
                    cursor: 'pointer',
                    transition: 'background var(--transition-fast)',
                    padding: 0,
                    fontSize: '10px',
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--accent-500)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.background = showTypeMenu
                      ? 'var(--accent-700)'
                      : 'var(--accent-600)'
                  }}
                >
                  <svg
                    width="10"
                    height="10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    viewBox="0 0 24 24"
                    style={{
                      transform: showTypeMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s',
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Inline type picker grid */}
          <AnimatePresence>
            {showTypeMenu && effectiveOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                style={{
                  marginTop: '5px',
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border-2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '6px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '4px',
                }}
              >
                {(
                  [
                    'note',
                    'evidence',
                    'technical',
                    'meeting',
                    'sprint',
                    'task',
                    'daily',
                  ] as NoteType[]
                ).map(type => {
                  const meta = NOTE_TYPE_META[type]
                  const TypeIcon = NOTE_TYPE_ICONS[type]
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        createNoteOfType(type)
                        setShowTypeMenu(false)
                      }}
                      title={meta.label}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 4px',
                        border: '1px solid var(--border-1)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-1)',
                        color: 'var(--text-2)',
                        cursor: 'pointer',
                        fontSize: '9px',
                        fontFamily: 'var(--font-ui)',
                        transition: 'all 0.1s',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.background = 'var(--bg-3)'
                        el.style.borderColor = meta.color
                        el.style.color = meta.color
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.background = 'var(--bg-1)'
                        el.style.borderColor = 'var(--border-1)'
                        el.style.color = 'var(--text-2)'
                      }}
                    >
                      <span style={{ color: meta.color, display: 'flex' }}>
                        <TypeIcon />
                      </span>
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                        }}
                      >
                        {meta.label}
                      </span>
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search — visible only when open */}
        <AnimatePresence initial={false}>
          {effectiveOpen && (
            <motion.div
              key="search"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.12 }}
              style={{ padding: '0 8px 6px', overflow: 'hidden' }}
            >
              <div style={{ position: 'relative' }}>
                <svg
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  style={{
                    position: 'absolute',
                    left: '9px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-3)',
                    pointerEvents: 'none',
                  }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar notas…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="input-base"
                  style={{
                    paddingLeft: '26px',
                    paddingRight: query ? '28px' : '8px',
                    fontSize: '12px',
                    width: '100%',
                  }}
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    title="Borrar búsqueda"
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-3)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '3px',
                      lineHeight: 1,
                    }}
                    onMouseEnter={e => {
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--text-0)'
                    }}
                    onMouseLeave={e => {
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
                    }}
                  >
                    <svg
                      width="11"
                      height="11"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <nav style={{ padding: '4px 8px', flexShrink: 0 }}>
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} title={label} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    padding: '7px 8px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '2px',
                    background: isActive ? 'var(--accent-glow)' : 'transparent',
                    color: isActive ? 'var(--accent-400)' : 'var(--text-2)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    borderLeft: isActive ? '2px solid var(--accent-600)' : '2px solid transparent',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = 'var(--bg-3)'
                      el.style.color = 'var(--text-0)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = 'transparent'
                      el.style.color = 'var(--text-2)'
                    }
                  }}
                >
                  <span style={{ flexShrink: 0, display: 'flex' }}>
                    <Icon />
                  </span>
                  <AnimatePresence initial={false}>
                    {effectiveOpen && (
                      <motion.span
                        key={to + '-label'}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                        style={{
                          fontFamily: 'var(--font-ui)',
                          fontSize: '13px',
                          fontWeight: 500,
                          overflow: 'hidden',
                          display: 'block',
                        }}
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Recent / filtered notes */}
        <AnimatePresence initial={false}>
          {effectiveOpen && (
            <motion.div
              key="notes-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              {/* Auto-organize mode selector — always visible */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '4px 8px',
                  borderBottom: '1px solid var(--border-1)',
                  flexShrink: 0,
                  background: autoOrganizeMode !== 'off' ? 'var(--accent-glow)' : 'transparent',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    color: autoOrganizeMode !== 'off' ? 'var(--accent-400)' : 'var(--text-3)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    paddingRight: '4px',
                    flexShrink: 0,
                    fontWeight: autoOrganizeMode !== 'off' ? 700 : 400,
                  }}
                >
                  Auto
                </span>
                {[
                  { value: 'off' as AutoOrganizeMode, label: '—', title: 'Sin auto-organizar' },
                  {
                    value: 'type' as AutoOrganizeMode,
                    label: 'tipo',
                    title: 'Organizar por tipo automáticamente',
                  },
                  {
                    value: 'sprint' as AutoOrganizeMode,
                    label: 'sprint',
                    title: 'Organizar por sprint automáticamente',
                  },
                  {
                    value: 'both' as AutoOrganizeMode,
                    label: 'ambos',
                    title: 'Organizar por tipo y sprint',
                  },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleSetAutoOrganize(opt.value)}
                    title={opt.title}
                    style={{
                      padding: '3px 7px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background:
                        autoOrganizeMode === opt.value ? 'var(--accent-500)' : 'transparent',
                      color: autoOrganizeMode === opt.value ? '#fff' : 'var(--text-3)',
                      fontSize: '10px',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: autoOrganizeMode === opt.value ? 600 : 400,
                      transition: 'all 0.1s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Tab switcher: Lista | Carpetas */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border-1)',
                  flexShrink: 0,
                  padding: '0 8px',
                  gap: '2px',
                }}
              >
                {(['list', 'folders'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSidebarTab(tab)}
                    style={{
                      padding: '5px 10px',
                      border: 'none',
                      background: 'transparent',
                      color: sidebarTab === tab ? 'var(--accent-400)' : 'var(--text-3)',
                      borderBottom:
                        sidebarTab === tab
                          ? '2px solid var(--accent-500)'
                          : '2px solid transparent',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: sidebarTab === tab ? 600 : 400,
                      transition: 'all var(--transition-fast)',
                      whiteSpace: 'nowrap',
                      marginBottom: '-1px',
                    }}
                  >
                    {tab === 'list' ? 'Lista' : 'Carpetas'}
                  </button>
                ))}
              </div>

              {/* ── Lista tab ─────────────────────────────── */}
              {sidebarTab === 'list' && (
                <>
                  {/* GroupBy selector */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '4px 8px',
                      borderBottom: '1px solid var(--border-1)',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        color: 'var(--text-3)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        paddingRight: '4px',
                        flexShrink: 0,
                      }}
                    >
                      Grup.
                    </span>
                    {GROUP_BY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => dispatch(setNotesGroupBy(opt.value))}
                        title={opt.title}
                        style={{
                          padding: '4px 6px',
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          background: groupBy === opt.value ? 'var(--accent-glow)' : 'transparent',
                          color: groupBy === opt.value ? 'var(--accent-400)' : 'var(--text-3)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.1s',
                        }}
                      >
                        <opt.Icon />
                      </button>
                    ))}
                  </div>

                  {/* Active type filter badge */}
                  {notesTypeFilter && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 8px',
                        background: 'var(--accent-glow)',
                        borderBottom: '1px solid var(--border-1)',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: '10px', color: 'var(--accent-400)', flex: 1 }}>
                        Tipo:{' '}
                        {NOTE_TYPE_META[notesTypeFilter as NoteType]?.label ?? notesTypeFilter}
                      </span>
                      <button
                        onClick={() => dispatch(setNotesTypeFilter(null))}
                        title="Quitar filtro"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--accent-400)',
                          padding: '1px 3px',
                          fontSize: '11px',
                          lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Notes list */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 8px' }}>
                    {(() => {
                      const q = query.toLowerCase().trim()

                      // Apply type filter from command palette
                      const typeFiltered = notesTypeFilter
                        ? notes.filter(n => n.noteType === notesTypeFilter)
                        : notes

                      // Apply search filter, then sort: pinned notes first
                      const searched = (
                        q
                          ? typeFiltered.filter(
                              n =>
                                n.title.toLowerCase().includes(q) ||
                                n.content.toLowerCase().includes(q) ||
                                n.tags.some(t => t.toLowerCase().includes(q)) ||
                                (n.noteType && n.noteType.toLowerCase().includes(q))
                            )
                          : typeFiltered
                      ).sort((a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false))

                      // Build groups
                      type Group = { key: string; label: string; icon?: string; notes: Note[] }
                      let groups: Group[] = []

                      if (q || groupBy === 'none') {
                        groups = [
                          {
                            key: 'all',
                            label: q
                              ? `${searched.length} resultado${searched.length !== 1 ? 's' : ''}`
                              : 'Recientes',
                            notes: q ? searched : searched.slice(0, 30),
                          },
                        ]
                      } else if (groupBy === 'type') {
                        const typeOrder: NoteType[] = [
                          'note',
                          'daily',
                          'evidence',
                          'technical',
                          'meeting',
                          'sprint',
                          'task',
                        ]
                        groups = typeOrder
                          .map(type => ({
                            key: type,
                            label: NOTE_TYPE_META[type].label,
                            icon: NOTE_TYPE_META[type].icon,
                            notes: searched.filter(n => (n.noteType ?? 'note') === type),
                          }))
                          .filter(g => g.notes.length > 0)
                      } else if (groupBy === 'tag') {
                        const allTags = Array.from(new Set(searched.flatMap(n => n.tags))).sort()
                        const untagged = searched.filter(n => n.tags.length === 0)
                        groups = [
                          ...allTags.map(tag => ({
                            key: tag,
                            label: `#${tag}`,
                            notes: searched.filter(n => n.tags.includes(tag)),
                          })),
                          ...(untagged.length > 0
                            ? [{ key: '__untagged__', label: 'Sin etiqueta', notes: untagged }]
                            : []),
                        ]
                      } else if (groupBy === 'sprint') {
                        groups = [
                          ...sprints.map(sp => ({
                            key: sp.id,
                            label: sp.name,
                            icon: '🏃',
                            notes: searched.filter(n => n.sprintId === sp.id),
                          })),
                          {
                            key: '__no-sprint__',
                            label: 'Sin sprint',
                            notes: searched.filter(n => !n.sprintId),
                          },
                        ].filter(g => g.notes.length > 0)
                      } else if (groupBy === 'alpha') {
                        const letters = Array.from(
                          new Set(searched.map(n => (n.title?.[0] ?? '#').toUpperCase()))
                        ).sort()
                        groups = letters.map(letter => ({
                          key: letter,
                          label: letter,
                          notes: searched.filter(
                            n => (n.title?.[0] ?? '#').toUpperCase() === letter
                          ),
                        }))
                      }

                      if (groups.every(g => g.notes.length === 0) && searched.length === 0) {
                        return (
                          <p style={{ fontSize: '12px', color: 'var(--text-3)', padding: '8px' }}>
                            {q ? 'Sin resultados' : 'Aún no hay notas. ¡Crea la primera!'}
                          </p>
                        )
                      }

                      return groups.map(group => (
                        <div key={group.key}>
                          {/* Group header */}
                          <p
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              color: 'var(--text-3)',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              padding: '8px 8px 3px',
                              margin: 0,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {groupBy === 'type' &&
                              (() => {
                                const TypeIcon = NOTE_TYPE_ICONS[group.key as NoteType]
                                return TypeIcon ? (
                                  <span style={{ display: 'flex', color: 'var(--text-3)' }}>
                                    <TypeIcon />
                                  </span>
                                ) : null
                              })()}
                            {group.label}
                            <span style={{ marginLeft: 'auto', opacity: 0.5 }}>
                              {group.notes.length}
                            </span>
                          </p>

                          {/* Note items */}
                          {group.notes.map(n => {
                            const typeMeta = NOTE_TYPE_META[n.noteType as NoteType]
                            const TypeIcon = NOTE_TYPE_ICONS[n.noteType as NoteType]
                            const isDelConfirm = deleteConfirmId === n.id
                            return (
                              <div
                                key={n.id}
                                style={{ position: 'relative' }}
                                onMouseEnter={() => {
                                  setHoveredNoteId(n.id)
                                }}
                                onMouseLeave={() => {
                                  setHoveredNoteId(null)
                                  // cancel pending delete confirm if mouse leaves
                                  if (deleteConfirmId === n.id) setDeleteConfirmId(null)
                                }}
                              >
                                <NavLink to={`/editor/${n.id}`} style={{ textDecoration: 'none' }}>
                                  {({ isActive }) => (
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '5px 8px',
                                        paddingRight: hoveredNoteId === n.id ? '60px' : '8px',
                                        borderRadius: 'var(--radius-md)',
                                        marginBottom: '1px',
                                        fontFamily: 'var(--font-ui)',
                                        fontSize: '12px',
                                        color: isActive ? 'var(--accent-400)' : 'var(--text-1)',
                                        background: isActive
                                          ? 'var(--accent-glow)'
                                          : hoveredNoteId === n.id
                                            ? 'var(--bg-3)'
                                            : 'transparent',
                                        cursor: 'pointer',
                                        transition: 'all var(--transition-fast)',
                                        borderLeft: `2px solid ${
                                          isActive
                                            ? 'var(--accent-500)'
                                            : (n.color ?? typeMeta?.color ?? 'transparent')
                                        }`,
                                        outline:
                                          n.pinned && !isActive
                                            ? '1px solid rgba(251,191,36,0.35)'
                                            : undefined,
                                      }}
                                    >
                                      {/* Type icon */}
                                      {TypeIcon && groupBy !== 'type' && (
                                        <span
                                          style={{
                                            display: 'flex',
                                            flexShrink: 0,
                                            color: typeMeta?.color ?? 'var(--text-3)',
                                            opacity: isActive ? 1 : 0.75,
                                          }}
                                        >
                                          <TypeIcon />
                                        </span>
                                      )}

                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                          style={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            fontWeight: isActive ? 600 : n.pinned ? 500 : 400,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                          }}
                                        >
                                          <span
                                            style={{
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              whiteSpace: 'nowrap',
                                              flex: 1,
                                            }}
                                          >
                                            {n.title || 'Sin título'}
                                          </span>
                                          {n.pinned && (
                                            <svg
                                              width="9"
                                              height="9"
                                              viewBox="0 0 24 24"
                                              fill="rgba(251,191,36,0.9)"
                                              style={{ flexShrink: 0 }}
                                            >
                                              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                                            </svg>
                                          )}
                                          {n.locked && (
                                            <svg
                                              width="9"
                                              height="9"
                                              viewBox="0 0 24 24"
                                              fill="rgba(239,68,68,0.8)"
                                              style={{ flexShrink: 0 }}
                                            >
                                              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                                            </svg>
                                          )}
                                        </div>
                                        {n.tags.length > 0 && (
                                          <div
                                            style={{
                                              display: 'flex',
                                              gap: '3px',
                                              marginTop: '2px',
                                              flexWrap: 'wrap',
                                            }}
                                          >
                                            {n.tags.slice(0, 3).map(t => (
                                              <button
                                                key={t}
                                                onClick={e => {
                                                  e.preventDefault()
                                                  e.stopPropagation()
                                                  setQuery(t)
                                                }}
                                                title={`Filtrar por #${t}`}
                                                style={{
                                                  fontSize: '9px',
                                                  padding: '1px 5px',
                                                  borderRadius: '3px',
                                                  background: 'var(--accent-glow)',
                                                  color: 'var(--accent-400)',
                                                  fontFamily: 'var(--font-mono)',
                                                  border: 'none',
                                                  cursor: 'pointer',
                                                }}
                                              >
                                                #{t}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </NavLink>

                                {/* Action buttons on hover */}
                                {hoveredNoteId === n.id && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: '50%',
                                      right: '4px',
                                      transform: 'translateY(-50%)',
                                      display: 'flex',
                                      gap: '2px',
                                      zIndex: 1,
                                    }}
                                  >
                                    {/* Duplicate */}
                                    <button
                                      title="Duplicar nota"
                                      onClick={e => {
                                        e.preventDefault()
                                        handleDuplicate(n)
                                      }}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '26px',
                                        height: '26px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border-2)',
                                        background: 'var(--bg-2)',
                                        color: 'var(--text-2)',
                                        cursor: 'pointer',
                                      }}
                                      onMouseEnter={e => {
                                        const el = e.currentTarget as HTMLElement
                                        el.style.background = 'var(--bg-3)'
                                        el.style.color = 'var(--text-0)'
                                      }}
                                      onMouseLeave={e => {
                                        const el = e.currentTarget as HTMLElement
                                        el.style.background = 'var(--bg-2)'
                                        el.style.color = 'var(--text-2)'
                                      }}
                                    >
                                      <svg
                                        width="11"
                                        height="11"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        viewBox="0 0 24 24"
                                      >
                                        <rect x="9" y="9" width="13" height="13" rx="2" />
                                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                      </svg>
                                    </button>

                                    {/* Delete — 1st click shows confirm, 2nd click deletes */}
                                    <button
                                      title={
                                        isDelConfirm
                                          ? '¿Confirmar eliminación? Clic de nuevo para borrar'
                                          : 'Eliminar nota'
                                      }
                                      onClick={e => {
                                        e.preventDefault()
                                        handleDelete(n)
                                      }}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: isDelConfirm ? '52px' : '26px',
                                        height: '26px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: `1px solid ${
                                          isDelConfirm ? 'rgba(239,68,68,0.6)' : 'var(--border-2)'
                                        }`,
                                        background: isDelConfirm
                                          ? 'rgba(239,68,68,0.15)'
                                          : 'var(--bg-2)',
                                        color: isDelConfirm ? '#ef4444' : 'var(--text-2)',
                                        cursor: 'pointer',
                                        gap: '4px',
                                        fontSize: '9px',
                                        fontFamily: 'var(--font-ui)',
                                        fontWeight: 600,
                                        transition: 'all 0.12s',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                      }}
                                      onMouseEnter={e => {
                                        if (!isDelConfirm) {
                                          const el = e.currentTarget as HTMLElement
                                          el.style.borderColor = 'rgba(239,68,68,0.5)'
                                          el.style.color = '#ef4444'
                                          el.style.background = 'rgba(239,68,68,0.08)'
                                        }
                                      }}
                                      onMouseLeave={e => {
                                        if (!isDelConfirm) {
                                          const el = e.currentTarget as HTMLElement
                                          el.style.borderColor = 'var(--border-2)'
                                          el.style.color = 'var(--text-2)'
                                          el.style.background = 'var(--bg-2)'
                                        }
                                      }}
                                    >
                                      <svg
                                        width="11"
                                        height="11"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        viewBox="0 0 24 24"
                                      >
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                        <path d="M10 11v6M14 11v6" />
                                        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                                      </svg>
                                      {isDelConfirm && 'Borrar'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ))
                    })()}
                  </div>
                </>
              )}

              {/* ── Carpetas tab ───────────────────────── */}
              {sidebarTab === 'folders' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <FolderTree />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div
          style={{
            marginTop: 'auto',
            borderTop: '1px solid var(--border-1)',
            padding: '8px 10px',
            flexShrink: 0,
          }}
        >
          <AnimatePresence initial={false}>
            {effectiveOpen && (
              <motion.p
                key="version"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--text-3)',
                  textAlign: 'center',
                  margin: 0,
                }}
              >
                v{__APP_VERSION__}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Resize handle — drag right edge to resize */}
        {effectiveOpen && !isMobile && (
          <div
            onMouseDown={startResize}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '5px',
              height: '100%',
              cursor: 'col-resize',
              zIndex: 10,
              background: 'transparent',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'var(--accent-600)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          />
        )}
      </motion.aside>
    </>
  )
}

declare const __APP_VERSION__: string
