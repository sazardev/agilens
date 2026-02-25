/**
 * ProjectPicker — popover para vincular uno o varios proyectos.
 * Incluye:
 *  • Búsqueda en tiempo real de proyectos existentes
 *  • Panel "Importar desde GitHub": lista repos, crea proyecto automáticamente
 *
 * Props:
 *   selectedIds  — IDs actualmente seleccionados
 *   onChange     — callback con la nueva lista de IDs
 *   mode         — 'single' | 'multi' (default: 'multi')
 *   placeholder  — texto del botón cuando no hay selección
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAppSelector, useAppDispatch } from '@/store'
import { addProject } from '@/store/slices/projectsSlice'
import { ProjectIcon } from '@/lib/projectIcons'
import type { ProjectIconName } from '@/types'
import { listUserRepos } from '@/lib/github/api'
import type { GitHubRepoMeta } from '@/lib/github/api'
import ProjectBadge from './ProjectBadge'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return crypto.randomUUID()
}

function todayISO() {
  return new Date().toISOString()
}

const LANG_COLOR: Record<string, string> = {
  typescript: '#3b82f6',
  javascript: '#eab308',
  python: '#22c55e',
  rust: '#f97316',
  go: '#06b6d4',
  java: '#f43f5e',
  kotlin: '#8b5cf6',
  swift: '#fb923c',
  html: '#f97316',
  css: '#6366f1',
  shell: '#34d399',
  bash: '#34d399',
  dockerfile: '#06b6d4',
  sql: '#10b981',
  ruby: '#ef4444',
  php: '#8b5cf6',
  csharp: '#6366f1',
  'c#': '#6366f1',
  cpp: '#f43f5e',
  c: '#64748b',
  dart: '#06b6d4',
  vue: '#22c55e',
  svelte: '#f97316',
}

function langToColor(lang: string | null): string {
  if (!lang) return '#6366f1'
  return LANG_COLOR[lang.toLowerCase()] ?? '#6366f1'
}

function langToIcon(lang: string | null): ProjectIconName {
  if (!lang) return 'code'
  const l = lang.toLowerCase()
  if (l === 'typescript' || l === 'javascript' || l === 'vue' || l === 'svelte') return 'code'
  if (l === 'python') return 'terminal'
  if (l === 'rust' || l === 'c' || l === 'cpp' || l === 'c#' || l === 'csharp') return 'tool'
  if (l === 'java' || l === 'kotlin' || l === 'swift' || l === 'dart') return 'mobile'
  if (l === 'html' || l === 'css') return 'globe'
  if (l === 'shell' || l === 'bash') return 'terminal'
  if (l === 'dockerfile') return 'cloud'
  if (l === 'sql') return 'database'
  if (l === 'go' || l === 'ruby' || l === 'php') return 'server'
  return 'code'
}

// ─── Inline icons ─────────────────────────────────────────────────────────────

const IcoGitHub = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.57 0-.28-.01-1.03-.01-2.02-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.4s2.04.13 3 .4c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.69.82.57C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
)

const IcoSpinner = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    style={{ animation: 'spin 0.8s linear infinite' }}
  >
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </svg>
)

const IcoBack = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const IcoRefresh = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <path d="M1 4v6h6" />
    <path d="M23 20v-6h-6" />
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
  </svg>
)

interface Props {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  mode?: 'single' | 'multi'
  placeholder?: string
  disabled?: boolean
  /** Si true el trigger y el dropdown ocupan el 100% del contenedor */
  fullWidth?: boolean
}

export default function ProjectPicker({
  selectedIds,
  onChange,
  mode = 'multi',
  placeholder = 'Vincular proyecto…',
  disabled = false,
  fullWidth = false,
}: Props) {
  const dispatch = useAppDispatch()
  const _allProjects = useAppSelector(s => s.projects.projects)
  const projects = useMemo(() => _allProjects.filter(p => !p.archived), [_allProjects])
  const githubToken = useAppSelector(s => s.settings.github?.token ?? null)

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [panel, setPanel] = useState<'list' | 'import'>('list')

  // GitHub import state
  const [repos, setRepos] = useState<GitHubRepoMeta[]>([])
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [repoSearch, setRepoSearch] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        setPanel('list')
        setSearch('')
      }
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [open])

  // Fetch GitHub repos
  const fetchRepos = useCallback(async () => {
    if (!githubToken) return
    setLoadingRepos(true)
    setImportError(null)
    try {
      const data = await listUserRepos(githubToken, 1, 100)
      setRepos(data)
    } catch {
      setImportError('Error al cargar repositorios de GitHub.')
    } finally {
      setLoadingRepos(false)
    }
  }, [githubToken])

  const openImport = () => {
    setPanel('import')
    setRepoSearch('')
    if (repos.length === 0 && !loadingRepos) fetchRepos()
  }

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  const filteredRepos = repos.filter(r => {
    const q = repoSearch.toLowerCase()
    return (
      r.name.toLowerCase().includes(q) ||
      r.fullName.toLowerCase().includes(q) ||
      (r.description ?? '').toLowerCase().includes(q)
    )
  })

  // Repos already linked to an existing project
  const linkedRepoFullNames = new Set(projects.flatMap(p => p.repoFullNames))

  function toggle(id: string) {
    if (mode === 'single') {
      onChange(selectedIds[0] === id ? [] : [id])
      setOpen(false)
    } else {
      if (selectedIds.includes(id)) {
        onChange(selectedIds.filter(x => x !== id))
      } else {
        onChange([...selectedIds, id])
      }
    }
  }

  function remove(id: string) {
    onChange(selectedIds.filter(x => x !== id))
  }

  function importRepo(repo: GitHubRepoMeta) {
    const now = todayISO()
    const color = langToColor(repo.language)
    const icon = langToIcon(repo.language)
    const techStack = [...(repo.language ? [repo.language] : []), ...repo.topics.slice(0, 5)]
    const newProject = {
      id: uid(),
      name: repo.name,
      description: repo.description ?? undefined,
      color,
      icon,
      techStack,
      repoFullNames: [repo.fullName],
      createdAt: now,
      updatedAt: now,
    }
    dispatch(addProject(newProject))
    if (mode === 'single') {
      onChange([newProject.id])
      setOpen(false)
    } else {
      onChange([...selectedIds, newProject.id])
    }
    setPanel('list')
  }

  const hasSelection = selectedIds.length > 0

  function closeModal() {
    setOpen(false)
    setPanel('list')
    setSearch('')
    setRepoSearch('')
  }

  return (
    <div
      style={{
        display: fullWidth ? 'block' : 'inline-block',
        width: fullWidth ? '100%' : undefined,
      }}
    >
      {/* Trigger */}
      <div
        onClick={() => !disabled && setOpen(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '4px',
          minHeight: '32px',
          width: fullWidth ? '100%' : undefined,
          padding: hasSelection ? '4px 8px' : '0 10px',
          borderRadius: '6px',
          border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
          background: 'var(--bg-2, rgba(255,255,255,0.05))',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          boxSizing: 'border-box',
        }}
      >
        {hasSelection ? (
          selectedIds.map(id => (
            <ProjectBadge
              key={id}
              projectId={id}
              size="sm"
              onRemove={disabled ? undefined : () => remove(id)}
            />
          ))
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--text-3, #6b7280)' }}>{placeholder}</span>
        )}
      </div>

      {/* Modal */}
      {open &&
        createPortal(
          <div
            onClick={closeModal}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2000,
              background: 'rgba(0,0,0,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              backdropFilter: 'blur(2px)',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: 'min(480px, 100%)',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '14px',
                border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
                background: 'var(--bg-1, #1a1a1e)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px 12px',
                  borderBottom: '1px solid var(--border-0, rgba(255,255,255,0.08))',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {panel === 'import' && (
                    <button
                      onClick={() => {
                        setPanel('list')
                        setRepoSearch('')
                      }}
                      title="Volver"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-2, #94a3b8)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px',
                        borderRadius: '6px',
                      }}
                    >
                      <IcoBack />
                    </button>
                  )}
                  <span
                    style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-0, #e2e2e2)' }}
                  >
                    {panel === 'list' ? 'Vincular proyectos' : 'Importar desde GitHub'}
                  </span>
                </div>
                <button
                  onClick={closeModal}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-2, #94a3b8)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                    borderRadius: '6px',
                    fontSize: '18px',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                {/* ── PANEL LISTA ── */}
                {panel === 'list' && (
                  <>
                    {/* Search */}
                    <div
                      style={{
                        padding: '12px 16px 10px',
                        borderBottom: '1px solid var(--border-0, rgba(255,255,255,0.08))',
                        flexShrink: 0,
                      }}
                    >
                      <input
                        autoFocus
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar proyecto…"
                        style={{
                          width: '100%',
                          background: 'var(--bg-2, rgba(255,255,255,0.07))',
                          border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
                          borderRadius: '8px',
                          color: 'var(--text-0, #e2e2e2)',
                          fontSize: '13px',
                          padding: '8px 12px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* List */}
                    <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
                      {filtered.length === 0 ? (
                        <div
                          style={{
                            padding: '24px 16px',
                            fontSize: '13px',
                            color: 'var(--text-3, #6b7280)',
                            textAlign: 'center',
                          }}
                        >
                          {search ? 'Sin coincidencias' : 'Sin proyectos creados'}
                        </div>
                      ) : (
                        filtered.map(p => {
                          const selected = selectedIds.includes(p.id)
                          return (
                            <div
                              key={p.id}
                              onClick={() => toggle(p.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '9px 16px',
                                cursor: 'pointer',
                                background: selected ? p.color + '18' : 'transparent',
                                transition: 'background 0.12s',
                              }}
                              onMouseEnter={e => {
                                if (!selected)
                                  (e.currentTarget as HTMLElement).style.background =
                                    'rgba(255,255,255,0.06)'
                              }}
                              onMouseLeave={e => {
                                ;(e.currentTarget as HTMLElement).style.background = selected
                                  ? p.color + '18'
                                  : 'transparent'
                              }}
                            >
                              <span
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '8px',
                                  background: p.color + '33',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <ProjectIcon icon={p.icon} size={15} color={p.color} />
                              </span>
                              <span
                                style={{
                                  flex: 1,
                                  fontSize: '14px',
                                  color: selected ? p.color : 'var(--text-0, #e2e2e2)',
                                  fontWeight: selected ? 600 : 400,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {p.name}
                              </span>
                              {selected && (
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke={p.color}
                                  strokeWidth="2.5"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>

                    {/* Footer del panel list */}
                    <div
                      style={{
                        borderTop: '1px solid var(--border-0, rgba(255,255,255,0.08))',
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: githubToken ? 'space-between' : 'flex-end',
                        gap: '8px',
                        flexShrink: 0,
                      }}
                    >
                      {githubToken && (
                        <button
                          onClick={openImport}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '7px',
                            border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: 'var(--text-2, #94a3b8)',
                            fontSize: '12px',
                            transition: 'background 0.12s, color 0.12s',
                          }}
                          onMouseEnter={e => {
                            ;(e.currentTarget as HTMLElement).style.background =
                              'rgba(255,255,255,0.07)'
                            ;(e.currentTarget as HTMLElement).style.color = 'var(--text-0)'
                          }}
                          onMouseLeave={e => {
                            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                            ;(e.currentTarget as HTMLElement).style.color = 'var(--text-2, #94a3b8)'
                          }}
                        >
                          <IcoGitHub />
                          Importar desde GitHub
                        </button>
                      )}
                      <button
                        onClick={closeModal}
                        style={{
                          padding: '6px 16px',
                          borderRadius: '7px',
                          border: 'none',
                          background: 'var(--accent-500, #6366f1)',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Listo
                      </button>
                    </div>
                  </>
                )}

                {/* ── PANEL IMPORTAR DESDE GITHUB ── */}
                {panel === 'import' && (
                  <>
                    {/* Buscador de repos */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 16px 10px',
                        borderBottom: '1px solid var(--border-0, rgba(255,255,255,0.08))',
                        flexShrink: 0,
                      }}
                    >
                      <input
                        autoFocus
                        value={repoSearch}
                        onChange={e => setRepoSearch(e.target.value)}
                        placeholder="Buscar repositorio…"
                        style={{
                          flex: 1,
                          background: 'var(--bg-2, rgba(255,255,255,0.07))',
                          border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
                          borderRadius: '8px',
                          color: 'var(--text-0, #e2e2e2)',
                          fontSize: '13px',
                          padding: '8px 12px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <button
                        onClick={fetchRepos}
                        disabled={loadingRepos}
                        title="Actualizar lista"
                        style={{
                          background: 'var(--bg-2, rgba(255,255,255,0.07))',
                          border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
                          cursor: loadingRepos ? 'not-allowed' : 'pointer',
                          color: 'var(--text-2, #94a3b8)',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px',
                          borderRadius: '8px',
                          flexShrink: 0,
                          opacity: loadingRepos ? 0.5 : 1,
                        }}
                      >
                        {loadingRepos ? <IcoSpinner /> : <IcoRefresh />}
                      </button>
                    </div>

                    {/* Lista de repos */}
                    <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
                      {loadingRepos ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '20px',
                            color: 'var(--text-3, #6b7280)',
                            fontSize: '12px',
                          }}
                        >
                          <IcoSpinner />
                          Cargando repositorios…
                        </div>
                      ) : importError ? (
                        <div
                          style={{
                            padding: '14px 12px',
                            fontSize: '12px',
                            color: '#f87171',
                            textAlign: 'center',
                            lineHeight: 1.5,
                          }}
                        >
                          {importError}
                          <br />
                          <span
                            onClick={fetchRepos}
                            style={{
                              color: 'var(--accent-400, #818cf8)',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              marginTop: '4px',
                              display: 'inline-block',
                            }}
                          >
                            Reintentar
                          </span>
                        </div>
                      ) : filteredRepos.length === 0 ? (
                        <div
                          style={{
                            padding: '14px',
                            fontSize: '12px',
                            color: 'var(--text-3, #6b7280)',
                            textAlign: 'center',
                          }}
                        >
                          {repos.length === 0 ? 'Sin repositorios' : 'Sin coincidencias'}
                        </div>
                      ) : (
                        filteredRepos.map(repo => {
                          const alreadyLinked = linkedRepoFullNames.has(repo.fullName)
                          const langColor = langToColor(repo.language)
                          return (
                            <div
                              key={repo.fullName}
                              onClick={() => !alreadyLinked && importRepo(repo)}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3px',
                                padding: '10px 16px',
                                cursor: alreadyLinked ? 'default' : 'pointer',
                                opacity: alreadyLinked ? 0.5 : 1,
                                transition: 'background 0.12s',
                                borderBottom: '1px solid var(--border-0, rgba(255,255,255,0.04))',
                              }}
                              onMouseEnter={e => {
                                if (!alreadyLinked)
                                  (e.currentTarget as HTMLElement).style.background =
                                    'rgba(255,255,255,0.06)'
                              }}
                              onMouseLeave={e => {
                                ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                              }}
                            >
                              {/* Nombre + badges */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                  style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    background: langColor,
                                    flexShrink: 0,
                                  }}
                                />
                                <span
                                  style={{
                                    flex: 1,
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: 'var(--text-0, #e2e2e2)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {repo.name}
                                </span>
                                {repo.private && (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      color: 'var(--text-3, #6b7280)',
                                      background: 'rgba(255,255,255,0.07)',
                                      borderRadius: '4px',
                                      padding: '1px 5px',
                                      flexShrink: 0,
                                    }}
                                  >
                                    privado
                                  </span>
                                )}
                                {alreadyLinked && (
                                  <span
                                    style={{ fontSize: '10px', color: '#34d399', flexShrink: 0 }}
                                  >
                                    ✓ vinculado
                                  </span>
                                )}
                              </div>

                              {/* Descripción */}
                              {repo.description && (
                                <span
                                  style={{
                                    fontSize: '12px',
                                    color: 'var(--text-3, #6b7280)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    paddingLeft: '18px',
                                  }}
                                >
                                  {repo.description}
                                </span>
                              )}

                              {/* Lenguaje */}
                              {repo.language && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    color: langColor,
                                    paddingLeft: '18px',
                                  }}
                                >
                                  {repo.language}
                                </span>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
