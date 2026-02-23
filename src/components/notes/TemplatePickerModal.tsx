import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { nanoid } from 'nanoid'
import { useAppDispatch, useAppSelector } from '@/store'
import { addNote } from '@/store/slices/notesSlice'
import { setActiveNoteId } from '@/store/slices/uiSlice'
import {
  setDefaultTemplate,
  addTemplate,
  deleteTemplate,
  updateTemplate,
  expandTemplate,
  BUILTIN_TEMPLATES,
} from '@/store/slices/templatesSlice'
import type { NoteTemplate, NoteType } from '@/types'
import { NOTE_TYPE_META } from '@/types'
import { NoteTypeIcon } from '@/lib/noteIcons'

// ─── Types in display order ───────────────────────────────────────────────────
const TYPE_ORDER: NoteType[] = [
  'note',
  'daily',
  'evidence',
  'technical',
  'meeting',
  'sprint',
  'task',
]

interface Props {
  onClose: () => void
}

// ─── Small inline editor for a single template ───────────────────────────────
function TemplateEditor({
  template,
  onSave,
  onCancel,
}: {
  template: Partial<NoteTemplate> & { type: NoteType }
  onSave: (t: Omit<NoteTemplate, 'id'>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(template.name ?? '')
  const [content, setContent] = useState(template.content ?? '')

  return (
    <div
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border-2)',
        borderRadius: 'var(--radius-md)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginTop: '6px',
      }}
    >
      <input
        autoFocus
        placeholder="Nombre de la plantilla"
        value={name}
        onChange={e => setName(e.target.value)}
        className="input-base"
        style={{ fontSize: '12px' }}
      />
      <textarea
        placeholder="Contenido Markdown… usa {{title}} y {{date}} como variables"
        value={content}
        onChange={e => setContent(e.target.value)}
        className="input-base"
        rows={6}
        style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', resize: 'vertical' }}
      />
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '4px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-2)',
            background: 'transparent',
            color: 'var(--text-2)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Cancelar
        </button>
        <button
          onClick={() =>
            onSave({
              name: name || 'Sin nombre',
              content,
              type: template.type,
              isBuiltin: false,
            })
          }
          style={{
            padding: '4px 12px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'var(--accent-600)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Guardar
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TemplatePickerModal({ onClose }: Props) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const templates = useAppSelector(s => s.templates.templates)
  const defaultId = useAppSelector(s => s.templates.defaultTemplateId)
  const sprints = useAppSelector(s => s.daily.sprints)
  const activeSprintId = useAppSelector(s => s.daily.activeSprintId)

  const [tab, setTab] = useState<'create' | 'manage'>('create')
  const [expandedType, setExpandedType] = useState<NoteType | null>(null)
  const [editingTpl, setEditingTpl] = useState<NoteTemplate | null>(null)
  const [newTplType, setNewTplType] = useState<NoteType | null>(null)

  function getTypeTemplates(type: NoteType) {
    // Builtins first, then custom
    const builtins = templates.filter(t => t.type === type && t.isBuiltin)
    const customs = templates.filter(t => t.type === type && !t.isBuiltin)
    return [...builtins, ...customs]
  }

  function createNote(template: NoteTemplate) {
    const baseName = NOTE_TYPE_META[template.type].label
    const now = new Date().toISOString()
    const title = baseName
    const content = expandTemplate(template.content, title)
    const note = {
      id: nanoid(),
      title,
      content,
      tags: [],
      noteType: template.type,
      templateId: template.id,
      sprintId: activeSprintId ?? undefined,
      createdAt: now,
      updatedAt: now,
      attachments: [],
    }
    dispatch(addNote(note))
    dispatch(setActiveNoteId(note.id))
    navigate(`/editor/${note.id}`)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 200,
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Dialog */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 201,
          width: 'min(680px, 92vw)',
          maxHeight: '80vh',
          background: 'var(--bg-1)',
          border: '1px solid var(--border-1)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px 10px',
            borderBottom: '1px solid var(--border-1)',
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-ui)',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-0)',
            }}
          >
            {tab === 'create' ? 'Nueva nota — elige plantilla' : 'Gestionar plantillas'}
          </h2>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {/* Tab switcher */}
            {(['create', 'manage'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-2)',
                  background: tab === t ? 'var(--accent-glow)' : 'transparent',
                  color: tab === t ? 'var(--accent-400)' : 'var(--text-2)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                }}
              >
                {t === 'create' ? '✦ Crear' : '⚙ Gestionar'}
              </button>
            ))}
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-2)',
                cursor: 'pointer',
                fontSize: '18px',
                lineHeight: 1,
                padding: '0 2px',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
          {tab === 'create' && (
            <>
              {/* Quick grid: one card per type */}
              <p
                style={{
                  margin: '0 0 10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--text-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                }}
              >
                Tipo de nota
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '8px',
                  marginBottom: '18px',
                }}
              >
                {TYPE_ORDER.map(type => {
                  const meta = NOTE_TYPE_META[type]
                  const typeTpls = getTypeTemplates(type)
                  const defaultTpl =
                    typeTpls.find(t => t.id === defaultId) ??
                    typeTpls.find(t => t.isBuiltin) ??
                    typeTpls[0]
                  const isExpanded = expandedType === type
                  const hasMultiple = typeTpls.length > 1

                  return (
                    <div
                      key={type}
                      style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
                    >
                      {/* Main type card */}
                      <button
                        onClick={() =>
                          hasMultiple
                            ? setExpandedType(isExpanded ? null : type)
                            : defaultTpl && createNote(defaultTpl)
                        }
                        title={`Crear nota de tipo: ${meta.label}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid ${isExpanded ? meta.color + '55' : 'var(--border-1)'}`,
                          background: isExpanded ? meta.color + '11' : 'var(--bg-2)',
                          cursor: 'pointer',
                          textAlign: 'left' as const,
                          transition: 'all 0.12s',
                          width: '100%',
                        }}
                        onMouseEnter={e => {
                          ;(e.currentTarget as HTMLElement).style.borderColor = meta.color + '88'
                          ;(e.currentTarget as HTMLElement).style.background = meta.color + '18'
                        }}
                        onMouseLeave={e => {
                          ;(e.currentTarget as HTMLElement).style.borderColor = isExpanded
                            ? meta.color + '55'
                            : 'var(--border-1)'
                          ;(e.currentTarget as HTMLElement).style.background = isExpanded
                            ? meta.color + '11'
                            : 'var(--bg-2)'
                        }}
                      >
                        <span
                          style={{
                            display: 'flex',
                            lineHeight: 1,
                            flexShrink: 0,
                            color: meta.color,
                          }}
                        >
                          <NoteTypeIcon type={type} size={20} />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: 'var(--font-ui)',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--text-0)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {meta.label}
                          </div>
                          <div
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              color: 'var(--text-3)',
                              marginTop: '1px',
                            }}
                          >
                            {typeTpls.length} plantilla{typeTpls.length !== 1 ? 's' : ''}
                            {hasMultiple ? ' ▾' : ''}
                          </div>
                        </div>
                      </button>

                      {/* Expanded template options */}
                      {isExpanded && (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                            padding: '4px 0 4px 4px',
                            borderLeft: `2px solid ${meta.color}55`,
                            marginLeft: '4px',
                          }}
                        >
                          {typeTpls.map(tpl => (
                            <button
                              key={tpl.id}
                              onClick={() => createNote(tpl)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '5px 8px',
                                borderRadius: 'var(--radius-sm)',
                                border: 'none',
                                background:
                                  tpl.id === defaultId ? 'var(--accent-glow)' : 'var(--bg-3)',
                                color: tpl.id === defaultId ? 'var(--accent-400)' : 'var(--text-1)',
                                cursor: 'pointer',
                                fontFamily: 'var(--font-ui)',
                                fontSize: '11px',
                                textAlign: 'left' as const,
                                width: '100%',
                              }}
                            >
                              <span style={{ opacity: 0.6, fontSize: '9px' }}>
                                {tpl.id === defaultId ? '★' : '☆'}
                              </span>
                              {tpl.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Sprint info */}
              {sprints.length > 0 && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border-1)',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '12px',
                    color: 'var(--text-2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ display: 'flex', color: 'var(--text-2)' }}>
                    <svg
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      viewBox="0 0 24 24"
                    >
                      <polyline points="13 17 18 12 13 7" />
                      <polyline points="6 17 11 12 6 7" />
                    </svg>
                  </span>
                  <span>
                    Sprint activo:{' '}
                    <strong style={{ color: 'var(--text-0)' }}>
                      {sprints.find(s => s.id === activeSprintId)?.name ?? 'Ninguno'}
                    </strong>
                    {' — la nota se asociará automáticamente'}
                  </span>
                </div>
              )}
            </>
          )}

          {tab === 'manage' && (
            <>
              <p
                style={{
                  margin: '0 0 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--text-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                }}
              >
                Todas las plantillas
              </p>

              {TYPE_ORDER.map(type => {
                const meta = NOTE_TYPE_META[type]
                const typeTpls = getTypeTemplates(type)
                return (
                  <div key={type} style={{ marginBottom: '16px' }}>
                    {/* Type heading */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '6px',
                      }}
                    >
                      <span style={{ display: 'flex', color: meta.color }}>
                        <NoteTypeIcon type={type} size={14} />
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-ui)',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-0)',
                        }}
                      >
                        {meta.label}
                      </span>
                      <button
                        onClick={() => setNewTplType(newTplType === type ? null : type)}
                        style={{
                          marginLeft: 'auto',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-2)',
                          background: 'transparent',
                          color: 'var(--accent-400)',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        + Añadir
                      </button>
                    </div>

                    {/* Template list for this type */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {typeTpls.map(tpl =>
                        editingTpl?.id === tpl.id ? (
                          <TemplateEditor
                            key={tpl.id}
                            template={tpl}
                            onSave={data => {
                              dispatch(updateTemplate({ id: tpl.id, ...data }))
                              setEditingTpl(null)
                            }}
                            onCancel={() => setEditingTpl(null)}
                          />
                        ) : (
                          <div
                            key={tpl.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '7px 10px',
                              borderRadius: 'var(--radius-sm)',
                              border: `1px solid ${tpl.id === defaultId ? 'var(--accent-600)' : 'var(--border-1)'}`,
                              background:
                                tpl.id === defaultId ? 'var(--accent-glow)' : 'var(--bg-2)',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '12px',
                                color: tpl.id === defaultId ? 'var(--accent-400)' : 'var(--text-3)',
                                flexShrink: 0,
                              }}
                            >
                              {tpl.id === defaultId ? '★' : '☆'}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontFamily: 'var(--font-ui)',
                                  fontSize: '12px',
                                  color:
                                    tpl.id === defaultId ? 'var(--accent-400)' : 'var(--text-0)',
                                  fontWeight: tpl.id === defaultId ? 600 : 400,
                                }}
                              >
                                {tpl.name}
                              </div>
                              {tpl.isBuiltin && (
                                <div
                                  style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '9px',
                                    color: 'var(--text-3)',
                                    marginTop: '1px',
                                  }}
                                >
                                  integrada
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                              <button
                                title="Establecer como predeterminada"
                                onClick={() => dispatch(setDefaultTemplate(tpl.id))}
                                disabled={tpl.id === defaultId}
                                style={{
                                  padding: '3px 7px',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-2)',
                                  background:
                                    tpl.id === defaultId ? 'var(--accent-600)' : 'transparent',
                                  color: tpl.id === defaultId ? '#fff' : 'var(--text-2)',
                                  cursor: tpl.id === defaultId ? 'default' : 'pointer',
                                  fontSize: '10px',
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                {tpl.id === defaultId ? '★ Default' : 'Set default'}
                              </button>
                              {!tpl.isBuiltin && (
                                <>
                                  <button
                                    title="Editar plantilla"
                                    onClick={() => setEditingTpl(tpl)}
                                    style={{
                                      padding: '3px 7px',
                                      borderRadius: 'var(--radius-sm)',
                                      border: '1px solid var(--border-2)',
                                      background: 'transparent',
                                      color: 'var(--text-2)',
                                      cursor: 'pointer',
                                      fontSize: '10px',
                                    }}
                                  >
                                    ✎
                                  </button>
                                  <button
                                    title="Eliminar plantilla"
                                    onClick={() => {
                                      if (window.confirm(`¿Eliminar "${tpl.name}"?`))
                                        dispatch(deleteTemplate(tpl.id))
                                    }}
                                    style={{
                                      padding: '3px 7px',
                                      borderRadius: 'var(--radius-sm)',
                                      border: '1px solid rgba(239,68,68,0.3)',
                                      background: 'transparent',
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                      fontSize: '10px',
                                    }}
                                  >
                                    ×
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      )}

                      {/* Inline new template editor */}
                      {newTplType === type && (
                        <TemplateEditor
                          template={{ type }}
                          onSave={data => {
                            dispatch(addTemplate(data))
                            setNewTplType(null)
                          }}
                          onCancel={() => setNewTplType(null)}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </>
  )
}
