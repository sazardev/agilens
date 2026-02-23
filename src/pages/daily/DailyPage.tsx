import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store'
import { addEntry, updateEntry, addSprint, setActiveSprint } from '@/store/slices/dailySlice'
import type { DailyEntry, Sprint } from '@/types'
import { nanoid } from '@reduxjs/toolkit'

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

type SectionKey = 'did' | 'will' | 'blocked'
const SECTIONS: { key: SectionKey; label: string; hint: string; color: string }[] = [
  { key: 'did', label: 'Hice hoy', hint: 'Qué completé hoy…', color: '#22c55e' },
  { key: 'will', label: 'Haré mañana', hint: 'Qué planeo hacer…', color: '#60a5fa' },
  { key: 'blocked', label: 'Bloqueado', hint: 'Impedimentos activos…', color: '#ef4444' },
]

export default function DailyPage() {
  const { date } = useParams()
  const targetDate = date ?? todayISO()
  const dispatch = useAppDispatch()
  const entries = useAppSelector(s => s.daily.entries)
  const sprints = useAppSelector(s => s.daily.sprints)
  const activeSprintId = useAppSelector(s => s.daily.activeSprintId)
  const entry = entries.find(e => e.date === targetDate)
  const notes = useAppSelector(s => s.notes.notes)
  const [sprintInput, setSprintInput] = useState('')
  const [showSprintForm, setShowSprintForm] = useState(false)

  function createSprint() {
    if (!sprintInput.trim()) return
    const sprint: Sprint = {
      id: nanoid(),
      name: sprintInput.trim(),
      startDate: todayISO(),
    }
    dispatch(addSprint(sprint))
    dispatch(setActiveSprint(sprint.id))
    setSprintInput('')
    setShowSprintForm(false)
  }

  const activeSprint = sprints.find(s => s.id === activeSprintId)

  function getOrCreate(): DailyEntry {
    if (entry) return entry
    const e: DailyEntry = {
      id: nanoid(),
      date: targetDate,
      did: [],
      will: [],
      blocked: [],
      noteIds: [],
      sprintId: activeSprintId ?? undefined,
    }
    dispatch(addEntry(e))
    return e
  }
  function addItem(key: SectionKey, value: string) {
    const e = getOrCreate()
    dispatch(updateEntry({ id: e.id, [key]: [...(entry?.[key] ?? []), value] }))
  }
  function removeItem(key: SectionKey, i: number) {
    const e = getOrCreate()
    const arr = [...(entry?.[key] ?? [])]
    arr.splice(i, 1)
    dispatch(updateEntry({ id: e.id, [key]: arr }))
  }
  function toggleNote(noteId: string) {
    const e = getOrCreate()
    const noteIds = e.noteIds.includes(noteId)
      ? e.noteIds.filter(id => id !== noteId)
      : [...e.noteIds, noteId]
    dispatch(updateEntry({ id: e.id, noteIds }))
  }
  function copyAsMarkdown() {
    if (!entry) return
    const noteTitles = entry.noteIds.map(id => notes.find(n => n.id === id)?.title).filter(Boolean)
    const md = [
      `## Daily — ${entry.date}`,
      '',
      '### Hice hoy',
      ...(entry.did.length ? entry.did.map(i => `- ${i}`) : ['- *(nada)*']),
      '',
      '### Haré mañana',
      ...(entry.will.length ? entry.will.map(i => `- ${i}`) : ['- *(nada)*']),
      '',
      '### Bloqueado',
      ...(entry.blocked.length ? entry.blocked.map(i => `- ${i}`) : ['- *(sin bloqueos)*']),
      ...(noteTitles.length ? ['', '### Evidencias', ...noteTitles.map(t => `- ${t}`)] : []),
    ].join('\n')
    navigator.clipboard.writeText(md)
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: 'clamp(16px, 3vw, 32px) clamp(14px, 3vw, 32px) 60px',
          display: 'flex',
          flexDirection: 'column' as const,
          gap: '24px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap' as const,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text-0)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Daily Standup
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--text-3)',
                marginTop: '3px',
              }}
            >
              {targetDate}
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={copyAsMarkdown}>
            Copiar Markdown
          </button>
        </div>

        {/* Sprint selector */}
        <div
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border-1)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap' as const,
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-2)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase' as const,
            }}
          >
            Sprint
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const, flex: 1 }}>
            {sprints.map(s => (
              <button
                key={s.id}
                onClick={() => dispatch(setActiveSprint(s.id === activeSprintId ? null : s.id))}
                style={{
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  borderColor: s.id === activeSprintId ? 'var(--accent-500)' : 'var(--border-2)',
                  background: s.id === activeSprintId ? 'var(--accent-glow)' : 'transparent',
                  color: s.id === activeSprintId ? 'var(--accent-400)' : 'var(--text-2)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '12px',
                  fontWeight: s.id === activeSprintId ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {s.name}
              </button>
            ))}
            {sprints.length === 0 && (
              <span style={{ fontSize: '12px', color: 'var(--text-3)', fontStyle: 'italic' }}>
                Sin sprints
              </span>
            )}
          </div>
          {showSprintForm ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                autoFocus
                type="text"
                placeholder="Nombre del sprint\u2026"
                value={sprintInput}
                onChange={e => setSprintInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') createSprint()
                  if (e.key === 'Escape') {
                    setShowSprintForm(false)
                    setSprintInput('')
                  }
                }}
                className="input-base"
                style={{ fontSize: '12px', width: '160px' }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={createSprint}
                disabled={!sprintInput.trim()}
              >
                Crear
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setShowSprintForm(false)
                  setSprintInput('')
                }}
              >
                ×
              </button>
            </div>
          ) : (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowSprintForm(true)}
              style={{ flexShrink: 0 }}
            >
              + Sprint
            </button>
          )}
        </div>

        {SECTIONS.map(({ key, label, hint, color }) => (
          <section
            key={key}
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border-1)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '1px',
                  background: color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-1)',
                  letterSpacing: '0.01em',
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--text-3)',
                  marginLeft: 'auto',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {entry?.[key].length ?? 0}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column' as const,
                gap: '4px',
                marginBottom: '8px',
              }}
            >
              {(entry?.[key] ?? []).map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-1)',
                    border: '1px solid var(--border-1)',
                    borderLeft: `3px solid ${color}`,
                  }}
                >
                  <span style={{ fontSize: '13px', color: 'var(--text-0)', flex: 1 }}>{item}</span>
                  <button
                    onClick={() => removeItem(key, i)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-3)',
                      padding: '2px 4px',
                      lineHeight: 1,
                      borderRadius: '3px',
                      fontSize: '14px',
                    }}
                    onMouseEnter={e => {
                      ;(e.currentTarget as HTMLElement).style.color = '#ef4444'
                    }}
                    onMouseLeave={e => {
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {!entry?.[key].length && (
                <p style={{ fontSize: '12px', color: 'var(--text-3)', padding: '2px 0' }}>
                  Sin entradas
                </p>
              )}
            </div>
            <input
              type="text"
              placeholder={hint}
              className="input-base"
              onKeyDown={e => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  addItem(key, e.currentTarget.value.trim())
                  e.currentTarget.value = ''
                }
              }}
            />
          </section>
        ))}

        <section
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border-1)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)' }}>
              Evidencias
            </span>
          </div>
          {notes.map(note => (
            <label
              key={note.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                background: entry?.noteIds.includes(note.id) ? 'var(--accent-glow)' : 'transparent',
                border: `1px solid ${entry?.noteIds.includes(note.id) ? 'var(--accent-600)' : 'var(--border-1)'}`,
                marginBottom: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <input
                type="checkbox"
                checked={entry?.noteIds.includes(note.id) ?? false}
                onChange={() => toggleNote(note.id)}
                style={{ accentColor: 'var(--accent-500)' }}
              />
              <span
                style={{
                  fontSize: '13px',
                  color: 'var(--text-0)',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' as const,
                }}
              >
                {note.title}
              </span>
            </label>
          ))}
          {notes.length === 0 && (
            <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Sin notas creadas</p>
          )}
        </section>
      </div>
    </div>
  )
}
