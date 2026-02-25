/**
 * KeyboardShortcutsModal — Overlay de atajos de teclado de Agilens.
 * Abrir con `?` o `F1`. Cerrar con `Escape` o clic fuera.
 */
import { useEffect, useRef } from 'react'

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Shortcut {
  keys: string[]
  label: string
}

interface ShortcutGroup {
  title: string
  color: string
  items: Shortcut[]
}

const GROUPS: ShortcutGroup[] = [
  {
    title: 'Global',
    color: '#a78bfa',
    items: [
      { keys: ['Ctrl', 'K'], label: 'Abrir paleta de comandos' },
      { keys: ['?'], label: 'Mostrar atajos de teclado' },
      { keys: ['F1'], label: 'Mostrar atajos de teclado' },
      { keys: ['Esc'], label: 'Cerrar panel / modal activo' },
    ],
  },
  {
    title: 'Navegación',
    color: '#34d399',
    items: [
      { keys: ['Ctrl', 'K'], label: 'Ir a Notas, Daily, Sprints…' },
      { keys: ['Ctrl', '1'], label: 'Notas (mapa)' },
      { keys: ['Ctrl', '2'], label: 'Daily' },
      { keys: ['Ctrl', '3'], label: 'Sprints' },
      { keys: ['Ctrl', '4'], label: 'Kanban' },
      { keys: ['Ctrl', '5'], label: 'Bloqueos' },
      { keys: ['Ctrl', '6'], label: 'Git' },
    ],
  },
  {
    title: 'Editor de notas',
    color: '#60a5fa',
    items: [
      { keys: ['Ctrl', 'B'], label: 'Negrita (**texto**)' },
      { keys: ['Ctrl', 'I'], label: 'Cursiva (*texto*)' },
      { keys: ['Ctrl', '`'], label: 'Código en línea' },
      { keys: ['Ctrl', 'Shift', 'X'], label: 'Tachado (~~texto~~)' },
      { keys: ['Ctrl', '1'], label: 'Encabezado H1' },
      { keys: ['Ctrl', '2'], label: 'Encabezado H2' },
      { keys: ['Ctrl', '3'], label: 'Encabezado H3' },
      { keys: ['Ctrl', 'Shift', '7'], label: 'Lista con viñetas' },
      { keys: ['Ctrl', 'Shift', '8'], label: 'Lista numerada' },
      { keys: ['Ctrl', 'Shift', '.'], label: 'Cita / blockquote' },
      { keys: ['Ctrl', 'Z'], label: 'Deshacer' },
      { keys: ['Ctrl', 'Y'], label: 'Rehacer' },
      { keys: ['Ctrl', 'H'], label: 'Buscar y reemplazar' },
      { keys: ['Ctrl', 'F'], label: 'Buscar en el editor' },
      { keys: ['Ctrl', 'Shift', 'Z'], label: 'Modo zen (escritura sin distracciones)' },
      { keys: ['Esc'], label: 'Salir de modo zen / Cerrar buscar' },
      { keys: ['[[ ]]'], label: 'Wikilink – enlace interno a otra nota' },
    ],
  },
  {
    title: 'Kanban',
    color: '#facc15',
    items: [
      { keys: ['N'], label: 'Nueva tarea rápida en columna' },
      { keys: ['Esc'], label: 'Cancelar edición' },
    ],
  },
  {
    title: 'Daily',
    color: '#fb923c',
    items: [
      { keys: ['Enter'], label: 'Agregar ítem a la sección activa' },
      { keys: ['Esc'], label: 'Cancelar ítem actual' },
    ],
  },
  {
    title: 'Git',
    color: '#f472b6',
    items: [{ keys: ['Ctrl', 'Enter'], label: 'Confirmar commit' }],
  },
  {
    title: 'Paleta de comandos',
    color: '#94a3b8',
    items: [
      { keys: ['↑', '↓'], label: 'Navegar resultados' },
      { keys: ['Enter'], label: 'Ejecutar comando seleccionado' },
      { keys: ['Esc'], label: 'Cerrar paleta' },
    ],
  },
]

// ─── Kbd chip ─────────────────────────────────────────────────────────────────

function Kbd({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '24px',
        height: '22px',
        padding: '0 7px',
        borderRadius: '5px',
        background: 'var(--bg-3)',
        border: '1px solid var(--border-2)',
        borderBottomWidth: '2px',
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        color: 'var(--text-1)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

export default function KeyboardShortcutsModal({ onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      ref={overlayRef}
      onClick={e => {
        if (e.target === overlayRef.current) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--border-1)',
          borderRadius: 'var(--radius-xl, 16px)',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-1)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="var(--accent-400)"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <rect x="2" y="6" width="20" height="13" rx="2" />
              <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h.01M12 14h.01M16 14h.01M6 14h.01M18 14h.01" />
            </svg>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-0)' }}>
              Atajos de teclado
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Presiona <Kbd label="?" /> o <Kbd label="F1" /> para abrir
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-3)',
                display: 'flex',
                padding: '4px',
                borderRadius: '6px',
              }}
            >
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body — scrollable grid */}
        <div
          style={{
            overflowY: 'auto',
            padding: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '16px',
            alignContent: 'start',
          }}
        >
          {GROUPS.map(group => (
            <div
              key={group.title}
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border-1)',
                borderTop: `2px solid ${group.color}`,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              {/* Group header */}
              <div
                style={{
                  padding: '8px 14px',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: group.color,
                  borderBottom: '1px solid var(--border-1)',
                  background: 'var(--bg-1)',
                }}
              >
                {group.title}
              </div>

              {/* Shortcut rows */}
              <div style={{ padding: '4px 0' }}>
                {group.items.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 14px',
                      gap: '12px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-1)',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {item.label}
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                      }}
                    >
                      {item.keys.map((k, ki) => (
                        <span
                          key={ki}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          {ki > 0 && (
                            <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>+</span>
                          )}
                          <Kbd label={k} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 20px',
            borderTop: '1px solid var(--border-1)',
            fontSize: '11px',
            color: 'var(--text-3)',
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Los atajos del editor dependen del estado de foco</span>
          <Kbd label="Esc" />
        </div>
      </div>
    </div>
  )
}
