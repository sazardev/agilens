/**
 * TableEditorModal — Visual Excel-like table editor.
 * Builds a Markdown GFM table from a grid of inputs.
 */
import { useState, useEffect, useCallback } from 'react'

interface Props {
  onInsert: (markdown: string) => void
  onClose: () => void
}

const MIN_COLS = 1
const MIN_ROWS = 1
const DEFAULT_ROWS = 3
const DEFAULT_COLS = 3

function buildMarkdown(headers: string[], cells: string[][]): string {
  const pad = (s: string) => ` ${s.trim() || ' '} `
  const headerRow = '|' + headers.map(pad).join('|') + '|'
  // Column separator — adapt width to longest cell
  const sepRow =
    '|' +
    headers
      .map((_, ci) => {
        const maxLen = Math.max(headers[ci].length, ...cells.map(row => row[ci]?.length ?? 0), 3)
        return ' ' + '-'.repeat(maxLen) + ' '
      })
      .join('|') +
    '|'
  const bodyRows = cells.map(row => '|' + row.map(pad).join('|') + '|').join('\n')
  return `\n${headerRow}\n${sepRow}\n${bodyRows}\n`
}

export default function TableEditorModal({ onInsert, onClose }: Props) {
  const [headers, setHeaders] = useState<string[]>(() => Array(DEFAULT_COLS).fill(''))
  const [cells, setCells] = useState<string[][]>(() =>
    Array.from({ length: DEFAULT_ROWS }, () => Array(DEFAULT_COLS).fill(''))
  )

  const rows = cells.length
  const cols = headers.length

  // ── Structural mutations ──────────────────────────────────────────────────

  function addRow() {
    setCells(prev => [...prev, Array(cols).fill('')])
  }

  function removeRow() {
    if (rows <= MIN_ROWS) return
    setCells(prev => prev.slice(0, -1))
  }

  function addCol() {
    setHeaders(prev => [...prev, ''])
    setCells(prev => prev.map(row => [...row, '']))
  }

  function removeCol() {
    if (cols <= MIN_COLS) return
    setHeaders(prev => prev.slice(0, -1))
    setCells(prev => prev.map(row => row.slice(0, -1)))
  }

  // ── Cell edits ────────────────────────────────────────────────────────────

  function setHeader(ci: number, val: string) {
    setHeaders(prev => prev.map((h, i) => (i === ci ? val : h)))
  }

  function setCell(ri: number, ci: number, val: string) {
    setCells(prev =>
      prev.map((row, r) => (r === ri ? row.map((c, cc) => (cc === ci ? val : c)) : row))
    )
  }

  // Navigate cells with Tab / Shift+Tab / Arrow keys
  function cellKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    ri: number,
    ci: number,
    isHeader?: boolean
  ) {
    const totalRows = rows + 1 // +1 for header row
    const headerRowIdx = 0
    const rowOffset = isHeader ? headerRowIdx : ri + 1
    const nextCell = (nextRow: number, nextCol: number) => {
      let sel: HTMLInputElement | null = null
      if (nextRow === 0) {
        sel = document.querySelector<HTMLInputElement>(`[data-table-header="${nextCol}"]`)
      } else {
        sel = document.querySelector<HTMLInputElement>(
          `[data-table-cell="${nextRow - 1}-${nextCol}"]`
        )
      }
      sel?.focus()
      sel?.select()
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      const nextCol = e.shiftKey ? ci - 1 : ci + 1
      if (nextCol >= 0 && nextCol < cols) {
        nextCell(rowOffset, nextCol)
      } else if (!e.shiftKey && rowOffset < totalRows - 1) {
        nextCell(rowOffset + 1, 0)
      } else if (e.shiftKey && rowOffset > 0) {
        nextCell(rowOffset - 1, cols - 1)
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (!isHeader && ri < rows - 1) {
        nextCell(ri + 2, ci)
      } else if (!isHeader && ri === rows - 1) {
        addRow()
        // focus new row after state update
        setTimeout(() => nextCell(rows + 1, ci), 0)
      }
    }
  }

  // ── Close on Escape ───────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // ── Render ────────────────────────────────────────────────────────────────

  const preview = buildMarkdown(headers, cells)

  const btnStyle = (disabled?: boolean): React.CSSProperties => ({
    padding: '4px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-2)',
    background: 'var(--bg-2)',
    color: disabled ? 'var(--text-3)' : 'var(--text-1)',
    fontFamily: 'var(--font-ui)',
    fontSize: '12px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'background var(--transition-fast)',
  })

  const cellInputStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontFamily: 'var(--font-ui)',
    fontSize: '12px',
    color: 'var(--text-1)',
    textAlign: 'center',
    padding: '2px 4px',
    minWidth: '60px',
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 900,
        background: 'rgba(0,0,0,0.52)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--border-2)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          padding: '20px 22px',
          minWidth: '380px',
          maxWidth: 'min(92vw, 720px)',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="var(--accent-400)"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-0)',
              }}
            >
              Editor de tabla
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-3)',
                background: 'var(--bg-3)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 7px',
              }}
            >
              {rows} × {cols}
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-3)',
                fontSize: '18px',
                lineHeight: 1,
                padding: '0 2px',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* ── Row/Col controls ── */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { label: '+ Fila', onClick: addRow, disabled: false },
            { label: '− Fila', onClick: removeRow, disabled: rows <= MIN_ROWS },
            { label: '+ Columna', onClick: addCol, disabled: false },
            { label: '− Columna', onClick: removeCol, disabled: cols <= MIN_COLS },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              disabled={btn.disabled}
              style={btnStyle(btn.disabled)}
              onMouseEnter={e => {
                if (!btn.disabled) (e.currentTarget as HTMLElement).style.background = 'var(--bg-3)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-2)'
              }}
            >
              {btn.label}
            </button>
          ))}
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--text-3)',
              alignSelf: 'center',
            }}
          >
            Tab / ↵ para navegar
          </span>
        </div>

        {/* ── Grid ── */}
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '320px' }}>
          <table
            style={{
              borderCollapse: 'collapse',
              width: '100%',
              tableLayout: 'auto',
            }}
          >
            {/* Header row */}
            <thead>
              <tr>
                {headers.map((h, ci) => (
                  <th
                    key={ci}
                    style={{
                      padding: '4px',
                      border: '1px solid var(--border-2)',
                      background: 'var(--accent-glow)',
                    }}
                  >
                    <input
                      data-table-header={ci}
                      value={h}
                      onChange={e => setHeader(ci, e.target.value)}
                      onKeyDown={e => cellKeyDown(e, 0, ci, true)}
                      placeholder={`Col ${ci + 1}`}
                      style={{
                        ...cellInputStyle,
                        fontWeight: 700,
                        color: 'var(--accent-400)',
                      }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            {/* Body */}
            <tbody>
              {cells.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : 'var(--bg-2)' }}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      style={{
                        padding: '3px',
                        border: '1px solid var(--border-1)',
                      }}
                    >
                      <input
                        data-table-cell={`${ri}-${ci}`}
                        value={cell}
                        onChange={e => setCell(ri, ci, e.target.value)}
                        onKeyDown={e => cellKeyDown(e, ri, ci)}
                        placeholder="—"
                        style={cellInputStyle}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Markdown preview ── */}
        <div
          style={{
            padding: '10px 12px',
            background: 'var(--bg-2)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-1)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-3)',
            whiteSpace: 'pre',
            overflowX: 'auto',
            lineHeight: 1.6,
            maxHeight: '100px',
            overflowY: 'auto',
          }}
        >
          {preview}
        </div>

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-2)',
              background: 'transparent',
              color: 'var(--text-2)',
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onInsert(preview)
              onClose()
            }}
            style={{
              padding: '7px 18px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--accent-600)',
              color: '#fff',
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Insertar tabla
          </button>
        </div>
      </div>
    </div>
  )
}
