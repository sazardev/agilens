/**
 * ProjectPicker — popover para vincular uno o varios proyectos.
 * Usado en notas, sprints, impedimentos y daily.
 *
 * Props:
 *   selectedIds  — IDs actualmente seleccionados
 *   onChange     — callback con la nueva lista de IDs
 *   mode         — 'single' | 'multi' (default: 'multi')
 *   placeholder  — texto del botón cuando no hay selección
 */
import { useState, useRef, useEffect } from 'react'
import { useAppSelector } from '@/store'
import { ProjectIcon } from '@/lib/projectIcons'
import ProjectBadge from './ProjectBadge'

interface Props {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  mode?: 'single' | 'multi'
  placeholder?: string
  disabled?: boolean
}

export default function ProjectPicker({
  selectedIds,
  onChange,
  mode = 'multi',
  placeholder = 'Vincular proyecto…',
  disabled = false,
}: Props) {
  const projects = useAppSelector(s => s.projects.projects.filter(p => !p.archived))
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

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

  const hasSelection = selectedIds.length > 0

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger */}
      <div
        onClick={() => !disabled && setOpen(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '4px',
          minHeight: '30px',
          padding: hasSelection ? '4px 8px' : '0 10px',
          borderRadius: '6px',
          border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
          background: 'var(--bg-2, rgba(255,255,255,0.05))',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
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

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 1000,
            width: '220px',
            maxHeight: '280px',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '10px',
            border: '1px solid var(--border-0, rgba(255,255,255,0.1))',
            background: 'var(--bg-1, #1a1a1e)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}
        >
          {/* Search */}
          <div
            style={{
              padding: '8px',
              borderBottom: '1px solid var(--border-0, rgba(255,255,255,0.08))',
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
                borderRadius: '6px',
                color: 'var(--text-0, #e2e2e2)',
                fontSize: '12px',
                padding: '5px 9px',
                outline: 'none',
              }}
            />
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '12px',
                  fontSize: '12px',
                  color: 'var(--text-3, #6b7280)',
                  textAlign: 'center',
                }}
              >
                Sin proyectos
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
                      gap: '8px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      background: selected ? p.color + '18' : 'transparent',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => {
                      if (!selected)
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'
                    }}
                    onMouseLeave={e => {
                      ;(e.currentTarget as HTMLElement).style.background = selected
                        ? p.color + '18'
                        : 'transparent'
                    }}
                  >
                    <span
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        background: p.color + '33',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <ProjectIcon icon={p.icon} size={13} color={p.color} />
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: '13px',
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
                        width="14"
                        height="14"
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
        </div>
      )}
    </div>
  )
}
