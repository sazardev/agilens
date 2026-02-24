/**
 * KanbanPage — Tablero Kanban para notas de tipo tarea.
 * Drag-and-drop nativo, filtro por sprint/etiqueta, creación rápida.
 */
import { useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { nanoid } from 'nanoid'
import { useAppSelector, useAppDispatch } from '@/store'
import { addNote, setKanbanStatus, updateNote } from '@/store/slices/notesSlice'
import type { Note, KanbanStatus, Sprint } from '@/types'
import { KANBAN_STATUS_META } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS: KanbanStatus[] = ['backlog', 'todo', 'in-progress', 'review', 'done']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IcoPlus = () => (
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
const IcoTask = () => (
  <svg
    width="15"
    height="15"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    viewBox="0 0 24 24"
  >
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
)
const IcoFilter = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
)
const IcoSort = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
)
const IcoLink = () => (
  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </svg>
)
const IcoX = () => (
  <svg
    width="10"
    height="10"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    viewBox="0 0 24 24"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const IcoChevron = ({ open }: { open: boolean }) => (
  <svg
    width="12"
    height="12"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    viewBox="0 0 24 24"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

// ─── Quick-add popover inside a column ───────────────────────────────────────

function QuickAdd({
  status,
  sprintId,
  onAdd,
  onClose,
}: {
  status: KanbanStatus
  sprintId: string | undefined
  onAdd: (title: string) => void
  onClose: () => void
}) {
  const [val, setVal] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  return (
    <div
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border-2)',
        borderRadius: 'var(--radius-md)',
        padding: '8px',
        marginTop: '6px',
      }}
    >
      <input
        ref={ref}
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && val.trim()) {
            onAdd(val.trim())
            setVal('')
          }
          if (e.key === 'Escape') onClose()
        }}
        placeholder="Título de la tarea…"
        style={{
          width: '100%',
          background: 'var(--bg-0)',
          border: '1px solid var(--border-2)',
          borderRadius: 'var(--radius-sm)',
          padding: '5px 8px',
          fontFamily: 'var(--font-ui)',
          fontSize: '12px',
          color: 'var(--text-0)',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
        <button
          onClick={() => {
            if (val.trim()) {
              onAdd(val.trim())
              setVal('')
            }
          }}
          style={{
            flex: 1,
            padding: '4px',
            background: 'var(--accent-500)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            color: '#fff',
            fontFamily: 'var(--font-ui)',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          Añadir
        </button>
        <button
          onClick={onClose}
          style={{
            padding: '4px 8px',
            background: 'var(--bg-3)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-2)',
            fontFamily: 'var(--font-ui)',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── Sprint assign dropdown on card ──────────────────────────────────────────

function SprintBadge({
  note,
  sprints,
  onAssign,
}: {
  note: Note
  sprints: Sprint[]
  onAssign: (sprintId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const sprint = sprints.find(s => s.id === note.sprintId)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onMouseDown={e => {
          e.stopPropagation()
          e.preventDefault()
          setOpen(o => !o)
        }}
        title="Asignar sprint"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '2px 6px',
          border: 'none',
          borderRadius: '999px',
          cursor: 'pointer',
          fontFamily: 'var(--font-ui)',
          fontSize: '10px',
          fontWeight: 500,
          background: sprint ? 'rgba(244,114,182,0.15)' : 'var(--bg-3)',
          color: sprint ? '#f472b6' : 'var(--text-3)',
          transition: 'background var(--transition-fast)',
        }}
      >
        <IcoLink />
        {sprint ? sprint.name : 'Sin sprint'}
        <IcoChevron open={open} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 200,
            background: 'var(--bg-1)',
            border: '1px solid var(--border-2)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            minWidth: '180px',
            overflow: 'hidden',
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          {/* Dismiss overlay */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: -1 }}
            onMouseDown={() => setOpen(false)}
          />
          <button
            onMouseDown={() => {
              onAssign(null)
              setOpen(false)
            }}
            style={{
              width: '100%',
              padding: '7px 10px',
              background: !note.sprintId ? 'var(--accent-glow)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              fontSize: '12px',
              color: !note.sprintId ? 'var(--accent-400)' : 'var(--text-2)',
              textAlign: 'left',
              borderBottom: '1px solid var(--border-1)',
            }}
          >
            Sin sprint
          </button>
          {sprints.map(s => (
            <button
              key={s.id}
              onMouseDown={() => {
                onAssign(s.id)
                setOpen(false)
              }}
              style={{
                width: '100%',
                padding: '7px 10px',
                background: note.sprintId === s.id ? 'var(--accent-glow)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                fontSize: '12px',
                color: note.sprintId === s.id ? 'var(--accent-400)' : 'var(--text-1)',
                textAlign: 'left',
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Task card ────────────────────────────────────────────────────────────────

function TaskCard({
  note,
  sprints,
  isDragOver,
  onDragStart,
  onAssignSprint,
  onClick,
}: {
  note: Note
  sprints: Sprint[]
  isDragOver: boolean
  onDragStart: () => void
  onAssignSprint: (sprintId: string | null) => void
  onClick: () => void
}) {
  const meta = KANBAN_STATUS_META[note.kanbanStatus ?? 'backlog']

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('noteId', note.id)
        onDragStart()
      }}
      onClick={onClick}
      style={{
        background: isDragOver ? 'var(--bg-3)' : 'var(--bg-2)',
        border: `1px solid ${isDragOver ? 'var(--accent-500)' : 'var(--border-1)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '10px 11px 9px',
        cursor: 'grab',
        transition: 'border-color 0.12s, background 0.12s, box-shadow 0.12s',
        boxShadow: isDragOver ? '0 0 0 2px rgba(99,102,241,0.25)' : 'none',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        if (!isDragOver) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-2)'
      }}
      onMouseLeave={e => {
        if (!isDragOver) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-1)'
      }}
    >
      {/* Color stripe if set */}
      {note.color && (
        <div
          style={{
            height: '3px',
            borderRadius: '2px',
            background: note.color,
            marginBottom: '7px',
            marginLeft: '-11px',
            marginRight: '-11px',
            marginTop: '-10px',
            borderTopLeftRadius: 'var(--radius-md)',
            borderTopRightRadius: 'var(--radius-md)',
          }}
        />
      )}

      {/* Title */}
      <div
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text-0)',
          lineHeight: 1.35,
          marginBottom: '7px',
        }}
      >
        {note.title || 'Sin título'}
      </div>

      {/* Tags */}
      {note.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '8px' }}>
          {note.tags.slice(0, 4).map(tag => (
            <span
              key={tag}
              style={{
                padding: '1px 6px',
                borderRadius: '999px',
                background: 'var(--accent-glow)',
                color: 'var(--accent-400)',
                fontFamily: 'var(--font-ui)',
                fontSize: '10px',
                fontWeight: 500,
              }}
            >
              {tag}
            </span>
          ))}
          {note.tags.length > 4 && (
            <span
              style={{
                padding: '1px 6px',
                borderRadius: '999px',
                background: 'var(--bg-3)',
                color: 'var(--text-3)',
                fontFamily: 'var(--font-ui)',
                fontSize: '10px',
              }}
            >
              +{note.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '2px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <SprintBadge note={note} sprints={sprints} onAssign={onAssignSprint} />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--text-3)',
          }}
        >
          {relTime(note.updatedAt)}
        </span>
      </div>
    </div>
  )
}

// ─── Kanban column ────────────────────────────────────────────────────────────

function KanbanColumn({
  status,
  notes,
  sprints,
  activeSprint,
  onDrop,
  onAssignSprint,
  onCardClick,
  onAddTask,
}: {
  status: KanbanStatus
  notes: Note[]
  sprints: Sprint[]
  activeSprint: string | null
  onDrop: (noteId: string, status: KanbanStatus) => void
  onAssignSprint: (noteId: string, sprintId: string | null) => void
  onCardClick: (note: Note) => void
  onAddTask: (title: string, status: KanbanStatus) => void
}) {
  const meta = KANBAN_STATUS_META[status]
  const [dragTarget, setDragTarget] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragTarget(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragTarget(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const noteId = e.dataTransfer.getData('noteId')
      if (noteId) onDrop(noteId, status)
      setDragTarget(false)
    },
    [onDrop, status]
  )

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: '240px',
        maxWidth: '280px',
        flex: '1 0 240px',
        background: dragTarget ? 'rgba(99,102,241,0.04)' : 'var(--bg-0)',
        border: `2px solid ${dragTarget ? 'var(--accent-500)' : 'var(--border-1)'}`,
        borderRadius: 'var(--radius-lg)',
        transition: 'border-color 0.15s, background 0.15s',
        overflow: 'hidden',
      }}
    >
      {/* Column header */}
      <div
        style={{
          padding: '10px 12px 9px',
          borderBottom: '1px solid var(--border-1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-1)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: meta.color,
              flexShrink: 0,
              boxShadow: `0 0 6px ${meta.color}80`,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-0)',
              letterSpacing: '0.02em',
            }}
          >
            {meta.label}
          </span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: '999px',
              background: meta.bg,
              color: meta.color,
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 600,
            }}
          >
            {notes.length}
          </span>
        </div>
        <button
          onClick={() => setShowAdd(a => !a)}
          title="Añadir tarea"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: showAdd ? 'var(--accent-500)' : 'var(--bg-3)',
            border: 'none',
            cursor: 'pointer',
            color: showAdd ? '#fff' : 'var(--text-2)',
            transition: 'background var(--transition-fast)',
          }}
        >
          <IcoPlus />
        </button>
      </div>

      {/* Cards area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          minHeight: '80px',
        }}
      >
        {showAdd && (
          <QuickAdd
            status={status}
            sprintId={activeSprint ?? undefined}
            onAdd={title => {
              onAddTask(title, status)
              setShowAdd(false)
            }}
            onClose={() => setShowAdd(false)}
          />
        )}

        {notes.map(note => (
          <TaskCard
            key={note.id}
            note={note}
            sprints={sprints}
            isDragOver={draggingId === note.id}
            onDragStart={() => setDraggingId(note.id)}
            onAssignSprint={sprintId => onAssignSprint(note.id, sprintId)}
            onClick={() => onCardClick(note)}
          />
        ))}

        {notes.length === 0 && !showAdd && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-3)',
              fontFamily: 'var(--font-ui)',
              fontSize: '11px',
              minHeight: '60px',
              opacity: dragTarget ? 0.3 : 1,
            }}
          >
            {dragTarget ? 'Soltar aquí' : 'Sin tareas'}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type SortKey = 'updated' | 'created' | 'title'

export default function KanbanPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const allNotes = useAppSelector(s => s.notes.notes)
  const sprints = useAppSelector(s => s.daily.sprints)

  const [activeSprint, setActiveSprint] = useState<string | null>(null) // null = todos
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('updated')
  const [showSortMenu, setShowSortMenu] = useState(false)

  // All task notes
  const taskNotes = useMemo(() => allNotes.filter(n => n.noteType === 'task'), [allNotes])

  // All tags used in task notes
  const allTags = useMemo(
    () => Array.from(new Set(taskNotes.flatMap(n => n.tags))).sort(),
    [taskNotes]
  )

  // Filtered task notes
  const filtered = useMemo(() => {
    let notes = taskNotes
    if (activeSprint !== null) {
      notes = notes.filter(n => n.sprintId === activeSprint)
    }
    if (activeTag) {
      notes = notes.filter(n => n.tags.includes(activeTag))
    }
    // sort
    return [...notes].sort((a, b) => {
      if (sort === 'updated')
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      if (sort === 'created')
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      return a.title.localeCompare(b.title)
    })
  }, [taskNotes, activeSprint, activeTag, sort])

  // Group by column
  const byStatus = useMemo(() => {
    const map: Record<KanbanStatus, Note[]> = {
      backlog: [],
      todo: [],
      'in-progress': [],
      review: [],
      done: [],
    }
    for (const note of filtered) {
      const col: KanbanStatus = note.kanbanStatus ?? 'backlog'
      map[col].push(note)
    }
    return map
  }, [filtered])

  // Drop handler
  const handleDrop = useCallback(
    (noteId: string, status: KanbanStatus) => {
      dispatch(setKanbanStatus({ id: noteId, status }))
    },
    [dispatch]
  )

  // Assign sprint
  const handleAssignSprint = useCallback(
    (noteId: string, sprintId: string | null) => {
      dispatch(updateNote({ id: noteId, sprintId: sprintId ?? undefined }))
    },
    [dispatch]
  )

  // Add task
  const handleAddTask = useCallback(
    (title: string, status: KanbanStatus) => {
      const now = new Date().toISOString()
      const id = nanoid()
      dispatch(
        addNote({
          id,
          title,
          content: `# ${title}\n\n**Prioridad:** Media  \n**Sprint:** \n\n## Descripción\n\n\n\n## Criterios de aceptación\n\n- [ ] \n\n## Notas\n\n`,
          tags: [],
          noteType: 'task',
          sprintId: activeSprint ?? undefined,
          attachments: [],
          createdAt: now,
          updatedAt: now,
          kanbanStatus: status,
        })
      )
    },
    [dispatch, activeSprint]
  )

  const SORT_LABELS: Record<SortKey, string> = {
    updated: 'Reciente',
    created: 'Creación',
    title: 'Título A-Z',
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-0)',
        overflow: 'hidden',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div
        style={{
          borderBottom: '1px solid var(--border-1)',
          background: 'var(--bg-1)',
          flexShrink: 0,
        }}
      >
        {/* Title row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <span style={{ color: '#facc15', display: 'flex' }}>
              <IcoTask />
            </span>
            <span
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--text-0)',
                letterSpacing: '-0.01em',
              }}
            >
              Tareas
            </span>
            <span
              style={{
                padding: '1px 8px',
                borderRadius: '999px',
                background: 'rgba(250,204,21,0.12)',
                color: '#facc15',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {taskNotes.length}
            </span>
          </div>

          {/* Sort + create */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Sort */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSortMenu(s => !s)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border-2)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  color: 'var(--text-2)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '12px',
                }}
              >
                <IcoSort />
                {SORT_LABELS[sort]}
              </button>
              {showSortMenu && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                    onClick={() => setShowSortMenu(false)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      zIndex: 100,
                      background: 'var(--bg-1)',
                      border: '1px solid var(--border-2)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-md)',
                      overflow: 'hidden',
                      minWidth: '140px',
                    }}
                  >
                    {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([k, v]) => (
                      <button
                        key={k}
                        onClick={() => {
                          setSort(k)
                          setShowSortMenu(false)
                        }}
                        style={{
                          width: '100%',
                          padding: '7px 12px',
                          background: sort === k ? 'var(--accent-glow)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-ui)',
                          fontSize: '12px',
                          color: sort === k ? 'var(--accent-400)' : 'var(--text-1)',
                          textAlign: 'left',
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Create task */}
            <button
              onClick={() => {
                const now = new Date().toISOString()
                const id = nanoid()
                dispatch(
                  addNote({
                    id,
                    title: 'Nueva tarea',
                    content: `# Nueva tarea\n\n**Prioridad:** Media  \n**Sprint:** \n\n## Descripción\n\n\n\n## Criterios de aceptación\n\n- [ ] \n\n## Notas\n\n`,
                    tags: [],
                    noteType: 'task',
                    sprintId: activeSprint ?? undefined,
                    attachments: [],
                    createdAt: now,
                    updatedAt: now,
                    kanbanStatus: 'todo',
                  })
                )
                navigate(`/editor/${id}`)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                background: 'var(--accent-500)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                color: '#fff',
                fontFamily: 'var(--font-ui)',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              <IcoPlus />
              Nueva tarea
            </button>
          </div>
        </div>

        {/* Sprint tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: '8px 16px 0',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {[null, ...sprints.map(s => s.id)].map(sId => {
            const label =
              sId === null ? 'Todos los sprints' : (sprints.find(s => s.id === sId)?.name ?? sId)
            const count =
              sId === null ? taskNotes.length : taskNotes.filter(n => n.sprintId === sId).length
            const isActive = activeSprint === sId
            return (
              <button
                key={sId ?? '__all__'}
                onClick={() => setActiveSprint(sId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 11px 8px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '12px',
                  color: isActive ? 'var(--accent-400)' : 'var(--text-2)',
                  fontWeight: isActive ? 600 : 400,
                  borderBottom: isActive ? '2px solid var(--accent-500)' : '2px solid transparent',
                  transition: 'color var(--transition-fast)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {label}
                {count > 0 && (
                  <span
                    style={{
                      padding: '0 5px',
                      borderRadius: '999px',
                      fontSize: '10px',
                      background: isActive ? 'var(--accent-glow)' : 'var(--bg-3)',
                      color: isActive ? 'var(--accent-400)' : 'var(--text-3)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 18px 8px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            <span style={{ color: 'var(--text-3)', display: 'flex', flexShrink: 0 }}>
              <IcoFilter />
            </span>
            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: 'var(--accent-500)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '11px',
                }}
              >
                <IcoX /> Limpiar
              </button>
            )}
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                style={{
                  padding: '2px 9px',
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTag === tag ? 'var(--accent-500)' : 'var(--bg-3)',
                  color: activeTag === tag ? '#fff' : 'var(--text-2)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '11px',
                  fontWeight: 500,
                  transition: 'background var(--transition-fast)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Board ────────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          gap: '10px',
          padding: '14px 16px 16px',
          overflowX: 'auto',
          overflowY: 'hidden',
          alignItems: 'stretch',
        }}
      >
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col}
            status={col}
            notes={byStatus[col]}
            sprints={sprints}
            activeSprint={activeSprint}
            onDrop={handleDrop}
            onAssignSprint={handleAssignSprint}
            onCardClick={note => navigate(`/editor/${note.id}`)}
            onAddTask={handleAddTask}
          />
        ))}
      </div>

      {/* Empty state */}
      {taskNotes.length === 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: '36px', opacity: 0.3 }}>✅</span>
          <p
            style={{
              color: 'var(--text-3)',
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              margin: 0,
            }}
          >
            No hay tareas todavía
          </p>
          <p
            style={{
              color: 'var(--text-3)',
              fontFamily: 'var(--font-ui)',
              fontSize: '11px',
              margin: 0,
              opacity: 0.7,
            }}
          >
            Crea una nota de tipo "Tarea" para que aparezca aquí
          </p>
        </div>
      )}
    </div>
  )
}
