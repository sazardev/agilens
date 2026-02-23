// ─── Notes ────────────────────────────────────────────────────────────────────

export type NoteType = 'note' | 'daily' | 'evidence' | 'technical' | 'meeting' | 'sprint' | 'task'

export const NOTE_TYPE_META: Record<NoteType, { label: string; icon: string; color: string }> = {
  note: { label: 'Nota', icon: '📝', color: '#6b7280' },
  daily: { label: 'Daily', icon: '📅', color: '#60a5fa' },
  evidence: { label: 'Evidencia', icon: '📎', color: '#a78bfa' },
  technical: { label: 'Técnica', icon: '⚙️', color: '#34d399' },
  meeting: { label: 'Reunión', icon: '👥', color: '#fb923c' },
  sprint: { label: 'Sprint', icon: '🏃', color: '#f472b6' },
  task: { label: 'Tarea', icon: '✅', color: '#facc15' },
}

export interface NoteTemplate {
  id: string
  name: string
  type: NoteType
  content: string // may use {{title}} and {{date}} placeholders
  isDefault?: boolean
  isBuiltin?: boolean
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
  dataUrl: string // base64 or blob URL
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
  noteIds: string[] // Referencias a notas del día
}

// ─── Sprints ───────────────────────────────────────────────────────────────────

export interface Sprint {
  id: string
  name: string
  startDate: string
  endDate?: string
  goal?: string
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
}

// ─── UI ────────────────────────────────────────────────────────────────────────

export type AppView = 'editor' | 'daily' | 'git' | 'settings'

export interface UIState {
  activeView: AppView
  sidebarOpen: boolean
  sidebarWidth: number
  sidebarAutoHide: boolean
  activeNoteId: string | null
  editorPreviewMode: 'edit' | 'split' | 'preview'
}
