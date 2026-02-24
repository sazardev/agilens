/**
 * SprintsPage — Controlador global de sprints.
 * Gestión completa: crear/editar/cerrar sprints, asignar tareas, evidencias,
 * notas, vincular impedimentos y ver el historial daily por sprint.
 */
import { useState, useMemo } from 'react'
import { nanoid } from '@reduxjs/toolkit'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store'
import { addSprint, updateSprint, deleteSprint, setActiveSprint } from '@/store/slices/dailySlice'
import { updateNote } from '@/store/slices/notesSlice'
import { updateImpediment } from '@/store/slices/impedimentsSlice'
import type { Sprint, SprintStatus, Note, DailyEntry, Impediment, TaskPriority } from '@/types'
import { TASK_PRIORITY_META } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

function daysLeft(endDate?: string) {
  if (!endDate) return null
  return daysBetween(todayISO(), endDate)
}

function sprintProgress(sprint: Sprint): number {
  if (!sprint.startDate || !sprint.endDate) return 0
  const total = daysBetween(sprint.startDate, sprint.endDate)
  if (total <= 0) return 100
  const elapsed = daysBetween(sprint.startDate, todayISO())
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
}

function resolveStatus(sprint: Sprint): SprintStatus {
  if (sprint.status) return sprint.status
  const today = todayISO()
  if (sprint.endDate && sprint.endDate < today) return 'completed'
  if (sprint.startDate <= today) return 'active'
  return 'planning'
}

// ─── Status meta ─────────────────────────────────────────────────────────────

const STATUS_META: Record<SprintStatus, { label: string; color: string; bg: string }> = {
  planning: { label: 'Planificación', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  active: { label: 'Activo', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  completed: { label: 'Completado', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  cancelled: { label: 'Cancelado', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

const NOTE_TYPE_META: Record<string, { label: string; color: string }> = {
  note: { label: 'Nota', color: '#6b7280' },
  daily: { label: 'Daily', color: '#60a5fa' },
  evidence: { label: 'Evidencia', color: '#a78bfa' },
  technical: { label: 'Técnica', color: '#34d399' },
  meeting: { label: 'Reunión', color: '#fb923c' },
  sprint: { label: 'Sprint', color: '#f472b6' },
  task: { label: 'Tarea', color: '#facc15' },
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#fbbf24',
  low: '#34d399',
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IcoPlus = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const IcoPencil = () => (
  <svg
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)
const IcoTrash = () => (
  <svg
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
)
const IcoCheck = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IcoX = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const IcoChevronRight = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)
const IcoFlag = () => (
  <svg
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
)
const IcoLink = () => (
  <svg
    width="12"
    height="12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </svg>
)
const IcoUnlink = () => (
  <svg
    width="12"
    height="12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)
const IcoCalendar = () => (
  <svg
    width="12"
    height="12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

// ─── Sprint form modal ────────────────────────────────────────────────────────

interface SprintForm {
  name: string
  startDate: string
  endDate: string
  goal: string
  description: string
  status: SprintStatus
  storyPoints: string
}

const EMPTY_FORM: SprintForm = {
  name: '',
  startDate: todayISO(),
  endDate: '',
  goal: '',
  description: '',
  status: 'planning',
  storyPoints: '',
}

function sprintToForm(s: Sprint): SprintForm {
  return {
    name: s.name,
    startDate: s.startDate,
    endDate: s.endDate ?? '',
    goal: s.goal ?? '',
    description: s.description ?? '',
    status: resolveStatus(s),
    storyPoints: s.storyPoints != null ? String(s.storyPoints) : '',
  }
}

function SprintModal({
  editing,
  onSave,
  onClose,
}: {
  editing?: Sprint
  onSave: (f: SprintForm) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<SprintForm>(editing ? sprintToForm(editing) : EMPTY_FORM)
  const [error, setError] = useState('')

  function set<K extends keyof SprintForm>(k: K, v: SprintForm[K]) {
    setForm(p => ({ ...p, [k]: v }))
  }

  function submit() {
    if (!form.name.trim()) {
      setError('El nombre es requerido.')
      return
    }
    onSave(form)
  }

  const label: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-2)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '4px',
    display: 'block',
  }
  const inp: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-1)',
    border: '1px solid var(--border-1)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 10px',
    fontSize: '13px',
    color: 'var(--text-0)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--border-1)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px 12px',
            borderBottom: '1px solid var(--border-1)',
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: 600 }}>
            {editing ? 'Editar sprint' : 'Nuevo sprint'}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-2)',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
            }}
          >
            <IcoX />
          </button>
        </div>

        <div
          style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <div>
            <label style={label}>Nombre *</label>
            <input
              autoFocus
              style={inp}
              placeholder="Sprint 1 — Autenticación"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
            {error && (
              <span
                style={{ fontSize: '11px', color: '#ef4444', display: 'block', marginTop: '3px' }}
              >
                {error}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={label}>Inicio</label>
              <input
                type="date"
                style={inp}
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
              />
            </div>
            <div>
              <label style={label}>Fin</label>
              <input
                type="date"
                style={inp}
                value={form.endDate}
                onChange={e => set('endDate', e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={label}>Estado</label>
              <select
                style={{ ...inp, cursor: 'pointer' }}
                value={form.status}
                onChange={e => set('status', e.target.value as SprintStatus)}
              >
                <option value="planning">Planificación</option>
                <option value="active">Activo</option>
                <option value="completed">Completado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div>
              <label style={label}>Story Points</label>
              <input
                type="number"
                style={inp}
                min="0"
                placeholder="0"
                value={form.storyPoints}
                onChange={e => set('storyPoints', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={label}>Objetivo del sprint</label>
            <textarea
              style={{ ...inp, resize: 'vertical', minHeight: '56px', fontFamily: 'inherit' }}
              placeholder="¿Qué queremos entregar al final del sprint?"
              value={form.goal}
              onChange={e => set('goal', e.target.value)}
            />
          </div>

          <div>
            <label style={label}>Descripción</label>
            <textarea
              style={{ ...inp, resize: 'vertical', minHeight: '56px', fontFamily: 'inherit' }}
              placeholder="Contexto adicional, alcance, o notas del equipo…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            padding: '12px 20px 16px',
            borderTop: '1px solid var(--border-1)',
          }}
        >
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary btn-sm" onClick={submit}>
            <IcoCheck />
            {editing ? 'Guardar' : 'Crear sprint'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Retro modal ──────────────────────────────────────────────────────────────

function RetroModal({
  sprint,
  onSave,
  onClose,
}: {
  sprint: Sprint
  onSave: (retro: {
    wentWell: string
    toImprove: string
    actions: string
    completedPoints: string
  }) => void
  onClose: () => void
}) {
  const [wentWell, setWentWell] = useState(sprint.retrospective?.wentWell ?? '')
  const [toImprove, setToImprove] = useState(sprint.retrospective?.toImprove ?? '')
  const [actions, setActions] = useState(sprint.retrospective?.actions ?? '')
  const [completedPoints, setCompletedPoints] = useState(
    sprint.completedPoints != null ? String(sprint.completedPoints) : ''
  )

  const ta: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-1)',
    border: '1px solid var(--border-1)',
    borderRadius: 'var(--radius-sm)',
    padding: '7px 10px',
    fontSize: '12px',
    color: 'var(--text-0)',
    outline: 'none',
    resize: 'vertical',
    minHeight: '72px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  }
  const label: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-2)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '4px',
    display: 'block',
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--border-1)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px 12px',
            borderBottom: '1px solid var(--border-1)',
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: 600 }}>Retrospectiva — {sprint.name}</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-2)',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
            }}
          >
            <IcoX />
          </button>
        </div>
        <div
          style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <div>
            <label style={label}>Puntos completados</label>
            <input
              type="number"
              min="0"
              value={completedPoints}
              onChange={e => setCompletedPoints(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-1)',
                border: '1px solid var(--border-1)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px',
                fontSize: '13px',
                color: 'var(--text-0)',
                outline: 'none',
                boxSizing: 'border-box' as const,
              }}
            />
          </div>
          <div>
            <label
              style={{
                ...label,
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <svg
                width="12"
                height="12"
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              ¿Qué salió bien?
            </label>
            <textarea
              style={ta}
              placeholder="Logros, buenas prácticas, colaboración…"
              value={wentWell}
              onChange={e => setWentWell(e.target.value)}
            />
          </div>
          <div>
            <label
              style={{
                ...label,
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <svg
                width="12"
                height="12"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              ¿Qué mejorar?
            </label>
            <textarea
              style={ta}
              placeholder="Problemas encontrados, deuda técnica, procesos…"
              value={toImprove}
              onChange={e => setToImprove(e.target.value)}
            />
          </div>
          <div>
            <label
              style={{
                ...label,
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <svg
                width="12"
                height="12"
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              Acciones para el próximo sprint
            </label>
            <textarea
              style={ta}
              placeholder="Acciones concretas, responsables…"
              value={actions}
              onChange={e => setActions(e.target.value)}
            />
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            padding: '12px 20px 16px',
            borderTop: '1px solid var(--border-1)',
          }}
        >
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onSave({ wentWell, toImprove, actions, completedPoints })}
          >
            <IcoCheck />
            Guardar retro
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Note picker modal ────────────────────────────────────────────────────────

function NotePickerModal({
  title,
  notes,
  assignedIds,
  onToggle,
  onClose,
}: {
  title: string
  notes: Note[]
  assignedIds: Set<string>
  onToggle: (note: Note) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const filtered = notes.filter(
    n => n.title.toLowerCase().includes(q.toLowerCase()) || n.noteType.includes(q.toLowerCase())
  )

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--border-1)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px 10px',
            borderBottom: '1px solid var(--border-1)',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-2)',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
            }}
          >
            <IcoX />
          </button>
        </div>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-1)' }}>
          <input
            autoFocus
            style={{
              width: '100%',
              background: 'var(--bg-2)',
              border: '1px solid var(--border-1)',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 8px',
              fontSize: '12px',
              color: 'var(--text-0)',
              outline: 'none',
              boxSizing: 'border-box' as const,
            }}
            placeholder="Buscar nota…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 && (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                fontSize: '12px',
                color: 'var(--text-3)',
              }}
            >
              Sin resultados
            </div>
          )}
          {filtered.map(note => {
            const assigned = assignedIds.has(note.id)
            const meta = NOTE_TYPE_META[note.noteType] ?? NOTE_TYPE_META.note
            return (
              <div
                key={note.id}
                onClick={() => onToggle(note)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 16px',
                  cursor: 'pointer',
                  background: assigned ? 'var(--accent-glow)' : 'transparent',
                  borderBottom: '1px solid var(--border-1)',
                  transition: 'background 0.1s',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: meta.color,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-0)',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {note.title}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{meta.label}</div>
                </div>
                {assigned && (
                  <span style={{ color: 'var(--accent-400)', flexShrink: 0 }}>
                    <IcoCheck />
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-1)' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ width: '100%' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sprint card (left list) ──────────────────────────────────────────────────

function SprintCard({
  sprint,
  isActive,
  isSelected,
  onClick,
}: {
  sprint: Sprint
  isActive: boolean
  isSelected: boolean
  onClick: () => void
}) {
  const status = resolveStatus(sprint)
  const prog = sprintProgress(sprint)
  const sm = STATUS_META[status]
  const left = daysLeft(sprint.endDate)

  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        background: isSelected ? 'var(--accent-glow)' : 'transparent',
        border: isSelected ? '1px solid var(--accent-400)' : '1px solid var(--border-1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        transition: 'all 0.12s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {isActive && (
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#34d399',
              flexShrink: 0,
            }}
          />
        )}
        <span
          style={{
            flex: 1,
            fontSize: '13px',
            fontWeight: 600,
            color: isSelected ? 'var(--accent-400)' : 'var(--text-0)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {sprint.name}
        </span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            color: sm.color,
            background: sm.bg,
            padding: '1px 6px',
            borderRadius: '8px',
            flexShrink: 0,
          }}
        >
          {sm.label}
        </span>
      </div>

      {sprint.startDate && (
        <div
          style={{
            fontSize: '10px',
            color: 'var(--text-3)',
            display: 'flex',
            gap: '6px',
            alignItems: 'center',
          }}
        >
          <IcoCalendar />
          {fmtDate(sprint.startDate)} → {fmtDate(sprint.endDate)}
          {left !== null && status === 'active' && (
            <span style={{ color: left < 3 ? '#ef4444' : left < 7 ? '#fbbf24' : 'var(--text-3)' }}>
              ({left}d)
            </span>
          )}
        </div>
      )}

      {sprint.endDate && (
        <div
          style={{
            height: '3px',
            borderRadius: '99px',
            background: 'var(--bg-3)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${prog}%`,
              background: sm.color,
              borderRadius: '99px',
              transition: 'width 0.3s',
            }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Note row ─────────────────────────────────────────────────────────────────

function NoteRow({
  note,
  onNavigate,
  onUnlink,
}: {
  note: Note
  onNavigate: () => void
  onUnlink: () => void
}) {
  const meta = NOTE_TYPE_META[note.noteType] ?? NOTE_TYPE_META.note
  return (
    <div
      style={
        {
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          background: 'var(--bg-1)',
          border: '1px solid var(--border-1)',
          borderRadius: 'var(--radius-md)',
          gap: '10px',
        } as React.CSSProperties
      }
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: meta.color,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--text-0)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {note.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{meta.label}</span>
          {note.noteType === 'task' &&
            note.priority &&
            (() => {
              const pm = TASK_PRIORITY_META[note.priority as TaskPriority]
              return (
                <span
                  style={{
                    padding: '0 5px',
                    borderRadius: '4px',
                    background: pm.bg,
                    color: pm.color,
                    fontSize: '9px',
                    fontWeight: 700,
                  }}
                >
                  {pm.label}
                </span>
              )
            })()}
          {note.noteType === 'task' && note.storyPoints !== undefined && (
            <span
              style={{
                padding: '0 5px',
                borderRadius: '4px',
                background: 'rgba(250,204,21,0.10)',
                color: '#facc15',
                fontSize: '9px',
                fontWeight: 600,
              }}
            >
              {note.storyPoints}sp
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onNavigate}
        title="Abrir nota"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-2)',
          padding: '3px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <IcoChevronRight />
      </button>
      <button
        onClick={onUnlink}
        title="Desvincultar"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-3)',
          padding: '3px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <IcoUnlink />
      </button>
    </div>
  )
}

// ─── Impediment row ───────────────────────────────────────────────────────────

function ImpedimentRow({
  imp,
  onNavigate,
  onUnlink,
}: {
  imp: Impediment
  onNavigate: () => void
  onUnlink: () => void
}) {
  const col = SEVERITY_COLOR[imp.severity] ?? '#6b7280'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 12px',
        background: 'var(--bg-1)',
        border: '1px solid var(--border-1)',
        borderLeft: `3px solid ${col}`,
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--text-0)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {imp.title}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
          {imp.severity} · {imp.status}
          {imp.responsible ? ` · ${imp.responsible}` : ''}
        </div>
      </div>
      <button
        onClick={onNavigate}
        title="Ver en Impediments"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-2)',
          padding: '3px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <IcoChevronRight />
      </button>
      <button
        onClick={onUnlink}
        title="Desvincular"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-3)',
          padding: '3px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <IcoUnlink />
      </button>
    </div>
  )
}

// ─── Daily row ────────────────────────────────────────────────────────────────

function DailyRow({ entry, onNavigate }: { entry: DailyEntry; onNavigate: () => void }) {
  const hasBlockers = entry.blocked.some(b => b.trim())
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 12px',
        background: 'var(--bg-1)',
        border: '1px solid var(--border-1)',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
      }}
      onClick={onNavigate}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: hasBlockers ? '#ef4444' : '#34d399',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-0)' }}>
          {entry.date}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
          {entry.did.filter(Boolean).length} hechos · {entry.will.filter(Boolean).length}{' '}
          planificados
          {hasBlockers ? ` · ${entry.blocked.filter(Boolean).length} bloqueos` : ''}
        </div>
      </div>
      <IcoChevronRight />
    </div>
  )
}

// ─── Burndown chart (SVG, no extra deps) ─────────────────────────────────────

function BurndownChart({ sprint, tasks }: { sprint: Sprint; tasks: Note[] }) {
  if (!sprint.startDate || !sprint.endDate || tasks.length === 0) return null
  const todaySt = new Date().toISOString().split('T')[0]
  const total = daysBetween(sprint.startDate, sprint.endDate)
  if (total <= 0) return null

  const totalPoints = tasks.reduce((s, t) => s + (t.storyPoints ?? 1), 0)

  // Build day-by-day array from sprint start to end
  const allDays: string[] = []
  for (let i = 0; i <= total; i++) {
    const d = new Date(sprint.startDate)
    d.setDate(d.getDate() + i)
    allDays.push(d.toISOString().split('T')[0])
  }

  // Remaining curve (up to today)
  const doneTasks = tasks.filter(t => t.kanbanStatus === 'done')
  const todayIdx = Math.min(
    allDays.findIndex(d => d >= todaySt),
    allDays.length - 1
  )
  const actualDays = allDays.slice(0, Math.max(1, todayIdx + 1))
  const actual = actualDays.map(day => {
    const donePoints = doneTasks
      .filter(t => t.updatedAt.slice(0, 10) <= day)
      .reduce((s, t) => s + (t.storyPoints ?? 1), 0)
    return Math.max(0, totalPoints - donePoints)
  })

  // Ideal line (full sprint)
  const ideal = allDays.map((_, i) => totalPoints - (totalPoints * i) / total)

  const W = 280
  const H = 110
  const PAD = { top: 8, right: 8, bottom: 24, left: 28 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom

  const xS = (i: number) => PAD.left + (i / (allDays.length - 1)) * cW
  const yS = (v: number) => PAD.top + cH - (v / totalPoints) * cH

  const idealPath = ideal
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${xS(i).toFixed(1)},${yS(v).toFixed(1)}`)
    .join(' ')
  const actualPath = actual
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${xS(i).toFixed(1)},${yS(v).toFixed(1)}`)
    .join(' ')

  const remaining = actual[actual.length - 1] ?? totalPoints
  const done = totalPoints - remaining

  return (
    <div
      style={{
        background: 'var(--bg-0)',
        border: '1px solid var(--border-1)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '4px',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--text-3)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Burndown del sprint
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#34d399' }}>✓ {done}sp</span>
          <span style={{ fontSize: '10px', color: '#fbbf24' }}>↑ {remaining}sp</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
        {/* Grid lines */}
        {[0.5, 1].map(f => {
          const y = yS(totalPoints * (1 - f)).toFixed(1)
          return (
            <g key={f}>
              <line
                x1={PAD.left}
                y1={y}
                x2={PAD.left + cW}
                y2={y}
                stroke="var(--border-1)"
                strokeWidth="0.5"
              />
              <text
                x={PAD.left - 3}
                y={parseFloat(y) + 3}
                textAnchor="end"
                fontSize="7"
                fill="var(--text-3)"
              >
                {Math.round(totalPoints * (1 - f))}
              </text>
            </g>
          )
        })}

        {/* Axes */}
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={PAD.top + cH}
          stroke="var(--border-2)"
          strokeWidth="0.8"
        />
        <line
          x1={PAD.left}
          y1={PAD.top + cH}
          x2={PAD.left + cW}
          y2={PAD.top + cH}
          stroke="var(--border-2)"
          strokeWidth="0.8"
        />

        {/* Ideal (dashed) */}
        <path
          d={idealPath}
          fill="none"
          stroke="rgba(107,114,128,0.5)"
          strokeWidth="1"
          strokeDasharray="4,3"
        />

        {/* Actual */}
        <path
          d={actualPath}
          fill="none"
          stroke="#60a5fa"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Today marker */}
        {todayIdx >= 0 && todayIdx < allDays.length - 1 && (
          <line
            x1={xS(todayIdx).toFixed(1)}
            y1={PAD.top}
            x2={xS(todayIdx).toFixed(1)}
            y2={PAD.top + cH}
            stroke="#facc15"
            strokeWidth="0.8"
            strokeDasharray="3,2"
            opacity="0.8"
          />
        )}

        {/* Last actual dot */}
        <circle
          cx={xS(actual.length - 1).toFixed(1)}
          cy={yS(actual[actual.length - 1] ?? totalPoints).toFixed(1)}
          r="2.5"
          fill="#60a5fa"
        />

        {/* Axis date labels */}
        <text x={PAD.left} y={H - 3} fontSize="7" fill="var(--text-3)">
          {sprint.startDate.slice(5)}
        </text>
        <text x={PAD.left + cW} y={H - 3} fontSize="7" fill="var(--text-3)" textAnchor="end">
          {sprint.endDate.slice(5)}
        </text>
      </svg>

      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '9px',
            color: 'var(--text-3)',
          }}
        >
          <svg width="14" height="6">
            <line
              x1="0"
              y1="3"
              x2="14"
              y2="3"
              stroke="rgba(107,114,128,0.55)"
              strokeWidth="1"
              strokeDasharray="3,2"
            />
          </svg>
          Ideal
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '9px',
            color: 'var(--text-3)',
          }}
        >
          <svg width="14" height="6">
            <line x1="0" y1="3" x2="14" y2="3" stroke="#60a5fa" strokeWidth="1.5" />
          </svg>
          Real
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '9px',
            color: 'var(--text-3)',
          }}
        >
          <svg width="14" height="6">
            <line
              x1="0"
              y1="3"
              x2="14"
              y2="3"
              stroke="#facc15"
              strokeWidth="0.8"
              strokeDasharray="3,2"
              opacity="0.8"
            />
          </svg>
          Hoy
        </span>
      </div>
    </div>
  )
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'tasks' | 'notes' | 'impediments' | 'evidence' | 'daily' | 'retro'

// ─── Sprint detail panel ──────────────────────────────────────────────────────

function SprintDetail({
  sprint,
  allNotes,
  allImpediments,
  allEntries,
  isActive,
  onEdit,
  onDelete,
  onSetActive,
  onRetro,
}: {
  sprint: Sprint
  allNotes: Note[]
  allImpediments: Impediment[]
  allEntries: DailyEntry[]
  isActive: boolean
  onEdit: () => void
  onDelete: () => void
  onSetActive: () => void
  onRetro: () => void
}) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [showNotePicker, setShowNotePicker] = useState(false)
  const [showImpPicker, setShowImpPicker] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [showStats, setShowStats] = useState(false)

  const status = resolveStatus(sprint)
  const sm = STATUS_META[status]
  const prog = sprintProgress(sprint)
  const left = daysLeft(sprint.endDate)

  // Notes linked to this sprint
  const linkedNotes = useMemo(
    () => allNotes.filter(n => n.sprintId === sprint.id),
    [allNotes, sprint.id]
  )
  const tasks = useMemo(() => linkedNotes.filter(n => n.noteType === 'task'), [linkedNotes])
  const evidence = useMemo(() => linkedNotes.filter(n => n.noteType === 'evidence'), [linkedNotes])
  const otherNotes = useMemo(
    () => linkedNotes.filter(n => n.noteType !== 'task' && n.noteType !== 'evidence'),
    [linkedNotes]
  )
  // Story points total
  const totalSP = useMemo(() => tasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0), [tasks])
  const doneSP = useMemo(
    () =>
      tasks.filter(t => t.kanbanStatus === 'done').reduce((s, t) => s + (t.storyPoints ?? 0), 0),
    [tasks]
  )

  // Impediments for this sprint
  const linkedImpediments = useMemo(
    () => allImpediments.filter(i => i.sprintId === sprint.id),
    [allImpediments, sprint.id]
  )

  // Daily entries for this sprint
  const sprintEntries = useMemo(() => {
    return allEntries
      .filter(e => {
        if (e.sprintId === sprint.id) return true
        if (sprint.startDate && sprint.endDate) {
          return e.date >= sprint.startDate && e.date <= sprint.endDate
        }
        return false
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [allEntries, sprint])

  // Note picker: exclude already-linked
  const linkedIds = useMemo(() => new Set(linkedNotes.map(n => n.id)), [linkedNotes])
  const impLinkedIds = useMemo(() => new Set(linkedImpediments.map(i => i.id)), [linkedImpediments])

  function assignNote(note: Note) {
    dispatch(
      updateNote({ id: note.id, sprintId: note.sprintId === sprint.id ? undefined : sprint.id })
    )
  }

  function unassignNote(note: Note) {
    dispatch(updateNote({ id: note.id, sprintId: undefined }))
  }

  function assignImpediment(imp: Impediment) {
    dispatch(
      updateImpediment({ id: imp.id, sprintId: imp.sprintId === sprint.id ? undefined : sprint.id })
    )
  }

  function unassignImpediment(imp: Impediment) {
    dispatch(updateImpediment({ id: imp.id, sprintId: undefined }))
  }

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Resumen' },
    { key: 'tasks', label: 'Tareas', count: tasks.length },
    { key: 'evidence', label: 'Evidencias', count: evidence.length },
    { key: 'impediments', label: 'Impedimentos', count: linkedImpediments.length },
    { key: 'notes', label: 'Notas', count: otherNotes.length },
    { key: 'daily', label: 'Daily', count: sprintEntries.length },
    { key: 'retro', label: 'Retro' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{ padding: '16px 20px 0', borderBottom: '1px solid var(--border-1)', flexShrink: 0 }}
      >
        <div
          style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: sm.color,
                  background: sm.bg,
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                {isActive && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#34d399',
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                )}
                {sm.label}
              </span>
            </div>
            <h2
              style={{
                margin: '4px 0 0',
                fontSize: '17px',
                fontWeight: 700,
                color: 'var(--text-0)',
              }}
            >
              {sprint.name}
            </h2>
            {sprint.goal && (
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '12px',
                  color: 'var(--text-2)',
                  lineHeight: 1.5,
                }}
              >
                {sprint.goal}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            {!isActive && status !== 'cancelled' && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={onSetActive}
                title="Activar sprint"
                style={{ fontSize: '11px' }}
              >
                <IcoFlag /> Activar
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>
              <IcoPencil />
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setDeleteConfirm(true)}
              style={{ color: '#ef4444' }}
            >
              <IcoTrash />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {sprint.startDate && sprint.endDate && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                {fmtDate(sprint.startDate)} → {fmtDate(sprint.endDate)}
                {left !== null && status === 'active' && (
                  <span
                    style={{
                      color: left < 3 ? '#ef4444' : left < 7 ? '#fbbf24' : 'var(--text-3)',
                      marginLeft: '6px',
                    }}
                  >
                    {left >= 0 ? `${left}d restantes` : `${Math.abs(left)}d vencido`}
                  </span>
                )}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{prog}%</span>
            </div>
            <div style={{ height: '4px', borderRadius: '99px', background: 'var(--bg-3)' }}>
              <div
                style={{
                  height: '100%',
                  width: `${prog}%`,
                  background: sm.color,
                  borderRadius: '99px',
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>
        )}

        {/* Story points mini bar */}
        {sprint.storyPoints != null && sprint.storyPoints > 0 && (
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>Story Points</span>
            <div
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '99px',
                background: 'var(--bg-3)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, ((sprint.completedPoints ?? 0) / sprint.storyPoints) * 100)}%`,
                  background: 'var(--accent-400)',
                  borderRadius: '99px',
                }}
              />
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
              {sprint.completedPoints ?? 0}/{sprint.storyPoints} pts
            </span>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2px', overflowX: 'auto' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: tab === t.key ? 600 : 400,
                color: tab === t.key ? 'var(--accent-400)' : 'var(--text-2)',
                borderBottom:
                  tab === t.key ? '2px solid var(--accent-400)' : '2px solid transparent',
                whiteSpace: 'nowrap',
                transition: 'all 0.12s',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span
                  style={{
                    background: tab === t.key ? 'var(--accent-glow)' : 'var(--bg-3)',
                    color: tab === t.key ? 'var(--accent-400)' : 'var(--text-3)',
                    borderRadius: '10px',
                    padding: '0 5px',
                    fontSize: '10px',
                    fontWeight: 600,
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <>
            {/* Quick stats toggle */}
            <button
              onClick={() => setShowStats(p => !p)}
              style={{
                alignSelf: 'flex-start',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                color: 'var(--text-3)',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                letterSpacing: '0.04em',
              }}
            >
              <svg
                width="10"
                height="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                style={{
                  transform: showStats ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.15s',
                }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              ESTADÍSTICAS
            </button>
            {showStats && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(80px,1fr))',
                  gap: '6px',
                }}
              >
                {[
                  { label: 'Tareas', value: tasks.length, color: 'var(--accent-400)' },
                  {
                    label: `SP (${doneSP}/${totalSP || '?'})`,
                    value: totalSP > 0 ? `${doneSP}/${totalSP}` : '—',
                    color: '#facc15',
                  },
                  { label: 'Impedimentos', value: linkedImpediments.length, color: '#ef4444' },
                  { label: 'Dailys', value: sprintEntries.length, color: 'var(--accent-400)' },
                ].map(s => (
                  <div
                    key={s.label}
                    style={{
                      background: 'var(--bg-1)',
                      border: '1px solid var(--border-1)',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 10px',
                    }}
                  >
                    <div
                      style={{ fontSize: '18px', fontWeight: 700, color: s.color, lineHeight: 1 }}
                    >
                      {s.value}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Burndown chart */}
            <BurndownChart sprint={sprint} tasks={tasks} />

            {sprint.description && (
              <div
                style={{
                  background: 'var(--bg-1)',
                  border: '1px solid var(--border-1)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  fontSize: '12px',
                  color: 'var(--text-1)',
                  lineHeight: 1.6,
                }}
              >
                {sprint.description}
              </div>
            )}

            {/* Blockers summary */}
            {linkedImpediments.filter(i => i.status === 'open' || i.status === 'in-progress')
              .length > 0 && (
              <div
                style={{
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#ef4444',
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  ⚠ Impedimentos activos
                </div>
                {linkedImpediments
                  .filter(i => i.status === 'open' || i.status === 'in-progress')
                  .map(imp => (
                    <div
                      key={imp.id}
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-1)',
                        padding: '3px 0',
                        borderBottom: '1px solid rgba(239,68,68,0.1)',
                      }}
                    >
                      · {imp.title}
                      {imp.responsible && (
                        <span style={{ color: 'var(--text-3)', marginLeft: '6px' }}>
                          ({imp.responsible})
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* Recent daily */}
            {sprintEntries.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '6px',
                  }}
                >
                  Últimos dailys
                </div>
                {sprintEntries.slice(0, 3).map(e => (
                  <DailyRow key={e.id} entry={e} onNavigate={() => navigate(`/daily/${e.date}`)} />
                ))}
                {sprintEntries.length > 3 && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ width: '100%', marginTop: '4px', fontSize: '11px' }}
                    onClick={() => setTab('daily')}
                  >
                    Ver todos ({sprintEntries.length})
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ── TASKS ── */}
        {tab === 'tasks' && (
          <>
            <button
              className="btn btn-ghost btn-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => setShowNotePicker(true)}
            >
              <IcoLink /> Vincular tareas
            </button>
            {tasks.length === 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-3)', padding: '12px 0' }}>
                Sin tareas vinculadas.
              </div>
            )}
            {tasks.map(n => (
              <NoteRow
                key={n.id}
                note={n}
                onNavigate={() => navigate(`/editor/${n.id}`)}
                onUnlink={() => unassignNote(n)}
              />
            ))}
          </>
        )}

        {/* ── EVIDENCE ── */}
        {tab === 'evidence' && (
          <>
            <button
              className="btn btn-ghost btn-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => setShowNotePicker(true)}
            >
              <IcoLink /> Vincular evidencias
            </button>
            {evidence.length === 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-3)', padding: '12px 0' }}>
                Sin evidencias vinculadas.
              </div>
            )}
            {evidence.map(n => (
              <NoteRow
                key={n.id}
                note={n}
                onNavigate={() => navigate(`/editor/${n.id}`)}
                onUnlink={() => unassignNote(n)}
              />
            ))}
          </>
        )}

        {/* ── IMPEDIMENTS ── */}
        {tab === 'impediments' && (
          <>
            <button
              className="btn btn-ghost btn-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => setShowImpPicker(true)}
            >
              <IcoLink /> Vincular impedimentos
            </button>
            {linkedImpediments.length === 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-3)', padding: '12px 0' }}>
                Sin impedimentos vinculados.
              </div>
            )}
            {linkedImpediments.map(imp => (
              <ImpedimentRow
                key={imp.id}
                imp={imp}
                onNavigate={() => navigate('/impediments')}
                onUnlink={() => unassignImpediment(imp)}
              />
            ))}
          </>
        )}

        {/* ── NOTES ── */}
        {tab === 'notes' && (
          <>
            <button
              className="btn btn-ghost btn-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => setShowNotePicker(true)}
            >
              <IcoLink /> Vincular notas
            </button>
            {otherNotes.length === 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-3)', padding: '12px 0' }}>
                Sin notas vinculadas.
              </div>
            )}
            {otherNotes.map(n => (
              <NoteRow
                key={n.id}
                note={n}
                onNavigate={() => navigate(`/editor/${n.id}`)}
                onUnlink={() => unassignNote(n)}
              />
            ))}
          </>
        )}

        {/* ── DAILY ── */}
        {tab === 'daily' && (
          <>
            <button
              className="btn btn-ghost btn-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => navigate('/daily')}
            >
              Ir al Daily
            </button>
            {sprintEntries.length === 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-3)', padding: '12px 0' }}>
                Sin entradas daily en este sprint.
              </div>
            )}
            {sprintEntries.map(e => (
              <DailyRow key={e.id} entry={e} onNavigate={() => navigate(`/daily/${e.date}`)} />
            ))}
          </>
        )}

        {/* ── RETRO ── */}
        {tab === 'retro' && (
          <>
            <button
              className="btn btn-ghost btn-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={onRetro}
            >
              <IcoPencil /> Editar retrospectiva
            </button>
            {sprint.retrospective ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sprint.retrospective.wentWell && (
                  <div
                    style={{
                      background: 'rgba(52,211,153,0.06)',
                      border: '1px solid rgba(52,211,153,0.18)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#34d399',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <svg
                        width="11"
                        height="11"
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      Qué salió bien
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '12px',
                        color: 'var(--text-1)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {sprint.retrospective.wentWell}
                    </p>
                  </div>
                )}
                {sprint.retrospective.toImprove && (
                  <div
                    style={{
                      background: 'rgba(251,191,36,0.06)',
                      border: '1px solid rgba(251,191,36,0.18)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#fbbf24',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <svg
                        width="11"
                        height="11"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      A mejorar
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '12px',
                        color: 'var(--text-1)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {sprint.retrospective.toImprove}
                    </p>
                  </div>
                )}
                {sprint.retrospective.actions && (
                  <div
                    style={{
                      background: 'rgba(96,165,250,0.06)',
                      border: '1px solid rgba(96,165,250,0.18)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#60a5fa',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <svg
                        width="11"
                        height="11"
                        fill="none"
                        stroke="#60a5fa"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <line x1="3" y1="6" x2="3.01" y2="6" />
                        <line x1="3" y1="12" x2="3.01" y2="12" />
                        <line x1="3" y1="18" x2="3.01" y2="18" />
                      </svg>
                      Acciones
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '12px',
                        color: 'var(--text-1)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {sprint.retrospective.actions}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--text-3)', padding: '12px 0' }}>
                Sin retrospectiva registrada. Usa "Editar retrospectiva" para añadirla.
              </div>
            )}
          </>
        )}
      </div>

      {/* Note picker */}
      {showNotePicker && (
        <NotePickerModal
          title={
            tab === 'tasks'
              ? 'Vincular tareas'
              : tab === 'evidence'
                ? 'Vincular evidencias'
                : 'Vincular notas'
          }
          notes={
            tab === 'tasks'
              ? allNotes.filter(n => n.noteType === 'task')
              : tab === 'evidence'
                ? allNotes.filter(n => n.noteType === 'evidence')
                : allNotes.filter(n => n.noteType !== 'task' && n.noteType !== 'evidence')
          }
          assignedIds={linkedIds}
          onToggle={assignNote}
          onClose={() => setShowNotePicker(false)}
        />
      )}

      {/* Impediment picker */}
      {showImpPicker && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setShowImpPicker(false)}
        >
          <div
            style={{
              background: 'var(--bg-1)',
              border: '1px solid var(--border-1)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '460px',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px 10px',
                borderBottom: '1px solid var(--border-1)',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Vincular impedimentos</span>
              <button
                onClick={() => setShowImpPicker(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-2)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                }}
              >
                <IcoX />
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {allImpediments.length === 0 && (
                <div
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: 'var(--text-3)',
                  }}
                >
                  Sin impedimentos. Créalos en la sección Bloqueos.
                </div>
              )}
              {allImpediments.map(imp => {
                const assigned = impLinkedIds.has(imp.id)
                const col = SEVERITY_COLOR[imp.severity] ?? '#6b7280'
                return (
                  <div
                    key={imp.id}
                    onClick={() => assignImpediment(imp)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 16px',
                      cursor: 'pointer',
                      background: assigned ? 'var(--accent-glow)' : 'transparent',
                      borderBottom: '1px solid var(--border-1)',
                      borderLeft: `3px solid ${col}`,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          color: 'var(--text-0)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {imp.title}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                        {imp.severity} · {imp.status}
                      </div>
                    </div>
                    {assigned && (
                      <span style={{ color: 'var(--accent-400)' }}>
                        <IcoCheck />
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-1)' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowImpPicker(false)}
                style={{ width: '100%' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setDeleteConfirm(false)}
        >
          <div
            style={{
              background: 'var(--bg-1)',
              border: '1px solid var(--border-1)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              maxWidth: '360px',
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-0)' }}>
              ¿Eliminar el sprint <strong>{sprint.name}</strong>? Las notas e impedimentos
              vinculados no se eliminarán, pero perderán la asociación al sprint.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-sm"
                style={{ background: '#ef4444', color: '#fff', border: 'none' }}
                onClick={onDelete}
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SprintsPage() {
  const dispatch = useAppDispatch()
  const sprints = useAppSelector(s => s.daily.sprints)
  const activeSprintId = useAppSelector(s => s.daily.activeSprintId)
  const allNotes = useAppSelector(s => s.notes.notes)
  const allImpediments = useAppSelector(s => s.impediments.impediments)
  const allEntries = useAppSelector(s => s.daily.entries)

  const [selectedId, setSelectedId] = useState<string | null>(() => sprints[0]?.id ?? null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingSprint, setEditingSprint] = useState<Sprint | undefined>()
  const [showRetro, setShowRetro] = useState(false)
  const [filterStatus, setFilterStatus] = useState<SprintStatus | 'all'>('all')
  const [showSideStats, setShowSideStats] = useState(false)

  const sortedSprints = useMemo(() => {
    const arr = [...sprints]
    arr.sort((a, b) => {
      // Active first, then by startDate descending
      if (a.id === activeSprintId) return -1
      if (b.id === activeSprintId) return 1
      return b.startDate.localeCompare(a.startDate)
    })
    return arr
  }, [sprints, activeSprintId])

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return sortedSprints
    return sortedSprints.filter(s => resolveStatus(s) === filterStatus)
  }, [sortedSprints, filterStatus])

  const selected = sprints.find(s => s.id === selectedId) ?? null

  function handleSave(form: SprintForm) {
    const sp = editingSprint?.id
    if (sp) {
      dispatch(
        updateSprint({
          id: sp,
          name: form.name,
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          goal: form.goal || undefined,
          description: form.description || undefined,
          status: form.status,
          storyPoints: form.storyPoints ? Number(form.storyPoints) : undefined,
        })
      )
    } else {
      const id = nanoid()
      dispatch(
        addSprint({
          id,
          name: form.name,
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          goal: form.goal || undefined,
          description: form.description || undefined,
          status: form.status,
          storyPoints: form.storyPoints ? Number(form.storyPoints) : undefined,
        })
      )
      setSelectedId(id)
      if (form.status === 'active') dispatch(setActiveSprint(id))
    }
    setShowCreate(false)
    setEditingSprint(undefined)
  }

  function handleDelete() {
    if (!selected) return
    // Unlink all notes and impediments
    allNotes
      .filter(n => n.sprintId === selected.id)
      .forEach(n => dispatch(updateNote({ id: n.id, sprintId: undefined })))
    allImpediments
      .filter(i => i.sprintId === selected.id)
      .forEach(i => dispatch(updateImpediment({ id: i.id, sprintId: undefined })))
    dispatch(deleteSprint(selected.id))
    setSelectedId(sprints.find(s => s.id !== selected.id)?.id ?? null)
  }

  function handleRetroSave(retro: {
    wentWell: string
    toImprove: string
    actions: string
    completedPoints: string
  }) {
    if (!selected) return
    dispatch(
      updateSprint({
        id: selected.id,
        retrospective: {
          wentWell: retro.wentWell || undefined,
          toImprove: retro.toImprove || undefined,
          actions: retro.actions || undefined,
        },
        completedPoints: retro.completedPoints ? Number(retro.completedPoints) : undefined,
        status: 'completed',
      })
    )
    setShowRetro(false)
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '3px 10px',
    border: `1px solid ${active ? 'var(--accent-400)' : 'var(--border-1)'}`,
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: active ? 600 : 400,
    background: active ? 'var(--accent-glow)' : 'transparent',
    color: active ? 'var(--accent-400)' : 'var(--text-2)',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  })

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--bg-0)',
        color: 'var(--text-0)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {/* ── LEFT PANEL: Sprint list ── */}
      <div
        style={{
          width: '260px',
          flexShrink: 0,
          borderRight: '1px solid var(--border-1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 14px 10px',
            borderBottom: '1px solid var(--border-1)',
            flexShrink: 0,
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
            <span style={{ fontSize: '13px', fontWeight: 700 }}>Sprints</span>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingSprint(undefined)
                setShowCreate(true)
              }}
            >
              <IcoPlus />
            </button>
          </div>
          {/* Filter chips */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {(['all', 'active', 'planning', 'completed', 'cancelled'] as const).map(s => (
              <button
                key={s}
                style={chipStyle(filterStatus === s)}
                onClick={() => setFilterStatus(s)}
              >
                {s === 'all' ? 'Todos' : STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {filtered.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--text-3)',
                fontSize: '12px',
                padding: '20px 0',
              }}
            >
              {sprints.length === 0 ? 'Sin sprints. Crea el primero.' : 'Sin resultados.'}
            </div>
          )}
          {filtered.map(s => (
            <SprintCard
              key={s.id}
              sprint={s}
              isActive={s.id === activeSprintId}
              isSelected={s.id === selectedId}
              onClick={() => setSelectedId(s.id)}
            />
          ))}
        </div>

        {/* Global stats footer */}
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border-1)', flexShrink: 0 }}>
          <button
            onClick={() => setShowSideStats(p => !p)}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '10px',
              color: 'var(--text-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 0',
              letterSpacing: '0.04em',
            }}
          >
            <span>ESTADÍSTICAS</span>
            <svg
              width="10"
              height="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              style={{
                transform: showSideStats ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showSideStats && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '5px',
                marginTop: '6px',
              }}
            >
              {[
                { label: 'Total', value: sprints.length },
                {
                  label: 'Activos',
                  value: sprints.filter(s => resolveStatus(s) === 'active').length,
                },
                {
                  label: 'Completados',
                  value: sprints.filter(s => resolveStatus(s) === 'completed').length,
                },
                {
                  label: 'Planificando',
                  value: sprints.filter(s => resolveStatus(s) === 'planning').length,
                },
              ].map(st => (
                <div
                  key={st.label}
                  style={{
                    background: 'var(--bg-2)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '5px 8px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: 'var(--text-0)',
                      lineHeight: 1,
                    }}
                  >
                    {st.value}
                  </div>
                  <div
                    style={{
                      fontSize: '9px',
                      color: 'var(--text-3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginTop: '1px',
                    }}
                  >
                    {st.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Sprint detail ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selected ? (
          <SprintDetail
            sprint={selected}
            allNotes={allNotes}
            allImpediments={allImpediments}
            allEntries={allEntries}
            isActive={selected.id === activeSprintId}
            onEdit={() => {
              setEditingSprint(selected)
              setShowCreate(true)
            }}
            onDelete={handleDelete}
            onSetActive={() => dispatch(setActiveSprint(selected.id))}
            onRetro={() => setShowRetro(true)}
          />
        ) : (
          <div
            style={{
              flex: 1,
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
              strokeWidth="1.3"
              viewBox="0 0 24 24"
              style={{ opacity: 0.3 }}
            >
              <polyline points="13 17 18 12 13 7" />
              <polyline points="6 17 11 12 6 7" />
            </svg>
            <span style={{ fontSize: '13px' }}>Selecciona un sprint para ver su detalle</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setEditingSprint(undefined)
                setShowCreate(true)
              }}
            >
              <IcoPlus /> Crear sprint
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <SprintModal
          editing={editingSprint}
          onSave={handleSave}
          onClose={() => {
            setShowCreate(false)
            setEditingSprint(undefined)
          }}
        />
      )}
      {showRetro && selected && (
        <RetroModal
          sprint={selected}
          onSave={handleRetroSave}
          onClose={() => setShowRetro(false)}
        />
      )}
    </div>
  )
}
