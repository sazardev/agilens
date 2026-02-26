// ─── Notes ────────────────────────────────────────────────────────────────────

export type NoteType =
  | 'note'
  | 'daily'
  | 'evidence'
  | 'technical'
  | 'meeting'
  | 'sprint'
  | 'task'
  | 'research'

export const NOTE_TYPE_META: Record<NoteType, { label: string; icon: string; color: string }> = {
  note: { label: 'Nota', icon: '📝', color: '#6b7280' },
  daily: { label: 'Daily', icon: '📅', color: '#60a5fa' },
  evidence: { label: 'Evidencia', icon: '📎', color: '#a78bfa' },
  technical: { label: 'Técnica', icon: '⚙️', color: '#34d399' },
  meeting: { label: 'Reunión', icon: '👥', color: '#fb923c' },
  sprint: { label: 'Sprint', icon: '🏃', color: '#f472b6' },
  task: { label: 'Tarea', icon: '✅', color: '#facc15' },
  research: { label: 'Investigación', icon: '🔬', color: '#22d3ee' },
}

export interface NoteTemplate {
  id: string
  name: string
  type: NoteType
  content: string // may use {{title}} and {{date}} placeholders
  isDefault?: boolean
  isBuiltin?: boolean
}

export type KanbanStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done'

export const KANBAN_STATUS_META: Record<
  KanbanStatus,
  { label: string; color: string; bg: string }
> = {
  backlog: { label: 'Backlog', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  todo: { label: 'Pendiente', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  'in-progress': { label: 'En progreso', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  review: { label: 'Revisión', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  done: { label: 'Hecho', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
}

// ─── Task priority ────────────────────────────────────────────────────────────

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'

export const TASK_PRIORITY_META: Record<
  TaskPriority,
  { label: string; color: string; bg: string; short: string }
> = {
  critical: { label: 'Crítica', short: 'C', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  high: { label: 'Alta', short: 'A', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  medium: { label: 'Media', short: 'M', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  low: { label: 'Baja', short: 'B', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
}

export interface Note {
  id: string
  title: string
  content: string // raw Markdown
  tags: string[]
  noteType: NoteType
  sprintId?: string
  templateId?: string
  folderId?: string // Reference to a Folder id
  createdAt: string // ISO date
  updatedAt: string // ISO date
  attachments: NoteAttachment[]
  commitHash?: string
  pinned?: boolean // Nota fijada — aparece primero en la lista
  locked?: boolean // Nota bloqueada — solo lectura
  color?: string // Color de etiqueta visual (hex)
  kanbanStatus?: KanbanStatus // estado para el tablero kanban
  priority?: TaskPriority // prioridad de la tarea
  storyPoints?: number // story points de la tarea
  projectId?: string // proyecto al que pertenece esta nota (legacy — preferir projectIds)
  projectIds?: string[] // proyectos vinculados a esta nota (multi-proyecto)
  linkedTaskId?: string // para notas de investigación: tarea vinculada
}

// ─── Folders ──────────────────────────────────────────────────────────────────

/** Visual folder tree node */
export interface Folder {
  id: string
  name: string
  parentId: string | null // null = root
  icon?: string // optional emoji override
  color?: string // accent hex
  isSystem?: boolean // auto-generated folders cannot be renamed/deleted by user
  systemKey?: string // stable key for auto folders (e.g. 'type:technical' | 'sprint:xyz')
  sortIndex: number
  createdAt: string
}

export interface NoteAttachment {
  id: string
  name: string
  type: 'image' | 'video' | 'file'
  /** base64 dataUrl — stored in IndexedDB, not in localStorage */
  dataUrl?: string
  size: number
}

// ─── Daily ─────────────────────────────────────────────────────────────────────

export interface DailyEntry {
  id: string
  date: string // YYYY-MM-DD
  sprintId?: string
  did: string[] // Hice
  will: string[] // Haré
  blocked: string[] // Bloqueos
  highlights?: string[] // Logros destacados
  noteIds: string[] // Referencias a notas del día
  projectNoteIds?: string[] // Notas vinculadas como proyectos
  projectIds?: string[] // IDs de proyectos Agilens trabajados en el día
  repoRefs?: string[] // full names de repos referenciados (owner/repo)
  generalNotes?: string // Notas libres
  mood?: number // 1-5
  energy?: number // 1-5
}

// ─── Sprints ───────────────────────────────────────────────────────────────────

export type SprintStatus = 'planning' | 'active' | 'completed' | 'cancelled'

export interface Sprint {
  id: string
  name: string
  startDate: string
  endDate?: string
  goal?: string
  status?: SprintStatus // planning | active | completed | cancelled
  description?: string // descripción extendida
  storyPoints?: number // puntos planificados
  completedPoints?: number // puntos completados al cerrar
  retrospective?: {
    wentWell?: string
    toImprove?: string
    actions?: string
  }
  projectIds?: string[] // proyectos involucrados en este sprint
}

// ─── Impediments ──────────────────────────────────────────────────────────────

export type ImpedimentStatus = 'open' | 'in-progress' | 'resolved' | 'wont-fix'
export type ImpedimentSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface Impediment {
  id: string
  title: string
  description?: string
  status: ImpedimentStatus
  severity: ImpedimentSeverity
  sprintId?: string // sprint afectado
  responsible?: string // persona responsable de resolverlo
  openedAt: string // YYYY-MM-DD
  resolvedAt?: string // YYYY-MM-DD
  notes?: string // notas libres
  linkedEntryIds?: string[] // daily entries relacionados
  linkedNoteIds?: string[] // notas/tareas relacionadas
  projectId?: string // proyecto al que pertenece este impedimento
}

// ─── Git ───────────────────────────────────────────────────────────────────────

export type GitStatus = 'unmodified' | 'modified' | 'added' | 'deleted' | 'untracked'

export interface GitFileStatus {
  path: string
  status: GitStatus
}

export interface GitCommit {
  oid: string
  message: string
  author: string
  timestamp: number
}

export interface GitBranch {
  name: string
  isCurrent: boolean
  isRemote: boolean
}

// ─── GitHub ────────────────────────────────────────────────────────────────────

export interface GitHubConfig {
  token: string
  owner: string
  repo: string
  branch: string
}

// ─── Settings ──────────────────────────────────────────────────────────────────

export type AccentColor =
  | 'indigo'
  | 'violet'
  | 'blue'
  | 'emerald'
  | 'orange'
  | 'pink'
  | 'cyan'
  | 'rose'
  | 'teal'
  | 'slate'
  | 'custom'

export type EditorFont =
  | 'fira-code'
  | 'jetbrains-mono'
  | 'cascadia'
  | 'source-code'
  | 'inconsolata'
  | 'ibm-plex'
  | 'system-mono'

export type UIDensity = 'compact' | 'default' | 'relaxed'

export type UITheme = 'dark' | 'light'

export type MarkdownPreviewFont = 'sans' | 'serif' | 'mono'

export interface AppSettings {
  github: GitHubConfig | null
  editorFontSize: number
  editorTheme: UITheme
  uiTheme: UITheme
  accentColor: AccentColor
  customAccentHex: string
  editorFont: EditorFont
  uiDensity: UIDensity
  defaultSprintId?: string
  userName: string
  userEmail: string
  lineHeight: number
  wordWrap: boolean
  // ─── Markdown preview ─────────────────────────────────────────────────────
  markdownPreviewFont: MarkdownPreviewFont
  markdownProseWidth: number
  markdownShowReadingTime: boolean
  markdownHeadingAnchors: boolean
  markdownCopyCode: boolean
  markdownCodeHighlight: boolean
  markdownTabSize: 2 | 4
  markdownSpellcheck: boolean
  // ─── Seguridad ────────────────────────────────────────────────────────────
  lockEnabled: boolean
  lockPasswordHash: string // SHA-256 hex del PIN/contraseña
  lockTimeoutMinutes: number // 0 = nunca, >0 = inactividad en minutos
  lockOnHide: boolean // bloquear cuando la pestaña pierde el foco
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export type ProjectIconName =
  | 'code'
  | 'globe'
  | 'server'
  | 'database'
  | 'mobile'
  | 'desktop'
  | 'api'
  | 'cloud'
  | 'shield'
  | 'tool'
  | 'star'
  | 'flame'
  | 'brain'
  | 'package'
  | 'layers'
  | 'terminal'

export interface Project {
  id: string
  name: string
  description?: string
  color: string // hex
  icon: ProjectIconName
  techStack: string[] // ['React', 'TypeScript', ...]
  repoFullNames: string[] // ['owner/repo', 'owner/repo2']
  createdAt: string // ISO
  updatedAt: string // ISO
  archived?: boolean
}

// ─── UI ────────────────────────────────────────────────────────────────────────

export type AppView = 'editor' | 'daily' | 'git' | 'settings'

export type NotesGroupBy = 'none' | 'type' | 'tag' | 'sprint' | 'alpha'

export type AutoOrganizeMode = 'off' | 'type' | 'sprint' | 'both'

export interface UIState {
  activeView: AppView
  sidebarOpen: boolean
  sidebarWidth: number
  sidebarAutoHide: boolean
  activeNoteId: string | null
  editorPreviewMode: 'edit' | 'split' | 'preview'
  notesGroupBy: NotesGroupBy
  notesTypeFilter: string | null
  autoOrganizeMode: AutoOrganizeMode
  focusMode: boolean // Modo zen — oculta sidebar y toolbars
}
