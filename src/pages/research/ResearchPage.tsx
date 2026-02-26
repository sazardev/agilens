/**
 * ResearchPage — Cuaderno de investigación.
 * Diseño idéntico a TaskPage: split formulario + preview Markdown en tiempo real,
 * resize handle arrastrable, mismas cards/tipografía/botones.
 */
import { useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { nanoid } from '@reduxjs/toolkit'
import { useAppDispatch, useAppSelector } from '@/store'
import { useMobile } from '@/hooks/useMobile'
import { addNote } from '@/store/slices/notesSlice'
import { setActiveNoteId } from '@/store/slices/uiSlice'
import type { Note } from '@/types'
import NoteRelationPicker from '@/components/editor/NoteRelationPicker'
import ProjectPicker from '@/components/projects/ProjectPicker'

function nowISO() {
  return new Date().toISOString()
}

function Ico(paths: React.ReactNode, size = 13) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths}
    </svg>
  )
}
const IcoArrowLeft = () =>
  Ico(
    <>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </>
  )
const IcoResearch = ({ color }: { color?: string }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color ?? 'currentColor'}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
)
const IcoPreview = () =>
  Ico(
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  )
const IcoPlus = () =>
  Ico(
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  )
const IcoX = () =>
  Ico(
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  )
const IcoLink = () =>
  Ico(
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  )
const IcoSave = () =>
  Ico(
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </>,
    14
  )
const IcoTrash = () =>
  Ico(
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </>
  )

const CARD: React.CSSProperties = {
  background: 'var(--bg-2)',
  border: '1px solid var(--border-1)',
  borderRadius: 'var(--radius-md)',
  padding: '14px 16px',
}

function CardHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
      <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-2)' }}>{icon}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)', flex: 1 }}>
        {label}
      </span>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'block',
        fontSize: '10px',
        fontWeight: 700,
        color: 'var(--text-3)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: '7px',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {children}
    </span>
  )
}

function TagInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('')
  function addTag(raw: string) {
    const t = raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '')
    if (!t || value.includes(t)) return
    onChange([...value, t])
    setInput('')
  }
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '5px',
        alignItems: 'center',
        padding: '5px 8px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-1)',
        background: 'var(--bg-1)',
        minHeight: 34,
        cursor: 'text',
      }}
      onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement | null)?.focus()}
    >
      {value.map(t => (
        <span
          key={t}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            padding: '1px 7px',
            borderRadius: '99px',
            background: 'var(--accent-glow)',
            border: '1px solid var(--accent-600)',
            color: 'var(--accent-400)',
            fontSize: '11px',
            fontWeight: 500,
          }}
        >
          #{t}
          <button
            onMouseDown={e => {
              e.preventDefault()
              onChange(value.filter(x => x !== t))
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              padding: '0 1px',
              display: 'flex',
              opacity: 0.7,
            }}
          >
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addTag(input)
          }
          if (e.key === 'Backspace' && !input && value.length) onChange(value.slice(0, -1))
        }}
        onBlur={() => addTag(input)}
        placeholder={value.length ? '' : 'Añadir etiqueta...'}
        style={{
          background: 'none',
          border: 'none',
          outline: 'none',
          color: 'var(--text-1)',
          fontSize: '12px',
          minWidth: 100,
          lineHeight: 1.4,
        }}
      />
    </div>
  )
}

interface RefEntry {
  id: string
  url: string
  description: string
}

function buildMarkdown(hallazgos: string, refs: RefEntry[], codigo: string, notas: string): string {
  const parts: string[] = []
  if (hallazgos.trim()) parts.push(`## Hallazgos y descubrimientos\n\n${hallazgos.trim()}`)
  const activeRefs = refs.filter(r => r.url.trim())
  if (activeRefs.length) {
    const rows = activeRefs
      .map(r => `- [${r.description.trim() || r.url.trim()}](${r.url.trim()})`)
      .join('\n')
    parts.push(`## Referencias\n\n${rows}`)
  }
  if (codigo.trim()) parts.push(`## Código y ejemplos\n\n${codigo.trim()}`)
  if (notas.trim()) parts.push(`## Notas adicionales\n\n${notas.trim()}`)
  return parts.join('\n\n')
}

export default function ResearchPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const sprints = useAppSelector(s => s.daily.sprints)
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

  const SPLIT_KEY = 'agilens_research_split'
  const [splitPct, setSplitPct] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(SPLIT_KEY)) || 48
    } catch {
      return 48
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
      const pct = Math.min(Math.max(((ev.clientX - rect.left) / rect.width) * 100, 28), 72)
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

  const [title, setTitle] = useState('')
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null)
  const [linkedTaskTitle, setLinkedTaskTitle] = useState<string | null>(null)
  const [sprintId, setSprintId] = useState('')
  const [projectIds, setProjectIds] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [hallazgos, setHallazgos] = useState('')
  const [refs, setRefs] = useState<RefEntry[]>([{ id: nanoid(), url: '', description: '' }])
  const [codigo, setCodigo] = useState('')
  const [notas, setNotas] = useState('')
  const [showTaskPicker, setShowTaskPicker] = useState(false)
  const [showPreview, setShowPreview] = useState(() => window.innerWidth >= 1080)
  const isMobile = useMobile()
  const effectiveShowPreview = showPreview && !isMobile
  const [savedFlash, setSavedFlash] = useState(false)

  const handleLinkTask = useCallback((note: Note) => {
    setLinkedTaskId(note.id)
    setLinkedTaskTitle(note.title)
    setShowTaskPicker(false)
    if (note.sprintId) setSprintId(note.sprintId)
    if (note.projectIds?.length) setProjectIds(note.projectIds)
    else if (note.projectId) setProjectIds([note.projectId])
  }, [])

  const addRef = useCallback(
    () => setRefs(prev => [...prev, { id: nanoid(), url: '', description: '' }]),
    []
  )
  const updateRef = useCallback(
    (id: string, field: 'url' | 'description', value: string) =>
      setRefs(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r))),
    []
  )
  const removeRef = useCallback(
    (id: string) => setRefs(prev => (prev.length > 1 ? prev.filter(r => r.id !== id) : prev)),
    []
  )

  const mdContent = useMemo(
    () => buildMarkdown(hallazgos, refs, codigo, notas),
    [hallazgos, refs, codigo, notas]
  )

  const previewMd = useMemo(() => {
    const metaLines: string[] = []
    if (linkedTaskTitle) metaLines.push(`**Tarea vinculada:** [[${linkedTaskTitle}]]`)
    if (sprintId) {
      const sp = sprints.find(x => x.id === sprintId)
      if (sp) metaLines.push(`**Sprint:** ${sp.name}`)
    }
    if (tags.length) metaLines.push(`**Etiquetas:** ${tags.map(t => `\`#${t}\``).join('  ')}`)
    const t = title.trim() || 'Sin título'
    const meta = metaLines.join('  \n')
    const body = mdContent || '*Sin contenido aún.*'
    return `# ${t}\n\n${meta}${meta ? '\n\n---\n\n' : ''}${body}`
  }, [title, linkedTaskTitle, sprintId, sprints, tags, mdContent])

  const handleSave = useCallback(() => {
    if (!title.trim()) return
    const now = nowISO()
    const note: Note = {
      id: nanoid(),
      title: title.trim(),
      content: mdContent,
      tags,
      noteType: 'research',
      sprintId: sprintId || undefined,
      projectIds: projectIds.length ? projectIds : undefined,
      linkedTaskId: linkedTaskId ?? undefined,
      attachments: [],
      createdAt: now,
      updatedAt: now,
    }
    dispatch(addNote(note))
    dispatch(setActiveNoteId(note.id))
    setSavedFlash(true)
    setTimeout(() => navigate(`/editor/${note.id}`), 800)
  }, [title, mdContent, tags, sprintId, projectIds, linkedTaskId, dispatch, navigate])

  void projects

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', display: 'flex', overflow: 'hidden', background: 'var(--bg-0)' }}
    >
      {/* Form column */}
      <div
        style={{
          flex: effectiveShowPreview ? `0 0 ${splitPct}%` : '1 1 auto',
          overflowY: 'auto',
          minWidth: 0,
        }}
      >
        <div
          style={{
            maxWidth: '680px',
            margin: '0 auto',
            padding: 'clamp(20px,4vw,36px) clamp(14px,4vw,28px) 80px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate(-1)}
              aria-label="Volver"
              style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }}
            >
              <IcoArrowLeft />
            </button>
            <div style={{ flex: 1, minWidth: 0, padding: '0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IcoResearch color="#22d3ee" />
                <h1
                  style={{
                    fontSize: '17px',
                    fontWeight: 600,
                    color: 'var(--text-0)',
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Nueva Investigación
                </h1>
              </div>
            </div>
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
              <IcoPreview /> {!isMobile && 'Vista previa'}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!title.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: 'var(--radius-md)',
                flexShrink: 0,
                opacity: title.trim() ? 1 : 0.45,
              }}
            >
              <IcoSave /> {isMobile ? 'Crear' : 'Crear Investigación'}
            </button>
          </div>

          {/* Título */}
          <div style={CARD}>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Título de la investigación..."
              autoFocus
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text-0)',
                fontSize: '20px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                padding: 0,
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Contexto */}
          <div style={CARD}>
            <CardHeader
              icon={Ico(
                <>
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </>
              )}
              label="Contexto"
            />

            {/* Tarea vinculada */}
            <div style={{ marginBottom: '12px' }}>
              <FieldLabel>Tarea vinculada (hereda sprint y proyectos)</FieldLabel>
              {linkedTaskId ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 10px',
                    borderRadius: '99px',
                    border: '1px solid var(--border-1)',
                    background: 'rgba(34,211,238,0.08)',
                    color: '#22d3ee',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  <IcoLink /> {linkedTaskTitle}
                  <button
                    onClick={() => {
                      setLinkedTaskId(null)
                      setLinkedTaskTitle(null)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'inherit',
                      padding: '0 1px',
                      display: 'flex',
                      opacity: 0.7,
                    }}
                  >
                    <IcoX />
                  </button>
                </span>
              ) : (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowTaskPicker(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <IcoLink /> Vincular tarea
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {/* Sprint */}
              <div style={{ flex: 1, minWidth: 148 }}>
                <FieldLabel>Sprint</FieldLabel>
                {sprints.length > 0 ? (
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {sprints.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setSprintId(id => (id === s.id ? '' : s.id))}
                        style={{
                          padding: '2px 10px',
                          borderRadius: '20px',
                          border: '1px solid',
                          borderColor: sprintId === s.id ? 'var(--border-2)' : 'var(--border-1)',
                          background: sprintId === s.id ? 'var(--accent-glow)' : 'transparent',
                          color: sprintId === s.id ? 'var(--accent-400)' : 'var(--text-1)',
                          fontSize: '12px',
                          fontWeight: sprintId === s.id ? 600 : 400,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-3)', fontStyle: 'italic' }}>
                    Sin sprints
                  </span>
                )}
              </div>

              {/* Proyecto */}
              <div style={{ flex: '1 1 100%' }}>
                <FieldLabel>Proyecto</FieldLabel>
                <ProjectPicker
                  selectedIds={projectIds}
                  onChange={setProjectIds}
                  mode="multi"
                  placeholder="Buscar o vincular proyectos..."
                  fullWidth
                />
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <FieldLabel>Etiquetas</FieldLabel>
              <TagInput value={tags} onChange={setTags} />
            </div>
          </div>

          {/* Hallazgos */}
          <div style={CARD}>
            <CardHeader
              icon={Ico(
                <>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </>
              )}
              label="Hallazgos y descubrimientos"
            />
            <textarea
              className="input-base"
              value={hallazgos}
              onChange={e => setHallazgos(e.target.value)}
              placeholder={
                '¿Qué descubriste? Escribe en Markdown...\n\nEjemplo:\n- useCallback solo ayuda cuando el hijo está memoizado con React.memo\n- El re-render ocurre porque el objeto se recrea en cada render padre'
              }
              rows={6}
              style={{
                width: '100%',
                resize: 'vertical',
                fontSize: '13px',
                lineHeight: 1.6,
                fontFamily: 'var(--font-mono)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Referencias */}
          <div style={CARD}>
            <CardHeader icon={<IcoLink />} label="Referencias y enlaces" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '3fr 4fr auto',
                  gap: '8px',
                  paddingLeft: '2px',
                }}
              >
                <FieldLabel>Descripción</FieldLabel>
                <FieldLabel>URL</FieldLabel>
                <span />
              </div>
              {refs.map(ref => (
                <div
                  key={ref.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '3fr 4fr auto',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <input
                    className="input-base"
                    placeholder="Artículo sobre useMemo..."
                    value={ref.description}
                    onChange={e => updateRef(ref.id, 'description', e.target.value)}
                    style={{ fontSize: '12px' }}
                  />
                  <input
                    className="input-base"
                    placeholder="https://..."
                    value={ref.url}
                    onChange={e => updateRef(ref.id, 'url', e.target.value)}
                    style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                  />
                  <button
                    onClick={() => removeRef(ref.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-3)',
                      display: 'flex',
                      padding: '4px',
                      borderRadius: '4px',
                    }}
                    title="Eliminar"
                  >
                    <IcoTrash />
                  </button>
                </div>
              ))}
              <button
                className="btn btn-ghost btn-sm"
                onClick={addRef}
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginTop: '4px',
                }}
              >
                <IcoPlus /> Añadir referencia
              </button>
            </div>
          </div>

          {/* Código */}
          <div style={CARD}>
            <CardHeader
              icon={Ico(
                <>
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </>
              )}
              label="Código y ejemplos"
            />
            <textarea
              className="input-base"
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              placeholder={
                'Pega código de ejemplo con bloques Markdown:\n\n```ts\nconst memoized = useMemo(() => compute(x), [x])\n```'
              }
              rows={5}
              style={{
                width: '100%',
                resize: 'vertical',
                fontSize: '13px',
                lineHeight: 1.6,
                fontFamily: 'var(--font-mono)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Notas adicionales */}
          <div style={CARD}>
            <CardHeader
              icon={Ico(
                <>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </>
              )}
              label="Notas adicionales"
            />
            <textarea
              className="input-base"
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Observaciones, dudas pendientes, próximos pasos..."
              rows={3}
              style={{
                width: '100%',
                resize: 'vertical',
                fontSize: '13px',
                lineHeight: 1.6,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              padding: '4px 2px 0',
              borderTop: '1px solid var(--border-1)',
            }}
          >
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!title.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: 'var(--radius-md)',
                opacity: title.trim() ? 1 : 0.45,
              }}
            >
              <IcoSave /> Crear Investigación
            </button>
          </div>
        </div>
      </div>

      {/* Resize handle */}
      {effectiveShowPreview && (
        <div
          className="daily-resize-handle"
          onPointerDown={handleDragStart}
          title="Arrastrar para redimensionar"
        />
      )}

      {/* Preview column */}
      {effectiveShowPreview && (
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
            <IcoPreview /> Vista previa de nota
            <span
              style={{
                padding: '1px 8px',
                borderRadius: '99px',
                background: 'rgba(34,211,238,0.12)',
                color: '#22d3ee',
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'none',
                letterSpacing: 0,
                marginLeft: '6px',
              }}
            >
              Investigación
            </span>
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
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewMd}</ReactMarkdown>
            </article>
          </div>
        </div>
      )}

      {showTaskPicker && (
        <NoteRelationPicker
          onSelect={note => handleLinkTask(note)}
          onClose={() => setShowTaskPicker(false)}
        />
      )}
    </div>
  )
}
