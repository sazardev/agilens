/**
 * TaskPage — Creador de tareas agiles.
 *
 * Diseno integrado con el lenguaje visual de DailyPage:
 * tarjetas con var(--bg-2), tipografia limpia, preview Markdown real.
 *
 * Caracteristicas:
 *  - Titulo, estado, prioridad, estimacion, dificultad
 *  - Sprint, proyecto, repositorio y etiquetas
 *  - Criterios de aceptacion (checklist)
 *  - Escenarios Gherkin con importador
 *  - Dependencias con NoteRelationPicker
 *  - Casos de uso y notas adicionales
 *  - Preview ReactMarkdown en tiempo real (mismo CSS que el editor)
 */
import { useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { nanoid } from '@reduxjs/toolkit'
import { useAppDispatch, useAppSelector } from '@/store'
import { addNote } from '@/store/slices/notesSlice'
import { setActiveNoteId } from '@/store/slices/uiSlice'
import type { Note, KanbanStatus, TaskPriority } from '@/types'
import { KANBAN_STATUS_META, TASK_PRIORITY_META } from '@/types'
import NoteRelationPicker from '@/components/editor/NoteRelationPicker'

// Helpers

function nowISO() {
  return new Date().toISOString()
}

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21] as const
const DIFFICULTY_LABELS = ['', 'Muy facil', 'Facil', 'Media', 'Dificil', 'Muy dificil']
const DIFFICULTY_COLORS = ['', '#34d399', '#60a5fa', '#fbbf24', '#f97316', '#ef4444']

const STATUSES: KanbanStatus[] = ['backlog', 'todo', 'in-progress', 'review', 'done']
const PRIORITIES: TaskPriority[] = ['critical', 'high', 'medium', 'low']

// Gherkin parser

interface GherkinStep {
  keyword: 'Given' | 'When' | 'Then' | 'And' | 'But'
  text: string
}

interface GherkinScenario {
  name: string
  steps: GherkinStep[]
}

function parseGherkin(raw: string): GherkinScenario[] {
  const lines = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l)
  const scenarios: GherkinScenario[] = []
  let current: GherkinScenario | null = null

  for (const line of lines) {
    const scenarioMatch = /^(?:Scenario|Escenario|Scenario Outline|Ejemplo):\s*(.+)/i.exec(line)
    if (scenarioMatch) {
      if (current) scenarios.push(current)
      current = { name: scenarioMatch[1].trim(), steps: [] }
      continue
    }
    const stepMatch =
      /^(Given|Dado que|When|Cuando|Then|Entonces|And|Y|But|Pero)\s+(.+)/i.exec(line)
    if (stepMatch && current) {
      const kw = stepMatch[1].toLowerCase()
      let keyword: GherkinStep['keyword'] = 'Given'
      if (['when', 'cuando'].includes(kw)) keyword = 'When'
      else if (['then', 'entonces'].includes(kw)) keyword = 'Then'
      else if (['and', 'y'].includes(kw)) keyword = 'And'
      else if (['but', 'pero'].includes(kw)) keyword = 'But'
      current.steps.push({ keyword, text: stepMatch[2].trim() })
    }
  }
  if (current) scenarios.push(current)
  return scenarios
}

function scenariosToMarkdown(scenarios: GherkinScenario[]): string {
  if (!scenarios.length) return ''
  return scenarios
    .map(s => {
      const steps = s.steps.map(st => `  - **${st.keyword}** ${st.text}`).join('\n')
      return `### ${s.name}\n\n${steps}`
    })
    .join('\n\n')
}

// Form state

interface TaskFormState {
  title: string
  description: string
  status: KanbanStatus
  priority: TaskPriority
  storyPoints: number | null
  difficulty: number
  timeEstimate: string
  sprintId: string
  projectId: string
  repoRef: string
  dependencies: { id: string; title: string }[]
  criteria: string[]
  scenarios: GherkinScenario[]
  useCases: string
  extraNotes: string
  gherkinRaw: string
}

const DEFAULT_FORM: TaskFormState = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  storyPoints: null,
  difficulty: 0,
  timeEstimate: '',
  sprintId: '',
  projectId: '',
  repoRef: '',
  dependencies: [],
  criteria: [''],
  scenarios: [],
  useCases: '',
  extraNotes: '',
  gherkinRaw: '',
}

// Markdown builder (contenido real de la nota, sin emojis)

function buildMarkdownContent(form: TaskFormState, tags: string[]): string {
  const sections: string[] = []

  if (form.description.trim()) {
    sections.push(`## Descripcion\n\n${form.description.trim()}`)
  }

  const activeCriteria = form.criteria.filter(c => c.trim())
  if (activeCriteria.length) {
    const list = activeCriteria.map(c => `- [ ] ${c.trim()}`).join('\n')
    sections.push(`## Criterios de Aceptacion\n\n${list}`)
  }

  const gherkinMd = scenariosToMarkdown(form.scenarios)
  if (gherkinMd) {
    sections.push(`## Escenarios Gherkin\n\n${gherkinMd}`)
  }

  if (form.useCases.trim()) {
    sections.push(`## Casos de Uso\n\n${form.useCases.trim()}`)
  }

  if (form.dependencies.length) {
    const deps = form.dependencies.map(d => `- [[${d.title || d.id}]]`).join('\n')
    sections.push(`## Dependencias\n\n${deps}`)
  }

  if (form.extraNotes.trim()) {
    sections.push(`## Notas Adicionales\n\n${form.extraNotes.trim()}`)
  }

  if (tags.length) {
    sections.push(`## Etiquetas\n\n${tags.map(t => `\`#${t}\``).join('  ')}`)
  }

  return sections.join('\n\n')
}

// Icons (SVG inline, sin emojis)

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

const IcoTask = ({ color }: { color?: string }) => (
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
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
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

const IcoCheck = ({ color }: { color: string }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
)

const IcoLink = () =>
  Ico(
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  )

const IcoGherkin = () =>
  Ico(
    <>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </>
  )

const IcoChevronDown = () => Ico(<polyline points="6 9 12 15 18 9" />, 11)
const IcoChevronUp = () => Ico(<polyline points="18 15 12 9 6 15" />, 11)

const IcoSave = () =>
  Ico(
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </>,
    14
  )

// Card style (igual que DailyPage)

const CARD: React.CSSProperties = {
  background: 'var(--bg-2)',
  border: '1px solid var(--border-1)',
  borderRadius: 'var(--radius-md)',
  padding: '14px 16px',
}

// Section header reutilizable

function CardHeader({
  icon,
  label,
  count,
  collapsible,
  open,
  onToggle,
}: {
  icon: React.ReactNode
  label: string
  count?: number
  collapsible?: boolean
  open?: boolean
  onToggle?: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: collapsible && !open ? 0 : '12px',
        cursor: collapsible ? 'pointer' : 'default',
        userSelect: 'none',
      }}
      onClick={collapsible ? onToggle : undefined}
    >
      <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-2)' }}>{icon}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)', flex: 1 }}>
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span
          style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-400)',
            fontWeight: 600,
          }}
        >
          {count}
        </span>
      )}
      {collapsible && (
        <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-3)' }}>
          {open ? <IcoChevronUp /> : <IcoChevronDown />}
        </span>
      )}
    </div>
  )
}

// Subheader label

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

// Tag input

function TagInput({
  value,
  onChange,
}: {
  value: string[]
  onChange: (tags: string[]) => void
}) {
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
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
        placeholder={value.length ? '' : 'Anadir etiqueta...'}
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

// Criteria editor

function CriteriaEditor({
  items,
  onChange,
}: {
  items: string[]
  onChange: (items: string[]) => void
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  function update(idx: number, val: string) {
    const next = [...items]
    next[idx] = val
    onChange(next)
  }
  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx))
  }
  function addItem() {
    onChange([...items, ''])
    setTimeout(() => refs.current[items.length]?.focus(), 50)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-1)',
            borderLeft: '2px solid #22c55e',
          }}
        >
          <IcoCheck color="#22c55e" />
          <input
            ref={el => {
              refs.current[idx] = el
            }}
            value={item}
            onChange={e => update(idx, e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addItem()
              }
              if (e.key === 'Backspace' && !item && items.length > 1) {
                remove(idx)
                setTimeout(() => refs.current[Math.max(0, idx - 1)]?.focus(), 30)
              }
            }}
            placeholder={`Criterio ${idx + 1}...`}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-0)',
              fontSize: '13px',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => remove(idx)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-3)',
              display: 'flex',
              padding: '2px',
              borderRadius: '4px',
            }}
          >
            <IcoX />
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="btn btn-ghost btn-sm"
        style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '5px' }}
      >
        <IcoPlus /> Anadir criterio
      </button>
    </div>
  )
}

// Gherkin scenario card

const KW_COLORS: Record<string, string> = {
  Given: '#34d399',
  When: '#60a5fa',
  Then: '#a78bfa',
  And: '#94a3b8',
  But: '#f97316',
}
const KEYWORDS: GherkinStep['keyword'][] = ['Given', 'When', 'Then', 'And', 'But']

function ScenarioCard({
  scenario,
  onChange,
  onRemove,
}: {
  scenario: GherkinScenario
  onChange: (s: GherkinScenario) => void
  onRemove: () => void
}) {
  function updateStep(idx: number, field: keyof GherkinStep, val: string) {
    const steps = scenario.steps.map((s, i) => (i === idx ? { ...s, [field]: val } : s))
    onChange({ ...scenario, steps })
  }
  function addStep() {
    onChange({ ...scenario, steps: [...scenario.steps, { keyword: 'And', text: '' }] })
  }
  function removeStep(idx: number) {
    onChange({ ...scenario, steps: scenario.steps.filter((_, i) => i !== idx) })
  }

  return (
    <div
      style={{
        border: '1px solid var(--border-1)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-1)',
        overflow: 'hidden',
        marginBottom: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '7px 12px',
          borderBottom: '1px solid var(--border-1)',
          background: 'var(--bg-2)',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#60a5fa',
            letterSpacing: '0.08em',
            fontFamily: 'var(--font-mono)',
          }}
        >
          SCENARIO
        </span>
        <input
          value={scenario.name}
          onChange={e => onChange({ ...scenario, name: e.target.value })}
          placeholder="Nombre del escenario..."
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: 'var(--text-0)',
            fontSize: '13px',
            fontWeight: 500,
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}
        >
          <IcoX />
        </button>
      </div>
      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {scenario.steps.map((step, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={step.keyword}
              onChange={e => updateStep(idx, 'keyword', e.target.value)}
              style={{
                padding: '3px 6px',
                borderRadius: '6px',
                border: '1px solid var(--border-1)',
                background: `${KW_COLORS[step.keyword]}18`,
                color: KW_COLORS[step.keyword],
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {KEYWORDS.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            <input
              value={step.text}
              onChange={e => updateStep(idx, 'text', e.target.value)}
              placeholder="descripcion del paso..."
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                borderBottom: '1px solid var(--border-1)',
                color: 'var(--text-0)',
                fontSize: '12px',
                padding: '2px 0',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={() => removeStep(idx)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: '2px' }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
        <button
          className="btn btn-ghost btn-sm"
          onClick={addStep}
          style={{ alignSelf: 'flex-start', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <IcoPlus /> Paso
        </button>
      </div>
    </div>
  )
}

// Main page

export default function TaskPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const sprints = useAppSelector(s => s.daily.sprints)
  const _allProjects = useAppSelector(s => s.projects.projects)
  const projects = useMemo(() => _allProjects.filter(p => !p.archived), [_allProjects])

  // Preview settings (mismos que DailyPage)
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

  // Resizable split (mismo patron que DailyPage)
  const SPLIT_KEY = 'agilens_tasks_split'
  const [splitPct, setSplitPct] = useState<number>(() => {
    try { return Number(localStorage.getItem(SPLIT_KEY)) || 48 } catch { return 48 }
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
      try { localStorage.setItem(SPLIT_KEY, String(pct)) } catch { /* noop */ }
    }
    const onUp = () => {
      draggingRef.current = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [])

  const [form, setForm] = useState<TaskFormState>(DEFAULT_FORM)
  const [tags, setTags] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(() => window.innerWidth >= 1080)
  const [showGherkinImport, setShowGherkinImport] = useState(false)
  const [showDepPicker, setShowDepPicker] = useState(false)
  const [showGherkin, setShowGherkin] = useState(true)
  const [showDeps, setShowDeps] = useState(true)
  const [showUseCases, setShowUseCases] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  function upd<K extends keyof TaskFormState>(k: K, v: TaskFormState[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  const selectedProject = useMemo(
    () => projects.find(p => p.id === form.projectId),
    [projects, form.projectId]
  )
  const repos = useMemo(() => selectedProject?.repoFullNames ?? [], [selectedProject])

  const mdContent = useMemo(() => buildMarkdownContent(form, tags), [form, tags])

  const previewMd = useMemo(() => {
    const statusMeta = KANBAN_STATUS_META[form.status]
    const priorityMeta = TASK_PRIORITY_META[form.priority]

    const metaLines: string[] = [
      `**Estado:** ${statusMeta.label}`,
      `**Prioridad:** ${priorityMeta.label}`,
    ]
    if (form.storyPoints != null) metaLines.push(`**Puntos:** ${form.storyPoints}`)
    if (form.difficulty > 0)
      metaLines.push(`**Dificultad:** ${form.difficulty}/5 -- ${DIFFICULTY_LABELS[form.difficulty]}`)
    if (form.timeEstimate) metaLines.push(`**Estimacion:** ${form.timeEstimate}`)
    if (form.sprintId) {
      const s = sprints.find(x => x.id === form.sprintId)
      if (s) metaLines.push(`**Sprint:** ${s.name}`)
    }
    if (selectedProject) metaLines.push(`**Proyecto:** ${selectedProject.name}`)
    if (form.repoRef) metaLines.push(`**Repo:** \`${form.repoRef}\``)

    const title = form.title.trim() || 'Sin titulo'
    const meta = metaLines.join('  \n')
    const body = mdContent || '*Sin contenido aun.*'

    return `# ${title}\n\n${meta}\n\n---\n\n${body}`
  }, [form, tags, mdContent, sprints, selectedProject])

  function handleGherkinImport() {
    const parsed = parseGherkin(form.gherkinRaw)
    upd('scenarios', [...form.scenarios, ...parsed])
    upd('gherkinRaw', '')
    setShowGherkinImport(false)
  }

  const handleSave = useCallback(() => {
    if (!form.title.trim()) return
    const now = nowISO()
    const note: Note = {
      id: nanoid(),
      title: form.title.trim(),
      content: mdContent,
      tags,
      noteType: 'task',
      sprintId: form.sprintId || undefined,
      projectId: form.projectId || undefined,
      projectIds: form.projectId ? [form.projectId] : [],
      createdAt: now,
      updatedAt: now,
      attachments: [],
      kanbanStatus: form.status,
      priority: form.priority,
      storyPoints: form.storyPoints ?? undefined,
    }
    dispatch(addNote(note))
    dispatch(setActiveNoteId(note.id))
    setSavedFlash(true)
    setTimeout(() => navigate(`/editor/${note.id}`), 800)
  }, [form, tags, mdContent, dispatch, navigate])

  const criteriaCount = form.criteria.filter(c => c.trim()).length

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', display: 'flex', overflow: 'hidden', background: 'var(--bg-0)' }}
    >
      {/* Form column */}
      <div
        style={{
          flex: showPreview ? `0 0 ${splitPct}%` : '1 1 auto',
          overflowY: 'auto',
          minWidth: 0,
        }}
      >
        <div
          style={{
            maxWidth: '680px',
            margin: '0 auto',
            padding: 'clamp(20px, 4vw, 36px) clamp(14px, 4vw, 28px) 80px',
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
                <IcoTask color="#facc15" />
                <h1
                  style={{
                    fontSize: '17px',
                    fontWeight: 600,
                    color: 'var(--text-0)',
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Nueva Tarea
                </h1>
              </div>
            </div>

            {savedFlash && (
              <span style={{ fontSize: '11px', color: '#4ade80', fontFamily: 'var(--font-mono)', paddingRight: '4px' }}>
                guardado
              </span>
            )}

            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowPreview(p => !p)}
              title={showPreview ? 'Ocultar vista previa' : 'Mostrar vista previa'}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0, color: showPreview ? 'var(--accent-400)' : undefined }}
            >
              <IcoPreview />
              Vista previa
            </button>

            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!form.title.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: 'var(--radius-md)', flexShrink: 0, opacity: form.title.trim() ? 1 : 0.45 }}
            >
              <IcoSave />
              Crear Tarea
            </button>
          </div>

          {/* Titulo */}
          <div style={CARD}>
            <input
              value={form.title}
              onChange={e => upd('title', e.target.value)}
              placeholder="Titulo de la tarea..."
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

          {/* Estado & Prioridad */}
          <div style={CARD}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <FieldLabel>Estado</FieldLabel>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {STATUSES.map(s => {
                    const m = KANBAN_STATUS_META[s]
                    const active = form.status === s
                    return (
                      <button
                        key={s}
                        onClick={() => upd('status', s)}
                        style={{
                          padding: '3px 11px',
                          borderRadius: '20px',
                          border: '1px solid',
                          borderColor: active ? m.color : 'var(--border-1)',
                          background: active ? `${m.color}18` : 'transparent',
                          color: active ? m.color : 'var(--text-1)',
                          fontSize: '12px',
                          fontWeight: active ? 600 : 400,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {m.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <FieldLabel>Prioridad</FieldLabel>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {PRIORITIES.map(p => {
                    const m = TASK_PRIORITY_META[p]
                    const active = form.priority === p
                    return (
                      <button
                        key={p}
                        onClick={() => upd('priority', p)}
                        style={{
                          padding: '3px 11px',
                          borderRadius: '20px',
                          border: '1px solid',
                          borderColor: active ? m.color : 'var(--border-1)',
                          background: active ? `${m.color}18` : 'transparent',
                          color: active ? m.color : 'var(--text-1)',
                          fontSize: '12px',
                          fontWeight: active ? 600 : 400,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {m.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Estimacion */}
          <div style={CARD}>
            <CardHeader
              icon={Ico(<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>)}
              label="Estimacion"
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '22px' }}>
              <div>
                <FieldLabel>Puntos (Fibonacci)</FieldLabel>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => upd('storyPoints', null)}
                    title="Sin estimar"
                    style={{
                      width: 30, height: 30, borderRadius: '6px',
                      border: '1px solid var(--border-1)',
                      background: form.storyPoints === null ? 'var(--bg-1)' : 'transparent',
                      color: 'var(--text-3)', fontSize: '11px',
                      fontWeight: form.storyPoints === null ? 700 : 400,
                      cursor: 'pointer', fontFamily: 'var(--font-mono)',
                    }}
                  >?</button>
                  {FIBONACCI.map(n => {
                    const active = form.storyPoints === n
                    return (
                      <button
                        key={n}
                        onClick={() => upd('storyPoints', n)}
                        style={{
                          width: 30, height: 30, borderRadius: '6px',
                          border: '1px solid', borderColor: active ? 'var(--accent-500)' : 'var(--border-1)',
                          background: active ? 'var(--accent-glow)' : 'transparent',
                          color: active ? 'var(--accent-400)' : 'var(--text-2)',
                          fontSize: '12px', fontWeight: active ? 700 : 400,
                          cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-mono)',
                        }}
                      >{n}</button>
                    )
                  })}
                </div>
              </div>
              <div>
                <FieldLabel>Dificultad</FieldLabel>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5].map(d => {
                    const active = form.difficulty === d
                    return (
                      <button
                        key={d}
                        onClick={() => upd('difficulty', form.difficulty === d ? 0 : d)}
                        title={DIFFICULTY_LABELS[d]}
                        style={{
                          width: 30, height: 30, borderRadius: '6px',
                          border: '1px solid', borderColor: active ? DIFFICULTY_COLORS[d] : 'var(--border-1)',
                          background: active ? `${DIFFICULTY_COLORS[d]}18` : 'transparent',
                          color: active ? DIFFICULTY_COLORS[d] : 'var(--text-2)',
                          fontSize: '12px', fontWeight: active ? 700 : 400,
                          cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-mono)',
                        }}
                      >{d}</button>
                    )
                  })}
                  {form.difficulty > 0 && (
                    <span style={{ fontSize: '11px', color: DIFFICULTY_COLORS[form.difficulty], fontFamily: 'var(--font-mono)', marginLeft: '4px' }}>
                      {DIFFICULTY_LABELS[form.difficulty]}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <FieldLabel>Tiempo estimado</FieldLabel>
                <input
                  className="input-base"
                  value={form.timeEstimate}
                  onChange={e => upd('timeEstimate', e.target.value)}
                  placeholder="ej. 3h, 2d..."
                  style={{ fontSize: '13px', width: '120px', fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>
          </div>

          {/* Contexto */}
          <div style={CARD}>
            <CardHeader
              icon={Ico(<><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></>)}
              label="Contexto"
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {/* Sprint */}
              <div style={{ flex: 1, minWidth: 148 }}>
                <FieldLabel>Sprint</FieldLabel>
                {sprints.length > 0 ? (
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {sprints.map(s => (
                      <button
                        key={s.id}
                        onClick={() => upd('sprintId', form.sprintId === s.id ? '' : s.id)}
                        style={{
                          padding: '2px 10px', borderRadius: '20px', border: '1px solid',
                          borderColor: form.sprintId === s.id ? 'var(--border-2)' : 'var(--border-1)',
                          background: form.sprintId === s.id ? 'var(--accent-glow)' : 'transparent',
                          color: form.sprintId === s.id ? 'var(--accent-400)' : 'var(--text-1)',
                          fontSize: '12px', fontWeight: form.sprintId === s.id ? 600 : 400,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >{s.name}</button>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-3)', fontStyle: 'italic' }}>Sin sprints</span>
                )}
              </div>
              {/* Proyecto */}
              <div style={{ flex: 1, minWidth: 148 }}>
                <FieldLabel>Proyecto</FieldLabel>
                <select
                  className="input-base"
                  value={form.projectId}
                  onChange={e => { upd('projectId', e.target.value); upd('repoRef', '') }}
                  style={{ width: '100%', fontSize: '13px', cursor: 'pointer' }}
                >
                  <option value="">Sin proyecto</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {/* Repositorio */}
              {repos.length > 0 && (
                <div style={{ flex: 1, minWidth: 148 }}>
                  <FieldLabel>Repositorio</FieldLabel>
                  <select
                    className="input-base"
                    value={form.repoRef}
                    onChange={e => upd('repoRef', e.target.value)}
                    style={{ width: '100%', fontSize: '13px', cursor: 'pointer' }}
                  >
                    <option value="">Sin repositorio</option>
                    {repos.map((r: string) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{ marginTop: '12px' }}>
              <FieldLabel>Etiquetas</FieldLabel>
              <TagInput value={tags} onChange={setTags} />
            </div>
          </div>

          {/* Descripcion */}
          <div style={CARD}>
            <CardHeader
              icon={Ico(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>)}
              label="Descripcion"
            />
            <textarea
              className="input-base"
              value={form.description}
              onChange={e => upd('description', e.target.value)}
              placeholder="Descripcion de la tarea (soporta Markdown)..."
              rows={4}
              style={{ width: '100%', resize: 'vertical', fontSize: '13px', lineHeight: 1.6, fontFamily: 'var(--font-mono)', boxSizing: 'border-box' }}
            />
          </div>

          {/* Criterios de Aceptacion */}
          <div style={CARD}>
            <CardHeader
              icon={Ico(<><polyline points="9 11 12 14 22 4" /><polyline points="9 18 12 21 22 11" /></>)}
              label="Criterios de Aceptacion"
              count={criteriaCount}
            />
            <CriteriaEditor items={form.criteria} onChange={items => upd('criteria', items)} />
          </div>

          {/* Escenarios Gherkin */}
          <div style={CARD}>
            <CardHeader
              icon={<IcoGherkin />}
              label="Escenarios Gherkin"
              count={form.scenarios.length}
              collapsible
              open={showGherkin}
              onToggle={() => setShowGherkin(v => !v)}
            />
            {showGherkin && (
              <>
                {form.scenarios.map((s, idx) => (
                  <ScenarioCard
                    key={idx}
                    scenario={s}
                    onChange={sc => {
                      const next = [...form.scenarios]
                      next[idx] = sc
                      upd('scenarios', next)
                    }}
                    onRemove={() => upd('scenarios', form.scenarios.filter((_, i) => i !== idx))}
                  />
                ))}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => upd('scenarios', [
                      ...form.scenarios,
                      { name: '', steps: [{ keyword: 'Given', text: '' }, { keyword: 'When', text: '' }, { keyword: 'Then', text: '' }] },
                    ])}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <IcoPlus /> Nuevo escenario
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowGherkinImport(v => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', color: showGherkinImport ? 'var(--accent-400)' : undefined }}
                  >
                    <IcoGherkin /> Importar Gherkin
                  </button>
                </div>
                {showGherkinImport && (
                  <div style={{ marginTop: '12px', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-1)', background: 'var(--bg-1)' }}>
                    <FieldLabel>Pegar texto Gherkin (Feature / Scenario / Given / When / Then)</FieldLabel>
                    <textarea
                      className="input-base"
                      value={form.gherkinRaw}
                      onChange={e => upd('gherkinRaw', e.target.value)}
                      rows={7}
                      placeholder={'Feature: Login\n\nScenario: Acceso exitoso\n  Given el usuario ingresa credenciales validas\n  When hace clic en Ingresar\n  Then ve el dashboard'}
                      style={{ width: '100%', resize: 'vertical', fontSize: '12px', fontFamily: 'var(--font-mono)', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button className="btn btn-primary btn-sm" onClick={handleGherkinImport} disabled={!form.gherkinRaw.trim()}>
                        Importar
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { upd('gherkinRaw', ''); setShowGherkinImport(false) }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Dependencias */}
          <div style={CARD}>
            <CardHeader
              icon={<IcoLink />}
              label="Dependencias"
              count={form.dependencies.length}
              collapsible
              open={showDeps}
              onToggle={() => setShowDeps(v => !v)}
            />
            {showDeps && (
              <>
                {form.dependencies.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                    {form.dependencies.map(dep => (
                      <span
                        key={dep.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          padding: '3px 9px 3px 7px', borderRadius: '99px',
                          border: '1px solid var(--border-1)', background: 'var(--bg-1)',
                          color: 'var(--text-0)', fontSize: '12px',
                        }}
                      >
                        <IcoLink />
                        {dep.title || dep.id}
                        <button
                          onClick={() => upd('dependencies', form.dependencies.filter(d => d.id !== dep.id))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: '0 1px' }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowDepPicker(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <IcoPlus /> Vincular tarea
                </button>
              </>
            )}
          </div>

          {/* Casos de Uso */}
          <div style={CARD}>
            <CardHeader
              icon={Ico(<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6M9 13h6M9 17h4" /></>)}
              label="Casos de Uso"
              collapsible
              open={showUseCases}
              onToggle={() => setShowUseCases(v => !v)}
            />
            {showUseCases && (
              <textarea
                className="input-base"
                value={form.useCases}
                onChange={e => upd('useCases', e.target.value)}
                placeholder={'Como [usuario], quiero [accion] para [beneficio].\n\nEscenario: ...\nActores: ...\nPrecondicion: ...'}
                rows={5}
                style={{ width: '100%', resize: 'vertical', fontSize: '13px', lineHeight: 1.6, fontFamily: 'var(--font-mono)', boxSizing: 'border-box' }}
              />
            )}
          </div>

          {/* Notas libres */}
          <div style={CARD}>
            <CardHeader
              icon={Ico(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>)}
              label="Notas libres"
            />
            <textarea
              className="input-base"
              value={form.extraNotes}
              onChange={e => upd('extraNotes', e.target.value)}
              placeholder="Contexto adicional, decisiones tecnicas, referencias..."
              rows={3}
              style={{ width: '100%', resize: 'vertical', fontSize: '13px', lineHeight: 1.6, boxSizing: 'border-box' }}
            />
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '10px', padding: '4px 2px 0', flexWrap: 'wrap',
              borderTop: '1px solid var(--border-1)',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              {criteriaCount > 0 ? `${criteriaCount} criterio${criteriaCount !== 1 ? 's' : ''}` : 'Sin criterios'}
              {form.scenarios.length > 0 ? ` · ${form.scenarios.length} escenario${form.scenarios.length !== 1 ? 's' : ''}` : ''}
              {form.dependencies.length > 0 ? ` · ${form.dependencies.length} dep.` : ''}
            </span>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!form.title.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: 'var(--radius-md)', opacity: form.title.trim() ? 1 : 0.45 }}
            >
              <IcoSave />
              Crear Tarea
            </button>
          </div>
        </div>
      </div>

      {/* Resize handle (mismo que DailyPage) */}
      {showPreview && (
        <div
          className="daily-resize-handle"
          onPointerDown={handleDragStart}
          title="Arrastrar para redimensionar"
        />
      )}

      {/* Preview column */}
      {showPreview && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Preview header */}
          <div
            style={{
              padding: '10px 20px 8px',
              borderBottom: '1px solid var(--border-1)',
              fontSize: '11px', fontWeight: 600, color: 'var(--text-3)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, flexWrap: 'wrap',
            }}
          >
            <IcoPreview />
            Vista previa de nota
            <div style={{ display: 'flex', gap: '5px', marginLeft: '8px', flexWrap: 'wrap' }}>
              {(() => {
                const sm = KANBAN_STATUS_META[form.status]
                return (
                  <span style={{ padding: '1px 8px', borderRadius: '99px', background: `${sm.color}18`, color: sm.color, fontSize: '10px', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
                    {sm.label}
                  </span>
                )
              })()}
              {(() => {
                const pm = TASK_PRIORITY_META[form.priority]
                return (
                  <span style={{ padding: '1px 8px', borderRadius: '99px', background: `${pm.color}18`, color: pm.color, fontSize: '10px', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
                    {pm.label}
                  </span>
                )
              })()}
              {form.storyPoints != null && (
                <span style={{ padding: '1px 8px', borderRadius: '99px', background: 'var(--accent-glow)', color: 'var(--accent-400)', fontSize: '10px', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
                  {form.storyPoints} pts
                </span>
              )}
            </div>
          </div>

          {/* Markdown real */}
          <div
            className="md-preview-root"
            style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 80px', fontSize: `${previewFontSize}px`, lineHeight: previewLineHeight }}
          >
            <article
              className={`md-prose ${previewIsDark ? 'md-prose--dark' : 'md-prose--light'}`}
              style={{ maxWidth: `${previewProseWidth}px`, margin: '0 auto', fontFamily: PROSE_FONT_STACKS[previewProseFont] ?? PROSE_FONT_STACKS.sans }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewMd}</ReactMarkdown>
            </article>
          </div>
        </div>
      )}

      {/* NoteRelationPicker para dependencias */}
      {showDepPicker && (
        <NoteRelationPicker
          onSelect={note => {
            if (!form.dependencies.find(d => d.id === note.id)) {
              upd('dependencies', [...form.dependencies, { id: note.id, title: note.title }])
            }
            setShowDepPicker(false)
          }}
          onClose={() => setShowDepPicker(false)}
        />
      )}
    </div>
  )
}
