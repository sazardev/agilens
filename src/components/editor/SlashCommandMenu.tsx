/**
 * SlashCommandMenu — Menú de comandos estilo Notion activado con "/"
 *
 * Detectado desde MarkdownEditor cuando el usuario escribe "/" al inicio
 * de una línea o tras un espacio. Filtra en tiempo real por la query.
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { FormatCmd } from './MarkdownEditor'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SlashCmdKind = 'insert' | 'format' | 'modal' | 'meta' | 'view'

export interface SlashCmd {
  id: string
  group: string
  label: string
  description: string
  icon: React.ReactNode
  keywords: string[]
  kind: SlashCmdKind
  /** Texto a insertar (reemplaza /query) */
  insert?: string
  /** Comando de formato a ejecutar */
  formatCmd?: FormatCmd
  /** Modal a abrir */
  modal?: 'table'
  /** Acción de metadatos de la nota */
  metaAction?: 'addTag' | 'assignProject' | 'assignSprint' | 'setType' | 'relateNote'
  /** Acción de vista */
  viewAction?: 'focusMode' | 'split' | 'preview' | 'edit'
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const I = (paths: React.ReactNode) => (
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
    {paths}
  </svg>
)

const icons = {
  h1: <span style={{ fontWeight: 700, fontSize: '14px', lineHeight: 1 }}>H1</span>,
  h2: <span style={{ fontWeight: 700, fontSize: '13px', lineHeight: 1 }}>H2</span>,
  h3: <span style={{ fontWeight: 700, fontSize: '12px', lineHeight: 1 }}>H3</span>,
  h4: <span style={{ fontWeight: 600, fontSize: '11px', lineHeight: 1 }}>H4</span>,
  bold: <b style={{ fontSize: '14px', fontFamily: 'serif' }}>B</b>,
  italic: <i style={{ fontSize: '14px', fontFamily: 'serif' }}>I</i>,
  strike: <s style={{ fontSize: '13px' }}>S</s>,
  code: I(<polyline points="16 18 22 12 16 6" />),
  blockquote: I(
    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 2v6c0 6 3 8 6 8zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 2v6c0 6 3 8 6 8z" />
  ),
  link: I(
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  image: I(
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </>
  ),
  wikilink: I(
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </>
  ),
  list: I(
    <>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </>
  ),
  numlist: I(
    <>
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <path d="M4 6h1v4" />
      <path d="M4 10h2" />
      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
    </>
  ),
  todo: I(
    <>
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </>
  ),
  codeblock: I(
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </>
  ),
  hr: I(<line x1="5" y1="12" x2="19" y2="12" />),
  table: I(
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </>
  ),
  date: I(
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  clock: I(
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  tag: I(
    <>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </>
  ),
  project: I(
    <>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </>
  ),
  sprint: I(
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  type: I(
    <>
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </>
  ),
  focus: I(
    <>
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </>
  ),
  split: I(
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </>
  ),
  preview: I(
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  edit: I(
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>
  ),
  relateNote: I(
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </>
  ),
}

// ─── Command list ─────────────────────────────────────────────────────────────

export const ALL_SLASH_COMMANDS: SlashCmd[] = [
  // ── Encabezados
  {
    id: 'h1',
    group: 'Encabezados',
    label: 'Título 1',
    description: 'Encabezado grande',
    icon: icons.h1,
    keywords: ['h1', 'titulo', 'heading', 'encabezado', 'grande'],
    kind: 'insert',
    insert: '# ',
  },
  {
    id: 'h2',
    group: 'Encabezados',
    label: 'Título 2',
    description: 'Encabezado mediano',
    icon: icons.h2,
    keywords: ['h2', 'subtitulo', 'heading', 'encabezado', 'mediano'],
    kind: 'insert',
    insert: '## ',
  },
  {
    id: 'h3',
    group: 'Encabezados',
    label: 'Título 3',
    description: 'Encabezado pequeño',
    icon: icons.h3,
    keywords: ['h3', 'seccion', 'heading', 'encabezado', 'pequeño'],
    kind: 'insert',
    insert: '### ',
  },
  {
    id: 'h4',
    group: 'Encabezados',
    label: 'Título 4',
    description: 'Encabezado subsección',
    icon: icons.h4,
    keywords: ['h4', 'subseccion', 'heading', 'encabezado'],
    kind: 'insert',
    insert: '#### ',
  },

  // ── Texto
  {
    id: 'bold',
    group: 'Texto',
    label: 'Negrita',
    description: '**texto en negrita**',
    icon: icons.bold,
    keywords: ['bold', 'negrita', 'fuerte'],
    kind: 'format',
    formatCmd: 'bold',
  },
  {
    id: 'italic',
    group: 'Texto',
    label: 'Cursiva',
    description: '*texto en cursiva*',
    icon: icons.italic,
    keywords: ['italic', 'cursiva', 'itálica'],
    kind: 'format',
    formatCmd: 'italic',
  },
  {
    id: 'strike',
    group: 'Texto',
    label: 'Tachado',
    description: '~~texto tachado~~',
    icon: icons.strike,
    keywords: ['strike', 'tachado', 'strikethrough'],
    kind: 'format',
    formatCmd: 'strikethrough',
  },
  {
    id: 'inlinecode',
    group: 'Texto',
    label: 'Código inline',
    description: '`código en línea`',
    icon: icons.code,
    keywords: ['code', 'codigo', 'inline', 'código'],
    kind: 'format',
    formatCmd: 'inlineCode',
  },
  {
    id: 'blockquote',
    group: 'Texto',
    label: 'Cita',
    description: 'Bloque de cita',
    icon: icons.blockquote,
    keywords: ['quote', 'cita', 'blockquote'],
    kind: 'format',
    formatCmd: 'blockquote',
  },
  {
    id: 'link',
    group: 'Texto',
    label: 'Enlace',
    description: '[texto](url)',
    icon: icons.link,
    keywords: ['link', 'enlace', 'url', 'href'],
    kind: 'format',
    formatCmd: 'link',
  },
  {
    id: 'image',
    group: 'Texto',
    label: 'Imagen',
    description: '![alt](url)',
    icon: icons.image,
    keywords: ['image', 'imagen', 'foto', 'img'],
    kind: 'format',
    formatCmd: 'image',
  },
  {
    id: 'wikilink',
    group: 'Texto',
    label: 'Vincular nota',
    description: '[[enlace interno]]',
    icon: icons.wikilink,
    keywords: ['wiki', 'link', 'nota', 'internal', 'vincular'],
    kind: 'insert',
    insert: '[[',
  },

  // ── Listas
  {
    id: 'bullet',
    group: 'Listas',
    label: 'Lista con viñetas',
    description: 'Lista no ordenada',
    icon: icons.list,
    keywords: ['bullet', 'list', 'lista', 'viñetas', 'unordered'],
    kind: 'insert',
    insert: '- ',
  },
  {
    id: 'numbered',
    group: 'Listas',
    label: 'Lista numerada',
    description: 'Lista ordenada',
    icon: icons.numlist,
    keywords: ['numbered', 'number', 'lista', 'numerada', 'ordered'],
    kind: 'insert',
    insert: '1. ',
  },
  {
    id: 'todo',
    group: 'Listas',
    label: 'Lista de tareas',
    description: 'Checkbox / to-do',
    icon: icons.todo,
    keywords: ['todo', 'task', 'tarea', 'checkbox', 'check'],
    kind: 'insert',
    insert: '- [ ] ',
  },

  // ── Bloques
  {
    id: 'codeblock',
    group: 'Bloques',
    label: 'Bloque de código',
    description: 'Código con resaltado',
    icon: icons.codeblock,
    keywords: ['code', 'block', 'codigo', 'bloque', 'codeblock'],
    kind: 'format',
    formatCmd: 'codeBlock',
  },
  {
    id: 'hr',
    group: 'Bloques',
    label: 'Separador',
    description: 'Línea divisoria horizontal',
    icon: icons.hr,
    keywords: ['hr', 'separador', 'divider', 'line', 'horizontal'],
    kind: 'format',
    formatCmd: 'hr',
  },
  {
    id: 'table-visual',
    group: 'Bloques',
    label: 'Tabla (editor visual)',
    description: 'Abre el editor de tablas',
    icon: icons.table,
    keywords: ['table', 'tabla', 'visual', 'grid'],
    kind: 'modal',
    modal: 'table',
  },
  {
    id: 'table-simple',
    group: 'Bloques',
    label: 'Tabla simple',
    description: 'Inserta tabla Markdown',
    icon: icons.table,
    keywords: ['table', 'tabla', 'simple', 'markdown'],
    kind: 'insert',
    insert:
      '\n| Columna 1 | Columna 2 | Columna 3 |\n|-----------|-----------|------------|\n| Celda     | Celda     | Celda      |\n',
  },
  {
    id: 'callout-info',
    group: 'Bloques',
    label: 'Callout Info',
    description: 'Bloque de información',
    icon: I(
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    ),
    keywords: ['callout', 'info', 'note', 'alert', 'bloque'],
    kind: 'insert',
    insert: '\n> **ℹ️ Nota:**\n> Escribe tu nota aquí.\n',
  },
  {
    id: 'callout-warn',
    group: 'Bloques',
    label: 'Callout Advertencia',
    description: 'Bloque de advertencia',
    icon: I(
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
    keywords: ['callout', 'warn', 'warning', 'advertencia', 'alert'],
    kind: 'insert',
    insert: '\n> **⚠️ Advertencia:**\n> Escribe la advertencia aquí.\n',
  },
  {
    id: 'callout-error',
    group: 'Bloques',
    label: 'Callout Error',
    description: 'Bloque de error crítico',
    icon: I(
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </>
    ),
    keywords: ['callout', 'error', 'critical', 'danger'],
    kind: 'insert',
    insert: '\n> **🚨 Error:**\n> Describe el error aquí.\n',
  },

  // ── Inserciones
  {
    id: 'date',
    group: 'Inserciones',
    label: 'Fecha actual',
    description: 'Inserta la fecha de hoy',
    icon: icons.date,
    keywords: ['date', 'fecha', 'hoy', 'today'],
    kind: 'insert',
    insert: new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  },
  {
    id: 'time',
    group: 'Inserciones',
    label: 'Hora actual',
    description: 'Inserta la hora actual',
    icon: icons.clock,
    keywords: ['time', 'hora', 'ahora', 'now'],
    kind: 'insert',
    insert: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
  },
  {
    id: 'datetime',
    group: 'Inserciones',
    label: 'Fecha y hora',
    description: 'Fecha + hora completa',
    icon: icons.date,
    keywords: ['datetime', 'fecha', 'hora', 'timestamp'],
    kind: 'insert',
    insert: new Date().toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  },
  {
    id: 'iso-date',
    group: 'Inserciones',
    label: 'Fecha ISO',
    description: 'Formato YYYY-MM-DD',
    icon: icons.date,
    keywords: ['iso', 'fecha', 'date', 'formato'],
    kind: 'insert',
    insert: new Date().toISOString().split('T')[0],
  },

  // ── Meta de la nota
  {
    id: 'addtag',
    group: 'Nota',
    label: 'Agregar etiqueta',
    description: 'Añade una etiqueta a la nota',
    icon: icons.tag,
    keywords: ['tag', 'etiqueta', 'label', 'categoría'],
    kind: 'meta',
    metaAction: 'addTag',
  },
  {
    id: 'assignproject',
    group: 'Nota',
    label: 'Asignar proyecto',
    description: 'Vincula la nota a un proyecto',
    icon: icons.project,
    keywords: ['project', 'proyecto', 'assign', 'vincular'],
    kind: 'meta',
    metaAction: 'assignProject',
  },
  {
    id: 'assignsprint',
    group: 'Nota',
    label: 'Asignar sprint',
    description: 'Vincula la nota a un sprint',
    icon: icons.sprint,
    keywords: ['sprint', 'assign', 'vincular', 'iteration'],
    kind: 'meta',
    metaAction: 'assignSprint',
  },
  {
    id: 'settype',
    group: 'Nota',
    label: 'Tipo de nota',
    description: 'Cambia el tipo de la nota',
    icon: icons.type,
    keywords: ['type', 'tipo', 'kind', 'note', 'evidence'],
    kind: 'meta',
    metaAction: 'setType',
  },
  {
    id: 'relatenote',
    group: 'Nota',
    label: 'Relacionar nota',
    description: 'Inserta un enlace [[wiki]] a otra nota',
    icon: icons.relateNote,
    keywords: [
      'related',
      'relacionar',
      'link',
      'vincular',
      'referencia',
      'wiki',
      'backlink',
      'nota',
    ],
    kind: 'meta',
    metaAction: 'relateNote',
  },

  // ── Vista
  {
    id: 'focusmode',
    group: 'Vista',
    label: 'Pantalla completa',
    description: 'Modo zen / focus',
    icon: icons.focus,
    keywords: ['focus', 'zen', 'fullscreen', 'completo', 'pantalla'],
    kind: 'view',
    viewAction: 'focusMode',
  },
  {
    id: 'split',
    group: 'Vista',
    label: 'Vista dividida',
    description: 'Editor y previsualización',
    icon: icons.split,
    keywords: ['split', 'dividida', 'dual', 'preview', 'editor'],
    kind: 'view',
    viewAction: 'split',
  },
  {
    id: 'preview',
    group: 'Vista',
    label: 'Solo previsualización',
    description: 'Muestra solo el preview',
    icon: icons.preview,
    keywords: ['preview', 'previsualizar', 'ver', 'solo'],
    kind: 'view',
    viewAction: 'preview',
  },
  {
    id: 'edit',
    group: 'Vista',
    label: 'Solo editor',
    description: 'Muestra solo el editor',
    icon: icons.edit,
    keywords: ['edit', 'editor', 'escribir', 'solo'],
    kind: 'view',
    viewAction: 'edit',
  },
]

// ─── Group order ──────────────────────────────────────────────────────────────
const GROUP_ORDER = ['Encabezados', 'Texto', 'Listas', 'Bloques', 'Inserciones', 'Nota', 'Vista']

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  query: string
  anchorRect: { top: number; bottom: number; left: number; right: number }
  onSelect: (cmd: SlashCmd) => void
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SlashCommandMenu({ query, anchorRect, onSelect, onClose }: Props) {
  const [activeIdx, setActiveIdx] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const activeItemRef = useRef<HTMLButtonElement>(null)

  // Filter commands by query
  const filtered = useMemo(() => {
    if (!query) return ALL_SLASH_COMMANDS
    const q = query
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    return ALL_SLASH_COMMANDS.filter(cmd => {
      const haystack = [cmd.label, cmd.description, cmd.group, ...cmd.keywords]
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      return haystack.includes(q)
    })
  }, [query])

  // Reset active index when query changes
  useEffect(() => setActiveIdx(0), [query])

  // Scroll active item into view
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  // Keyboard navigation
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        setActiveIdx(i => (i + 1) % Math.max(filtered.length, 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        setActiveIdx(i => (i - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        if (filtered[activeIdx]) onSelect(filtered[activeIdx])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handle, true)
    return () => window.removeEventListener('keydown', handle, true)
  }, [filtered, activeIdx, onSelect, onClose])

  if (filtered.length === 0) {
    return createPortal(
      <div
        style={{
          position: 'fixed',
          top: anchorRect.bottom + 6,
          left: anchorRect.left,
          zIndex: 9999,
          background: 'var(--bg-1, #1a1a1e)',
          border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
          borderRadius: '10px',
          padding: '12px 16px',
          fontSize: '13px',
          color: 'var(--text-3, #6b7280)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          minWidth: '200px',
        }}
      >
        Sin resultados para "<strong style={{ color: 'var(--text-1)' }}>{query}</strong>"
      </div>,
      document.body
    )
  }

  // Group the filtered commands preserving order
  const groups = GROUP_ORDER.reduce<Array<{ name: string; items: SlashCmd[] }>>((acc, g) => {
    const items = filtered.filter(c => c.group === g)
    if (items.length > 0) acc.push({ name: g, items })
    return acc
  }, [])

  // Flatten filtered respecting group order (for index tracking)
  const flatOrdered = groups.flatMap(g => g.items)

  // Position: prefer below cursor, flip above if not enough space
  const menuHeight = Math.min(filtered.length * 40 + groups.length * 28 + 16, 420)
  const spaceBelow = window.innerHeight - anchorRect.bottom - 8
  const top = spaceBelow >= menuHeight ? anchorRect.bottom + 6 : anchorRect.top - menuHeight - 6

  // Keep menu within horizontal bounds
  const menuWidth = 280
  const left = Math.min(anchorRect.left, window.innerWidth - menuWidth - 12)

  return createPortal(
    <div
      onMouseDown={e => e.preventDefault()} // prevent editor blur
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 9999,
        width: menuWidth,
        maxHeight: 420,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-1, #1a1a1e)',
        border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
        borderRadius: '10px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px 6px',
          borderBottom: '1px solid var(--border-0, rgba(255,255,255,0.07))',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexShrink: 0,
        }}
      >
        <span
          style={{ fontSize: '11px', color: 'var(--text-3, #6b7280)', letterSpacing: '0.04em' }}
        >
          {query ? (
            <>
              <span style={{ color: 'var(--accent-400, #818cf8)' }}>/{query}</span>
              {' · '}
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </>
          ) : (
            <>
              Comandos — <kbd style={{ opacity: 0.5, fontSize: '10px' }}>↑↓</kbd> navegar ·{' '}
              <kbd style={{ opacity: 0.5, fontSize: '10px' }}>↵</kbd> insertar ·{' '}
              <kbd style={{ opacity: 0.5, fontSize: '10px' }}>Esc</kbd> cerrar
            </>
          )}
        </span>
      </div>

      {/* List */}
      <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
        {groups.map(group => (
          <div key={group.name}>
            {/* Group label */}
            <div
              style={{
                padding: '8px 12px 4px',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-3, #6b7280)',
              }}
            >
              {group.name}
            </div>
            {/* Items */}
            {group.items.map(cmd => {
              const idx = flatOrdered.indexOf(cmd)
              const isActive = idx === activeIdx
              return (
                <button
                  key={cmd.id}
                  ref={isActive ? activeItemRef : undefined}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => onSelect(cmd)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '7px 12px',
                    background: isActive
                      ? 'var(--accent-glow, rgba(99,102,241,0.15))'
                      : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                >
                  {/* Icon box */}
                  <span
                    style={{
                      width: '28px',
                      height: '28px',
                      flexShrink: 0,
                      borderRadius: '7px',
                      background: isActive
                        ? 'var(--accent-500, #6366f1)'
                        : 'var(--bg-2, rgba(255,255,255,0.07))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? '#fff' : 'var(--text-2, #94a3b8)',
                      transition: 'background 0.1s, color 0.1s',
                      fontSize: '12px',
                    }}
                  >
                    {cmd.icon}
                  </span>
                  {/* Text */}
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: isActive ? 'var(--accent-300, #a5b4fc)' : 'var(--text-0, #e2e2e2)',
                        lineHeight: 1.2,
                      }}
                    >
                      {cmd.label}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-3, #6b7280)',
                        lineHeight: 1.3,
                        marginTop: '1px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cmd.description}
                    </div>
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>,
    document.body
  )
}
