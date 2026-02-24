import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store'
import { setActiveNoteId, setEditorPreviewMode } from '@/store/slices/uiSlice'
import {
  updateNote,
  addNote,
  deleteNote,
  addAttachment,
  setNoteFolder,
} from '@/store/slices/notesSlice'
import type { NoteAttachment, NoteType } from '@/types'
import { NOTE_TYPE_META } from '@/types'
import { NoteTypeIcon } from '@/lib/noteIcons'
import { nanoid } from 'nanoid'
import MarkdownEditor, {
  type MarkdownEditorHandle,
  type FormatCmd,
} from '@/components/editor/MarkdownEditor'
import MarkdownPreview from '@/components/editor/MarkdownPreview'
import { downloadNoteAsMarkdown, printNote } from '@/lib/export'
import { markdownToHtml } from '@/lib/markdown/processor'
import { saveAttachmentBlob } from '@/lib/attachmentsDb'
import { writeAttachmentFile } from '@/lib/git/client'
import { GIT_DIR } from '@/store/slices/gitSlice'

const modeLabels = { edit: 'Editor', split: 'Split', preview: 'Preview' } as const

// ─── Formatting toolbar config ────────────────────────────────────────────────
interface FmtBtn {
  cmd: FormatCmd
  label: string
  title: string
  icon?: string
}
const FMT_GROUPS: FmtBtn[][] = [
  [
    { cmd: 'h1', label: 'H1', title: 'Encabezado 1' },
    { cmd: 'h2', label: 'H2', title: 'Encabezado 2' },
    { cmd: 'h3', label: 'H3', title: 'Encabezado 3' },
  ],
  [
    { cmd: 'bold', label: 'B', title: 'Negrita (Ctrl+B)' },
    { cmd: 'italic', label: 'I', title: 'Cursiva (Ctrl+I)' },
    { cmd: 'strikethrough', label: 'S\u0336', title: 'Tachado' },
  ],
  [
    { cmd: 'inlineCode', label: '`', title: 'Código en línea' },
    { cmd: 'codeBlock', label: '```', title: 'Bloque de código' },
  ],
  [
    { cmd: 'link', label: '⎘', title: 'Enlace' },
    { cmd: 'image', label: '⊞', title: 'Imagen' },
    { cmd: 'wikiLink', label: '[[]]', title: 'Enlace interno (wiki)' },
  ],
  [
    { cmd: 'bulletList', label: '≡', title: 'Lista con viñetas' },
    { cmd: 'numberedList', label: '1≡', title: 'Lista numerada' },
    { cmd: 'blockquote', label: '❝', title: 'Cita' },
  ],
  [
    { cmd: 'hr', label: '—', title: 'Separador horizontal' },
    { cmd: 'table', label: '⊞', title: 'Tabla' },
  ],
]

// ─── Icon components ──────────────────────────────────────────────────────────
function BoldIcon() {
  return <b style={{ fontFamily: 'serif', fontSize: '14px', fontWeight: 800 }}>B</b>
}
function ItalicIcon() {
  return <i style={{ fontFamily: 'serif', fontSize: '14px' }}>I</i>
}
function StrikeIcon() {
  return <s style={{ fontFamily: 'inherit', fontSize: '13px' }}>S</s>
}

function FmtIcon({ cmd, label }: { cmd: FormatCmd; label: string }) {
  if (cmd === 'bold') return <BoldIcon />
  if (cmd === 'italic') return <ItalicIcon />
  if (cmd === 'strikethrough') return <StrikeIcon />
  if (cmd === 'link')
    return (
      <svg
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </svg>
    )
  if (cmd === 'image')
    return (
      <svg
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    )
  if (cmd === 'bulletList')
    return (
      <svg
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <line x1="9" y1="6" x2="20" y2="6" />
        <line x1="9" y1="12" x2="20" y2="12" />
        <line x1="9" y1="18" x2="20" y2="18" />
        <circle cx="4" cy="6" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    )
  if (cmd === 'numberedList')
    return (
      <svg
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <line x1="10" y1="6" x2="21" y2="6" />
        <line x1="10" y1="12" x2="21" y2="12" />
        <line x1="10" y1="18" x2="21" y2="18" />
        <path d="M4 6h1v4M4 12c0-1 2-1 2 0s-2 2-2 2h2M5 18v-2l-1 1" strokeLinecap="round" />
      </svg>
    )
  if (cmd === 'blockquote')
    return (
      <svg
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
      </svg>
    )
  if (cmd === 'hr')
    return (
      <svg width="14" height="14" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <line x1="3" y1="12" x2="21" y2="12" />
      </svg>
    )
  if (cmd === 'table')
    return (
      <svg
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="12" y1="3" x2="12" y2="21" />
      </svg>
    )
  // Fallback: text label
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600 }}>
      {label}
    </span>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function EditorPage() {
  const { noteId } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const activeNoteId = useAppSelector(s => s.ui.activeNoteId)
  const mode = useAppSelector(s => s.ui.editorPreviewMode)
  const note = useAppSelector(s => s.notes.notes.find(n => n.id === (noteId ?? activeNoteId)))
  const allNotes = useAppSelector(s => s.notes.notes)
  const sprints = useAppSelector(s => s.daily.sprints)
  const folders = useAppSelector(s => s.folders.folders)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorRef = useRef<MarkdownEditorHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)
  // Tracks the live (unsaved) content from CodeMirror — updated synchronously before debounce
  const liveContentRef = useRef<string>(note?.content ?? '')
  const [tagInput, setTagInput] = useState('')
  const [tagFocused, setTagFocused] = useState(false)
  const [tagSuggIdx, setTagSuggIdx] = useState(-1)
  const [showExport, setShowExport] = useState(false)
  const [showBacklinks, setShowBacklinks] = useState(false)
  const [showMeta, setShowMeta] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // All tags across every note, deduplicated and sorted
  const allExistingTags = Array.from(new Set(allNotes.flatMap(n => n.tags))).sort()

  // Suggestions: existing tags that match input and aren't already on this note
  const tagSuggestions =
    tagFocused && tagInput.trim()
      ? allExistingTags.filter(
          t =>
            t.includes(tagInput.trim().toLowerCase()) &&
            t !== tagInput.trim().toLowerCase() &&
            !note?.tags.includes(t)
        )
      : tagFocused && !tagInput.trim()
        ? allExistingTags.filter(t => !note?.tags.includes(t)).slice(0, 8)
        : []

  // Notes that reference the current note by title via [[...]]
  const backlinks =
    note && note.title
      ? allNotes.filter(n => n.id !== note.id && n.content.includes(`[[${note.title}`))
      : []

  useEffect(() => {
    if (noteId) dispatch(setActiveNoteId(noteId))
  }, [noteId, dispatch])

  // Keep liveContentRef in sync when switching notes so image insertion
  // uses the correct note's content as a base
  useEffect(() => {
    liveContentRef.current = note?.content ?? ''
  }, [note?.id])

  const handleChange = useCallback(
    (content: string) => {
      if (!note) return
      liveContentRef.current = content // always track live content synchronously
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
      saveTimeout.current = setTimeout(() => {
        const title = content.match(/^#+ (.+)/m)?.[1] ?? 'Sin título'
        dispatch(updateNote({ id: note.id, content, title }))
      }, 400)
    },
    [note, dispatch]
  )

  const fmt = useCallback((cmd: FormatCmd) => {
    editorRef.current?.format(cmd)
  }, [])

  function addTag(raw: string) {
    if (!note) return
    const tag = raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '')
    if (!tag || note.tags.includes(tag)) return
    dispatch(updateNote({ id: note.id, tags: [...note.tags, tag] }))
  }

  function removeTag(tag: string) {
    if (!note) return
    dispatch(updateNote({ id: note.id, tags: note.tags.filter(t => t !== tag) }))
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setTagSuggIdx(i => Math.min(i + 1, tagSuggestions.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setTagSuggIdx(i => Math.max(i - 1, -1))
      return
    }
    if (e.key === 'Escape') {
      setTagFocused(false)
      setTagSuggIdx(-1)
      tagInputRef.current?.blur()
      return
    }
    if (
      (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') &&
      tagSuggIdx >= 0 &&
      tagSuggestions[tagSuggIdx]
    ) {
      e.preventDefault()
      addTag(tagSuggestions[tagSuggIdx])
      setTagInput('')
      setTagSuggIdx(-1)
      return
    }
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
      setTagInput('')
      setTagSuggIdx(-1)
    } else if (e.key === 'Tab' && tagInput.trim()) {
      e.preventDefault()
      addTag(tagInput)
      setTagInput('')
      setTagSuggIdx(-1)
    } else if (e.key === 'Backspace' && !tagInput && note?.tags.length) {
      removeTag(note.tags[note.tags.length - 1])
    }
  }

  // ── Metadata assignment ────────────────────────────────────────────────────
  function handleSetNoteType(type: NoteType) {
    if (!note) return
    dispatch(updateNote({ id: note.id, noteType: type }))
  }

  function handleSetSprint(sprintId: string | null) {
    if (!note) return
    dispatch(updateNote({ id: note.id, sprintId: sprintId ?? undefined }))
  }

  function handleSetFolder(folderId: string | null) {
    if (!note) return
    dispatch(setNoteFolder({ noteId: note.id, folderId }))
  }

  // ── Close meta/export dropdowns when clicking outside ─────────────────────
  useEffect(() => {
    if (!showMeta && !showExport) return
    function handleOutside() {
      setShowMeta(false)
      setShowExport(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [showMeta, showExport])

  // ── Image handling ─────────────────────────────────────────────────────────
  function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleImageFiles(files: File[]) {
    if (!note) return
    // Accumulate markdown text for preview-only mode (no editor mounted)
    let appendedMarkdown = ''
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      const dataUrl = await readFileAsDataURL(file)
      const id = nanoid()
      const attachment: NoteAttachment = {
        id,
        name: file.name,
        type: 'image',
        dataUrl,
        size: file.size,
      }
      dispatch(addAttachment({ noteId: note.id, attachment }))
      // Persist blob to IndexedDB (survives refresh; not subject to localStorage limits)
      void saveAttachmentBlob(id, dataUrl)
      // Also write to LightningFS so git can track the file
      void writeAttachmentFile(GIT_DIR, note.id, id, file.name, dataUrl).catch(() => {
        // LightningFS not available yet (git not initialized) — file will be added on next commit
      })
      const alt = file.name.replace(/\.[^.]+$/, '')
      const markdown = `![${alt}](attachment:${id})\n`
      if (editorRef.current) {
        editorRef.current.insertText(markdown)
      } else {
        appendedMarkdown += markdown
      }
    }

    // Immediately flush content to Redux so the preview updates without waiting the 400ms debounce
    if (saveTimeout.current) clearTimeout(saveTimeout.current)

    let finalContent: string
    if (editorRef.current) {
      // Read directly from CodeMirror's state — guaranteed up-to-date after insertText
      finalContent = editorRef.current.getValue()
    } else {
      // Preview-only mode: append to base content
      const base = liveContentRef.current || note.content
      finalContent = base + (base.endsWith('\n') ? '' : '\n') + appendedMarkdown
    }

    if (finalContent) {
      const title = finalContent.match(/^#+ (.+)/m)?.[1] ?? note.title
      dispatch(updateNote({ id: note.id, content: finalContent, title }))
      liveContentRef.current = finalContent
    }
  }

  function handleEditorPaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData.items)
    const imageItems = items.filter(item => item.type.startsWith('image/'))
    if (imageItems.length === 0) return
    e.preventDefault()
    const files = imageItems.map(item => item.getAsFile()).filter(Boolean) as File[]
    void handleImageFiles(files)
  }

  function handleDragOver(e: React.DragEvent) {
    const hasFiles = Array.from(e.dataTransfer.items).some(
      i => i.kind === 'file' && i.type.startsWith('image/')
    )
    if (!hasFiles) return
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length > 0) void handleImageFiles(files)
  }

  async function handlePrint() {
    if (!note) return
    setShowExport(false)
    const html = await markdownToHtml(note.content)
    printNote(note, html)
  }

  function handleDownload() {
    if (!note) return
    setShowExport(false)
    downloadNoteAsMarkdown(note)
  }

  function handleDuplicate() {
    if (!note) return
    const now = new Date().toISOString()
    const copy = {
      ...note,
      id: nanoid(),
      title: note.title + ' (copia)',
      content: note.content.replace(/^(#+ .+)/m, m => m + ' (copia)'),
      createdAt: now,
      updatedAt: now,
      commitHash: undefined,
    }
    dispatch(addNote(copy))
    dispatch(setActiveNoteId(copy.id))
    navigate(`/editor/${copy.id}`)
  }

  function handleDeleteNote() {
    if (!note) return
    if (!window.confirm(`¿Eliminar "${note.title}"? Esta acción no se puede deshacer.`)) return
    dispatch(deleteNote(note.id))
    dispatch(setActiveNoteId(null))
    navigate('/editor')
  }

  if (!note) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          color: 'var(--text-3)',
        }}
      >
        <svg
          width="40"
          height="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          viewBox="0 0 24 24"
          style={{ opacity: 0.25 }}
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
        <div style={{ textAlign: 'center' }}>
          <p
            style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-1)', margin: '0 0 4px' }}
          >
            Sin nota seleccionada
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
            Selecciona o crea una nota para comenzar
          </p>
        </div>
      </div>
    )
  }

  const wordCount = note.content.trim().split(/\s+/).filter(Boolean).length
  const charCount = note.content.length

  const showFmtBar = mode !== 'preview'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── Main toolbar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0 12px',
          height: 'var(--toolbar-h)',
          borderBottom: showFmtBar ? 'none' : '1px solid var(--border-1)',
          background: 'var(--bg-1)',
          flexShrink: 0,
        }}
      >
        {/* Tags editor */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            flex: 1,
            overflow: 'hidden',
            minWidth: 0,
            flexWrap: 'wrap',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {note.tags.map(tag => (
            <span
              key={tag}
              className="tag tag-accent"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}
            >
              {tag}
              <button
                onMouseDown={e => {
                  e.preventDefault()
                  removeTag(tag)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1,
                  opacity: 0.6,
                  fontSize: '11px',
                }}
                title="Eliminar etiqueta"
              >
                ×
              </button>
            </span>
          ))}

          {/* Input + dropdown */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <input
              ref={tagInputRef}
              type="text"
              value={tagInput}
              onChange={e => {
                setTagInput(e.target.value)
                setTagSuggIdx(-1)
              }}
              onKeyDown={handleTagKeyDown}
              onFocus={() => setTagFocused(true)}
              onBlur={() => {
                // Delay so click on suggestion fires first
                setTimeout(() => {
                  setTagFocused(false)
                  setTagSuggIdx(-1)
                  if (tagInput.trim()) {
                    addTag(tagInput)
                    setTagInput('')
                  }
                }, 150)
              }}
              placeholder={note.tags.length === 0 ? 'Añadir etiqueta…' : '+etiqueta'}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'var(--font-ui)',
                fontSize: '12px',
                color: 'var(--text-2)',
                minWidth: note.tags.length === 0 ? '120px' : '70px',
                maxWidth: '150px',
                padding: '2px 4px',
              }}
            />

            {/* Suggestions dropdown */}
            {tagSuggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  background: 'var(--bg-1)',
                  border: '1px solid var(--border-2)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-md)',
                  zIndex: 80,
                  minWidth: '160px',
                  maxWidth: '240px',
                  overflow: 'hidden',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                {tagInput.trim() && !allExistingTags.includes(tagInput.trim().toLowerCase()) && (
                  <button
                    onMouseDown={e => {
                      e.preventDefault()
                      addTag(tagInput)
                      setTagInput('')
                      setTagSuggIdx(-1)
                      tagInputRef.current?.focus()
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      width: '100%',
                      padding: '6px 10px',
                      background: tagSuggIdx === -1 ? 'var(--bg-3)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-ui)',
                      fontSize: '12px',
                      color: 'var(--accent-400)',
                      textAlign: 'left' as const,
                      borderBottom: '1px solid var(--border-1)',
                    }}
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Crear «{tagInput.trim().toLowerCase()}»
                  </button>
                )}
                {tagSuggestions.map((sug, i) => (
                  <button
                    key={sug}
                    onMouseDown={e => {
                      e.preventDefault()
                      addTag(sug)
                      setTagInput('')
                      setTagSuggIdx(-1)
                      tagInputRef.current?.focus()
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      width: '100%',
                      padding: '6px 10px',
                      background: tagSuggIdx === i ? 'var(--accent-glow)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-ui)',
                      fontSize: '12px',
                      color: tagSuggIdx === i ? 'var(--accent-400)' : 'var(--text-1)',
                      textAlign: 'left' as const,
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={() => setTagSuggIdx(i)}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'var(--accent-500)',
                        flexShrink: 0,
                      }}
                    />
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-3)',
            flexShrink: 0,
            display: 'flex',
            gap: '8px',
          }}
        >
          <span>{wordCount}w</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{charCount}c</span>
        </span>

        {/* ── Metadata panel button ── */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            title="Asignar tipo, sprint y carpeta"
            onMouseDown={e => e.stopPropagation()}
            onClick={() => {
              setShowMeta(v => !v)
              setShowExport(false)
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              height: '28px',
              padding: '0 8px',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${showMeta ? 'var(--accent-500)' : 'var(--border-2)'}`,
              background: showMeta ? 'var(--accent-glow)' : 'var(--bg-2)',
              color: 'var(--accent-400)',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              fontSize: '11px',
              fontWeight: 500,
              transition: 'all var(--transition-fast)',
              flexShrink: 0,
            }}
          >
            <NoteTypeIcon type={note.noteType} size={13} />
            <span style={{ color: 'var(--text-1)' }}>{NOTE_TYPE_META[note.noteType].label}</span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showMeta && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                background: 'var(--bg-1)',
                border: '1px solid var(--border-2)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 60,
                width: '260px',
                overflow: 'hidden',
              }}
              onMouseDown={e => e.stopPropagation()}
            >
              {/* ── Tipo de nota ── */}
              <div style={{ padding: '10px 12px 8px' }}>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--text-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    margin: '0 0 8px',
                  }}
                >
                  Tipo de nota
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                  {(Object.keys(NOTE_TYPE_META) as NoteType[]).map(type => {
                    const isActive = note.noteType === type
                    return (
                      <button
                        key={type}
                        title={NOTE_TYPE_META[type].label}
                        onClick={() => handleSetNoteType(type)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 4px',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid ${isActive ? 'var(--accent-500)' : 'transparent'}`,
                          background: isActive ? 'var(--accent-glow)' : 'transparent',
                          color: isActive ? 'var(--accent-400)' : 'var(--text-2)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-ui)',
                          fontSize: '10px',
                          transition: 'all var(--transition-fast)',
                        }}
                        onMouseEnter={e => {
                          if (!isActive)
                            (e.currentTarget as HTMLElement).style.background = 'var(--bg-3)'
                        }}
                        onMouseLeave={e => {
                          if (!isActive)
                            (e.currentTarget as HTMLElement).style.background = 'transparent'
                        }}
                      >
                        <NoteTypeIcon type={type} size={14} />
                        <span style={{ lineHeight: 1 }}>{NOTE_TYPE_META[type].label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--border-1)', margin: '0 12px' }} />

              {/* ── Sprint ── */}
              <div style={{ padding: '10px 12px 8px' }}>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--text-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    margin: '0 0 6px',
                  }}
                >
                  Sprint
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    maxHeight: '130px',
                    overflowY: 'auto',
                  }}
                >
                  <button
                    onClick={() => handleSetSprint(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '5px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${!note.sprintId ? 'var(--accent-500)' : 'transparent'}`,
                      background: !note.sprintId ? 'var(--accent-glow)' : 'transparent',
                      color: !note.sprintId ? 'var(--accent-400)' : 'var(--text-3)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-ui)',
                      fontSize: '12px',
                      textAlign: 'left' as const,
                      transition: 'all var(--transition-fast)',
                    }}
                    onMouseEnter={e => {
                      if (note.sprintId)
                        (e.currentTarget as HTMLElement).style.background = 'var(--bg-3)'
                    }}
                    onMouseLeave={e => {
                      if (note.sprintId)
                        (e.currentTarget as HTMLElement).style.background = 'transparent'
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    Sin sprint
                  </button>
                  {sprints.map(sprint => {
                    const isActive = note.sprintId === sprint.id
                    return (
                      <button
                        key={sprint.id}
                        onClick={() => handleSetSprint(sprint.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          padding: '5px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${isActive ? 'var(--accent-500)' : 'transparent'}`,
                          background: isActive ? 'var(--accent-glow)' : 'transparent',
                          color: isActive ? 'var(--accent-400)' : 'var(--text-1)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-ui)',
                          fontSize: '12px',
                          textAlign: 'left' as const,
                          transition: 'all var(--transition-fast)',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                        }}
                        onMouseEnter={e => {
                          if (!isActive)
                            (e.currentTarget as HTMLElement).style.background = 'var(--bg-3)'
                        }}
                        onMouseLeave={e => {
                          if (!isActive)
                            (e.currentTarget as HTMLElement).style.background = 'transparent'
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <polyline points="13 17 18 12 13 7" />
                          <polyline points="6 17 11 12 6 7" />
                        </svg>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sprint.name}
                        </span>
                        {isActive && (
                          <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.7 }}>
                            ✓
                          </span>
                        )}
                      </button>
                    )
                  })}
                  {sprints.length === 0 && (
                    <p
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-3)',
                        margin: '2px 8px',
                        fontStyle: 'italic',
                      }}
                    >
                      No hay sprints. Créalos en Daily.
                    </p>
                  )}
                </div>
              </div>

              {/* ── Carpeta (si hay carpetas) ── */}
              {folders.length > 0 && (
                <>
                  <div style={{ height: '1px', background: 'var(--border-1)', margin: '0 12px' }} />
                  <div style={{ padding: '10px 12px 10px' }}>
                    <p
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: 'var(--text-3)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        margin: '0 0 6px',
                      }}
                    >
                      Carpeta
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        maxHeight: '120px',
                        overflowY: 'auto',
                      }}
                    >
                      <button
                        onClick={() => handleSetFolder(null)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          padding: '5px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${!note.folderId ? 'var(--accent-500)' : 'transparent'}`,
                          background: !note.folderId ? 'var(--accent-glow)' : 'transparent',
                          color: !note.folderId ? 'var(--accent-400)' : 'var(--text-3)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-ui)',
                          fontSize: '12px',
                          textAlign: 'left' as const,
                          transition: 'all var(--transition-fast)',
                        }}
                        onMouseEnter={e => {
                          if (note.folderId)
                            (e.currentTarget as HTMLElement).style.background = 'var(--bg-3)'
                        }}
                        onMouseLeave={e => {
                          if (note.folderId)
                            (e.currentTarget as HTMLElement).style.background = 'transparent'
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="16" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                        Sin carpeta
                      </button>
                      {folders.map(folder => {
                        const isActive = note.folderId === folder.id
                        const indent = folder.parentId ? 16 : 0
                        return (
                          <button
                            key={folder.id}
                            onClick={() => handleSetFolder(folder.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '7px',
                              padding: '5px 8px',
                              paddingLeft: `${8 + indent}px`,
                              borderRadius: 'var(--radius-sm)',
                              border: `1px solid ${isActive ? 'var(--accent-500)' : 'transparent'}`,
                              background: isActive ? 'var(--accent-glow)' : 'transparent',
                              color: isActive ? 'var(--accent-400)' : 'var(--text-1)',
                              cursor: 'pointer',
                              fontFamily: 'var(--font-ui)',
                              fontSize: '12px',
                              textAlign: 'left' as const,
                              transition: 'all var(--transition-fast)',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                            }}
                            onMouseEnter={e => {
                              if (!isActive)
                                (e.currentTarget as HTMLElement).style.background = 'var(--bg-3)'
                            }}
                            onMouseLeave={e => {
                              if (!isActive)
                                (e.currentTarget as HTMLElement).style.background = 'transparent'
                            }}
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                            >
                              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                            </svg>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {folder.name}
                            </span>
                            {isActive && (
                              <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.7 }}>
                                ✓
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Duplicate + Delete */}
        <button
          title="Duplicar nota (⧉)"
          onClick={handleDuplicate}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-2)',
            cursor: 'pointer',
            flexShrink: 0,
            fontSize: '14px',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-3)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
        >
          ⧉
        </button>
        <button
          title="Eliminar nota"
          onClick={handleDeleteNote}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'transparent',
            color: '#ef4444',
            cursor: 'pointer',
            flexShrink: 0,
            fontSize: '16px',
            opacity: 0.6,
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'rgba(239,68,68,0.1)'
            el.style.opacity = '1'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'transparent'
            el.style.opacity = '0.6'
          }}
        >
          ×
        </button>

        {/* Export */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            title="Exportar nota"
            onClick={() => setShowExport(v => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: showExport ? 'var(--bg-3)' : 'transparent',
              color: 'var(--text-2)',
              cursor: 'pointer',
              transition: 'background var(--transition-fast)',
            }}
          >
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          {showExport && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                background: 'var(--bg-2)',
                border: '1px solid var(--border-2)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                zIndex: 50,
                minWidth: '160px',
                overflow: 'hidden',
              }}
            >
              {[
                { label: 'Descargar .md', action: handleDownload, icon: '↓' },
                { label: 'Imprimir / PDF', action: () => void handlePrint(), icon: '⎙' },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 14px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '13px',
                    color: 'var(--text-1)',
                    textAlign: 'left' as const,
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-3)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-400)' }}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mode buttons */}
        <div
          style={{
            display: 'flex',
            gap: '2px',
            flexShrink: 0,
            background: 'var(--bg-2)',
            borderRadius: 'var(--radius-md)',
            padding: '2px',
            border: '1px solid var(--border-1)',
          }}
        >
          {(['edit', 'split', 'preview'] as const).map(m => (
            <button
              key={m}
              onClick={() => dispatch(setEditorPreviewMode(m))}
              style={{
                padding: '3px 10px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                fontSize: '11px',
                fontWeight: mode === m ? 600 : 400,
                transition: 'all var(--transition-fast)',
                background: mode === m ? 'var(--accent-600)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--text-2)',
              }}
            >
              {modeLabels[m]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Format toolbar (edit/split mode only) ── */}
      {showFmtBar && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: '0 12px',
            height: '34px',
            borderBottom: '1px solid var(--border-1)',
            background: 'var(--bg-1)',
            flexShrink: 0,
            overflowX: 'auto',
          }}
        >
          {FMT_GROUPS.map((group, gi) => (
            <div key={gi} style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
              {gi > 0 && (
                <div
                  style={{
                    width: '1px',
                    height: '16px',
                    background: 'var(--border-2)',
                    margin: '0 4px',
                    flexShrink: 0,
                  }}
                />
              )}
              {group.map(btn => (
                <button
                  key={btn.cmd}
                  onClick={() => fmt(btn.cmd)}
                  title={btn.title}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '26px',
                    height: '26px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-2)',
                    background: 'transparent',
                    transition: 'background var(--transition-fast), color var(--transition-fast)',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-3)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text-0)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text-2)'
                  }}
                >
                  <FmtIcon cmd={btn.cmd} label={btn.label} />
                </button>
              ))}
            </div>
          ))}
          {/* image upload button */}
          <div
            style={{
              width: '1px',
              height: '16px',
              background: 'var(--border-2)',
              margin: '0 4px',
              flexShrink: 0,
            }}
          />
          <button
            title="Subir imagen (o pegar / arrastrar)"
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--accent-400)',
              background: 'var(--accent-glow)',
              transition: 'background var(--transition-fast), color var(--transition-fast)',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-3)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'var(--accent-glow)'
            }}
          >
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
              <polyline points="16 3 16 8 21 8" />
            </svg>
          </button>
          {/* hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => {
              const files = Array.from(e.target.files ?? [])
              if (files.length) void handleImageFiles(files)
              e.target.value = ''
            }}
          />
        </div>
      )}

      {/* ── Panes ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', position: 'relative' }}>
        {isDragging && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              pointerEvents: 'none',
              border: '2px dashed var(--accent-500)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '14px',
                color: 'var(--accent-400)',
                fontWeight: 600,
              }}
            >
              Suelta la imagen aquí
            </span>
          </div>
        )}
        {(mode === 'edit' || mode === 'split') && (
          <div
            style={{
              width: mode === 'split' ? '50%' : '100%',
              height: '100%',
              overflow: 'hidden',
              borderRight: mode === 'split' ? '1px solid var(--border-1)' : 'none',
            }}
            onPaste={handleEditorPaste}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <MarkdownEditor
              ref={editorRef}
              value={note.content}
              onChange={handleChange}
              placeholder="Empieza a escribir en Markdown…"
            />
          </div>
        )}
        {(mode === 'preview' || mode === 'split') && (
          <div
            style={{ width: mode === 'split' ? '50%' : '100%', height: '100%', overflow: 'hidden' }}
          >
            <MarkdownPreview content={note.content} attachments={note.attachments} />
          </div>
        )}
      </div>

      {/* ── Backlinks panel ── */}
      {backlinks.length > 0 && (
        <div
          style={{
            borderTop: '1px solid var(--border-1)',
            flexShrink: 0,
            background: 'var(--bg-1)',
          }}
        >
          <button
            onClick={() => setShowBacklinks(v => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 14px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--text-3)',
              textAlign: 'left' as const,
              letterSpacing: '0.06em',
              textTransform: 'uppercase' as const,
            }}
          >
            <span style={{ color: 'var(--accent-400)', fontSize: '12px' }}>↩</span>
            {backlinks.length} referencia{backlinks.length !== 1 ? 's' : ''} entrante
            {backlinks.length !== 1 ? 's' : ''}
            <span style={{ marginLeft: 'auto', fontSize: '10px' }}>
              {showBacklinks ? '▴' : '▾'}
            </span>
          </button>
          {showBacklinks && (
            <div
              style={{
                padding: '0 12px 10px',
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
              }}
            >
              {backlinks.map(n => (
                <button
                  key={n.id}
                  onClick={() => navigate(`/editor/${n.id}`)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-2)',
                    background: 'var(--accent-glow)',
                    color: 'var(--accent-400)',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {n.title || 'Sin título'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
