/**
 * DailyHistoryPage — Calendar view of all daily standup entries.
 * Shows patterns, blockers, streaks and sprint context at a glance.
 */
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/store'
import { useMobile } from '@/hooks/useMobile'
import type { DailyEntry, Sprint } from '@/types'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** Returns 0=Mon .. 6=Sun for the first day of the month */
function getFirstWeekday(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay()
  return (d + 6) % 7
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' })
}

function dayLabel(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** Count consecutive days with entries ending on (and including) a given ISO date */
function streakUpTo(entries: DailyEntry[], untilISO: string): number {
  const dateSet = new Set(entries.map(e => e.date))
  let streak = 0
  const d = new Date(untilISO + 'T12:00:00')
  while (dateSet.has(d.toISOString().split('T')[0])) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

/** Is iso between start and end (inclusive)? */
function inSprintRange(iso: string, sprint: Sprint): boolean {
  if (!sprint.startDate) return false
  if (iso < sprint.startDate) return false
  if (sprint.endDate && iso > sprint.endDate) return false
  return true
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IcoChevronLeft = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)
const IcoChevronRight = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)
const IcoCalendar = () => (
  <svg
    width="14"
    height="14"
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
const IcoBack = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)
const IcoFire = () => (
  <svg
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" />
    <path d="M12 8c0 2.5-2 4-2 6s1 3 2 3 2-1 2-3-2-3.5-2-6z" />
  </svg>
)

// ─── Day cell ─────────────────────────────────────────────────────────────────

interface DayData {
  iso: string
  entry?: DailyEntry
  isToday: boolean
  isCurrentMonth: boolean
  sprintsOnDay: Sprint[]
}

function DayCell({
  data,
  selected,
  onClick,
}: {
  data: DayData
  selected: boolean
  onClick: () => void
}) {
  const { iso, entry, isToday, isCurrentMonth, sprintsOnDay } = data
  const day = parseInt(iso.split('-')[2])
  const hasEntry = !!entry
  const blockerCount = entry?.blocked?.length ?? 0
  const didCount = entry?.did?.length ?? 0
  const willCount = entry?.will?.length ?? 0
  const hasBlockers = blockerCount > 0
  const hasSprint = sprintsOnDay.length > 0
  const sprintColor = sprintsOnDay[0] ? `${sprintsOnDay[0].name.slice(0, 2).toUpperCase()}` : null

  // Color indicator logic
  let dotColor = 'transparent'
  if (hasEntry) {
    dotColor = hasBlockers ? '#f87171' : '#22c55e'
  }

  return (
    <button
      onClick={onClick}
      aria-label={iso}
      title={
        hasEntry
          ? `${dayLabel(iso)}\n${didCount} hecho · ${willCount} planificado${hasBlockers ? ` · ${blockerCount} bloqueo${blockerCount > 1 ? 's' : ''}` : ''}`
          : dayLabel(iso)
      }
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1',
        minHeight: '42px',
        borderRadius: '8px',
        background: selected ? 'var(--accent-glow)' : isToday ? 'var(--bg-3)' : 'transparent',
        border: selected
          ? '1px solid var(--accent-500)'
          : isToday
            ? '1px solid var(--border-2)'
            : '1px solid transparent',
        cursor: hasEntry || isCurrentMonth ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '3px',
        padding: '4px 2px',
        transition: 'background 0.1s',
        opacity: isCurrentMonth ? 1 : 0.3,
      }}
      onMouseEnter={e => {
        if (!selected && isCurrentMonth) {
          ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-2)'
        }
      }}
      onMouseLeave={e => {
        if (!selected && !isToday) {
          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
        } else if (!selected && isToday) {
          ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-3)'
        }
      }}
    >
      {/* Sprint band */}
      {hasSprint && (
        <div
          title={sprintsOnDay.map(s => s.name).join(', ')}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            borderRadius: '8px 8px 0 0',
            background: 'var(--accent-500)',
            opacity: 0.7,
          }}
        />
      )}

      {/* Day number */}
      <span
        style={{
          fontSize: '12px',
          fontWeight: isToday ? 700 : 400,
          color: isToday ? 'var(--accent-400)' : selected ? 'var(--accent-300)' : 'var(--text-1)',
          lineHeight: 1,
        }}
      >
        {day}
      </span>

      {/* Entry indicator dot */}
      {hasEntry && (
        <div
          style={{
            display: 'flex',
            gap: '2px',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: dotColor,
              flexShrink: 0,
            }}
          />
          {hasBlockers && (
            <div
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: '#fb923c',
                flexShrink: 0,
              }}
            />
          )}
        </div>
      )}

      {/* Sprint label */}
      {hasSprint && sprintColor && (
        <span
          style={{
            fontSize: '8px',
            color: 'var(--accent-400)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.03em',
            lineHeight: 1,
            marginTop: '1px',
          }}
        >
          {sprintColor}
        </span>
      )}
    </button>
  )
}

// ─── Entry detail panel ───────────────────────────────────────────────────────

function EntryDetail({
  iso,
  entry,
  onNavigate,
}: {
  iso: string
  entry?: DailyEntry
  onNavigate: () => void
}) {
  if (!entry) {
    return (
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border-1)',
          borderRadius: '10px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-2)',
            textTransform: 'capitalize',
          }}
        >
          {dayLabel(iso)}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-3)', fontStyle: 'italic' }}>
          Sin registro daily para este día.
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onNavigate}
          style={{ alignSelf: 'flex-start', marginTop: '4px' }}
        >
          Registrar daily
        </button>
      </div>
    )
  }

  const sections = [
    { label: 'Hice hoy', items: entry.did, color: '#22c55e' },
    { label: 'Haré mañana', items: entry.will, color: '#60a5fa' },
    { label: 'Bloqueado', items: entry.blocked, color: '#f87171' },
    { label: 'Destacados', items: entry.highlights ?? [], color: '#fbbf24' },
  ].filter(s => s.items.length > 0)

  return (
    <div
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border-1)',
        borderRadius: '10px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Date header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-2)',
              textTransform: 'capitalize',
              marginBottom: '2px',
            }}
          >
            {dayLabel(iso)}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '11px',
                color: '#22c55e',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {entry.did.length} hecho
            </span>
            <span
              style={{
                fontSize: '11px',
                color: '#60a5fa',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {entry.will.length} planificado
            </span>
            {entry.blocked.length > 0 && (
              <span
                style={{
                  fontSize: '11px',
                  color: '#f87171',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {entry.blocked.length} bloqueo{entry.blocked.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onNavigate}
          title="Abrir en editor de daily"
        >
          Abrir
        </button>
      </div>

      {/* Sections */}
      {sections.map(sec => (
        <div key={sec.label}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: sec.color,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '5px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {sec.label}
          </div>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
            }}
          >
            {sec.items.map((item, i) => (
              <li
                key={i}
                style={{
                  fontSize: '12px',
                  color: 'var(--text-1)',
                  lineHeight: 1.4,
                  paddingLeft: '10px',
                  borderLeft: `2px solid ${sec.color}40`,
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {entry.generalNotes?.trim() && (
        <div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--text-2)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '5px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Notas
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: 'var(--text-2)',
              lineHeight: 1.5,
              whiteSpace: 'pre-line',
            }}
          >
            {entry.generalNotes.trim().slice(0, 280)}
            {entry.generalNotes.trim().length > 280 ? '…' : ''}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Stats row ────────────────────────────────────────────────────────────────

function MonthStats({
  entries,
  year,
  month,
}: {
  entries: DailyEntry[]
  year: number
  month: number
}) {
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthEntries = entries.filter(e => e.date.startsWith(monthStr))
  const totalDid = monthEntries.reduce((s, e) => s + e.did.length, 0)
  const totalBlocked = monthEntries.reduce((s, e) => s + e.blocked.length, 0)
  const daysWithBlockers = monthEntries.filter(e => e.blocked.length > 0).length
  const workdays = Math.round(getDaysInMonth(year, month) * (5 / 7))

  const stats = [
    {
      label: 'Días registrados',
      value: monthEntries.length,
      sub: `/ ${workdays} laborables`,
      color: 'var(--accent-400)',
    },
    { label: 'Items completados', value: totalDid, sub: 'tareas/logros', color: '#22c55e' },
    {
      label: 'Bloqueos',
      value: totalBlocked,
      sub: `en ${daysWithBlockers} día${daysWithBlockers !== 1 ? 's' : ''}`,
      color: totalBlocked > 0 ? '#f87171' : 'var(--text-3)',
    },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '8px',
      }}
    >
      {stats.map(s => (
        <div
          key={s.label}
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border-1)',
            borderRadius: '8px',
            padding: '10px 12px',
          }}
        >
          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: s.color,
              lineHeight: 1,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {s.value}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-1)', marginTop: '3px' }}>
            {s.label}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '1px' }}>{s.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function DailyHistoryPage() {
  const navigate = useNavigate()
  const entries = useAppSelector(s => s.daily.entries)
  const sprints = useAppSelector(s => s.daily.sprints)
  const activeSprintId = useAppSelector(s => s.daily.activeSprintId)

  const today = todayISO()
  const todayYear = parseInt(today.split('-')[0])
  const todayMonth = parseInt(today.split('-')[1]) - 1

  const [viewYear, setViewYear] = useState(todayYear)
  const [viewMonth, setViewMonth] = useState(todayMonth)
  const [selectedISO, setSelectedISO] = useState<string>(today)
  const [filterSprintId, setFilterSprintId] = useState<string | 'all'>('all')
  const isMobile = useMobile()

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear(y => y - 1)
      setViewMonth(11)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear(y => y + 1)
      setViewMonth(0)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  function goToday() {
    setViewYear(todayYear)
    setViewMonth(todayMonth)
    setSelectedISO(today)
  }

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth)
    const firstWeekday = getFirstWeekday(viewYear, viewMonth)

    // Days from previous month to fill the first row
    const prevMonthDays = getDaysInMonth(
      viewMonth === 0 ? viewYear - 1 : viewYear,
      viewMonth === 0 ? 11 : viewMonth - 1
    )

    const cells: DayData[] = []

    // Leading days from previous month
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const day = prevMonthDays - i
      const pm = viewMonth === 0 ? 11 : viewMonth - 1
      const py = viewMonth === 0 ? viewYear - 1 : viewYear
      const iso = isoDate(py, pm, day)
      cells.push({
        iso,
        entry: entries.find(e => e.date === iso),
        isToday: iso === today,
        isCurrentMonth: false,
        sprintsOnDay: sprints.filter(s => inSprintRange(iso, s)),
      })
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = isoDate(viewYear, viewMonth, d)
      cells.push({
        iso,
        entry: entries.find(e => e.date === iso),
        isToday: iso === today,
        isCurrentMonth: true,
        sprintsOnDay: sprints.filter(s => inSprintRange(iso, s)),
      })
    }

    // Trailing days from next month
    const totalCells = Math.ceil(cells.length / 7) * 7
    const nm = viewMonth === 11 ? 0 : viewMonth + 1
    const ny = viewMonth === 11 ? viewYear + 1 : viewYear
    for (let d = 1; cells.length < totalCells; d++) {
      const iso = isoDate(ny, nm, d)
      cells.push({
        iso,
        entry: entries.find(e => e.date === iso),
        isToday: iso === today,
        isCurrentMonth: false,
        sprintsOnDay: sprints.filter(s => inSprintRange(iso, s)),
      })
    }

    return cells
  }, [viewYear, viewMonth, entries, sprints])

  // Filtered entries for stats
  const visibleEntries = useMemo(() => {
    if (filterSprintId === 'all') return entries
    return entries.filter(e => e.sprintId === filterSprintId)
  }, [entries, filterSprintId])

  // Current streak
  const currentStreak = useMemo(() => streakUpTo(entries, today), [entries, today])

  // Active sprint info
  const selectedEntry = entries.find(e => e.date === selectedISO)

  // Summary counts for selected month
  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
  const isCurrentView = viewYear === todayYear && viewMonth === todayMonth

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg-0)' }}>
      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: 'clamp(16px, 3vw, 32px) clamp(12px, 3vw, 24px) 64px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* ── Page header ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/daily')}
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <IcoBack />
            Daily
          </button>
          <div style={{ flex: 1 }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12px',
              color: 'var(--text-2)',
            }}
          >
            <IcoCalendar />
            Historial
          </div>
          {currentStreak > 1 && (
            <div
              title={`Racha de ${currentStreak} días consecutivos`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                color: '#fb923c',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
              }}
            >
              <IcoFire />
              {currentStreak}
            </div>
          )}
        </div>

        {/* ── Main layout: calendar + detail ───────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr minmax(240px, 280px)',
            gap: '16px',
            alignItems: 'start',
          }}
        >
          {/* ── Left: calendar ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Month nav */}
            <div
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border-1)',
                borderRadius: '10px',
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '14px',
                }}
              >
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={prevMonth}
                  aria-label="Mes anterior"
                  style={{ padding: '4px 8px' }}
                >
                  <IcoChevronLeft />
                </button>
                <div
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text-0)',
                    textTransform: 'capitalize',
                  }}
                >
                  {monthLabel(viewYear, viewMonth)}
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={nextMonth}
                  aria-label="Mes siguiente"
                  style={{ padding: '4px 8px' }}
                >
                  <IcoChevronRight />
                </button>
                {!isCurrentView && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={goToday}
                    style={{ fontSize: '11px', color: 'var(--accent-400)' }}
                  >
                    Hoy
                  </button>
                )}
              </div>

              {/* Weekday headers */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '2px',
                  marginBottom: '4px',
                }}
              >
                {WEEKDAYS.map(wd => (
                  <div
                    key={wd}
                    style={{
                      textAlign: 'center',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: 'var(--text-3)',
                      letterSpacing: '0.04em',
                      padding: '4px 0',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {wd}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '2px',
                }}
              >
                {calendarDays.map(dayData => (
                  <DayCell
                    key={dayData.iso}
                    data={dayData}
                    selected={dayData.iso === selectedISO}
                    onClick={() => setSelectedISO(dayData.iso)}
                  />
                ))}
              </div>

              {/* Legend */}
              <div
                style={{
                  display: 'flex',
                  gap: '14px',
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border-1)',
                  flexWrap: 'wrap',
                }}
              >
                {[
                  { color: '#22c55e', label: 'Sin bloqueos' },
                  { color: '#f87171', label: 'Con bloqueos' },
                  { color: 'var(--accent-500)', label: 'Sprint activo', band: true },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {l.band ? (
                      <div
                        style={{
                          width: '14px',
                          height: '3px',
                          borderRadius: '2px',
                          background: l.color,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: l.color,
                        }}
                      />
                    )}
                    <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly stats */}
            <MonthStats entries={visibleEntries} year={viewYear} month={viewMonth} />

            {/* Sprint filter */}
            {sprints.length > 0 && (
              <div
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border-1)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-2)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-mono)',
                    marginBottom: '8px',
                  }}
                >
                  Filtrar por sprint
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  <button
                    className="btn btn-sm"
                    onClick={() => setFilterSprintId('all')}
                    style={{
                      background: filterSprintId === 'all' ? 'var(--accent-glow)' : 'var(--bg-3)',
                      color: filterSprintId === 'all' ? 'var(--accent-400)' : 'var(--text-2)',
                      border: 'none',
                    }}
                  >
                    Todos
                  </button>
                  {sprints.map(s => (
                    <button
                      key={s.id}
                      className="btn btn-sm"
                      onClick={() => setFilterSprintId(prev => (prev === s.id ? 'all' : s.id))}
                      style={{
                        background: filterSprintId === s.id ? 'var(--accent-glow)' : 'var(--bg-3)',
                        color: filterSprintId === s.id ? 'var(--accent-400)' : 'var(--text-2)',
                        border: 'none',
                      }}
                    >
                      {s.name}
                      {s.id === activeSprintId && (
                        <span
                          style={{
                            fontSize: '9px',
                            color: 'var(--accent-500)',
                            marginLeft: '4px',
                          }}
                        >
                          activo
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: selected day detail ───────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <EntryDetail
              iso={selectedISO}
              entry={selectedEntry}
              onNavigate={() => navigate(`/daily/${selectedISO}`)}
            />

            {/* Overall stats */}
            <div
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border-1)',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Total global
              </div>
              {[
                { label: 'Dailys totales', value: entries.length },
                {
                  label: 'Días con bloqueos',
                  value: entries.filter(e => e.blocked.length > 0).length,
                },
                {
                  label: 'Items completados',
                  value: entries.reduce((s, e) => s + e.did.length, 0),
                },
                { label: 'Racha actual', value: `${currentStreak}d` },
              ].map(s => (
                <div
                  key={s.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{s.label}</span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-0)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {s.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Blocker pattern — days in current month with blockers listed */}
            {(() => {
              const monthEntries = entries.filter(
                e => e.date.startsWith(monthStr) && e.blocked.length > 0
              )
              if (!monthEntries.length) return null
              return (
                <div
                  style={{
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border-1)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#f87171',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-mono)',
                      marginBottom: '8px',
                    }}
                  >
                    Bloqueos del mes
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {monthEntries.map(e => (
                      <button
                        key={e.id}
                        onClick={() => {
                          setSelectedISO(e.date)
                          navigate(`/daily/${e.date}`)
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-3)',
                            marginBottom: '2px',
                          }}
                        >
                          {new Date(e.date + 'T12:00:00').toLocaleDateString('es', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                        {e.blocked.map((b, i) => (
                          <div
                            key={i}
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-1)',
                              paddingLeft: '8px',
                              borderLeft: '2px solid #f8717160',
                              lineHeight: 1.35,
                              marginBottom: '2px',
                            }}
                          >
                            {b}
                          </div>
                        ))}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
