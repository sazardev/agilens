/**
 * NotesMapPage — Mapa de conocimiento estilo Obsidian.
 * Grafo interactivo con todos los nodos de la app: notas, sprints,
 * dailys, impedimentos y sus vínculos. Ultra-filtrable.
 */
import {
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
  type MouseEvent as RMouseEvent,
  type WheelEvent as RWheelEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/store'
import type { Note, Sprint, DailyEntry, Impediment, NoteType } from '@/types'

// ─── Node / Edge types ────────────────────────────────────────────────────────

type NodeKind = 'note' | 'sprint' | 'daily' | 'impediment'

interface GNode {
  id: string
  kind: NodeKind
  label: string
  subLabel: string
  color: string
  borderColor: string
  radius: number
  x: number
  y: number
  vx: number
  vy: number
  pinned: boolean
  mass: number
}

interface GEdge {
  source: string
  target: string
  kind: 'sprint-link' | 'tag-shared' | 'daily-note' | 'daily-sprint' | 'imp-sprint'
  color: string
  width: number
  dashed: boolean
}

// ─── Color palettes ───────────────────────────────────────────────────────────

const NOTE_TYPE_COLOR: Record<NoteType, string> = {
  note: '#94a3b8',
  daily: '#60a5fa',
  evidence: '#a78bfa',
  technical: '#34d399',
  meeting: '#fb923c',
  sprint: '#f472b6',
  task: '#facc15',
}

const NOTE_TYPE_LABEL: Record<NoteType, string> = {
  note: 'Nota',
  daily: 'Daily nota',
  evidence: 'Evidencia',
  technical: 'Técnica',
  meeting: 'Reunión',
  sprint: 'Sprint nota',
  task: 'Tarea',
}

const SPRINT_COLOR = '#7c3aed'
const DAILY_COLOR = '#38bdf8'
const IMP_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#fbbf24',
  low: '#34d399',
}

// ─── Force simulation constants ───────────────────────────────────────────────

const REPULSION = 4000
const SPRING_LENGTH = 120
const SPRING_K = 0.06
const GRAVITY = 0.015
const DAMPING = 0.82
const MAX_VELOCITY = 14

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function fmtDate(iso?: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

// ─── Build graph from store ────────────────────────────────────────────────────

interface BuildOptions {
  notes: Note[]
  sprints: Sprint[]
  entries: DailyEntry[]
  impediments: Impediment[]
  showNoteTypes: Set<NoteType>
  showSprints: boolean
  showDaily: boolean
  showImpediments: boolean
  sprintFilter: string
  dateFrom: string
  dateTo: string
  tagFilter: string
  search: string
  linkTag: boolean
  linkSprint: boolean
  linkDaily: boolean
  linkImpediment: boolean
  prevNodes?: GNode[]
  canvasW: number
  canvasH: number
}

function buildGraph(opts: BuildOptions): { nodes: GNode[]; edges: GEdge[] } {
  const {
    notes,
    sprints,
    entries,
    impediments,
    showNoteTypes,
    showSprints,
    showDaily,
    showImpediments,
    sprintFilter,
    dateFrom,
    dateTo,
    tagFilter,
    search,
    linkTag,
    linkSprint,
    linkDaily,
    linkImpediment,
    prevNodes,
    canvasW,
    canvasH,
  } = opts

  const nodes: GNode[] = []
  const edges: GEdge[] = []
  const cx = canvasW / 2
  const cy = canvasH / 2

  function prevPos(id: string) {
    const p = prevNodes?.find(n => n.id === id)
    if (p) return { x: p.x, y: p.y, vx: p.vx, vy: p.vy }
    const angle = Math.random() * Math.PI * 2
    const r = 100 + Math.random() * 200
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), vx: 0, vy: 0 }
  }

  // ── Sprints ──
  const sprintSet = new Set<string>()
  if (showSprints) {
    for (const s of sprints) {
      if (sprintFilter && s.id !== sprintFilter) continue
      const pp = prevPos(`sprint:${s.id}`)
      nodes.push({
        id: `sprint:${s.id}`,
        kind: 'sprint',
        label: truncate(s.name, 22),
        subLabel: s.goal
          ? truncate(s.goal, 28)
          : s.endDate
            ? `${fmtDate(s.startDate)}–${fmtDate(s.endDate)}`
            : fmtDate(s.startDate),
        color: SPRINT_COLOR,
        borderColor: '#a78bfa',
        radius: 28,
        ...pp,
        pinned: false,
        mass: 3,
      })
      sprintSet.add(`sprint:${s.id}`)
    }
  }

  // ── Notes ──
  const noteSet = new Set<string>()
  for (const n of notes) {
    if (!showNoteTypes.has(n.noteType)) continue
    if (
      search &&
      !n.title.toLowerCase().includes(search.toLowerCase()) &&
      !n.content.toLowerCase().includes(search.toLowerCase())
    )
      continue
    if (tagFilter && !n.tags.includes(tagFilter)) continue
    if (sprintFilter && n.sprintId !== sprintFilter) continue
    if (dateFrom && n.updatedAt < dateFrom) continue
    if (dateTo && n.updatedAt > dateTo + 'T99') continue
    const pp = prevPos(`note:${n.id}`)
    nodes.push({
      id: `note:${n.id}`,
      kind: 'note',
      label: truncate(n.title, 24),
      subLabel: NOTE_TYPE_LABEL[n.noteType],
      color: NOTE_TYPE_COLOR[n.noteType],
      borderColor: NOTE_TYPE_COLOR[n.noteType],
      radius: n.noteType === 'sprint' ? 22 : n.noteType === 'task' ? 19 : 17,
      ...pp,
      pinned: false,
      mass: 1.2,
    })
    noteSet.add(`note:${n.id}`)
  }

  // ── Daily entries ──
  const dailySet = new Set<string>()
  if (showDaily) {
    for (const e of entries) {
      if (sprintFilter) {
        const sp = sprints.find(s => s.id === sprintFilter)
        const inRange = sp ? e.date >= sp.startDate && (!sp.endDate || e.date <= sp.endDate) : false
        if (e.sprintId !== sprintFilter && !inRange) continue
      }
      if (dateFrom && e.date < dateFrom) continue
      if (dateTo && e.date > dateTo) continue
      const pp = prevPos(`daily:${e.id}`)
      nodes.push({
        id: `daily:${e.id}`,
        kind: 'daily',
        label: fmtDate(e.date),
        subLabel:
          e.blocked.length > 0
            ? `⚠ ${e.blocked.length} bloqueado${e.blocked.length > 1 ? 's' : ''}`
            : 'Daily',
        color: DAILY_COLOR,
        borderColor: e.blocked.length > 0 ? '#f59e0b' : DAILY_COLOR,
        radius: 16,
        ...pp,
        pinned: false,
        mass: 1,
      })
      dailySet.add(`daily:${e.id}`)
    }
  }

  // ── Impediments ──
  const impSet = new Set<string>()
  if (showImpediments) {
    for (const imp of impediments) {
      if (sprintFilter && imp.sprintId !== sprintFilter) continue
      if (dateFrom && imp.openedAt < dateFrom) continue
      if (dateTo && (imp.resolvedAt ?? todayISO()) > dateTo) continue
      const pp = prevPos(`imp:${imp.id}`)
      nodes.push({
        id: `imp:${imp.id}`,
        kind: 'impediment',
        label: truncate(imp.title, 22),
        subLabel: imp.severity.charAt(0).toUpperCase() + imp.severity.slice(1),
        color: IMP_COLORS[imp.severity] ?? '#ef4444',
        borderColor: IMP_COLORS[imp.severity] ?? '#ef4444',
        radius: 18,
        ...pp,
        pinned: false,
        mass: 1.1,
      })
      impSet.add(`imp:${imp.id}`)
    }
  }

  const allNodeIds = new Set(nodes.map(n => n.id))

  // ── Edges: note → sprint ──
  if (linkSprint) {
    for (const n of notes) {
      if (!n.sprintId) continue
      const src = `note:${n.id}`
      const tgt = `sprint:${n.sprintId}`
      if (allNodeIds.has(src) && allNodeIds.has(tgt)) {
        edges.push({
          source: src,
          target: tgt,
          kind: 'sprint-link',
          color: 'rgba(124,58,237,0.5)',
          width: 1.5,
          dashed: false,
        })
      }
    }
    // daily → sprint
    for (const e of entries) {
      if (!e.sprintId) continue
      const src = `daily:${e.id}`
      const tgt = `sprint:${e.sprintId}`
      if (allNodeIds.has(src) && allNodeIds.has(tgt)) {
        edges.push({
          source: src,
          target: tgt,
          kind: 'daily-sprint',
          color: 'rgba(56,189,248,0.45)',
          width: 1,
          dashed: true,
        })
      }
    }
    // imp → sprint
    for (const imp of impediments) {
      if (!imp.sprintId) continue
      const src = `imp:${imp.id}`
      const tgt = `sprint:${imp.sprintId}`
      if (allNodeIds.has(src) && allNodeIds.has(tgt)) {
        edges.push({
          source: src,
          target: tgt,
          kind: 'imp-sprint',
          color: 'rgba(239,68,68,0.4)',
          width: 1,
          dashed: false,
        })
      }
    }
  }

  // ── Edges: daily → note ──
  if (linkDaily) {
    for (const e of entries) {
      for (const nid of [...(e.noteIds ?? []), ...(e.projectNoteIds ?? [])]) {
        const src = `daily:${e.id}`
        const tgt = `note:${nid}`
        if (allNodeIds.has(src) && allNodeIds.has(tgt)) {
          edges.push({
            source: src,
            target: tgt,
            kind: 'daily-note',
            color: 'rgba(56,189,248,0.35)',
            width: 1,
            dashed: true,
          })
        }
      }
    }
  }

  // ── Edges: shared tags ──
  if (linkTag) {
    const tagMap = new Map<string, string[]>()
    for (const n of notes) {
      for (const tag of n.tags) {
        if (!tagMap.has(tag)) tagMap.set(tag, [])
        tagMap.get(tag)!.push(`note:${n.id}`)
      }
    }
    const seen = new Set<string>()
    for (const [, ids] of tagMap) {
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const key = `${ids[i]}__${ids[j]}`
          if (seen.has(key)) continue
          if (allNodeIds.has(ids[i]) && allNodeIds.has(ids[j])) {
            seen.add(key)
            edges.push({
              source: ids[i],
              target: ids[j],
              kind: 'tag-shared',
              color: 'rgba(148,163,184,0.25)',
              width: 1,
              dashed: true,
            })
          }
        }
      }
    }
  }

  return { nodes, edges }
}

// ─── Force simulation step ────────────────────────────────────────────────────

function simulationStep(nodes: GNode[], edges: GEdge[], cx: number, cy: number) {
  const n = nodes.length

  // Repulsion
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = nodes[i]
      const b = nodes[j]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d2 = dx * dx + dy * dy + 0.01
      const d = Math.sqrt(d2)
      const f = REPULSION / d2
      const fx = (dx / d) * f
      const fy = (dy / d) * f
      a.vx -= fx / a.mass
      a.vy -= fy / a.mass
      b.vx += fx / b.mass
      b.vy += fy / b.mass
    }
  }

  // Springs (edges)
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  for (const e of edges) {
    const a = nodeMap.get(e.source)
    const b = nodeMap.get(e.target)
    if (!a || !b) continue
    const dx = b.x - a.x
    const dy = b.y - a.y
    const d = Math.sqrt(dx * dx + dy * dy) + 0.01
    const stretch = d - SPRING_LENGTH
    const fx = (dx / d) * stretch * SPRING_K
    const fy = (dy / d) * stretch * SPRING_K
    if (!a.pinned) {
      a.vx += fx
      a.vy += fy
    }
    if (!b.pinned) {
      b.vx -= fx
      b.vy -= fy
    }
  }

  // Center gravity
  for (const node of nodes) {
    if (node.pinned) continue
    node.vx += (cx - node.x) * GRAVITY
    node.vy += (cy - node.y) * GRAVITY
  }

  // Integrate
  for (const node of nodes) {
    if (node.pinned) continue
    node.vx *= DAMPING
    node.vy *= DAMPING
    const spd = Math.sqrt(node.vx * node.vx + node.vy * node.vy)
    if (spd > MAX_VELOCITY) {
      node.vx = (node.vx / spd) * MAX_VELOCITY
      node.vy = (node.vy / spd) * MAX_VELOCITY
    }
    node.x += node.vx
    node.y += node.vy
  }
}

// ─── Canvas drawing ───────────────────────────────────────────────────────────

function drawGraph(
  ctx: CanvasRenderingContext2D,
  nodes: GNode[],
  edges: GEdge[],
  selectedId: string | null,
  hoveredId: string | null,
  transform: DOMMatrix,
  zoom: number
) {
  ctx.save()
  ctx.setTransform(transform)

  // Draw edges
  for (const e of edges) {
    const src = nodes.find(n => n.id === e.source)
    const tgt = nodes.find(n => n.id === e.target)
    if (!src || !tgt) continue

    ctx.beginPath()
    ctx.strokeStyle = e.color
    ctx.lineWidth = e.width / zoom
    if (e.dashed) ctx.setLineDash([4 / zoom, 4 / zoom])
    else ctx.setLineDash([])
    ctx.moveTo(src.x, src.y)
    ctx.lineTo(tgt.x, tgt.y)
    ctx.stroke()
  }
  ctx.setLineDash([])

  // Draw nodes
  for (const node of nodes) {
    const isSelected = node.id === selectedId
    const isHovered = node.id === hoveredId
    const r = node.radius

    // Glow for selected/hovered
    if (isSelected || isHovered) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, r + 8 / zoom, 0, Math.PI * 2)
      ctx.fillStyle = node.color + '33'
      ctx.fill()
    }

    // Node shape by kind
    ctx.beginPath()
    if (node.kind === 'sprint') {
      // Hexagon
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6
        const x = node.x + r * Math.cos(angle)
        const y = node.y + r * Math.sin(angle)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
    } else if (node.kind === 'impediment') {
      // Diamond
      ctx.moveTo(node.x, node.y - r)
      ctx.lineTo(node.x + r, node.y)
      ctx.lineTo(node.x, node.y + r)
      ctx.lineTo(node.x - r, node.y)
      ctx.closePath()
    } else {
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
    }

    // Fill with dark bg tinted
    ctx.fillStyle = node.color + '22'
    ctx.fill()

    // Border
    ctx.strokeStyle = isSelected ? '#fff' : isHovered ? node.borderColor : node.borderColor + 'bb'
    ctx.lineWidth = isSelected ? 2.5 / zoom : 1.5 / zoom
    ctx.stroke()

    // Label (visible when zoomed enough)
    if (zoom > 0.45) {
      const fontSize = Math.max(9, Math.min(12, 11 / zoom))
      ctx.font = `${isSelected ? 600 : 500} ${fontSize}px system-ui, sans-serif`
      ctx.fillStyle = isSelected ? '#fff' : 'rgba(226,232,240,0.9)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.label, node.x, node.y + r + fontSize * 1.1)

      if (zoom > 0.7) {
        const subFontSize = fontSize * 0.82
        ctx.font = `${subFontSize}px system-ui, sans-serif`
        ctx.fillStyle = node.color + 'bb'
        ctx.fillText(node.subLabel, node.x, node.y + r + fontSize * 1.1 + subFontSize * 1.2)
      }
    }

    // Dot in center (kind indicator)
    ctx.beginPath()
    ctx.arc(node.x, node.y, r * 0.35, 0, Math.PI * 2)
    ctx.fillStyle = node.color
    ctx.globalAlpha = isSelected ? 1 : 0.75
    ctx.fill()
    ctx.globalAlpha = 1
  }

  ctx.restore()
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IcoSearch = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const IcoFilter = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
)
const IcoPlus = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const IcoMinus = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const IcoReset = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-5.1" />
  </svg>
)
const IcoNavigate = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)
const IcoX = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

// ─── Filter panel ─────────────────────────────────────────────────────────────

const ALL_NOTE_TYPES: NoteType[] = [
  'note',
  'task',
  'evidence',
  'technical',
  'meeting',
  'sprint',
  'daily',
]

interface FilterPanelProps {
  showNoteTypes: Set<NoteType>
  setShowNoteTypes: (v: Set<NoteType>) => void
  showSprints: boolean
  setShowSprints: (v: boolean) => void
  showDaily: boolean
  setShowDaily: (v: boolean) => void
  showImpediments: boolean
  setShowImpediments: (v: boolean) => void
  sprintFilter: string
  setSprintFilter: (v: string) => void
  dateFrom: string
  setDateFrom: (v: string) => void
  dateTo: string
  setDateTo: (v: string) => void
  tagFilter: string
  setTagFilter: (v: string) => void
  search: string
  setSearch: (v: string) => void
  linkTag: boolean
  setLinkTag: (v: boolean) => void
  linkSprint: boolean
  setLinkSprint: (v: boolean) => void
  linkDaily: boolean
  setLinkDaily: (v: boolean) => void
  linkImpediment: boolean
  setLinkImpediment: (v: boolean) => void
  sprints: Sprint[]
  allTags: string[]
  nodeCount: number
  edgeCount: number
}

function FilterPanel({
  showNoteTypes,
  setShowNoteTypes,
  showSprints,
  setShowSprints,
  showDaily,
  setShowDaily,
  showImpediments,
  setShowImpediments,
  sprintFilter,
  setSprintFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  tagFilter,
  setTagFilter,
  search,
  setSearch,
  linkTag,
  setLinkTag,
  linkSprint,
  setLinkSprint,
  linkDaily,
  setLinkDaily,
  linkImpediment,
  setLinkImpediment,
  sprints,
  allTags,
  nodeCount,
  edgeCount,
}: FilterPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  function toggleNoteType(t: NoteType) {
    const s = new Set(showNoteTypes)
    if (s.has(t)) s.delete(t)
    else s.add(t)
    setShowNoteTypes(s)
  }

  if (collapsed) {
    return (
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 20 }}>
        <button
          onClick={() => setCollapsed(false)}
          style={{ ...btnStyle, gap: 6 }}
          title="Abrir filtros"
        >
          <IcoFilter /> Filtros
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: 230,
        background: 'var(--bg-1)',
        borderRight: '1px solid var(--border-1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
        overflowY: 'auto',
        fontSize: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 12px 8px',
          borderBottom: '1px solid var(--border-1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--text-0)',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <IcoFilter /> Mapa de Notas
        </div>
        <button onClick={() => setCollapsed(true)} style={{ ...ghostBtnStyle, padding: '2px 4px' }}>
          <IcoX />
        </button>
      </div>

      {/* Stats */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-1)',
          display: 'flex',
          gap: 12,
        }}
      >
        <StatChip label="Nodos" value={nodeCount} color="var(--accent-400)" />
        <StatChip label="Vínculos" value={edgeCount} color="var(--accent-400)" />
      </div>

      <div
        style={{
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {/* Search */}
        <Section label="Buscar">
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-3)',
                pointerEvents: 'none',
              }}
            >
              <IcoSearch />
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Título o contenido…"
              className="input-base"
              style={{ width: '100%', paddingLeft: 28, fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>
        </Section>

        {/* Tipos de nodo */}
        <Section label="Tipos de nota">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {ALL_NOTE_TYPES.map(t => (
              <button
                key={t}
                onClick={() => toggleNoteType(t)}
                style={{
                  ...chipStyle,
                  background: showNoteTypes.has(t) ? 'var(--accent-glow)' : 'transparent',
                  borderColor: showNoteTypes.has(t) ? 'var(--accent-500)' : 'var(--border-2)',
                  color: showNoteTypes.has(t) ? 'var(--accent-400)' : 'var(--text-2)',
                }}
              >
                {NOTE_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </Section>

        {/* Capas */}
        <Section label="Capas">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'Sprints', value: showSprints, set: setShowSprints },
              { label: 'Daily entries', value: showDaily, set: setShowDaily },
              { label: 'Impedimentos', value: showImpediments, set: setShowImpediments },
            ].map(item => (
              <label
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  color: item.value ? 'var(--text-1)' : 'var(--text-2)',
                  userSelect: 'none',
                }}
              >
                <div
                  onClick={() => item.set(!item.value)}
                  style={{
                    width: 28,
                    height: 15,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: item.value ? 'var(--accent-500)' : 'var(--bg-4)',
                    border: `1px solid ${item.value ? 'var(--accent-600)' : 'var(--border-2)'}`,
                    transition: 'background 0.15s, border-color 0.15s',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 1,
                      left: item.value ? 14 : 1,
                      width: 11,
                      height: 11,
                      borderRadius: '50%',
                      background: item.value ? '#fff' : 'var(--border-3)',
                      transition: 'left 0.15s',
                    }}
                  />
                </div>
                {item.label}
              </label>
            ))}
          </div>
        </Section>

        {/* Vínculos */}
        <Section label="Tipo de vínculo">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: '→ Sprint', value: linkSprint, set: setLinkSprint },
              { label: 'Etiqueta compartida', value: linkTag, set: setLinkTag },
              { label: 'Daily → Nota', value: linkDaily, set: setLinkDaily },
              { label: 'Imp. → Sprint', value: linkImpediment, set: setLinkImpediment },
            ].map(item => (
              <label
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  color: item.value ? 'var(--text-1)' : 'var(--text-2)',
                  userSelect: 'none',
                }}
              >
                <div
                  onClick={() => item.set(!item.value)}
                  style={{
                    width: 28,
                    height: 15,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: item.value ? 'var(--accent-500)' : 'var(--bg-4)',
                    border: `1px solid ${item.value ? 'var(--accent-600)' : 'var(--border-2)'}`,
                    transition: 'background 0.15s, border-color 0.15s',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 1,
                      left: item.value ? 14 : 1,
                      width: 11,
                      height: 11,
                      borderRadius: '50%',
                      background: item.value ? '#fff' : 'var(--border-3)',
                      transition: 'left 0.15s',
                    }}
                  />
                </div>
                {item.label}
              </label>
            ))}
          </div>
        </Section>

        {/* Sprint filter */}
        <Section label="Sprint">
          <select
            value={sprintFilter}
            onChange={e => setSprintFilter(e.target.value)}
            className="input-base"
            style={{ width: '100%', fontSize: 12 }}
          >
            <option value="">Todos los sprints</option>
            {sprints.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Section>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <Section label="Etiqueta">
            <select
              value={tagFilter}
              onChange={e => setTagFilter(e.target.value)}
              className="input-base"
              style={{ width: '100%', fontSize: 12 }}
            >
              <option value="">Todas las etiquetas</option>
              {allTags.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Section>
        )}

        {/* Date range */}
        <Section label="Rango de fechas">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="input-base"
              style={{ width: '100%', fontSize: 11, boxSizing: 'border-box' }}
            />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="input-base"
              style={{ width: '100%', fontSize: 11, boxSizing: 'border-box' }}
            />
          </div>
        </Section>

        {/* Reset filters */}
        <button
          onClick={() => {
            setShowNoteTypes(new Set(ALL_NOTE_TYPES))
            setShowSprints(true)
            setShowDaily(true)
            setShowImpediments(true)
            setSprintFilter('')
            setDateFrom('')
            setDateTo('')
            setTagFilter('')
            setSearch('')
          }}
          style={{ ...btnStyle, justifyContent: 'center', color: 'var(--text-2)', gap: 6 }}
        >
          <IcoReset /> Limpiar filtros
        </button>
      </div>

      {/* Legend */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border-1)' }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-3)',
            marginBottom: 6,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Leyenda
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { shape: 'hex', label: 'Sprint' },
            { shape: 'circle', label: 'Daily Entry' },
            { shape: 'diamond', label: 'Impedimento' },
            { shape: 'circle', label: 'Nota' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="12" height="12" viewBox="0 0 14 14">
                {item.shape === 'hex' ? (
                  <polygon
                    points="7,1 12.5,4 12.5,10 7,13 1.5,10 1.5,4"
                    fill="var(--accent-glow)"
                    stroke="var(--accent-400)"
                    strokeWidth="1.2"
                  />
                ) : item.shape === 'diamond' ? (
                  <polygon
                    points="7,1 13,7 7,13 1,7"
                    fill="var(--accent-glow)"
                    stroke="var(--accent-400)"
                    strokeWidth="1.2"
                  />
                ) : (
                  <circle
                    cx="7"
                    cy="7"
                    r="5.5"
                    fill="var(--accent-glow)"
                    stroke="var(--accent-400)"
                    strokeWidth="1.2"
                  />
                )}
              </svg>
              <span style={{ color: 'var(--text-2)', fontSize: 11 }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Node detail panel ────────────────────────────────────────────────────────

interface NodeDetailProps {
  node: GNode
  notes: Note[]
  sprints: Sprint[]
  entries: DailyEntry[]
  impediments: Impediment[]
  connectedNodes: GNode[]
  onClose: () => void
  onNavigate: (node: GNode) => void
}

function NodeDetail({
  node,
  notes,
  sprints,
  entries,
  impediments,
  connectedNodes,
  onClose,
  onNavigate,
}: NodeDetailProps) {
  let detail: React.ReactNode = null

  if (node.kind === 'note') {
    const id = node.id.replace('note:', '')
    const n = notes.find(n => n.id === id)
    if (n)
      detail = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <KV k="Tipo" v={NOTE_TYPE_LABEL[n.noteType]} color={NOTE_TYPE_COLOR[n.noteType]} />
          {n.tags.length > 0 && <KV k="Etiquetas" v={n.tags.join(', ')} />}
          {n.sprintId && (
            <KV
              k="Sprint"
              v={sprints.find(s => s.id === n.sprintId)?.name ?? n.sprintId}
              color={SPRINT_COLOR}
            />
          )}
          <KV k="Actualizado" v={fmtDate(n.updatedAt.split('T')[0])} />
          {n.content && (
            <div style={{ marginTop: 4 }}>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--text-3)',
                  marginBottom: 3,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Contenido
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-2)',
                  lineHeight: 1.5,
                  maxHeight: 100,
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {n.content.slice(0, 300)}
                {n.content.length > 300 ? '…' : ''}
              </div>
            </div>
          )}
        </div>
      )
  } else if (node.kind === 'sprint') {
    const id = node.id.replace('sprint:', '')
    const s = sprints.find(s => s.id === id)
    if (s)
      detail = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {s.goal && <KV k="Objetivo" v={s.goal} />}
          <KV k="Inicio" v={fmtDate(s.startDate)} />
          {s.endDate && <KV k="Fin" v={fmtDate(s.endDate)} />}
          {s.storyPoints != null && (
            <KV k="Story points" v={`${s.completedPoints ?? 0} / ${s.storyPoints}`} />
          )}
          {s.status && <KV k="Estado" v={s.status} color={SPRINT_COLOR} />}
        </div>
      )
  } else if (node.kind === 'daily') {
    const id = node.id.replace('daily:', '')
    const e = entries.find(e => e.id === id)
    if (e)
      detail = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <KV k="Fecha" v={fmtDate(e.date)} />
          {e.did.length > 0 && <KV k="Hice" v={e.did.slice(0, 2).join(' • ')} />}
          {e.will.length > 0 && <KV k="Haré" v={e.will.slice(0, 2).join(' • ')} />}
          {e.blocked.length > 0 && <KV k="Bloqueado" v={e.blocked.join(' • ')} color="#f59e0b" />}
          {e.mood != null && <KV k="Mood" v={'⭐'.repeat(e.mood)} />}
        </div>
      )
  } else if (node.kind === 'impediment') {
    const id = node.id.replace('imp:', '')
    const imp = impediments.find(i => i.id === id)
    if (imp)
      detail = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <KV k="Severidad" v={imp.severity} color={IMP_COLORS[imp.severity]} />
          <KV k="Estado" v={imp.status} />
          <KV k="Abierto" v={fmtDate(imp.openedAt)} />
          {imp.resolvedAt && <KV k="Resuelto" v={fmtDate(imp.resolvedAt)} color="#34d399" />}
          {imp.responsible && <KV k="Responsable" v={imp.responsible} />}
          {imp.description && <KV k="Descripción" v={imp.description} />}
        </div>
      )
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 260,
        background: 'var(--bg-1)',
        borderLeft: '1px solid var(--border-1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
        fontSize: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--border-1)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: node.color,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-0)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {node.label}
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 14 }}>
            {node.subLabel}
          </div>
        </div>
        <button onClick={onClose} style={{ ...ghostBtnStyle, padding: '2px 4px', flexShrink: 0 }}>
          <IcoX />
        </button>
      </div>

      {/* Detail */}
      <div style={{ padding: '10px 12px', flex: 1, overflowY: 'auto' }}>
        {detail}

        {/* Conexiones */}
        {connectedNodes.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-3)',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 600,
              }}
            >
              Conexiones ({connectedNodes.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {connectedNodes.slice(0, 10).map(cn => (
                <div
                  key={cn.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 6px',
                    borderRadius: 4,
                    background: 'var(--bg-2)',
                    cursor: 'pointer',
                    border: '1px solid transparent',
                  }}
                  onClick={() => onNavigate(cn)}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: cn.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      color: 'var(--text-1)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {cn.label}
                  </span>
                  <span style={{ color: 'var(--text-3)', fontSize: 10 }}>{cn.subLabel}</span>
                </div>
              ))}
              {connectedNodes.length > 10 && (
                <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '2px 6px' }}>
                  +{connectedNodes.length - 10} más
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigate button */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border-1)' }}>
        <button
          onClick={() => onNavigate(node)}
          style={{
            ...btnStyle,
            justifyContent: 'center',
            gap: 6,
            color: 'var(--accent-400)',
            borderColor: 'var(--accent-400)',
            width: '100%',
          }}
        >
          <IcoNavigate /> Abrir
        </button>
      </div>
    </div>
  )
}

// ─── Micro helpers ────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--text-3)',
          marginBottom: 5,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{label}</div>
    </div>
  )
}

function KV({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: 2,
        }}
      >
        {k}
      </div>
      <div style={{ fontSize: 12, color: color ?? 'var(--text-1)', lineHeight: 1.4 }}>{v}</div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 10px',
  background: 'transparent',
  border: '1px solid var(--border-2)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-1)',
  cursor: 'pointer',
  fontSize: 11,
  fontFamily: 'inherit',
  transition: 'border-color 0.12s, color 0.12s',
}

const ghostBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  background: 'transparent',
  border: 'none',
  color: 'var(--text-3)',
  cursor: 'pointer',
  borderRadius: 4,
  padding: 4,
  fontFamily: 'inherit',
}

const chipStyle: React.CSSProperties = {
  fontSize: 11,
  padding: '2px 7px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid',
  cursor: 'pointer',
  background: 'transparent',
  fontFamily: 'inherit',
  transition: 'border-color 0.12s, color 0.12s, background 0.12s',
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NotesMapPage() {
  const navigate = useNavigate()
  const notes = useAppSelector(s => s.notes.notes)
  const sprints = useAppSelector(s => s.daily.sprints)
  const entries = useAppSelector(s => s.daily.entries)
  const impediments = useAppSelector(s => s.impediments.impediments)

  // ── Filter state ──
  const [showNoteTypes, setShowNoteTypes] = useState<Set<NoteType>>(new Set(ALL_NOTE_TYPES))
  const [showSprints, setShowSprints] = useState(true)
  const [showDaily, setShowDaily] = useState(true)
  const [showImpediments, setShowImpediments] = useState(true)
  const [sprintFilter, setSprintFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [search, setSearch] = useState('')
  const [linkTag, setLinkTag] = useState(true)
  const [linkSprint, setLinkSprint] = useState(true)
  const [linkDaily, setLinkDaily] = useState(true)
  const [linkImpediment, setLinkImpediment] = useState(true)

  // ── Canvas / interaction state ──
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const nodesRef = useRef<GNode[]>([])
  const edgesRef = useRef<GEdge[]>([])
  const rafRef = useRef<number>(0)
  const transformRef = useRef({ x: 0, y: 0, scale: 1 })
  const isDraggingCanvas = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const dragNodeId = useRef<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const simRunning = useRef(true)
  const canvasSize = useRef({ w: 800, h: 600 })

  const allTags = useMemo(() => {
    const t = new Set<string>()
    notes.forEach(n => n.tags.forEach(tag => t.add(tag)))
    return Array.from(t).sort()
  }, [notes])

  // ── Build graph ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { w, h } = canvasSize.current

    const { nodes, edges } = buildGraph({
      notes,
      sprints,
      entries,
      impediments,
      showNoteTypes,
      showSprints,
      showDaily,
      showImpediments,
      sprintFilter,
      dateFrom,
      dateTo,
      tagFilter,
      search,
      linkTag,
      linkSprint,
      linkDaily,
      linkImpediment,
      prevNodes: nodesRef.current,
      canvasW: w,
      canvasH: h,
    })

    nodesRef.current = nodes
    edgesRef.current = edges
    simRunning.current = true
  }, [
    notes,
    sprints,
    entries,
    impediments,
    showNoteTypes,
    showSprints,
    showDaily,
    showImpediments,
    sprintFilter,
    dateFrom,
    dateTo,
    tagFilter,
    search,
    linkTag,
    linkSprint,
    linkDaily,
    linkImpediment,
  ])

  // ── Animation loop ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let stepsWithoutMotion = 0

    function frame() {
      if (!canvas || !ctx) return
      const { w, h } = canvasSize.current

      // Sim step
      if (simRunning.current) {
        simulationStep(nodesRef.current, edgesRef.current, w / 2, h / 2)
        // Stop sim when velocity is low
        const maxV = nodesRef.current.reduce(
          (m, n) => Math.max(m, Math.abs(n.vx) + Math.abs(n.vy)),
          0
        )
        if (maxV < 0.15) {
          stepsWithoutMotion++
          if (stepsWithoutMotion > 120) simRunning.current = false
        } else {
          stepsWithoutMotion = 0
        }
      }

      // Render
      ctx.clearRect(0, 0, w, h)

      const t = transformRef.current
      const m = new DOMMatrix().translate(t.x, t.y).scale(t.scale)

      drawGraph(ctx, nodesRef.current, edgesRef.current, selectedId, hoveredId, m, t.scale)

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [selectedId, hoveredId])

  // ── Resize observer ──
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      canvasSize.current = { w: width, h: height }
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = width
        canvas.height = height
      }
      simRunning.current = true
    })
    obs.observe(container)
    return () => obs.disconnect()
  }, [])

  // ── Canvas world coords ──
  function toWorld(cx: number, cy: number) {
    const t = transformRef.current
    return {
      x: (cx - t.x) / t.scale,
      y: (cy - t.y) / t.scale,
    }
  }

  function hitTest(worldX: number, worldY: number): GNode | null {
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const n = nodesRef.current[i]
      const dist = Math.sqrt((worldX - n.x) ** 2 + (worldY - n.y) ** 2)
      if (dist <= n.radius + 4) return n
    }
    return null
  }

  // ── Mouse handlers ──
  const onMouseDown = useCallback((e: RMouseEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const wx = e.clientX - rect.left
    const wy = e.clientY - rect.top
    const { x, y } = toWorld(wx, wy)
    const hit = hitTest(x, y)
    if (hit) {
      dragNodeId.current = hit.id
      hit.pinned = true
    } else {
      isDraggingCanvas.current = true
      dragStart.current = {
        x: e.clientX - transformRef.current.x,
        y: e.clientY - transformRef.current.y,
      }
    }
    simRunning.current = true
  }, [])

  const onMouseMove = useCallback((e: RMouseEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const wx = e.clientX - rect.left
    const wy = e.clientY - rect.top
    const { x, y } = toWorld(wx, wy)

    if (dragNodeId.current) {
      const n = nodesRef.current.find(n => n.id === dragNodeId.current)
      if (n) {
        n.x = x
        n.y = y
        n.vx = 0
        n.vy = 0
      }
      simRunning.current = true
    } else if (isDraggingCanvas.current) {
      transformRef.current.x = e.clientX - dragStart.current.x
      transformRef.current.y = e.clientY - dragStart.current.y
    } else {
      const hit = hitTest(x, y)
      setHoveredId(hit?.id ?? null)
    }
  }, [])

  const onMouseUp = useCallback((e: RMouseEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const wx = e.clientX - rect.left
    const wy = e.clientY - rect.top
    const { x, y } = toWorld(wx, wy)

    if (dragNodeId.current) {
      const n = nodesRef.current.find(n => n.id === dragNodeId.current)
      if (n) n.pinned = false
      dragNodeId.current = null
    } else if (!isDraggingCanvas.current) {
      const hit = hitTest(x, y)
      setSelectedId(hit?.id ?? null)
    }
    isDraggingCanvas.current = false
  }, [])

  const onWheel = useCallback((e: RWheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    const t = transformRef.current
    const newScale = Math.min(4, Math.max(0.1, t.scale * factor))
    const scaleRatio = newScale / t.scale
    t.x = mx - (mx - t.x) * scaleRatio
    t.y = my - (my - t.y) * scaleRatio
    t.scale = newScale
  }, [])

  const onDblClick = useCallback((e: RMouseEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const wx = e.clientX - rect.left
    const wy = e.clientY - rect.top
    const { x, y } = toWorld(wx, wy)
    const hit = hitTest(x, y)
    if (hit) navigateToNode(hit)
  }, [])

  function navigateToNode(node: GNode) {
    if (node.kind === 'note') navigate(`/editor/${node.id.replace('note:', '')}`)
    else if (node.kind === 'sprint') navigate('/sprints')
    else if (node.kind === 'daily') navigate(`/daily/${node.id.replace('daily:', '')}`)
    else if (node.kind === 'impediment') navigate('/impediments')
  }

  // ── Zoom controls ──
  function zoomIn() {
    const { w, h } = canvasSize.current
    const t = transformRef.current
    const f = 1.25
    t.x = w / 2 - (w / 2 - t.x) * f
    t.y = h / 2 - (h / 2 - t.y) * f
    t.scale = Math.min(4, t.scale * f)
  }
  function zoomOut() {
    const { w, h } = canvasSize.current
    const t = transformRef.current
    const f = 0.8
    t.x = w / 2 - (w / 2 - t.x) * f
    t.y = h / 2 - (h / 2 - t.y) * f
    t.scale = Math.max(0.1, t.scale * f)
  }
  function resetView() {
    transformRef.current = { x: 0, y: 0, scale: 1 }
    simRunning.current = true
  }
  function fitView() {
    const nodes = nodesRef.current
    if (nodes.length === 0) return
    const xs = nodes.map(n => n.x)
    const ys = nodes.map(n => n.y)
    const minX = Math.min(...xs) - 40
    const maxX = Math.max(...xs) + 40
    const minY = Math.min(...ys) - 40
    const maxY = Math.max(...ys) + 40
    const { w, h } = canvasSize.current
    const scaleX = w / (maxX - minX)
    const scaleY = h / (maxY - minY)
    const scale = Math.min(scaleX, scaleY, 2)
    transformRef.current = {
      x: w / 2 - ((minX + maxX) / 2) * scale,
      y: h / 2 - ((minY + maxY) / 2) * scale,
      scale,
    }
  }

  // ── Selected node data for detail panel ──
  const selectedNode = nodesRef.current.find(n => n.id === selectedId) ?? null
  const connectedNodes = useMemo(() => {
    if (!selectedId) return []
    const related = new Set<string>()
    edgesRef.current.forEach(e => {
      if (e.source === selectedId) related.add(e.target)
      if (e.target === selectedId) related.add(e.source)
    })
    return nodesRef.current.filter(n => related.has(n.id))
  }, [selectedId, edgesRef.current.length, nodesRef.current.length])

  const detailPanelOpen = selectedNode !== null
  const FILTER_W = 230
  const DETAIL_W = detailPanelOpen ? 260 : 0

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-0)',
        position: 'relative',
      }}
    >
      {/* Canvas area */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          marginLeft: FILTER_W,
          marginRight: DETAIL_W,
          transition: 'margin-right 0.15s',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            cursor: hoveredId ? 'pointer' : 'default',
            background: 'var(--bg-0)',
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onWheel={onWheel}
          onDoubleClick={onDblClick}
          onMouseLeave={() => {
            isDraggingCanvas.current = false
            dragNodeId.current = null
          }}
        />

        {/* Zoom controls */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            zIndex: 10,
          }}
        >
          {[
            { icon: <IcoPlus />, fn: zoomIn, title: 'Acercar' },
            { icon: <IcoMinus />, fn: zoomOut, title: 'Alejar' },
            { icon: <IcoReset />, fn: fitView, title: 'Ajustar vista' },
          ].map((b, i) => (
            <button
              key={i}
              onClick={b.fn}
              title={b.title}
              style={{
                ...btnStyle,
                padding: 8,
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-1)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              {b.icon}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {nodesRef.current.length === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              pointerEvents: 'none',
            }}
          >
            <svg
              width="48"
              height="48"
              fill="none"
              stroke="var(--text-3)"
              strokeWidth="1.2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12h8M12 8v8" />
            </svg>
            <div style={{ color: 'var(--text-3)', fontSize: 14 }}>
              Sin nodos. Crea notas, sprints o dailys para verlos aquí.
            </div>
          </div>
        )}

        {/* Hint */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 12,
            fontSize: 11,
            color: 'var(--text-3)',
            pointerEvents: 'none',
          }}
        >
          Click para seleccionar · Doble click para abrir · Arrastrar para mover
        </div>
      </div>

      {/* Filter panel */}
      <FilterPanel
        showNoteTypes={showNoteTypes}
        setShowNoteTypes={setShowNoteTypes}
        showSprints={showSprints}
        setShowSprints={setShowSprints}
        showDaily={showDaily}
        setShowDaily={setShowDaily}
        showImpediments={showImpediments}
        setShowImpediments={setShowImpediments}
        sprintFilter={sprintFilter}
        setSprintFilter={setSprintFilter}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        search={search}
        setSearch={setSearch}
        linkTag={linkTag}
        setLinkTag={setLinkTag}
        linkSprint={linkSprint}
        setLinkSprint={setLinkSprint}
        linkDaily={linkDaily}
        setLinkDaily={setLinkDaily}
        linkImpediment={linkImpediment}
        setLinkImpediment={setLinkImpediment}
        sprints={sprints}
        allTags={allTags}
        nodeCount={nodesRef.current.length}
        edgeCount={edgesRef.current.length}
      />

      {/* Detail panel */}
      {selectedNode && (
        <NodeDetail
          node={selectedNode}
          notes={notes}
          sprints={sprints}
          entries={entries}
          impediments={impediments}
          connectedNodes={connectedNodes}
          onClose={() => setSelectedId(null)}
          onNavigate={navigateToNode}
        />
      )}
    </div>
  )
}
