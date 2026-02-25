/**
 * ProjectsPage — Gestión de proyectos de Agilens.
 *
 * Cada proyecto puede tener nombre, color, ícono, descripción,
 * tech stack y N repositorios de GitHub vinculados.
 * Se integra con notas (evidencia/técnica/tarea), sprints,
 * impedimentos y dailys.
 */
import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  addProject,
  updateProject,
  deleteProject,
  archiveProject,
  unarchiveProject,
  linkRepo,
  unlinkRepo,
} from '@/store/slices/projectsSlice'
import { setNoteProject } from '@/store/slices/notesSlice'
import type { Project, ProjectIconName, NoteType } from '@/types'
import { NOTE_TYPE_META } from '@/types'
import { PROJECT_ICON_COMPONENTS, PROJECT_ICON_LABELS, ProjectIcon } from '@/lib/projectIcons'
import {
  listUserRepos,
  listUserOrgs,
  listOrgRepos,
  type GitHubRepoMeta,
  type GitHubOrgMeta,
} from '@/lib/github/api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function todayISO() {
  return new Date().toISOString()
}

// ─── Color presets ────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#64748b',
]

// ─── Icons ────────────────────────────────────────────────────────────────────

const IcoPlus = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const IcoEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)
const IcoTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
)
const IcoGitHub = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
)
const IcoArchive = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
)
const IcoLink = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </svg>
)
const IcoX = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const IcoSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const IcoChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)
const IcoNote = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
  </svg>
)
const IcoSprint = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)
const IcoBlock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
)
const IcoImport = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

// ─── ProjectFormModal ─────────────────────────────────────────────────────────

interface FormState {
  name: string
  description: string
  color: string
  icon: ProjectIconName
  techStack: string
}

function ProjectFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<Project>
  onSave: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'repoFullNames'>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<FormState>({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    color: initial?.color ?? COLOR_PRESETS[0],
    icon: initial?.icon ?? 'code',
    techStack: initial?.techStack?.join(', ') ?? '',
  })

  const iconNames = Object.keys(PROJECT_ICON_COMPONENTS) as ProjectIconName[]

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      color: form.color,
      icon: form.icon,
      techStack: form.techStack
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
    })
  }

  const label = (text: string) => (
    <label
      style={{
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.05em',
        color: 'var(--text-2, #9ca3af)',
        textTransform: 'uppercase',
        display: 'block',
        marginBottom: '6px',
      }}
    >
      {text}
    </label>
  )

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-2, rgba(255,255,255,0.07))',
    border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
    borderRadius: '8px',
    color: 'var(--text-0, #e2e2e2)',
    fontSize: '14px',
    padding: '8px 12px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-1, #1a1a1e)',
          border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
          borderRadius: '16px',
          padding: '28px',
          width: '480px',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text-0, #e2e2e2)',
            }}
          >
            {initial?.id ? 'Editar proyecto' : 'Nuevo proyecto'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-2, #9ca3af)',
              padding: '4px',
            }}
          >
            <IcoX />
          </button>
        </div>

        {/* Name */}
        <div>
          {label('Nombre *')}
          <input
            autoFocus
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Mi proyecto…"
            style={inputStyle}
            required
          />
        </div>

        {/* Description */}
        <div>
          {label('Descripción')}
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Descripción breve…"
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {/* Color + Icon */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            {label('Color')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: c,
                    border: form.color === c ? '2px solid white' : '2px solid transparent',
                    cursor: 'pointer',
                    outline: form.color === c ? `2px solid ${c}` : 'none',
                  }}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                title="Color personalizado"
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: '1px dashed var(--border-0, rgba(255,255,255,0.2))',
                  cursor: 'pointer',
                  padding: 0,
                  background: 'transparent',
                }}
              />
            </div>
          </div>

          {/* Preview */}
          <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
          >
            {label('Vista previa')}
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: form.color + '33',
                border: `2px solid ${form.color}88`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ProjectIcon icon={form.icon} size={22} color={form.color} />
            </div>
          </div>
        </div>

        {/* Icon picker */}
        <div>
          {label('Ícono')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {iconNames.map(name => {
              const selected = form.icon === name
              return (
                <button
                  key={name}
                  type="button"
                  title={PROJECT_ICON_LABELS[name]}
                  onClick={() => setForm(f => ({ ...f, icon: name }))}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: selected
                      ? form.color + '33'
                      : 'var(--bg-2, rgba(255,255,255,0.06))',
                    border: selected ? `1px solid ${form.color}88` : '1px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: selected ? form.color : 'var(--text-2, #9ca3af)',
                  }}
                >
                  <ProjectIcon icon={name} size={15} color={selected ? form.color : undefined} />
                </button>
              )
            })}
          </div>
        </div>

        {/* Tech Stack */}
        <div>
          {label('Tech Stack (separado por comas)')}
          <input
            value={form.techStack}
            onChange={e => setForm(f => ({ ...f, techStack: e.target.value }))}
            placeholder="React, TypeScript, Node.js, PostgreSQL…"
            style={inputStyle}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
              background: 'transparent',
              color: 'var(--text-1, #d1d5db)',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: form.color,
              color: 'white',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {initial?.id ? 'Guardar cambios' : 'Crear proyecto'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── GitHub Import Modal ──────────────────────────────────────────────────────

function GitHubImportModal({
  token,
  existingRepos,
  onImport,
  onClose,
}: {
  token: string
  existingRepos: Set<string>
  onImport: (repos: GitHubRepoMeta[]) => void
  onClose: () => void
}) {
  // 'me' = personal repos; any other string = org login
  const [scope, setScope] = useState<'me' | string>('me')
  const [orgs, setOrgs] = useState<GitHubOrgMeta[]>([])
  const [orgsLoading, setOrgsLoading] = useState(true)
  const [repos, setRepos] = useState<GitHubRepoMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  // Load orgs once
  useEffect(() => {
    void listUserOrgs(token).then(data => {
      setOrgs(data)
      setOrgsLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load repos whenever scope changes
  useEffect(() => {
    setRepos([])
    setPage(1)
    setSelected(new Set())
    void load(1, scope)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope])

  async function load(p: number, currentScope = scope) {
    setLoading(true)
    const data =
      currentScope === 'me'
        ? await listUserRepos(token, p, 50)
        : await listOrgRepos(token, currentScope, p, 50)
    if (p === 1) setRepos(data)
    else setRepos(prev => [...prev, ...data])
    setHasMore(data.length === 50)
    setLoading(false)
  }

  const filtered = repos.filter(
    r =>
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (r.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function toggle(fullName: string) {
    setSelected(prev => {
      const s = new Set(prev)
      if (s.has(fullName)) s.delete(fullName)
      else s.add(fullName)
      return s
    })
  }

  const selectedRepos = repos.filter(r => selected.has(r.fullName))

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        zIndex: 9100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-1, #1a1a1e)',
          border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
          borderRadius: '16px',
          width: '560px',
          maxWidth: '100%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--border-0, rgba(255,255,255,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IcoGitHub />
            <h3
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--text-0, #e2e2e2)',
              }}
            >
              Importar desde GitHub
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-2, #9ca3af)',
            }}
          >
            <IcoX />
          </button>
        </div>

        {/* Org / personal tabs */}
        <div
          style={{
            padding: '0 16px',
            borderBottom: '1px solid var(--border-0, rgba(255,255,255,0.08))',
            display: 'flex',
            gap: '2px',
            overflowX: 'auto',
            flexShrink: 0,
          }}
        >
          {/* Personal tab */}
          {[
            { login: 'me', label: 'Mis repos' },
            ...orgs.map(o => ({ login: o.login, label: o.login })),
          ].map(tab => (
            <button
              key={tab.login}
              onClick={() => {
                setScope(tab.login)
                setSearch('')
              }}
              style={{
                padding: '8px 14px',
                background: 'none',
                border: 'none',
                borderBottom: scope === tab.login ? '2px solid #6366f1' : '2px solid transparent',
                color: scope === tab.login ? '#818cf8' : 'var(--text-2, #9ca3af)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: scope === tab.login ? 600 : 400,
                whiteSpace: 'nowrap',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </button>
          ))}
          {orgsLoading && (
            <span
              style={{ padding: '8px 10px', fontSize: '11px', color: 'var(--text-3, #6b7280)' }}
            >
              Cargando orgs…
            </span>
          )}
        </div>

        {/* Search */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-0, rgba(255,255,255,0.06))',
            flexShrink: 0,
          }}
        >
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-3, #6b7280)',
              }}
            >
              <IcoSearch />
            </span>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={scope === 'me' ? 'Buscar en mis repos…' : `Buscar en ${scope}…`}
              style={{
                width: '100%',
                paddingLeft: '34px',
                padding: '7px 12px 7px 34px',
                background: 'var(--bg-2, rgba(255,255,255,0.07))',
                border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
                borderRadius: '8px',
                color: 'var(--text-0, #e2e2e2)',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading && repos.length === 0 ? (
            <div
              style={{
                padding: '40px',
                textAlign: 'center',
                color: 'var(--text-3, #6b7280)',
                fontSize: '13px',
              }}
            >
              Cargando repositorios…
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                padding: '40px',
                textAlign: 'center',
                color: 'var(--text-3, #6b7280)',
                fontSize: '13px',
              }}
            >
              Sin resultados
            </div>
          ) : (
            filtered.map(r => {
              const isExisting = existingRepos.has(r.fullName)
              const isSelected = selected.has(r.fullName)
              return (
                <div
                  key={r.fullName}
                  onClick={() => !isExisting && toggle(r.fullName)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '10px 20px',
                    cursor: isExisting ? 'default' : 'pointer',
                    background: isSelected ? 'rgba(99,102,241,0.1)' : 'transparent',
                    opacity: isExisting ? 0.5 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!isExisting && !isSelected)
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.background = isSelected
                      ? 'rgba(99,102,241,0.1)'
                      : 'transparent'
                  }}
                >
                  {/* Checkbox */}
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '5px',
                      border: isSelected
                        ? 'none'
                        : '1px solid var(--border-0, rgba(255,255,255,0.2))',
                      background: isSelected ? '#6366f1' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {isSelected && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--text-0, #e2e2e2)',
                        }}
                      >
                        {r.fullName}
                      </span>
                      {r.private && (
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'rgba(234,179,8,0.15)',
                            color: '#eab308',
                            fontWeight: 600,
                          }}
                        >
                          privado
                        </span>
                      )}
                      {isExisting && (
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'rgba(52,211,153,0.12)',
                            color: '#34d399',
                            fontWeight: 600,
                          }}
                        >
                          ya importado
                        </span>
                      )}
                    </div>
                    {r.description && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-2, #9ca3af)',
                          marginTop: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {r.description}
                      </div>
                    )}
                    <div
                      style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}
                    >
                      {r.language && (
                        <span style={{ fontSize: '11px', color: 'var(--text-3, #6b7280)' }}>
                          {r.language}
                        </span>
                      )}
                      {r.topics.slice(0, 3).map(t => (
                        <span
                          key={t}
                          style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'rgba(99,102,241,0.15)',
                            color: '#818cf8',
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })
          )}

          {/* Load more */}
          {hasMore && !loading && (
            <button
              onClick={() => {
                const next = page + 1
                setPage(next)
                void load(next)
              }}
              style={{
                display: 'block',
                margin: '8px auto',
                padding: '6px 18px',
                borderRadius: '6px',
                border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
                background: 'transparent',
                color: 'var(--text-1, #d1d5db)',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Cargar más…
            </button>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-0, rgba(255,255,255,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-2, #9ca3af)' }}>
            {selected.size > 0
              ? `${selected.size} seleccionado${selected.size > 1 ? 's' : ''}`
              : 'Selecciona repositorios'}
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '7px 16px',
                borderRadius: '7px',
                border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
                background: 'transparent',
                color: 'var(--text-1, #d1d5db)',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Cancelar
            </button>
            <button
              disabled={selected.size === 0}
              onClick={() => {
                onImport(selectedRepos)
                onClose()
              }}
              style={{
                padding: '7px 16px',
                borderRadius: '7px',
                border: 'none',
                background: selected.size > 0 ? '#6366f1' : 'rgba(99,102,241,0.3)',
                color: 'white',
                cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Importar {selected.size > 0 ? `(${selected.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── AddRepoInput ─────────────────────────────────────────────────────────────

function AddRepoInput({
  onAdd,
  token,
  usedRepos,
}: {
  onAdd: (fullName: string) => void
  token: string | null
  usedRepos: string[]
}) {
  const [val, setVal] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<GitHubRepoMeta[]>([])

  async function loadSugg() {
    if (!token) return
    const all = await listUserRepos(token, 1, 100)
    setSuggestions(all.filter(r => !usedRepos.includes(r.fullName)))
    setSuggestOpen(true)
  }

  function submit() {
    const v = val.trim()
    if (!v || usedRepos.includes(v)) return
    onAdd(v)
    setVal('')
    setSuggestOpen(false)
  }

  const filtered = suggestions.filter(
    r => !usedRepos.includes(r.fullName) && r.fullName.toLowerCase().includes(val.toLowerCase())
  )

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onFocus={() => token && void loadSugg()}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="owner/repo"
          style={{
            flex: 1,
            background: 'var(--bg-2, rgba(255,255,255,0.07))',
            border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
            borderRadius: '7px',
            color: 'var(--text-0, #e2e2e2)',
            fontSize: '12px',
            padding: '6px 10px',
            outline: 'none',
          }}
        />
        <button
          onClick={submit}
          disabled={!val.trim()}
          style={{
            padding: '6px 12px',
            borderRadius: '7px',
            border: 'none',
            background: val.trim() ? 'var(--accent-500, #6366f1)' : 'rgba(99,102,241,0.25)',
            color: 'white',
            cursor: val.trim() ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          Agregar
        </button>
      </div>

      {/* Sugerencias */}
      {suggestOpen && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 200,
            background: 'var(--bg-1, #1a1a1e)',
            border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
            borderRadius: '8px',
            maxHeight: '180px',
            overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {filtered.slice(0, 12).map(r => (
            <div
              key={r.fullName}
              onClick={() => {
                onAdd(r.fullName)
                setVal('')
                setSuggestOpen(false)
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                color: 'var(--text-0, #e2e2e2)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={e =>
                ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)')
              }
              onMouseLeave={e =>
                ((e.currentTarget as HTMLElement).style.background = 'transparent')
              }
            >
              <IcoGitHub />
              <span style={{ fontWeight: 600 }}>{r.fullName}</span>
              {r.language && (
                <span style={{ color: 'var(--text-3, #6b7280)', fontSize: '11px' }}>
                  {r.language}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ProjectDetail ────────────────────────────────────────────────────────────

function ProjectDetail({
  project,
  onEdit,
  token,
}: {
  project: Project
  onEdit: () => void
  token: string | null
}) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const allNotes = useAppSelector(s => s.notes.notes)
  const allSprints = useAppSelector(s => s.daily.sprints)
  const allImpediments = useAppSelector(s => s.impediments.impediments)
  const notes = useMemo(
    () => allNotes.filter(n => n.projectId === project.id),
    [allNotes, project.id]
  )
  const sprints = useMemo(
    () => allSprints.filter(s => s.projectIds?.includes(project.id)),
    [allSprints, project.id]
  )
  const impediments = useMemo(
    () => allImpediments.filter(i => i.projectId === project.id),
    [allImpediments, project.id]
  )

  // ── Notes panel state ──────────────────────────────────────────────────
  const [notesOpen, setNotesOpen] = useState(true)
  const [noteSearch, setNoteSearch] = useState('')
  const [noteTypeFilter, setNoteTypeFilter] = useState<NoteType | 'all'>('all')
  const [noteSprintFilter, setNoteSprintFilter] = useState<string | 'all'>('all')
  const [noteSort, setNoteSort] = useState<'title-asc' | 'title-desc' | 'newest' | 'oldest'>(
    'newest'
  )

  const filteredNotes = useMemo(() => {
    let list = notes
    if (noteSearch.trim()) {
      const q = noteSearch.toLowerCase()
      list = list.filter(n => (n.title || '').toLowerCase().includes(q))
    }
    if (noteTypeFilter !== 'all') list = list.filter(n => n.noteType === noteTypeFilter)
    if (noteSprintFilter !== 'all') list = list.filter(n => n.sprintId === noteSprintFilter)
    if (noteSort === 'title-asc')
      list = [...list].sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    else if (noteSort === 'title-desc')
      list = [...list].sort((a, b) => (b.title || '').localeCompare(a.title || ''))
    else if (noteSort === 'newest')
      list = [...list].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    else if (noteSort === 'oldest')
      list = [...list].sort((a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || ''))
    return list
  }, [notes, noteSearch, noteTypeFilter, noteSprintFilter, noteSort])

  function addLinkedRepo(fullName: string) {
    dispatch(linkRepo({ projectId: project.id, repoFullName: fullName }))
  }

  function removeLinkedRepo(fullName: string) {
    dispatch(unlinkRepo({ projectId: project.id, repoFullName: fullName }))
  }

  const statCard = (icon: React.ReactNode, label: string, count: number, color: string) => (
    <div
      style={{
        flex: 1,
        padding: '14px 16px',
        borderRadius: '10px',
        background: color + '18',
        border: `1px solid ${color}33`,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <span style={{ color }}>{icon}</span>
      <div>
        <div style={{ fontSize: '20px', fontWeight: 700, color, lineHeight: 1 }}>{count}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-2, #9ca3af)', marginTop: '2px' }}>
          {label}
        </div>
      </div>
    </div>
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '24px',
        overflowY: 'auto',
        flex: 1,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: project.color + '33',
            border: `2px solid ${project.color}66`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ProjectIcon icon={project.icon} size={26} color={project.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text-0, #e2e2e2)',
              }}
            >
              {project.name}
            </h2>
            {project.archived && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '99px',
                  background: 'rgba(107,114,128,0.2)',
                  color: '#6b7280',
                }}
              >
                Archivado
              </span>
            )}
          </div>
          {project.description && (
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-2, #9ca3af)' }}>
              {project.description}
            </p>
          )}
          {project.techStack.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
              {project.techStack.map(t => (
                <span
                  key={t}
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '99px',
                    background: project.color + '22',
                    color: project.color,
                    border: `1px solid ${project.color}44`,
                    fontWeight: 500,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onEdit}
          style={{
            padding: '6px 12px',
            borderRadius: '7px',
            border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
            background: 'transparent',
            color: 'var(--text-1, #d1d5db)',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <IcoEdit /> Editar
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {statCard(<IcoNote />, 'Notas', notes.length, '#60a5fa')}
        {statCard(<IcoSprint />, 'Sprints', sprints.length, '#a78bfa')}
        {statCard(<IcoBlock />, 'Bloqueos', impediments.length, '#f87171')}
      </div>

      {/* GitHub Repos */}
      <div>
        <h3
          style={{
            margin: '0 0 12px',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-2, #9ca3af)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <IcoGitHub /> Repositorios vinculados
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {project.repoFullNames.length === 0 ? (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-3, #6b7280)' }}>
              Sin repos vinculados.
            </p>
          ) : (
            project.repoFullNames.map(repo => (
              <div
                key={repo}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-2, rgba(255,255,255,0.05))',
                  border: '1px solid var(--border-0, rgba(255,255,255,0.07))',
                }}
              >
                <IcoGitHub />
                <a
                  href={`https://github.com/${repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    fontSize: '13px',
                    color: 'var(--text-0, #e2e2e2)',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  {repo}
                  <IcoLink />
                </a>
                <button
                  onClick={() => removeLinkedRepo(repo)}
                  title="Quitar repo"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-3, #6b7280)',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <IcoX />
                </button>
              </div>
            ))
          )}

          {/* Add repo */}
          {!project.archived && (
            <AddRepoInput onAdd={addLinkedRepo} token={token} usedRepos={project.repoFullNames} />
          )}
        </div>
      </div>

      {/* Notes linked */}
      <div
        style={{
          border: '1px solid var(--border-0, rgba(255,255,255,0.07))',
          borderRadius: '10px',
          overflow: 'hidden',
        }}
      >
        {/* Collapsible header */}
        <button
          onClick={() => setNotesOpen(v => !v)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'var(--bg-1, rgba(255,255,255,0.04))',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-1, #d1d5db)',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-2, #9ca3af)',
            }}
          >
            <IcoNote />
            Notas vinculadas
            <span
              style={{
                background: 'var(--bg-3, rgba(255,255,255,0.1))',
                borderRadius: '99px',
                padding: '1px 7px',
                fontSize: '10px',
                fontWeight: 500,
                color: 'var(--text-2, #9ca3af)',
              }}
            >
              {notes.length}
            </span>
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              transform: notesOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {notesOpen && (
          <div
            style={{
              padding: '10px 12px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {/* Controls */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: '1 1 140px', minWidth: '120px' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '7px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-3, #6b7280)',
                    pointerEvents: 'none',
                    display: 'flex',
                  }}
                >
                  <IcoSearch />
                </span>
                <input
                  value={noteSearch}
                  onChange={e => setNoteSearch(e.target.value)}
                  placeholder="Buscar nota…"
                  style={{
                    width: '100%',
                    paddingLeft: '26px',
                    padding: '5px 8px 5px 26px',
                    background: 'var(--bg-2, rgba(255,255,255,0.06))',
                    border: '1px solid var(--border-0, rgba(255,255,255,0.09))',
                    borderRadius: '6px',
                    color: 'var(--text-0, #e2e2e2)',
                    fontSize: '12px',
                    outline: 'none',
                    fontFamily: 'var(--font-ui)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              {/* Type filter */}
              <select
                value={noteTypeFilter}
                onChange={e => setNoteTypeFilter(e.target.value as NoteType | 'all')}
                style={{
                  padding: '5px 8px',
                  background: 'var(--bg-2, rgba(255,255,255,0.06))',
                  border: '1px solid var(--border-0, rgba(255,255,255,0.09))',
                  borderRadius: '6px',
                  color: 'var(--text-1, #d1d5db)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <option value="all">Todos los tipos</option>
                {(Object.keys(NOTE_TYPE_META) as NoteType[]).map(t => (
                  <option key={t} value={t}>
                    {NOTE_TYPE_META[t].label}
                  </option>
                ))}
              </select>
              {/* Sprint filter */}
              {sprints.length > 0 && (
                <select
                  value={noteSprintFilter}
                  onChange={e => setNoteSprintFilter(e.target.value)}
                  style={{
                    padding: '5px 8px',
                    background: 'var(--bg-2, rgba(255,255,255,0.06))',
                    border: '1px solid var(--border-0, rgba(255,255,255,0.09))',
                    borderRadius: '6px',
                    color: 'var(--text-1, #d1d5db)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  <option value="all">Todos los sprints</option>
                  {sprints.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              {/* Sort */}
              <select
                value={noteSort}
                onChange={e => setNoteSort(e.target.value as typeof noteSort)}
                style={{
                  padding: '5px 8px',
                  background: 'var(--bg-2, rgba(255,255,255,0.06))',
                  border: '1px solid var(--border-0, rgba(255,255,255,0.09))',
                  borderRadius: '6px',
                  color: 'var(--text-1, #d1d5db)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <option value="newest">Más reciente</option>
                <option value="oldest">Más antigua</option>
                <option value="title-asc">A → Z</option>
                <option value="title-desc">Z → A</option>
              </select>
            </div>

            {/* Notes list */}
            {notes.length === 0 ? (
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-3, #6b7280)',
                  fontStyle: 'italic',
                  margin: '4px 0 0',
                }}
              >
                No hay notas vinculadas a este proyecto.
              </p>
            ) : filteredNotes.length === 0 ? (
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-3, #6b7280)',
                  fontStyle: 'italic',
                  margin: '4px 0 0',
                }}
              >
                No hay notas que coincidan con los filtros.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {filteredNotes.map(n => {
                  const typeMeta = NOTE_TYPE_META[n.noteType]
                  return (
                    <div
                      key={n.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '7px 10px',
                        borderRadius: '7px',
                        background: 'var(--bg-2, rgba(255,255,255,0.04))',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onClick={() => navigate(`/editor/${n.id}`)}
                      onMouseEnter={e => {
                        ;(e.currentTarget as HTMLElement).style.background =
                          'var(--bg-3, rgba(255,255,255,0.08))'
                      }}
                      onMouseLeave={e => {
                        ;(e.currentTarget as HTMLElement).style.background =
                          'var(--bg-2, rgba(255,255,255,0.04))'
                      }}
                    >
                      <span style={{ color: typeMeta.color, flexShrink: 0 }}>
                        <IcoNote />
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontSize: '13px',
                          color: 'var(--text-0, #e2e2e2)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {n.title || '(sin título)'}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '99px',
                          background: typeMeta.color + '22',
                          color: typeMeta.color,
                          flexShrink: 0,
                        }}
                      >
                        {typeMeta.label}
                      </span>
                      {n.sprintId &&
                        (() => {
                          const sp = sprints.find(s => s.id === n.sprintId)
                          return sp ? (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '99px',
                                background: 'rgba(167,139,250,0.15)',
                                color: '#a78bfa',
                                flexShrink: 0,
                                maxWidth: '90px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={sp.name}
                            >
                              {sp.name}
                            </span>
                          ) : null
                        })()}
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          dispatch(setNoteProject({ id: n.id, projectId: undefined }))
                        }}
                        title="Desvincular nota"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-3, #6b7280)',
                          padding: '2px',
                          flexShrink: 0,
                          opacity: 0.6,
                        }}
                        onMouseEnter={e => {
                          ;(e.currentTarget as HTMLElement).style.opacity = '1'
                        }}
                        onMouseLeave={e => {
                          ;(e.currentTarget as HTMLElement).style.opacity = '0.6'
                        }}
                      >
                        <IcoX />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sprints linked */}
      {sprints.length > 0 && (
        <div>
          <h3
            style={{
              margin: '0 0 10px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-2, #9ca3af)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Sprints vinculados
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {sprints.map(s => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-2, rgba(255,255,255,0.04))',
                }}
              >
                <IcoSprint />
                <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-0, #e2e2e2)' }}>
                  {s.name}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 7px',
                    borderRadius: '99px',
                    background: 'rgba(167,139,250,0.12)',
                    color: '#a78bfa',
                  }}
                >
                  {s.status ?? 'planning'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Impediments linked */}
      {impediments.length > 0 && (
        <div>
          <h3
            style={{
              margin: '0 0 10px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-2, #9ca3af)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Bloqueos vinculados
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {impediments.map(imp => (
              <div
                key={imp.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-2, rgba(255,255,255,0.04))',
                }}
              >
                <IcoBlock />
                <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-0, #e2e2e2)' }}>
                  {imp.title}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 7px',
                    borderRadius: '99px',
                    background:
                      imp.status === 'resolved' ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)',
                    color: imp.status === 'resolved' ? '#34d399' : '#f87171',
                  }}
                >
                  {imp.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const dispatch = useAppDispatch()
  const projects = useAppSelector(s => s.projects.projects)
  const token = useAppSelector(s => s.settings.github?.token ?? null)

  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Project | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // ── Derived ───────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = projects
    if (!showArchived) list = list.filter(p => !p.archived)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q) ||
          p.techStack.some(t => t.toLowerCase().includes(q)) ||
          p.repoFullNames.some(r => r.toLowerCase().includes(q))
      )
    }
    return list
  }, [projects, search, showArchived])

  const selectedProject = projects.find(p => p.id === selectedId) ?? null

  // Select first project when list changes and nothing is selected
  const firstId = filtered[0]?.id
  const resolvedSelected =
    selectedProject ?? (firstId ? (projects.find(p => p.id === firstId) ?? null) : null)

  // ── Handlers ──────────────────────────────────────────────────────────────

  function openNew() {
    setEditTarget(null)
    setFormOpen(true)
  }

  function openEdit(p: Project) {
    setEditTarget(p)
    setFormOpen(true)
  }

  function handleSave(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'repoFullNames'>) {
    if (editTarget) {
      dispatch(updateProject({ id: editTarget.id, ...data }))
    } else {
      const newId = uid()
      dispatch(
        addProject({
          id: newId,
          ...data,
          repoFullNames: [],
          createdAt: todayISO(),
          updatedAt: todayISO(),
        })
      )
      setSelectedId(newId)
    }
    setFormOpen(false)
  }

  function handleImport(repos: GitHubRepoMeta[]) {
    for (const r of repos) {
      const newId = uid()
      const lang = r.language ?? ''
      dispatch(
        addProject({
          id: newId,
          name: r.name,
          description: r.description ?? undefined,
          color: COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)],
          icon:
            lang === 'TypeScript' || lang === 'JavaScript'
              ? 'code'
              : lang === 'Python'
                ? 'brain'
                : lang === 'Go' || lang === 'Rust'
                  ? 'terminal'
                  : lang === 'Dockerfile'
                    ? 'server'
                    : 'package',
          techStack: r.topics.slice(0, 6),
          repoFullNames: [r.fullName],
          createdAt: todayISO(),
          updatedAt: todayISO(),
        })
      )
    }
  }

  function handleDelete(id: string) {
    dispatch(deleteProject(id))
    if (selectedId === id) setSelectedId(null)
    setConfirmDeleteId(null)
  }

  const allRepos = new Set(projects.flatMap(p => p.repoFullNames))

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
        fontFamily: 'var(--font-ui, system-ui, sans-serif)',
        color: 'var(--text-0, #e2e2e2)',
      }}
    >
      {/* ── Left panel — project list ──────────────────────────────────── */}
      <div
        style={{
          width: '280px',
          minWidth: '220px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--border-0, rgba(255,255,255,0.07))',
          background: 'var(--bg-05, rgba(255,255,255,0.015))',
        }}
      >
        {/* List header */}
        <div
          style={{
            padding: '16px 14px 10px',
            borderBottom: '1px solid var(--border-0, rgba(255,255,255,0.07))',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '13px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-2, #9ca3af)',
              }}
            >
              Proyectos
            </h2>
            <div style={{ display: 'flex', gap: '4px' }}>
              {token && (
                <button
                  onClick={() => setImportOpen(true)}
                  title="Importar desde GitHub"
                  style={{
                    padding: '5px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
                    background: 'transparent',
                    color: 'var(--text-1, #d1d5db)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                  }}
                >
                  <IcoImport /> Import
                </button>
              )}
              <button
                onClick={openNew}
                title="Nuevo proyecto"
                style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'var(--accent-500, #6366f1)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                <IcoPlus /> Nuevo
              </button>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-3, #6b7280)',
                pointerEvents: 'none',
              }}
            >
              <IcoSearch />
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar…"
              style={{
                width: '100%',
                paddingLeft: '30px',
                padding: '6px 8px 6px 30px',
                background: 'var(--bg-2, rgba(255,255,255,0.07))',
                border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
                borderRadius: '7px',
                color: 'var(--text-0, #e2e2e2)',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Project list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: 'var(--text-3, #6b7280)',
                fontSize: '13px',
              }}
            >
              {projects.length === 0 ? (
                <>
                  <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.5 }}>ᯓ★</div>
                  <div>Sin proyectos aún</div>
                  <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
                    Crea tu primer proyecto o importa desde GitHub
                  </div>
                </>
              ) : (
                'Sin resultados'
              )}
            </div>
          ) : (
            filtered.map(p => {
              const isActive = (resolvedSelected?.id ?? null) === p.id
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 14px',
                    cursor: 'pointer',
                    background: isActive ? p.color + '20' : 'transparent',
                    borderLeft: isActive ? `3px solid ${p.color}` : '3px solid transparent',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.background = isActive
                      ? p.color + '20'
                      : 'transparent'
                  }}
                >
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      background: p.color + '33',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <ProjectIcon icon={p.icon} size={15} color={p.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? p.color : 'var(--text-0, #e2e2e2)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.name}
                    </div>
                    {p.repoFullNames.length > 0 && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-3, #6b7280)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: '1px',
                        }}
                      >
                        {p.repoFullNames[0]}
                        {p.repoFullNames.length > 1 && ` +${p.repoFullNames.length - 1}`}
                      </div>
                    )}
                  </div>
                  <IcoChevronRight />
                </div>
              )
            })
          )}

          {/* Toggle archived */}
          {projects.some(p => p.archived) && (
            <button
              onClick={() => setShowArchived(v => !v)}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 14px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-3, #6b7280)',
                fontSize: '11px',
                textAlign: 'left',
                marginTop: '4px',
              }}
            >
              {showArchived
                ? '▲ Ocultar archivados'
                : `▼ Mostrar archivados (${projects.filter(p => p.archived).length})`}
            </button>
          )}
        </div>
      </div>

      {/* ── Right panel — project detail ───────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {resolvedSelected ? (
          <>
            {/* Toolbar */}
            <div
              style={{
                padding: '10px 20px',
                borderBottom: '1px solid var(--border-0, rgba(255,255,255,0.07))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              {resolvedSelected.archived ? (
                <button
                  onClick={() => dispatch(unarchiveProject(resolvedSelected.id))}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '7px',
                    border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
                    background: 'transparent',
                    color: 'var(--text-1, #d1d5db)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <IcoArchive /> Restaurar
                </button>
              ) : (
                <button
                  onClick={() => dispatch(archiveProject(resolvedSelected.id))}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '7px',
                    border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
                    background: 'transparent',
                    color: 'var(--text-1, #d1d5db)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <IcoArchive /> Archivar
                </button>
              )}
              <button
                onClick={() => setConfirmDeleteId(resolvedSelected.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '7px',
                  border: '1px solid rgba(239,68,68,0.3)',
                  background: 'transparent',
                  color: '#f87171',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <IcoTrash /> Eliminar
              </button>
            </div>

            <ProjectDetail
              project={resolvedSelected}
              onEdit={() => openEdit(resolvedSelected)}
              token={token}
            />
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              color: 'var(--text-3, #6b7280)',
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              opacity={0.4}
            >
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--text-1, #d1d5db)',
                  marginBottom: '6px',
                }}
              >
                Sin proyectos
              </div>
              <div style={{ fontSize: '13px' }}>
                Crea un proyecto o importa repositorios de GitHub
              </div>
            </div>
            <button
              onClick={openNew}
              style={{
                padding: '8px 20px',
                borderRadius: '9px',
                border: 'none',
                background: 'var(--accent-500, #6366f1)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <IcoPlus /> Nuevo proyecto
            </button>
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}

      {formOpen && (
        <ProjectFormModal
          initial={editTarget ?? undefined}
          onSave={handleSave}
          onClose={() => setFormOpen(false)}
        />
      )}

      {importOpen && token && (
        <GitHubImportModal
          token={token}
          existingRepos={allRepos}
          onImport={handleImport}
          onClose={() => setImportOpen(false)}
        />
      )}

      {/* Confirm delete */}
      {confirmDeleteId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 9500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-1, #1a1a1e)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '14px',
              padding: '24px',
              width: '360px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f87171' }}>
              ¿Eliminar proyecto?
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-2, #9ca3af)' }}>
              Las notas, sprints e impedimentos vinculados perderán el vínculo con este proyecto,
              pero no serán eliminados.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '7px',
                  border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
                  background: 'transparent',
                  color: 'var(--text-1, #d1d5db)',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '7px',
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
