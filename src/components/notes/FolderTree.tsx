/**
 * FolderTree — hierarchical folder explorer for notes.
 *
 * Features:
 *  - Infinite nesting with expand/collapse
 *  - Inline rename (double-click or F2)
 *  - Right-click context menu (add subfolder, rename, delete)
 *  - Drag-and-drop notes onto folders
 *  - Auto-organizar modal (by type / by sprint / both)
 *  - Read-only system folders (auto-generated)
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector, store } from '@/store'
import {
  addFolder,
  renameFolder,
  deleteFolder,
  autoOrganize,
  clearSystemFolders,
  selectRootFolders,
  selectChildFolders,
} from '@/store/slices/foldersSlice'
import { setNoteFolder, bulkSetNoteFolders, clearNoteFolders } from '@/store/slices/notesSlice'
import { setActiveNoteId } from '@/store/slices/uiSlice'
import type { Folder, Note, NoteType } from '@/types'
import { NOTE_TYPE_META } from '@/types'
import { NoteTypeIcon } from '@/lib/noteIcons'

// ─── Icons ────────────────────────────────────────────────────────────────────

const IcoChevronRight = () => (
  <svg
    width="10"
    height="10"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    viewBox="0 0 24 24"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
)
const IcoChevronDown = () => (
  <svg
    width="10"
    height="10"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    viewBox="0 0 24 24"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
)
const IcoFolder = ({ open, color }: { open?: boolean; color?: string }) => (
  <svg
    width="13"
    height="13"
    fill={color ? color + '33' : 'none'}
    stroke={color ?? 'currentColor'}
    strokeWidth="1.8"
    viewBox="0 0 24 24"
    style={{ flexShrink: 0 }}
  >
    {open ? (
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    ) : (
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    )}
  </svg>
)
const IcoFolderPlus = () => (
  <svg
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    <line x1="12" y1="11" x2="12" y2="17" />
    <line x1="9" y1="14" x2="15" y2="14" />
  </svg>
)
const IcoTrash = () => (
  <svg
    width="12"
    height="12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
)
const IcoPencil = () => (
  <svg
    width="12"
    height="12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)
const IcoWand = () => (
  <svg
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <line x1="5" y1="9" x2="19" y2="9" />
    <line x1="9" y1="5" x2="9" y2="19" />
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L2 15.67V22h6.33L20.84 9.5a5.5 5.5 0 000-7.77z" />
  </svg>
)
const IcoPlus = () => (
  <svg
    width="12"
    height="12"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    viewBox="0 0 24 24"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const IcoClear = () => (
  <svg
    width="12"
    height="12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </svg>
)

// ─── Context menu ─────────────────────────────────────────────────────────────

interface CtxItem {
  label: string
  icon: React.ReactNode
  action: () => void
  danger?: boolean
}

function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number
  y: number
  items: CtxItem[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  // Clamp to viewport
  const left = Math.min(x, window.innerWidth - 180)
  const top = Math.min(y, window.innerHeight - items.length * 34 - 8)

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 999,
        background: 'var(--bg-2)',
        border: '1px solid var(--border-1)',
        borderRadius: '8px',
        boxShadow: 'var(--shadow-lg)',
        padding: '4px',
        minWidth: '160px',
        userSelect: 'none',
      }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => {
            item.action()
            onClose()
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '6px 10px',
            background: 'transparent',
            border: 'none',
            borderRadius: '6px',
            color: item.danger ? '#ef4444' : 'var(--text-1)',
            cursor: 'pointer',
            fontSize: '12px',
            textAlign: 'left',
            transition: 'background var(--transition-fast)',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-3)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
        >
          <span style={{ display: 'flex', opacity: 0.7 }}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  )
}

// ─── Auto-organizar modal ─────────────────────────────────────────────────────

function AutoOrganizeModal({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch()
  const notes = useAppSelector(s => s.notes.notes)
  const sprints = useAppSelector(s => s.daily.sprints)
  const [mode, setMode] = useState<'type' | 'sprint' | 'both'>('both')
  const [replacing, setReplacing] = useState(true)

  function handleApply() {
    // Clear previous system folders / assignments if requested
    if (replacing) {
      dispatch(clearSystemFolders())
      dispatch(clearNoteFolders())
    }

    // Build system folders (synchronous Redux update)
    dispatch(autoOrganize({ notes, sprints, mode }))

    // Read the updated folders directly from the store (dispatch is sync in Redux)
    const updatedFolders = store.getState().folders.folders
    const assignments: Record<string, string> = {}

    const NOTE_TYPE_ORDER = [
      'note',
      'daily',
      'evidence',
      'technical',
      'meeting',
      'sprint',
      'task',
    ] as const

    if (mode === 'type' || mode === 'both') {
      NOTE_TYPE_ORDER.forEach(type => {
        const folder = updatedFolders.find(f => f.systemKey === `auto:type:${type}`)
        if (folder) {
          notes
            .filter(n => n.noteType === type)
            .forEach(n => {
              assignments[n.id] = folder.id
            })
        }
      })
    }

    if (mode === 'sprint' || mode === 'both') {
      sprints.forEach(sprint => {
        const folder = updatedFolders.find(f => f.systemKey === `auto:sprint:${sprint.id}`)
        if (folder) {
          notes
            .filter(n => n.sprintId === sprint.id)
            .forEach(n => {
              assignments[n.id] = folder.id
            })
        }
      })
      const noSprintFolder = updatedFolders.find(f => f.systemKey === 'auto:sprint:none')
      if (noSprintFolder) {
        notes
          .filter(n => !n.sprintId && !assignments[n.id])
          .forEach(n => {
            assignments[n.id] = noSprintFolder.id
          })
      }
    }

    dispatch(bulkSetNoteFolders(assignments))
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border-1)',
          borderRadius: '12px',
          padding: '24px',
          width: '380px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <h3
          style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: 'var(--text-0)' }}
        >
          Auto-organizar notas
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: '12px', color: 'var(--text-3)' }}>
          Se crean carpetas como sistema y se asignan notas automáticamente.
        </p>

        {/* Mode selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {(
            [
              {
                id: 'type' as const,
                label: 'Por tipo de nota',
                desc: '7 carpetas: Nota, Daily, Evidencia…',
              },
              {
                id: 'sprint' as const,
                label: 'Por sprint',
                desc: 'Una carpeta por sprint + "Sin sprint"',
              },
              {
                id: 'both' as const,
                label: 'Por tipo y sprint',
                desc: 'Árbol completo de 2 niveles',
              },
            ] as const
          ).map(opt => (
            <label
              key={opt.id}
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                padding: '10px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                border: `1px solid ${mode === opt.id ? 'var(--accent-500)' : 'var(--border-1)'}`,
                background: mode === opt.id ? 'var(--accent-glow)' : 'var(--bg-3)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <input
                type="radio"
                name="mode"
                value={opt.id}
                checked={mode === opt.id}
                onChange={() => setMode(opt.id)}
                style={{ marginTop: '2px', accentColor: 'var(--accent-500)' }}
              />
              <span>
                <span
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-0)',
                  }}
                >
                  {opt.label}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{opt.desc}</span>
              </span>
            </label>
          ))}
        </div>

        {/* Replace option */}
        <label
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            fontSize: '12px',
            color: 'var(--text-2)',
            marginBottom: '20px',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={replacing}
            onChange={e => setReplacing(e.target.checked)}
            style={{ accentColor: 'var(--accent-500)' }}
          />
          Reemplazar carpetas automáticas anteriores
        </label>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border-1)',
              background: 'transparent',
              color: 'var(--text-2)',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--accent-600)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Single folder node ───────────────────────────────────────────────────────

function FolderNode({
  folder,
  depth,
  allFolders,
  notes,
  activeNoteId,
  activeFolderId,
  onFolderClick,
  onContextMenu,
  onDrop,
}: {
  folder: Folder
  depth: number
  allFolders: Folder[]
  notes: Note[]
  activeNoteId: string | null
  activeFolderId: string | null
  onFolderClick: (id: string) => void
  onContextMenu: (e: React.MouseEvent, folder: Folder) => void
  onDrop: (noteId: string, folderId: string) => void
}) {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [open, setOpen] = useState(depth < 2) // auto-expand first 2 levels
  const [isDragOver, setIsDragOver] = useState(false)
  const isActive = activeFolderId === folder.id

  const children = selectChildFolders(allFolders, folder.id)
  const folderNotes = notes.filter(n => n.folderId === folder.id)
  const totalDescendantNotes = (function countAll(fId: string): number {
    const direct = notes.filter(n => n.folderId === fId).length
    const childCount = allFolders
      .filter(f => f.parentId === fId)
      .reduce((acc, f) => acc + countAll(f.id), 0)
    return direct + childCount
  })(folder.id)

  const indent = depth * 12

  return (
    <div>
      {/* Folder row */}
      <div
        onContextMenu={e => onContextMenu(e, folder)}
        onDragOver={e => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setIsDragOver(false)
          const noteId = e.dataTransfer.getData('text/note-id')
          if (noteId) onDrop(noteId, folder.id)
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          paddingLeft: `${8 + indent}px`,
          paddingRight: '8px',
          height: '28px',
          cursor: 'pointer',
          borderRadius: '5px',
          background: isDragOver ? 'var(--accent-glow)' : isActive ? 'var(--bg-3)' : 'transparent',
          color: isActive ? 'var(--text-0)' : 'var(--text-2)',
          transition: 'all var(--transition-fast)',
          userSelect: 'none',
          position: 'relative',
        }}
        onMouseEnter={e => {
          if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-3)'
        }}
        onMouseLeave={e => {
          if (!isActive && !isDragOver)
            (e.currentTarget as HTMLElement).style.background = 'transparent'
        }}
        onClick={() => {
          onFolderClick(folder.id)
          if (children.length || folderNotes.length) setOpen(o => !o)
        }}
      >
        {/* Expand chevron */}
        <span
          style={{
            display: 'flex',
            flexShrink: 0,
            width: '14px',
            color: 'var(--text-3)',
            visibility: children.length > 0 || folderNotes.length > 0 ? 'visible' : 'hidden',
          }}
          onClick={e => {
            e.stopPropagation()
            setOpen(o => !o)
          }}
        >
          {open ? <IcoChevronDown /> : <IcoChevronRight />}
        </span>

        {/* Folder icon — system folders use NoteTypeIcon, others use IcoFolder */}
        {(() => {
          const sk = folder.systemKey
          if (sk?.startsWith('auto:type:')) {
            const type = sk.replace('auto:type:', '') as NoteType
            return (
              <span
                style={{ display: 'flex', flexShrink: 0, color: folder.color ?? 'var(--text-3)' }}
              >
                <NoteTypeIcon type={type} size={13} />
              </span>
            )
          }
          if (sk === 'auto:sprint-root' || sk?.startsWith('auto:sprint:')) {
            return (
              <span style={{ display: 'flex', flexShrink: 0, color: folder.color ?? '#f472b6' }}>
                <NoteTypeIcon type="sprint" size={13} />
              </span>
            )
          }
          return (
            <span
              style={{ color: folder.color ?? 'var(--text-3)', display: 'flex', flexShrink: 0 }}
            >
              <IcoFolder open={open} color={folder.color} />
            </span>
          )
        })()}

        {/* Name */}
        <span
          style={{
            flex: 1,
            fontSize: '12px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'var(--text-1)',
          }}
        >
          {folder.name}
        </span>

        {/* Badge */}
        {totalDescendantNotes > 0 && (
          <span
            style={{
              fontSize: '10px',
              color: 'var(--text-3)',
              background: 'var(--bg-3)',
              borderRadius: '6px',
              padding: '1px 5px',
              flexShrink: 0,
            }}
          >
            {totalDescendantNotes}
          </span>
        )}

        {/* System indicator */}
        {folder.isSystem && (
          <span
            title="Carpeta automática"
            style={{
              fontSize: '9px',
              color: 'var(--text-3)',
              fontFamily: 'var(--font-mono)',
              flexShrink: 0,
            }}
          >
            auto
          </span>
        )}
      </div>

      {/* Children */}
      {open && (
        <div>
          {/* Sub-folders */}
          {children.map(child => (
            <FolderNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              allFolders={allFolders}
              notes={notes}
              activeNoteId={activeNoteId}
              activeFolderId={activeFolderId}
              onFolderClick={onFolderClick}
              onContextMenu={onContextMenu}
              onDrop={onDrop}
            />
          ))}

          {/* Notes in this folder */}
          {folderNotes
            .slice()
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .map(note => (
              <NoteRow
                key={note.id}
                note={note}
                depth={depth + 1}
                isActive={activeNoteId === note.id}
                onSelect={() => {
                  dispatch(setActiveNoteId(note.id))
                  navigate(`/editor/${note.id}`)
                }}
              />
            ))}
        </div>
      )}
    </div>
  )
}

// ─── Note row inside folder ───────────────────────────────────────────────────

function NoteRow({
  note,
  depth,
  isActive,
  onSelect,
}: {
  note: Note
  depth: number
  isActive: boolean
  onSelect: () => void
}) {
  const indent = depth * 12
  const meta = NOTE_TYPE_META[note.noteType]

  return (
    <div
      draggable
      onDragStart={e => e.dataTransfer.setData('text/note-id', note.id)}
      onClick={onSelect}
      title={note.title}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        paddingLeft: `${14 + indent}px`,
        paddingRight: '8px',
        height: '26px',
        cursor: 'pointer',
        borderRadius: '5px',
        background: isActive ? 'var(--accent-glow)' : 'transparent',
        color: isActive ? 'var(--accent-400)' : 'var(--text-2)',
        transition: 'all var(--transition-fast)',
        userSelect: 'none',
        borderLeft: isActive ? '2px solid var(--accent-500)' : '2px solid transparent',
        marginLeft: '4px',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'var(--bg-3)'
          el.style.color = 'var(--text-1)'
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
      <span style={{ display: 'flex', flexShrink: 0, color: meta.color }}>
        <NoteTypeIcon type={note.noteType} size={11} />
      </span>
      <span
        style={{
          flex: 1,
          fontSize: '11.5px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {note.title}
      </span>
    </div>
  )
}

// ─── Inline rename input ──────────────────────────────────────────────────────

function RenameInput({
  initial,
  onConfirm,
  onCancel,
}: {
  initial: string
  onConfirm: (v: string) => void
  onCancel: () => void
}) {
  const [val, setVal] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    ref.current?.select()
  }, [])

  return (
    <input
      ref={ref}
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => (val.trim() ? onConfirm(val.trim()) : onCancel())}
      onKeyDown={e => {
        if (e.key === 'Enter') val.trim() ? onConfirm(val.trim()) : onCancel()
        if (e.key === 'Escape') onCancel()
      }}
      onClick={e => e.stopPropagation()}
      className="input-base"
      style={{ fontSize: '12px', padding: '2px 6px', width: '100%', height: '22px' }}
      autoFocus
    />
  )
}

// ─── Main FolderTree component ────────────────────────────────────────────────

interface Props {
  /** List view note click — same handler as sidebar */
  onNoteSelect?: (noteId: string) => void
}

export default function FolderTree({ onNoteSelect: _onNoteSelect }: Props) {
  const dispatch = useAppDispatch()
  const folders = useAppSelector(s => s.folders.folders)
  const notes = useAppSelector(s => s.notes.notes)
  const activeNoteId = useAppSelector(s => s.ui.activeNoteId)
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [showAutoModal, setShowAutoModal] = useState(false)
  const [renaming, setRenaming] = useState<{ id: string } | null>(null)
  const [creating, setCreating] = useState<{ parentId: string | null } | null>(null)
  const [ctx, setCtx] = useState<{ x: number; y: number; folder: Folder } | null>(null)

  const rootFolders = selectRootFolders(folders)

  const handleContextMenu = useCallback((e: React.MouseEvent, folder: Folder) => {
    e.preventDefault()
    e.stopPropagation()
    setCtx({ x: e.clientX, y: e.clientY, folder })
  }, [])

  const handleDrop = useCallback(
    (noteId: string, folderId: string) => {
      dispatch(setNoteFolder({ noteId, folderId }))
    },
    [dispatch]
  )

  const handleFolderClick = useCallback((id: string) => {
    setActiveFolderId(prev => (prev === id ? null : id))
  }, [])

  const ctxItems: CtxItem[] = ctx
    ? [
        {
          label: 'Nueva subcarpeta',
          icon: <IcoFolderPlus />,
          action: () => setCreating({ parentId: ctx!.folder.id }),
        },
        ...(!ctx.folder.isSystem
          ? [
              {
                label: 'Renombrar',
                icon: <IcoPencil />,
                action: () => setRenaming({ id: ctx!.folder.id }),
              },
              {
                label: 'Eliminar carpeta',
                icon: <IcoTrash />,
                danger: true,
                action: () => {
                  if (
                    !window.confirm(
                      `¿Eliminar "${ctx!.folder.name}" y todas sus subcarpetas? Las notas no se eliminarán.`
                    )
                  )
                    return
                  dispatch(deleteFolder({ id: ctx!.folder.id, reassignTo: null }))
                  // Clear folderId from notes that were in any deleted folder
                  const deletedIds = new Set<string>()
                  const queue = [ctx!.folder.id]
                  while (queue.length) {
                    const cur = queue.pop()!
                    deletedIds.add(cur)
                    folders.filter(f => f.parentId === cur).forEach(f => queue.push(f.id))
                  }
                  notes.forEach(n => {
                    if (n.folderId && deletedIds.has(n.folderId)) {
                      dispatch(setNoteFolder({ noteId: n.id, folderId: null }))
                    }
                  })
                },
              },
            ]
          : []),
      ]
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Toolbar */}
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
            flex: 1,
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-3)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Carpetas
        </span>

        {/* New root folder */}
        <ToolBtn title="Nueva carpeta" onClick={() => setCreating({ parentId: null })}>
          <IcoPlus />
        </ToolBtn>

        {/* Auto-organize */}
        <ToolBtn title="Auto-organizar" onClick={() => setShowAutoModal(true)} accent>
          <IcoWand />
        </ToolBtn>

        {/* Clear system folders */}
        {folders.some(f => f.isSystem) && (
          <ToolBtn
            title="Limpiar carpetas automáticas"
            onClick={() => {
              if (
                window.confirm('¿Eliminar todas las carpetas automáticas? Las notas no se borran.')
              ) {
                dispatch(clearSystemFolders())
                dispatch(clearNoteFolders())
              }
            }}
          >
            <IcoClear />
          </ToolBtn>
        )}
      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {/* Creating root folder */}
        {creating?.parentId === null && (
          <div style={{ padding: '4px 8px' }}>
            <RenameInput
              initial=""
              onConfirm={name => {
                dispatch(addFolder({ name, parentId: null }))
                setCreating(null)
              }}
              onCancel={() => setCreating(null)}
            />
          </div>
        )}

        {rootFolders.length === 0 && !creating && (
          <div
            style={{
              padding: '20px 16px',
              textAlign: 'center',
              color: 'var(--text-3)',
              fontSize: '11px',
              lineHeight: 1.6,
            }}
          >
            <div
              style={{
                marginBottom: '8px',
                opacity: 0.4,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <IcoFolder open={false} />
            </div>
            Sin carpetas.
            <br />
            Usa <b>+</b> para crear una
            <br />o <b>Auto-organizar</b> para
            <br />
            generar el árbol automáticamente.
          </div>
        )}

        {rootFolders.map(folder => (
          <div key={folder.id}>
            {renaming?.id === folder.id ? (
              <div style={{ padding: '3px 8px' }}>
                <RenameInput
                  initial={folder.name}
                  onConfirm={name => {
                    dispatch(renameFolder({ id: folder.id, name }))
                    setRenaming(null)
                  }}
                  onCancel={() => setRenaming(null)}
                />
              </div>
            ) : (
              <FolderNode
                folder={folder}
                depth={0}
                allFolders={folders}
                notes={notes}
                activeNoteId={activeNoteId}
                activeFolderId={activeFolderId}
                onFolderClick={handleFolderClick}
                onContextMenu={handleContextMenu}
                onDrop={handleDrop}
              />
            )}
            {/* Creating subfolder */}
            {creating?.parentId === folder.id && (
              <div style={{ paddingLeft: '24px', paddingRight: '8px', paddingTop: '3px' }}>
                <RenameInput
                  initial=""
                  onConfirm={name => {
                    dispatch(addFolder({ name, parentId: folder.id }))
                    setCreating(null)
                  }}
                  onCancel={() => setCreating(null)}
                />
              </div>
            )}
          </div>
        ))}

        {/* Notes not in any folder */}
        {notes.some(n => !n.folderId) && activeFolderId === null && (
          <UnfiledSection notes={notes} activeNoteId={activeNoteId} />
        )}
      </div>

      {/* Modals */}
      {showAutoModal && <AutoOrganizeModal onClose={() => setShowAutoModal(false)} />}

      {/* Context menu */}
      {ctx && <ContextMenu x={ctx.x} y={ctx.y} items={ctxItems} onClose={() => setCtx(null)} />}
    </div>
  )
}

// ─── Unfiled section ──────────────────────────────────────────────────────────

function UnfiledSection({ notes, activeNoteId }: { notes: Note[]; activeNoteId: string | null }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const unfiled = notes.filter(n => !n.folderId)
  if (unfiled.length === 0) return null

  return (
    <div>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          paddingLeft: '8px',
          paddingRight: '8px',
          height: '28px',
          cursor: 'pointer',
          color: 'var(--text-3)',
          userSelect: 'none',
          borderTop: '1px solid var(--border-1)',
          marginTop: '4px',
        }}
      >
        <span style={{ display: 'flex', width: '14px' }}>
          {open ? <IcoChevronDown /> : <IcoChevronRight />}
        </span>
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', flex: 1 }}>
          Sin carpeta
        </span>
        <span
          style={{
            fontSize: '10px',
            background: 'var(--bg-3)',
            borderRadius: '5px',
            padding: '1px 5px',
          }}
        >
          {unfiled.length}
        </span>
      </div>
      {open &&
        unfiled
          .slice()
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .map(note => (
            <NoteRow
              key={note.id}
              note={note}
              depth={0}
              isActive={activeNoteId === note.id}
              onSelect={() => {
                dispatch(setActiveNoteId(note.id))
                navigate(`/editor/${note.id}`)
              }}
            />
          ))}
    </div>
  )
}

// ─── Toolbar button ───────────────────────────────────────────────────────────

function ToolBtn({
  children,
  title,
  onClick,
  accent,
}: {
  children: React.ReactNode
  title: string
  onClick: () => void
  accent?: boolean
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '22px',
        height: '22px',
        border: 'none',
        borderRadius: '4px',
        background: 'transparent',
        color: accent ? 'var(--accent-400)' : 'var(--text-3)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all var(--transition-fast)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.background = accent ? 'var(--accent-glow)' : 'var(--bg-3)'
        el.style.color = accent ? 'var(--accent-300)' : 'var(--text-1)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.background = 'transparent'
        el.style.color = accent ? 'var(--accent-400)' : 'var(--text-3)'
      }}
    >
      {children}
    </button>
  )
}
