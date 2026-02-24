/**
 * ImpedimentsPage — Registro centralizado de impedimentos del equipo.
 * Permite crear, editar, filtrar y resolver bloqueos con contexto de sprint.
 */
import { useState, useMemo } from 'react'
import { nanoid } from '@reduxjs/toolkit'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store'
import { addImpediment, updateImpediment, deleteImpediment } from '@/store/slices/impedimentsSlice'
import type { Impediment, ImpedimentStatus, ImpedimentSeverity } from '@/types'

// ─── Date helper ─────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

// ─── Label/color maps ─────────────────────────────────────────────────────────

const SEVERITY_META: Record<ImpedimentSeverity, { label: string; color: string; bg: string }> = {
  low: { label: 'Baja', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  medium: { label: 'Media', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  high: { label: 'Alta', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  critical: { label: 'Crítica', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
}

const STATUS_META: Record<ImpedimentStatus, { label: string; color: string; bg: string }> = {
  open: { label: 'Abierto', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  'in-progress': { label: 'En progreso', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  resolved: { label: 'Resuelto', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  'wont-fix': { label: 'No se atiende', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

const SEVERITY_ORDER: ImpedimentSeverity[] = ['critical', 'high', 'medium', 'low']
const STATUS_ORDER: ImpedimentStatus[] = ['open', 'in-progress', 'resolved', 'wont-fix']

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
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
)
const IcoCheck = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" />
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
const IcoCalendar = () => (
  <svg
    width="12"
    height="12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const IcoUser = () => (
  <svg
    width="12"
    height="12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)
const IcoX = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

// ─── Badge components ─────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: ImpedimentSeverity }) {
  const m = SEVERITY_META[severity]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: '1px 7px',
        borderRadius: '10px',
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.03em',
        color: m.color,
        background: m.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {m.label}
    </span>
  )
}

function StatusBadge({ status }: { status: ImpedimentStatus }) {
  const m = STATUS_META[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: '1px 8px',
        borderRadius: '10px',
        fontSize: '10px',
        fontWeight: 600,
        color: m.color,
        background: m.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {m.label}
    </span>
  )
}

// ─── Form modal ───────────────────────────────────────────────────────────────

interface FormValues {
  title: string
  description: string
  status: ImpedimentStatus
  severity: ImpedimentSeverity
  sprintId: string
  responsible: string
  openedAt: string
  resolvedAt: string
  notes: string
}

const EMPTY_FORM: FormValues = {
  title: '',
  description: '',
  status: 'open',
  severity: 'medium',
  sprintId: '',
  responsible: '',
  openedAt: todayISO(),
  resolvedAt: '',
  notes: '',
}

function impedimentToForm(imp: Impediment): FormValues {
  return {
    title: imp.title,
    description: imp.description ?? '',
    status: imp.status,
    severity: imp.severity,
    sprintId: imp.sprintId ?? '',
    responsible: imp.responsible ?? '',
    openedAt: imp.openedAt,
    resolvedAt: imp.resolvedAt ?? '',
    notes: imp.notes ?? '',
  }
}

interface ModalProps {
  editing?: Impediment
  sprints: Array<{ id: string; name: string }>
  onSave: (values: FormValues) => void
  onClose: () => void
}

function ImpedimentModal({ editing, sprints, onSave, onClose }: ModalProps) {
  const [form, setForm] = useState<FormValues>(editing ? impedimentToForm(editing) : EMPTY_FORM)
  const [error, setError] = useState('')

  function set<K extends keyof FormValues>(k: K, v: FormValues[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function handleSubmit() {
    if (!form.title.trim()) {
      setError('El título es requerido.')
      return
    }
    onSave(form)
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-2)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '4px',
    display: 'block',
  }

  const inputStyle: React.CSSProperties = {
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

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
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
          maxWidth: '560px',
          maxHeight: '90vh',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px 12px',
            borderBottom: '1px solid var(--border-1)',
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-0)' }}>
            {editing ? 'Editar impedimento' : 'Nuevo impedimento'}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-2)',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IcoX />
          </button>
        </div>

        {/* Body */}
        <div
          style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          {/* Title */}
          <div>
            <label style={labelStyle}>Título *</label>
            <input
              autoFocus
              style={inputStyle}
              placeholder="Describe el impedimento brevemente"
              value={form.title}
              onChange={e => set('title', e.target.value)}
            />
            {error && (
              <span
                style={{ fontSize: '11px', color: '#ef4444', marginTop: '3px', display: 'block' }}
              >
                {error}
              </span>
            )}
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Descripción</label>
            <textarea
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: '64px',
                fontFamily: 'inherit',
              }}
              placeholder="Detalla el contexto, impacto y causa raíz si se conoce…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          {/* Status + Severity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Estado</label>
              <select
                style={selectStyle}
                value={form.status}
                onChange={e => set('status', e.target.value as ImpedimentStatus)}
              >
                {STATUS_ORDER.map(s => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Severidad</label>
              <select
                style={selectStyle}
                value={form.severity}
                onChange={e => set('severity', e.target.value as ImpedimentSeverity)}
              >
                {SEVERITY_ORDER.map(s => (
                  <option key={s} value={s}>
                    {SEVERITY_META[s].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sprint + Responsible */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Sprint</label>
              <select
                style={selectStyle}
                value={form.sprintId}
                onChange={e => set('sprintId', e.target.value)}
              >
                <option value="">— Sin sprint —</option>
                {sprints.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Responsable</label>
              <input
                style={inputStyle}
                placeholder="Quién lo atiende"
                value={form.responsible}
                onChange={e => set('responsible', e.target.value)}
              />
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Fecha de apertura</label>
              <input
                type="date"
                style={inputStyle}
                value={form.openedAt}
                onChange={e => set('openedAt', e.target.value)}
              />
            </div>
            {(form.status === 'resolved' || form.status === 'wont-fix') && (
              <div>
                <label style={labelStyle}>Fecha de resolución</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={form.resolvedAt}
                  onChange={e => set('resolvedAt', e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notas adicionales</label>
            <textarea
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: '56px',
                fontFamily: 'inherit',
              }}
              placeholder="Pasos tomados, decisiones, contexto extra…"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
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
          <button className="btn btn-primary btn-sm" onClick={handleSubmit}>
            <IcoCheck />
            {editing ? 'Guardar cambios' : 'Crear impedimento'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Impediment card ──────────────────────────────────────────────────────────

interface CardProps {
  imp: Impediment
  sprintName?: string
  onEdit: () => void
  onDelete: () => void
  onQuickResolve: () => void
}

function ImpedimentCard({ imp, sprintName, onEdit, onDelete, onQuickResolve }: CardProps) {
  const isResolved = imp.status === 'resolved' || imp.status === 'wont-fix'
  const daysOpen = daysBetween(imp.openedAt, imp.resolvedAt ?? todayISO())
  const canResolve = imp.status === 'open' || imp.status === 'in-progress'

  return (
    <div
      style={{
        background: 'var(--bg-1)',
        border: '1px solid var(--border-1)',
        borderLeft: `3px solid ${SEVERITY_META[imp.severity].color}`,
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        opacity: isResolved ? 0.65 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {/* Row 1: title + badges + actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-0)',
              wordBreak: 'break-word',
              textDecoration: isResolved ? 'line-through' : 'none',
            }}
          >
            {imp.title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <SeverityBadge severity={imp.severity} />
          <StatusBadge status={imp.status} />
        </div>
        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
          {canResolve && (
            <button
              title="Marcar como resuelto"
              onClick={onQuickResolve}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#34d399',
                padding: '3px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '4px',
              }}
            >
              <IcoCheck />
            </button>
          )}
          <button
            title="Editar"
            onClick={onEdit}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-2)',
              padding: '3px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px',
            }}
          >
            <IcoPencil />
          </button>
          <button
            title="Eliminar"
            onClick={onDelete}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-2)',
              padding: '3px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px',
            }}
          >
            <IcoTrash />
          </button>
        </div>
      </div>

      {/* Description preview */}
      {imp.description && (
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            color: 'var(--text-2)',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {imp.description}
        </p>
      )}

      {/* Meta row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        {sprintName && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: 'var(--text-2)',
            }}
          >
            <IcoLink />
            {sprintName}
          </span>
        )}
        {imp.responsible && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: 'var(--text-2)',
            }}
          >
            <IcoUser />
            {imp.responsible}
          </span>
        )}
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            color: 'var(--text-2)',
          }}
        >
          <IcoCalendar />
          {fmtDate(imp.openedAt)}
          {isResolved && imp.resolvedAt && (
            <>
              {' '}
              → {fmtDate(imp.resolvedAt)}{' '}
              <span style={{ color: 'var(--text-3)' }}>({daysOpen}d)</span>
            </>
          )}
          {!isResolved && (
            <span
              style={{
                color: daysOpen > 14 ? '#ef4444' : daysOpen > 7 ? '#fbbf24' : 'var(--text-3)',
              }}
            >
              ({daysOpen}d abierto)
            </span>
          )}
        </span>
        {imp.linkedEntryIds && imp.linkedEntryIds.length > 0 && (
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
            {imp.linkedEntryIds.length} daily{imp.linkedEntryIds.length !== 1 ? 's' : ''} vinculado
            {imp.linkedEntryIds.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Stats card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-1)',
        border: '1px solid var(--border-1)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: '22px', fontWeight: 700, color, lineHeight: 1.1 }}>{value}</span>
      <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>{label}</span>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type FilterStatus = ImpedimentStatus | 'all'
type FilterSeverity = ImpedimentSeverity | 'all'

export default function ImpedimentsPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const impediments = useAppSelector(s => s.impediments.impediments)
  const sprints = useAppSelector(s => s.daily.sprints)
  const activeSprintId = useAppSelector(s => s.daily.activeSprintId)

  const [showModal, setShowModal] = useState(false)
  const [editingImp, setEditingImp] = useState<Impediment | undefined>()
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>('all')
  const [filterSprintId, setFilterSprintId] = useState<string>('all')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const open = impediments.filter(i => i.status === 'open').length
    const inProg = impediments.filter(i => i.status === 'in-progress').length
    const resolved = impediments.filter(i => i.status === 'resolved').length
    const critical = impediments.filter(
      i => i.severity === 'critical' && i.status !== 'resolved' && i.status !== 'wont-fix'
    ).length
    const avgResolutionDays = (() => {
      const resolvedOnes = impediments.filter(i => i.status === 'resolved' && i.resolvedAt)
      if (!resolvedOnes.length) return null
      const total = resolvedOnes.reduce((acc, i) => acc + daysBetween(i.openedAt, i.resolvedAt!), 0)
      return Math.round(total / resolvedOnes.length)
    })()
    return { open, inProg, resolved, critical, avgResolutionDays }
  }, [impediments])

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return impediments
      .filter(i => filterStatus === 'all' || i.status === filterStatus)
      .filter(i => filterSeverity === 'all' || i.severity === filterSeverity)
      .filter(i => filterSprintId === 'all' || i.sprintId === filterSprintId)
      .sort((a, b) => {
        // Active/open first, then by severity
        const statusScore = (s: ImpedimentStatus) =>
          s === 'open' ? 0 : s === 'in-progress' ? 1 : s === 'wont-fix' ? 2 : 3
        const severityScore = (s: ImpedimentSeverity) =>
          s === 'critical' ? 0 : s === 'high' ? 1 : s === 'medium' ? 2 : 3
        const ss = statusScore(a.status) - statusScore(b.status)
        if (ss !== 0) return ss
        return severityScore(a.severity) - severityScore(b.severity)
      })
  }, [impediments, filterStatus, filterSeverity, filterSprintId])

  // ── Handlers ──────────────────────────────────────────────────────────────
  function openCreate() {
    setEditingImp(undefined)
    setShowModal(true)
  }

  function openEdit(imp: Impediment) {
    setEditingImp(imp)
    setShowModal(true)
  }

  function handleSave(values: FormValues) {
    if (editingImp) {
      dispatch(
        updateImpediment({
          id: editingImp.id,
          title: values.title,
          description: values.description || undefined,
          status: values.status,
          severity: values.severity,
          sprintId: values.sprintId || undefined,
          responsible: values.responsible || undefined,
          openedAt: values.openedAt,
          resolvedAt: values.resolvedAt || undefined,
          notes: values.notes || undefined,
        })
      )
    } else {
      dispatch(
        addImpediment({
          id: nanoid(),
          title: values.title,
          description: values.description || undefined,
          status: values.status,
          severity: values.severity,
          sprintId: values.sprintId || undefined,
          responsible: values.responsible || undefined,
          openedAt: values.openedAt,
          resolvedAt: values.resolvedAt || undefined,
          notes: values.notes || undefined,
          linkedEntryIds: [],
        })
      )
    }
    setShowModal(false)
  }

  function handleQuickResolve(imp: Impediment) {
    dispatch(
      updateImpediment({
        id: imp.id,
        status: 'resolved',
        resolvedAt: todayISO(),
      })
    )
  }

  function handleDelete(id: string) {
    dispatch(deleteImpediment(id))
    setDeleteConfirmId(null)
  }

  function sprintName(id?: string) {
    if (!id) return undefined
    return sprints.find(s => s.id === id)?.name
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
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  })

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--bg-0)',
        color: 'var(--text-0)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid var(--border-1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-0)' }}>
            Impediment Log
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-2)' }}>
            Registro de bloqueos e impedimentos del equipo
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {activeSprintId && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '11px' }}
              onClick={() =>
                setFilterSprintId(prev => (prev === activeSprintId ? 'all' : activeSprintId))
              }
            >
              Sprint activo
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/daily')}>
            Daily
          </button>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <IcoPlus />
            Nuevo
          </button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: '10px',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-1)',
          flexShrink: 0,
        }}
      >
        <StatCard label="Abiertos" value={stats.open} color="#ef4444" />
        <StatCard label="En progreso" value={stats.inProg} color="#fbbf24" />
        <StatCard label="Resueltos" value={stats.resolved} color="#34d399" />
        <StatCard label="Críticos activos" value={stats.critical} color="#f97316" />
        <div
          style={{
            background: 'var(--bg-1)',
            border: '1px solid var(--border-1)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <span
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--accent-400)',
              lineHeight: 1.1,
            }}
          >
            {stats.avgResolutionDays !== null ? `${stats.avgResolutionDays}d` : '—'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>Promedio resolución</span>
        </div>
      </div>

      {/* ── Filters ── */}
      <div
        style={{
          padding: '10px 20px',
          borderBottom: '1px solid var(--border-1)',
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '11px', color: 'var(--text-3)', marginRight: '2px' }}>
          Estado:
        </span>
        {(['all', ...STATUS_ORDER] as Array<FilterStatus>).map(s => (
          <button key={s} style={chipStyle(filterStatus === s)} onClick={() => setFilterStatus(s)}>
            {s === 'all' ? 'Todos' : STATUS_META[s].label}
          </button>
        ))}
        <span
          style={{
            fontSize: '11px',
            color: 'var(--text-3)',
            marginLeft: '8px',
            marginRight: '2px',
          }}
        >
          Severidad:
        </span>
        {(['all', ...SEVERITY_ORDER] as Array<FilterSeverity>).map(s => (
          <button
            key={s}
            style={chipStyle(filterSeverity === s)}
            onClick={() => setFilterSeverity(s)}
          >
            {s === 'all' ? 'Todas' : SEVERITY_META[s].label}
          </button>
        ))}
        {sprints.length > 0 && (
          <>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-3)',
                marginLeft: '8px',
                marginRight: '2px',
              }}
            >
              Sprint:
            </span>
            <button
              style={chipStyle(filterSprintId === 'all')}
              onClick={() => setFilterSprintId('all')}
            >
              Todos
            </button>
            {sprints.map(s => (
              <button
                key={s.id}
                style={chipStyle(filterSprintId === s.id)}
                onClick={() => setFilterSprintId(s.id)}
              >
                {s.name}
              </button>
            ))}
          </>
        )}
      </div>

      {/* ── List ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {filtered.length === 0 && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              color: 'var(--text-3)',
              padding: '48px 0',
            }}
          >
            <svg
              width="36"
              height="36"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              viewBox="0 0 24 24"
              style={{ opacity: 0.35 }}
            >
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ fontSize: '13px' }}>
              {impediments.length === 0
                ? 'Sin impedimentos registrados'
                : 'Ningún impedimento coincide con los filtros'}
            </span>
            {impediments.length === 0 && (
              <button className="btn btn-ghost btn-sm" onClick={openCreate}>
                Registrar el primero
              </button>
            )}
          </div>
        )}

        {filtered.map(imp => (
          <ImpedimentCard
            key={imp.id}
            imp={imp}
            sprintName={sprintName(imp.sprintId)}
            onEdit={() => openEdit(imp)}
            onDelete={() => setDeleteConfirmId(imp.id)}
            onQuickResolve={() => handleQuickResolve(imp)}
          />
        ))}
      </div>

      {/* ── Create/Edit modal ── */}
      {showModal && (
        <ImpedimentModal
          editing={editingImp}
          sprints={sprints}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* ── Delete confirm ── */}
      {deleteConfirmId && (
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
          onClick={() => setDeleteConfirmId(null)}
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
              ¿Eliminar este impedimento? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirmId(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-sm"
                style={{ background: '#ef4444', color: '#fff', border: 'none' }}
                onClick={() => handleDelete(deleteConfirmId)}
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
