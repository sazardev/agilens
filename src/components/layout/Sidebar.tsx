import type { JSX } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/store'
import { toggleSidebar, setSidebarOpen } from '@/store/slices/uiSlice'
import { addNote, deleteNote } from '@/store/slices/notesSlice'
import { setActiveNoteId } from '@/store/slices/uiSlice'
import type { Note, NoteType } from '@/types'
import { NOTE_TYPE_META } from '@/types'
import { nanoid } from 'nanoid'
import { useEffect, useState } from 'react'
import TemplatePickerModal from '@/components/notes/TemplatePickerModal'
import { expandTemplate } from '@/store/slices/templatesSlice'
import { NOTE_TYPE_ICONS } from '@/lib/noteIcons'
import FolderTree from '@/components/notes/FolderTree'

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
const IconTemplates = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <path d="M4 6h16M4 10h16M4 14h10M4 18h6" />
    <circle cx="19" cy="17" r="3" />
    <path d="M21.17 20.17L23 22" />
  </svg>
)

const NAV_ITEMS = [
  { to: '/editor', label: 'Notas', Icon: IconNotes },
  { to: '/daily', label: 'Daily', Icon: IconDaily },
  { to: '/git', label: 'Git', Icon: IconGit },
  { to: '/settings', label: 'Ajustes', Icon: IconSettings },
]

type GroupBy = 'none' | 'type' | 'tag' | 'sprint' | 'alpha'

const GROUP_BY_OPTIONS: { value: GroupBy; Icon: () => JSX.Element; title: string }[] = [
  { value: 'none', Icon: IconGroupNone, title: 'Sin agrupar (recientes)' },
  { value: 'type', Icon: IconGroupType, title: 'Por tipo de nota' },
  { value: 'tag', Icon: IconGroupTag, title: 'Por etiqueta' },
  { value: 'sprint', Icon: IconGroupSprint, title: 'Por sprint' },
  { value: 'alpha', Icon: IconGroupAlpha, title: 'Alfabético' },
]

const W_OPEN = 240
const W_CLOSED = 52

export default function Sidebar() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const isOpen = useAppSelector(s => s.ui.sidebarOpen)
  const notes = useAppSelector(s => s.notes.notes)
  const activeNoteId = useAppSelector(s => s.ui.activeNoteId)
  const sprints = useAppSelector(s => s.daily.sprints)
  const [isMobile, setIsMobile] = useState(false)
  const [query, setQuery] = useState('')
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null)
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<'list' | 'folders'>('list')

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

  const defaultTemplateId = useAppSelector(s => s.templates.defaultTemplateId)
  const allTemplates = useAppSelector(s => s.templates.templates)

  function createNoteFromDefaultTemplate() {
    const tpl = allTemplates.find(t => t.id === defaultTemplateId) ?? allTemplates[0]
    const now = new Date().toISOString()
    const title = `Nota ${new Date().toLocaleDateString('es', { day: '2-digit', month: 'short' })}`
    const content = tpl ? expandTemplate(tpl.content, title) : `# ${title}\n\n`
    const note: Note = {
      id: nanoid(),
      title,
      content,
      tags: [],
      attachments: [],
      createdAt: now,
      updatedAt: now,
      noteType: tpl?.type ?? 'note',
      templateId: tpl?.id,
    }
    dispatch(addNote(note))
    dispatch(setActiveNoteId(note.id))
    navigate(`/editor/${note.id}`)
  }

  function handleNewNote() {
    createNoteFromDefaultTemplate()
  }

  function handleDelete(n: Note) {
    if (!window.confirm(`¿Eliminar "${n.title}"? Esta acción no se puede deshacer.`)) return
    dispatch(deleteNote(n.id))
    if (activeNoteId === n.id) {
      dispatch(setActiveNoteId(null))
      navigate('/editor')
    }
    setHoveredNoteId(null)
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
      {/* Template picker modal */}
      {showTemplatePicker && <TemplatePickerModal onClose={() => setShowTemplatePicker(false)} />}

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
          width: isMobile ? (isOpen ? W_OPEN : 0) : isOpen ? W_OPEN : W_CLOSED,
          x: isMobile && !isOpen ? -W_OPEN : 0,
        }}
        transition={{ duration: 0.18, ease: 'easeInOut' }}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: 'calc(100dvh - var(--statusbar-h))',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--border-1)',
          background: 'var(--bg-1)',
          zIndex: 20,
          overflow: 'hidden',
          boxShadow: isMobile && isOpen ? 'var(--shadow-lg)' : 'none',
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
            {isOpen && (
              <motion.span
                key="logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: 'var(--accent-400)',
                  letterSpacing: '-0.02em',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                Agilens
              </motion.span>
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

        {/* New note button */}
        <div style={{ padding: '8px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {/* Primary: create with default template */}
            <button
              onClick={handleNewNote}
              title="Nueva nota (plantilla por defecto)"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: isOpen ? 'flex-start' : 'center',
                gap: '7px',
                padding: isOpen ? '7px 10px' : '7px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--accent-600)',
                color: '#fff',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 500,
                transition: 'background var(--transition-fast)',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.background = 'var(--accent-700)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.background = 'var(--accent-600)'
              }}
            >
              <IconPlus />
              <AnimatePresence initial={false}>
                {isOpen && (
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

            {/* Secondary: open template picker */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.button
                  key="tpl-btn"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: '30px' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => setShowTemplatePicker(true)}
                  title="Elegir plantilla"
                  style={{
                    flexShrink: 0,
                    width: '30px',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--accent-600)',
                    background: 'transparent',
                    color: 'var(--accent-400)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    overflow: 'hidden',
                    padding: 0,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'var(--accent-glow)'
                    el.style.borderColor = 'var(--accent-400)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'transparent'
                    el.style.borderColor = 'var(--accent-600)'
                  }}
                >
                  <IconTemplates />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Search — visible only when open */}
        <AnimatePresence initial={false}>
          {isOpen && (
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
                  placeholder="Buscar notas\u2026"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="input-base"
                  style={{ paddingLeft: '26px', fontSize: '12px', width: '100%' }}
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-3)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      lineHeight: 1,
                      padding: 0,
                    }}
                  >
                    \u00d7
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
                    {isOpen && (
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
          {isOpen && (
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
                        onClick={() => setGroupBy(opt.value)}
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

                  {/* Notes list */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 8px' }}>
                    {(() => {
                      const q = query.toLowerCase().trim()

                      // Apply search filter
                      const searched = q
                        ? notes.filter(
                            n =>
                              n.title.toLowerCase().includes(q) ||
                              n.content.toLowerCase().includes(q) ||
                              n.tags.some(t => t.toLowerCase().includes(q)) ||
                              (n.noteType && n.noteType.toLowerCase().includes(q))
                          )
                        : notes

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
                          {group.notes.map(n => (
                            <div
                              key={n.id}
                              style={{ position: 'relative' }}
                              onMouseEnter={() => setHoveredNoteId(n.id)}
                              onMouseLeave={() => setHoveredNoteId(null)}
                            >
                              <NavLink to={`/editor/${n.id}`} style={{ textDecoration: 'none' }}>
                                {({ isActive }) => (
                                  <div
                                    style={{
                                      padding: '5px 8px',
                                      paddingRight: hoveredNoteId === n.id ? '56px' : '8px',
                                      borderRadius: 'var(--radius-sm)',
                                      marginBottom: '1px',
                                      fontFamily: 'var(--font-ui)',
                                      fontSize: '12px',
                                      color: isActive ? 'var(--accent-400)' : 'var(--text-2)',
                                      background: isActive
                                        ? 'var(--accent-glow)'
                                        : hoveredNoteId === n.id
                                          ? 'var(--bg-3)'
                                          : 'transparent',
                                      cursor: 'pointer',
                                      transition: 'all var(--transition-fast)',
                                    }}
                                  >
                                    <div
                                      style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                      }}
                                    >
                                      {n.noteType &&
                                        n.noteType !== 'note' &&
                                        groupBy !== 'type' &&
                                        (() => {
                                          const TypeIcon = NOTE_TYPE_ICONS[n.noteType as NoteType]
                                          return TypeIcon ? (
                                            <span
                                              style={{
                                                display: 'flex',
                                                flexShrink: 0,
                                                color: 'var(--text-3)',
                                              }}
                                            >
                                              <TypeIcon />
                                            </span>
                                          ) : null
                                        })()}
                                      <span
                                        style={{
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {n.title || 'Sin título'}
                                      </span>
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
                                            {t}
                                          </button>
                                        ))}
                                      </div>
                                    )}
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
                                  <button
                                    title="Duplicar nota"
                                    onClick={() => handleDuplicate(n)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: 'var(--radius-sm)',
                                      border: '1px solid var(--border-2)',
                                      background: 'var(--bg-2)',
                                      color: 'var(--text-2)',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                    }}
                                  >
                                    ⧉
                                  </button>
                                  <button
                                    title="Eliminar nota"
                                    onClick={() => handleDelete(n)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: 'var(--radius-sm)',
                                      border: '1px solid rgba(239,68,68,0.3)',
                                      background: 'var(--bg-2)',
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                      fontSize: '15px',
                                      lineHeight: 1,
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
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
            {isOpen && (
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
      </motion.aside>
    </>
  )
}

declare const __APP_VERSION__: string
