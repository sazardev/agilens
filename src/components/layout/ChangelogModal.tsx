/**
 * ChangelogModal — Historial de versiones de Agilens.
 * Se abre al hacer clic en el indicador de versión de la barra de estado.
 */

// ─── Data ─────────────────────────────────────────────────────────────────────

type EntryKind = 'added' | 'changed' | 'fixed' | 'removed'

interface ChangeEntry {
  kind: EntryKind
  text: string
}

interface VersionEntry {
  version: string
  date: string
  changes: ChangeEntry[]
}

const CHANGELOG: VersionEntry[] = [
  {
    version: '0.2.0',
    date: '2026-02-25',
    changes: [
      {
        kind: 'added',
        text: 'Presets modo Claro en Onboarding: 6 presets light (Claro Pro, Aurora, Cielo, Ámbar, Coral, Menta).',
      },
      { kind: 'added', text: 'Iconos SVG de luna/sol en secciones de presets (sin emojis).' },
      {
        kind: 'added',
        text: 'agilens.config.json generado en cada commit con toda la configuración del usuario.',
      },
      {
        kind: 'added',
        text: 'Configuración de seguridad (bloqueo, hash SHA-256, timeout) persistida en el repo git privado.',
      },
      {
        kind: 'added',
        text: 'CORS Proxy integrado en push, pull y clone para evitar bloqueos de acceso a GitHub.',
      },
      {
        kind: 'added',
        text: 'Restauración automática de settings al hacer clone/pull: tema, fuentes, bloqueo y más.',
      },
      {
        kind: 'added',
        text: 'Botón Pull en la página Git junto al Push, con estado en tiempo real.',
      },
      {
        kind: 'added',
        text: 'Changelog interactivo: clic en la versión de la barra de estado para ver el historial.',
      },
      { kind: 'changed', text: 'Swatch de presets: color sólido en lugar de gradiente.' },
      { kind: 'changed', text: 'Push y Pull comparten una fila compacta en la página Git.' },
      {
        kind: 'fixed',
        text: 'UITheme no incluía "system"; eliminada la opción del selector de tema en Onboarding.',
      },
      { kind: 'fixed', text: 'pullStatus y handlePull declarados pero no usados en GitPage.' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-02-01',
    changes: [
      {
        kind: 'added',
        text: 'PWA completa (React 19 + TypeScript + Vite SWC) instalable en escritorio y móvil.',
      },
      {
        kind: 'added',
        text: 'Editor Markdown en tiempo real: modo split/preview/editor, temas claro/oscuro.',
      },
      {
        kind: 'added',
        text: 'Tipos de nota: Nota, Daily, Evidencia, Técnica, Reunión, Sprint, Tarea.',
      },
      {
        kind: 'added',
        text: 'Onboarding de 6 pasos con presets de apariencia, fuentes y conexión GitHub.',
      },
      {
        kind: 'added',
        text: 'Kanban drag-and-drop: Backlog → Todo → En progreso → Revisión → Hecho.',
      },
      {
        kind: 'added',
        text: 'Sprints con gestión completa: crear, editar, cerrar, tareas, evidencias, daily.',
      },
      { kind: 'added', text: 'Daily standup con calendario visual, rachas y contexto de sprint.' },
      {
        kind: 'added',
        text: 'Impedimentos (bloqueos) con severidad, estado y vinculación a sprints/notas.',
      },
      {
        kind: 'added',
        text: 'Mapa de conocimiento: grafo interactivo estilo Obsidian con física de fuerzas.',
      },
      {
        kind: 'added',
        text: 'Git integrado en navegador (isomorphic-git + LightningFS): sin servidor.',
      },
      {
        kind: 'added',
        text: 'Auto-commit al crear/cambiar de nota; historial con diff LCS y restauración.',
      },
      {
        kind: 'added',
        text: 'GitHub Connect: wizard paso a paso para token, repo y sincronización.',
      },
      {
        kind: 'added',
        text: 'Carpetas con anidado infinito, drag-and-drop y auto-organizar por tipo/sprint.',
      },
      {
        kind: 'added',
        text: 'Plantillas por tipo con editor inline y variables {{title}}, {{date}}.',
      },
      {
        kind: 'added',
        text: 'Paleta de comandos (Ctrl+K): búsqueda global de notas, sprints, dailys, bloqueos.',
      },
      {
        kind: 'added',
        text: 'Pantalla de bloqueo con PIN/contraseña SHA-256, timeout y bloqueo al ocultar.',
      },
      { kind: 'added', text: 'Exportación: Markdown, HTML, ZIP, PDF/impresión.' },
      {
        kind: 'added',
        text: 'Adjuntos: imágenes/archivos embebidos en notas, almacenados en IndexedDB.',
      },
      {
        kind: 'added',
        text: 'Resaltado de sintaxis con Shiki: github-dark/light para 30+ lenguajes.',
      },
      { kind: 'added', text: 'Tabla de Markdown con editor visual de celdas.' },
      { kind: 'added', text: 'Acento de color personalizable: 10+ presets y selector hex libre.' },
      {
        kind: 'added',
        text: 'Fuente del editor: Fira Code, JetBrains Mono, Cascadia, IBM Plex, y más.',
      },
      { kind: 'added', text: 'Modo densidad UI: Default / Compacto.' },
      { kind: 'added', text: 'Atajos de teclado documentados (F1 / ?).' },
    ],
  },
]

// ─── Kind metadata ────────────────────────────────────────────────────────────

const KIND_META: Record<EntryKind, { label: string; color: string; bg: string }> = {
  added: { label: 'Añadido', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  changed: { label: 'Modificado', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  fixed: { label: 'Corregido', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  removed: { label: 'Eliminado', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

export default function ChangelogModal({ onClose }: Props) {
  // Group entries by kind within each version for a cleaner render
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Historial de versiones"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '80vh',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-1)',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 20px 14px',
            borderBottom: '1px solid var(--border-1)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Tag icon */}
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="var(--accent-400)"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-0)' }}>
              Historial de versiones
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-2)',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
              padding: '4px 6px',
              borderRadius: '6px',
            }}
            onMouseEnter={e =>
              ((e.currentTarget as HTMLElement).style.background = 'var(--surface-3)')
            }
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            ×
          </button>
        </div>

        {/* ── Body ── */}
        <div
          style={{
            overflowY: 'auto',
            padding: '16px 20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '28px',
          }}
        >
          {CHANGELOG.map(entry => {
            // Group changes by kind
            const grouped: Partial<Record<EntryKind, string[]>> = {}
            for (const c of entry.changes) {
              if (!grouped[c.kind]) grouped[c.kind] = []
              grouped[c.kind]!.push(c.text)
            }
            const kinds = (['added', 'changed', 'fixed', 'removed'] as EntryKind[]).filter(
              k => grouped[k] && grouped[k]!.length > 0
            )

            return (
              <div key={entry.version}>
                {/* Version header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '10px',
                    marginBottom: '14px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: '16px',
                      color: 'var(--text-0)',
                    }}
                  >
                    v{entry.version}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--text-3)',
                    }}
                  >
                    {entry.date}
                  </span>
                </div>

                {/* Groups */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {kinds.map(kind => {
                    const meta = KIND_META[kind]
                    return (
                      <div key={kind}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px 8px',
                            borderRadius: '5px',
                            backgroundColor: meta.bg,
                            color: meta.color,
                            fontSize: '10px',
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            marginBottom: '7px',
                          }}
                        >
                          {meta.label}
                        </div>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: '18px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                          }}
                        >
                          {grouped[kind]!.map((text, i) => (
                            <li
                              key={i}
                              style={{
                                fontSize: '12px',
                                color: 'var(--text-1)',
                                lineHeight: 1.55,
                              }}
                            >
                              {text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            borderTop: '1px solid var(--border-1)',
            padding: '10px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <a
            href="https://github.com/sazardev/agilens/blob/main/CHANGELOG.md"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '11px',
              color: 'var(--accent-400)',
              textDecoration: 'none',
            }}
            onMouseEnter={e =>
              ((e.currentTarget as HTMLElement).style.textDecoration = 'underline')
            }
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.textDecoration = 'none')}
          >
            Ver CHANGELOG.md en GitHub →
          </a>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ fontSize: '12px', padding: '4px 14px' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
