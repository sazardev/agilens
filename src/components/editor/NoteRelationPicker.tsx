/**
 * NoteRelationPicker — Modal de búsqueda de notas para relacionar.
 * Se abre desde el menú slash (/relacionar) y permite buscar notas
 * con filtros avanzados: texto, tipo, sprint, proyecto y etiquetas.
 * Al seleccionar una nota inserta [[Título de la nota]] en el editor.
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAppSelector } from '@/store'
import type { Note, NoteType } from '@/types'
import { NOTE_TYPE_META } from '@/types'
import { NoteTypeIcon } from '@/lib/noteIcons'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function relDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'ayer'
  if (diff < 7) return `hace ${diff} días`
  if (diff < 30) return `hace ${Math.floor(diff / 7)} sem`
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short' })
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IcoSearch = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const IcoX = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const IcoLink = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)

const IcoChevron = ({ open }: { open: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  /** Insertar referencia a la nota seleccionada */
  onSelect: (note: Note) => void
  onClose: () => void
  /** Nota actual excluida de los resultados */
  excludeId?: string
}

const ALL_TYPES: NoteType[] = [
  'note',
  'daily',
  'evidence',
  'technical',
  'meeting',
  'sprint',
  'task',
]

// ─── Dropdown helpers ─────────────────────────────────────────────────────────

function DropButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onMouseDown={e => {
        e.preventDefault()
        onClick()
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        borderRadius: 6,
        border: `1px solid ${active ? 'var(--accent-500)' : 'var(--border)'}`,
        background: active ? 'rgba(var(--accent-rgb,99,102,241),0.12)' : 'var(--surface-2)',
        color: active ? 'var(--accent-500)' : 'var(--text-2)',
        fontSize: 12,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.12s',
      }}
    >
      {label}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NoteRelationPicker({ onSelect, onClose, excludeId }: Props) {
  const notes = useAppSelector(s => s.notes.notes)
  const sprints = useAppSelector(s => s.daily.sprints)
  const _allProjects = useAppSelector(s => s.projects.projects)
  const projects = useMemo(() => _allProjects.filter(p => !p.archived), [_allProjects])

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<NoteType | null>(null)
  const [sprintFilter, setSprintFilter] = useState<string | null>(null)
  const [projectFilter, setProjectFilter] = useState<string | null>(null)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [activeIdx, setActiveIdx] = useState(0)

  const [showSprintDrop, setShowSprintDrop] = useState(false)
  const [showProjectDrop, setShowProjectDrop] = useState(false)
  const [showTagDrop, setShowTagDrop] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Recopilar todas las etiquetas únicas
  const allTags = useMemo(() => {
    const s = new Set<string>()
    notes.forEach(n => n.tags.forEach(t => s.add(t)))
    return [...s].sort()
  }, [notes])

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const results = useMemo(() => {
    const q = normalize(query.trim())
    return notes
      .filter(n => n.id !== excludeId)
      .filter(n => !typeFilter || n.noteType === typeFilter)
      .filter(n => !sprintFilter || n.sprintId === sprintFilter)
      .filter(n => {
        if (!projectFilter) return true
        return n.projectIds?.includes(projectFilter) || n.projectId === projectFilter
      })
      .filter(n => !tagFilter || n.tags.includes(tagFilter))
      .filter(n => {
        if (!q) return true
        const hay = normalize([n.title, n.content.slice(0, 300), ...n.tags].join(' '))
        return q.split(' ').every(w => hay.includes(w))
      })
      .sort((a, b) => {
        // Primero pinned, luego más reciente
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
      .slice(0, 60)
  }, [notes, query, typeFilter, sprintFilter, projectFilter, tagFilter, excludeId])

  // Resetear índice cuando cambian resultados
  useEffect(() => {
    setActiveIdx(0)
  }, [results])

  // Foco automático al montar
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  // ── Teclado global ────────────────────────────────────────────────────────
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx(i => Math.min(i + 1, results.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx(i => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter' && results[activeIdx]) {
        e.preventDefault()
        onSelect(results[activeIdx])
      }
    },
    [results, activeIdx, onClose, onSelect]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [handleKey])

  // Scroll al item activo
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  // ── Sprint/Project lookup ─────────────────────────────────────────────────
  const sprintMap = useMemo(() => {
    const m: Record<string, string> = {}
    sprints.forEach(s => {
      m[s.id] = s.name
    })
    return m
  }, [sprints])

  const projectMap = useMemo(() => {
    const m: Record<string, { name: string; color: string }> = {}
    projects.forEach(p => {
      m[p.id] = { name: p.name, color: p.color ?? '#6366f1' }
    })
    return m
  }, [projects])

  // ── Active label helpers ──────────────────────────────────────────────────
  const sprintLabel = sprintFilter ? (sprintMap[sprintFilter] ?? 'Sprint') : 'Sprint'
  const projectLabel = projectFilter ? (projectMap[projectFilter]?.name ?? 'Proyecto') : 'Proyecto'
  const tagLabel = tagFilter ?? 'Etiqueta'

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
      }}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 620,
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: 'var(--surface-1)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          maxHeight: '72vh',
        }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <IcoLink />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>
            Relacionar nota
          </span>
          <button
            onMouseDown={e => {
              e.preventDefault()
              onClose()
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-3)',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
            }}
          >
            <IcoX />
          </button>
        </div>

        {/* ── Buscador ────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <IcoSearch />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por título, contenido o etiquetas…"
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-1)',
              fontSize: 14,
            }}
          />
          {query && (
            <button
              onMouseDown={e => {
                e.preventDefault()
                setQuery('')
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-3)',
                display: 'flex',
                padding: 2,
              }}
            >
              <IcoX />
            </button>
          )}
        </div>

        {/* ── Filtros ─────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {/* Tipo de nota */}
          {ALL_TYPES.map(t => {
            const meta = NOTE_TYPE_META[t]
            const active = typeFilter === t
            return (
              <button
                key={t}
                onMouseDown={e => {
                  e.preventDefault()
                  setTypeFilter(active ? null : t)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 9px',
                  borderRadius: 6,
                  border: `1px solid ${active ? meta.color : 'var(--border)'}`,
                  background: active ? `${meta.color}20` : 'var(--surface-2)',
                  color: active ? meta.color : 'var(--text-2)',
                  fontSize: 11,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                <NoteTypeIcon type={t} size={11} />
                {meta.label}
              </button>
            )
          })}

          {/* Sprint */}
          <div style={{ position: 'relative' }}>
            <DropButton
              label={sprintLabel}
              active={!!sprintFilter}
              onClick={() => {
                setShowSprintDrop(v => !v)
                setShowProjectDrop(false)
                setShowTagDrop(false)
              }}
            />
            {showSprintDrop && (
              <div
                style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  zIndex: 10,
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  minWidth: 180,
                  maxHeight: 220,
                  overflowY: 'auto',
                  padding: 4,
                }}
              >
                <button
                  onMouseDown={e => {
                    e.preventDefault()
                    setSprintFilter(null)
                    setShowSprintDrop(false)
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 10px',
                    borderRadius: 5,
                    border: 'none',
                    background: !sprintFilter ? 'rgba(var(--accent-rgb,99,102,241),0.12)' : 'none',
                    color: 'var(--text-2)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Todos los sprints
                </button>
                {sprints.map(s => (
                  <button
                    key={s.id}
                    onMouseDown={e => {
                      e.preventDefault()
                      setSprintFilter(s.id)
                      setShowSprintDrop(false)
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 10px',
                      borderRadius: 5,
                      border: 'none',
                      background:
                        sprintFilter === s.id ? 'rgba(var(--accent-rgb,99,102,241),0.12)' : 'none',
                      color: 'var(--text-1)',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Proyecto */}
          <div style={{ position: 'relative' }}>
            <DropButton
              label={projectLabel}
              active={!!projectFilter}
              onClick={() => {
                setShowProjectDrop(v => !v)
                setShowSprintDrop(false)
                setShowTagDrop(false)
              }}
            />
            {showProjectDrop && (
              <div
                style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  zIndex: 10,
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  minWidth: 180,
                  maxHeight: 220,
                  overflowY: 'auto',
                  padding: 4,
                }}
              >
                <button
                  onMouseDown={e => {
                    e.preventDefault()
                    setProjectFilter(null)
                    setShowProjectDrop(false)
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 10px',
                    borderRadius: 5,
                    border: 'none',
                    background: !projectFilter ? 'rgba(var(--accent-rgb,99,102,241),0.12)' : 'none',
                    color: 'var(--text-2)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Todos los proyectos
                </button>
                {projects.map(p => (
                  <button
                    key={p.id}
                    onMouseDown={e => {
                      e.preventDefault()
                      setProjectFilter(p.id)
                      setShowProjectDrop(false)
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 10px',
                      borderRadius: 5,
                      border: 'none',
                      background:
                        projectFilter === p.id ? 'rgba(var(--accent-rgb,99,102,241),0.12)' : 'none',
                      color: 'var(--text-1)',
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: p.color ?? '#6366f1',
                        flexShrink: 0,
                      }}
                    />
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Etiqueta */}
          {allTags.length > 0 && (
            <div style={{ position: 'relative' }}>
              <DropButton
                label={tagLabel}
                active={!!tagFilter}
                onClick={() => {
                  setShowTagDrop(v => !v)
                  setShowSprintDrop(false)
                  setShowProjectDrop(false)
                }}
              />
              {showTagDrop && (
                <div
                  style={{
                    position: 'absolute',
                    top: '110%',
                    left: 0,
                    zIndex: 10,
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    minWidth: 160,
                    maxHeight: 220,
                    overflowY: 'auto',
                    padding: 4,
                  }}
                >
                  <button
                    onMouseDown={e => {
                      e.preventDefault()
                      setTagFilter(null)
                      setShowTagDrop(false)
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 10px',
                      borderRadius: 5,
                      border: 'none',
                      background: !tagFilter ? 'rgba(var(--accent-rgb,99,102,241),0.12)' : 'none',
                      color: 'var(--text-2)',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Todas las etiquetas
                  </button>
                  {allTags.map(t => (
                    <button
                      key={t}
                      onMouseDown={e => {
                        e.preventDefault()
                        setTagFilter(t)
                        setShowTagDrop(false)
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '6px 10px',
                        borderRadius: 5,
                        border: 'none',
                        background:
                          tagFilter === t ? 'rgba(var(--accent-rgb,99,102,241),0.12)' : 'none',
                        color: 'var(--text-1)',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Limpiar filtros */}
          {(typeFilter || sprintFilter || projectFilter || tagFilter) && (
            <button
              onMouseDown={e => {
                e.preventDefault()
                setTypeFilter(null)
                setSprintFilter(null)
                setProjectFilter(null)
                setTagFilter(null)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'none',
                color: 'var(--text-3)',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              <IcoX /> Limpiar
            </button>
          )}
        </div>

        {/* ── Resultados ──────────────────────────────────────── */}
        <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
          {results.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--text-3)',
                fontSize: 13,
              }}
            >
              No se encontraron notas
            </div>
          ) : (
            results.map((note, idx) => {
              const active = idx === activeIdx
              const typeMeta = NOTE_TYPE_META[note.noteType]
              const sprintName = note.sprintId ? sprintMap[note.sprintId] : null
              const noteProjects = [
                ...(note.projectIds ?? []),
                ...(note.projectId ? [note.projectId] : []),
              ]
                .filter((id, i, arr) => arr.indexOf(id) === i)
                .map(id => projectMap[id])
                .filter(Boolean)

              return (
                <button
                  key={note.id}
                  data-idx={idx}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onMouseDown={e => {
                    e.preventDefault()
                    onSelect(note)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 16px',
                    border: 'none',
                    background: active ? 'var(--surface-2)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.08s',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {/* Icono de tipo */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: `${typeMeta.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: typeMeta.color,
                      marginTop: 1,
                    }}
                  >
                    <NoteTypeIcon type={note.noteType} size={14} />
                  </div>

                  {/* Contenido */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-1)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                      >
                        {note.title || 'Sin título'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>
                        {relDate(note.updatedAt)}
                      </span>
                    </div>

                    {/* Metadatos */}
                    <div
                      style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}
                    >
                      {/* Tipo */}
                      <span
                        style={{
                          fontSize: 10,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: `${typeMeta.color}18`,
                          color: typeMeta.color,
                          fontWeight: 500,
                        }}
                      >
                        {typeMeta.label}
                      </span>

                      {/* Sprint */}
                      {sprintName && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'rgba(167,139,250,0.15)',
                            color: '#a78bfa',
                            fontWeight: 500,
                          }}
                        >
                          {sprintName}
                        </span>
                      )}

                      {/* Proyectos */}
                      {noteProjects.map((p, pi) => (
                        <span
                          key={pi}
                          style={{
                            fontSize: 10,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: `${p.color}18`,
                            color: p.color,
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: p.color,
                            }}
                          />
                          {p.name}
                        </span>
                      ))}

                      {/* Etiquetas */}
                      {note.tags.slice(0, 3).map(t => (
                        <span
                          key={t}
                          style={{
                            fontSize: 10,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'var(--surface-3, rgba(255,255,255,0.06))',
                            color: 'var(--text-3)',
                          }}
                        >
                          #{t}
                        </span>
                      ))}
                      {note.tags.length > 3 && (
                        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                          +{note.tags.length - 3}
                        </span>
                      )}

                      {/* Preview de contenido */}
                      {note.content && (
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--text-3)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 220,
                            marginLeft: 2,
                          }}
                        >
                          {note.content
                            .replace(/[#*`>\[\]_~]/g, '')
                            .trim()
                            .slice(0, 80)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hint de acción */}
                  {active && (
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--text-3)',
                        flexShrink: 0,
                        paddingTop: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <kbd
                        style={{
                          background: 'var(--surface-3, rgba(255,255,255,0.08))',
                          border: '1px solid var(--border)',
                          borderRadius: 3,
                          padding: '1px 4px',
                          fontSize: 10,
                          fontFamily: 'monospace',
                        }}
                      >
                        ↵
                      </kbd>
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            borderTop: '1px solid var(--border)',
            color: 'var(--text-3)',
            fontSize: 11,
          }}
        >
          <span>
            {results.length} nota{results.length !== 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span>
              <kbd
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  padding: '1px 4px',
                  fontSize: 10,
                  fontFamily: 'monospace',
                }}
              >
                ↑↓
              </kbd>{' '}
              navegar
            </span>
            <span>
              <kbd
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  padding: '1px 4px',
                  fontSize: 10,
                  fontFamily: 'monospace',
                }}
              >
                ↵
              </kbd>{' '}
              insertar
            </span>
            <span>
              <kbd
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  padding: '1px 4px',
                  fontSize: 10,
                  fontFamily: 'monospace',
                }}
              >
                Esc
              </kbd>{' '}
              cerrar
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
