/**
 * LandingPage — Página de presentación de Agilens.
 * Mostrada en el primer acceso; accesible desde Ajustes.
 * Diseño inspirado directamente en la UI del producto.
 */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AgilensLogo from '@/components/layout/AgilensLogo'
import { useAppDispatch } from '@/store'
import { updateSettings } from '@/store/slices/settingsSlice'
import type { AccentColor, EditorFont, UITheme } from '@/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onEnter: () => void
  onClose?: () => void // si se abre desde Ajustes
}

// ─── Theme presets (same as Onboarding) ──────────────────────────────────────

interface Preset {
  label: string
  desc: string
  theme: UITheme
  accent: AccentColor
  accentHex: string
  font: EditorFont
  colors: { bg: string; bg2: string; border: string; text: string; text2: string }
}

const PRESETS: Preset[] = [
  {
    label: 'Oscuro Pro',
    desc: 'Clásico para largas sesiones',
    theme: 'dark',
    accent: 'indigo',
    accentHex: '#4f46e5',
    font: 'fira-code',
    colors: { bg: '#0f1117', bg2: '#1a1d27', border: '#2a2d3e', text: '#e2e8f0', text2: '#94a3b8' },
  },
  {
    label: 'Violeta',
    desc: 'Creativo y dinámico',
    theme: 'dark',
    accent: 'violet',
    accentHex: '#7c3aed',
    font: 'jetbrains-mono',
    colors: { bg: '#0f0f1a', bg2: '#1a1728', border: '#2a2545', text: '#e9e4f7', text2: '#9b8ec4' },
  },
  {
    label: 'Esmeralda',
    desc: 'Fresco y enfocado',
    theme: 'dark',
    accent: 'emerald',
    accentHex: '#059669',
    font: 'cascadia',
    colors: { bg: '#0a110e', bg2: '#111a16', border: '#1a3028', text: '#d1fae5', text2: '#6ee7b7' },
  },
  {
    label: 'Claro Pro',
    desc: 'Nítido y profesional',
    theme: 'light',
    accent: 'indigo',
    accentHex: '#4f46e5',
    font: 'fira-code',
    colors: { bg: '#f8f9fc', bg2: '#ffffff', border: '#e2e8f0', text: '#1e293b', text2: '#64748b' },
  },
  {
    label: 'Aurora',
    desc: 'Natural y descansado',
    theme: 'light',
    accent: 'emerald',
    accentHex: '#059669',
    font: 'cascadia',
    colors: { bg: '#f0fdf4', bg2: '#ffffff', border: '#d1fae5', text: '#14532d', text2: '#4ade80' },
  },
  {
    label: 'Cian Tech',
    desc: 'Limpio y técnico',
    theme: 'dark',
    accent: 'cyan',
    accentHex: '#0891b2',
    font: 'ibm-plex',
    colors: { bg: '#080f12', bg2: '#0d1a20', border: '#0e2d3a', text: '#e0f7ff', text2: '#67e8f9' },
  },
]

// ─── Feature data ─────────────────────────────────────────────────────────────

const mkIcon = (paths: React.ReactNode, size = 22) => (
  <svg
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
  >
    {paths}
  </svg>
)

const FEATURES: { icon: React.ReactNode; title: string; desc: string }[] = [
  {
    icon: mkIcon(
      <>
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </>
    ),
    title: 'Editor Markdown',
    desc: '7 tipos de nota con preview en tiempo real, slash commands y tabla visual.',
  },
  {
    icon: mkIcon(
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </>
    ),
    title: 'Kanban Board',
    desc: 'Tablero drag-and-drop con 5 columnas, prioridad, estimación y filtros.',
  },
  {
    icon: mkIcon(<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />),
    title: 'Sprints',
    desc: 'Crea y cierra sprints, vincula tareas, observa el progreso y el historial.',
  },
  {
    icon: mkIcon(
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
    title: 'Daily Standup',
    desc: 'Registro diario con editor dividido, historial en calendario y racha.',
  },
  {
    icon: mkIcon(
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
    title: 'Impedimentos',
    desc: 'Registra bloqueos con severidad, sprint y responsable. Nunca pierdas un blocker.',
  },
  {
    icon: mkIcon(
      <>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </>
    ),
    title: 'Mapa de Conocimiento',
    desc: 'Grafo interactivo de todas tus notas, sprints, proyectos y relaciones.',
  },
  {
    icon: mkIcon(
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    ),
    title: 'Proyectos',
    desc: 'Organiza todo por proyecto con repositorios GitHub, stack técnico y más.',
  },
  {
    icon: mkIcon(
      <>
        <line x1="6" y1="3" x2="6" y2="15" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M18 9a9 9 0 01-9 9" />
      </>
    ),
    title: 'Integración Git',
    desc: 'Commit, push y pull desde la app. Sincroniza tus notas como código.',
  },
  {
    icon: mkIcon(
      <>
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </>
    ),
    title: 'Temas y Fuentes',
    desc: '12 presets de tema, 10 fuentes de código, personalización total del acento.',
  },
  {
    icon: mkIcon(
      <>
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </>
    ),
    title: 'Exportar',
    desc: 'PDF, ZIP, Markdown y HTML. Tus notas son tuyas para siempre.',
  },
  {
    icon: mkIcon(
      <>
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </>
    ),
    title: 'PWA Instalable',
    desc: 'Instala Agilens como app nativa en iOS, Android, Mac, Windows o Linux.',
  },
  {
    icon: mkIcon(
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </>
    ),
    title: 'Bloqueo con PIN',
    desc: 'Protege tu espacio con contraseña. Auto-lock por inactividad o al cerrar.',
  },
]

const PILLARS = [
  {
    icon: (
      <svg
        width="28"
        height="28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
    title: 'Privado por diseño',
    desc: 'Todo se guarda en tu navegador (localStorage + IndexedDB). Cero servidores, cero tracking, cero sorpresas.',
    color: '#6366f1',
  },
  {
    icon: (
      <svg
        width="28"
        height="28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: 'Ultra rápido',
    desc: 'Sin backend, sin red, sin latencia. Cada acción es instantánea porque todo ocurre en tu dispositivo.',
    color: '#f59e0b',
  },
  {
    icon: (
      <svg
        width="28"
        height="28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
        <line x1="12" y1="2" x2="12" y2="9" />
        <line x1="12" y1="15" x2="12" y2="22" />
        <line x1="2" y1="12" x2="9" y2="12" />
        <line x1="15" y1="12" x2="22" y2="12" />
      </svg>
    ),
    title: '100% Personalizable',
    desc: '12 temas, 10 fuentes, acentos personalizados, densidad UI y modos claros/oscuros. Tu espacio, tus reglas.',
    color: '#ec4899',
  },
  {
    icon: (
      <svg
        width="28"
        height="28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
      >
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    title: 'Para equipos ágiles',
    desc: 'Pensado desde el primer commit para Scrum, Kanban y cualquier metodología ágil. Solo agrega tu equipo.',
    color: '#10b981',
  },
]

const PERSONAS: { role: string; icon: React.ReactNode; desc: string }[] = [
  {
    role: 'Desarrollador solo',
    icon: mkIcon(
      <>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </>,
      28
    ),
    desc: 'Documenta tu código, planifica sprints propios y nunca pierdas el contexto de lo que estás construyendo.',
  },
  {
    role: 'Equipo Scrum',
    icon: mkIcon(
      <>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </>,
      28
    ),
    desc: 'Daily standups, boards Kanban, gestión de impedimentos y sprints — todo en un solo lugar sin saltar entre apps.',
  },
  {
    role: 'Tech Lead',
    icon: mkIcon(
      <>
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </>,
      28
    ),
    desc: 'Visión completa del proyecto: mapa de conocimiento, burndown de sprint, historial git integrado y ADRs.',
  },
  {
    role: 'Startup / Freelance',
    icon: mkIcon(
      <>
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
      </>,
      28
    ),
    desc: 'Sin costos de suscripción, sin límites de notas, sin retener datos. Instálalo y es tuyo para siempre.',
  },
]

// ─── Mini Kanban helper ───────────────────────────────────────────────────────

const MINI_KANBAN = [
  { col: 'Todo', color: '#94a3b8', tasks: ['Diseñar API REST', 'Revisar PRs abiertos'] },
  { col: 'En progreso', color: '#f59e0b', tasks: ['Implementar autenticación'] },
  { col: 'Listo', color: '#10b981', tasks: ['Setup CI/CD', 'Documentar endpoints'] },
]

// ─── Simple Markdown renderer (no external dep needed for landing) ─────────────

function renderMd(md: string): string {
  return md
    .replace(
      /^### (.+)$/gm,
      '<h3 style="margin:0 0 4px;font-size:14px;color:var(--accent-400)">$1</h3>'
    )
    .replace(/^## (.+)$/gm, '<h2 style="margin:0 0 6px;font-size:16px;font-weight:700">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="margin:0 0 8px;font-size:20px;font-weight:800">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(
      /`(.+?)`/g,
      '<code style="background:var(--bg-3);border-radius:3px;padding:1px 5px;font-size:11px">$1</code>'
    )
    .replace(/^- (.+)$/gm, '<li style="margin:1px 0;padding-left:6px">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
}

// ─── SVG scroll indicator ────────────────────────────────────────────────────

const ScrollArrow = () => (
  <motion.div
    animate={{ y: [0, 8, 0] }}
    transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
    style={{
      color: 'var(--text-3)',
      display: 'flex',
      justifyContent: 'center',
      marginTop: '8px',
      cursor: 'default',
    }}
  >
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  </motion.div>
)

// ─── Main component ───────────────────────────────────────────────────────────

export default function LandingPage({ onEnter, onClose }: Props) {
  const dispatch = useAppDispatch()
  const [activePreset, setActivePreset] = useState(0)
  const [mdValue, setMdValue] = useState(
    `# Mi primera nota\n\nHoy trabajé en **autenticación** y revisé las *issues* abiertas.\n\n## Tareas\n- Implementar JWT\n- Agregar tests\n- Revisar \`auth.ts\``
  )
  const [sprintProgress] = useState(67)
  const [showInstallHint, setShowInstallHint] = useState(false)
  const featuresRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  const preset = PRESETS[activePreset]

  // Apply preset to the whole app immediately (live preview)
  function applyPreset(idx: number) {
    const p = PRESETS[idx]
    setActivePreset(idx)
    dispatch(
      updateSettings({
        uiTheme: p.theme,
        accentColor: p.accent,
        customAccentHex: p.accentHex,
        editorFont: p.font,
      })
    )
  }

  // PWA install hint
  useEffect(() => {
    const t = setTimeout(() => setShowInstallHint(true), 3000)
    return () => clearTimeout(t)
  }, [])

  const scrollToFeatures = () => featuresRef.current?.scrollIntoView({ behavior: 'smooth' })

  // ── Shared button styles ───────────────────────────────────────────────────
  const ctaBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '13px 28px',
    borderRadius: '10px',
    border: 'none',
    background: 'var(--accent-600)',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 700,
    fontFamily: 'var(--font-ui)',
    cursor: 'pointer',
    letterSpacing: '0.01em',
    boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  }

  const secondaryBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '10px',
    border: '1px solid var(--border-2)',
    background: 'var(--bg-2)',
    color: 'var(--text-1)',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'var(--font-ui)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  }

  // ── Rendered HTML for markdown preview ────────────────────────────────────
  const previewHtml = renderMd(mdValue)

  return (
    <div
      style={{
        position: onClose ? 'fixed' : 'relative',
        inset: onClose ? 0 : undefined,
        width: '100%',
        height: onClose ? '100dvh' : undefined,
        minHeight: onClose ? undefined : '100dvh',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'var(--bg-1)',
        color: 'var(--text-0)',
        fontFamily: 'var(--font-ui)',
        zIndex: onClose ? 100 : undefined,
        scrollBehavior: 'smooth',
      }}
    >
      {/* ── Close button (from Settings) ──────────────────────────────────── */}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 200,
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '1px solid var(--border-2)',
            background: 'var(--bg-2)',
            color: 'var(--text-1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN 1 — HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(60px, 10vh, 100px) 20px 40px',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
        }}
      >
        {/* Background glow orbs */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute',
              top: '-10%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'clamp(300px,60vw,700px)',
              height: 'clamp(300px,60vw,700px)',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${preset.accentHex}22 0%, transparent 70%)`,
              transition: 'background 0.6s',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '10%',
              right: '-10%',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${preset.accentHex}15 0%, transparent 70%)`,
              transition: 'background 0.6s',
            }}
          />
        </div>

        {/* Logo + badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '28px',
          }}
        >
          <AgilensLogo size={52} showWordmark variant="color" />
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: `${preset.accentHex}20`,
              border: `1px solid ${preset.accentHex}55`,
              color: preset.accentHex,
              borderRadius: '20px',
              padding: '3px 10px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              transition: 'all 0.4s',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: preset.accentHex,
                flexShrink: 0,
              }}
            />
            v0.2.0 · PWA · Open Source
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          style={{
            fontSize: 'clamp(28px, 5.5vw, 64px)',
            fontWeight: 900,
            lineHeight: 1.1,
            margin: '0 0 16px',
            maxWidth: '820px',
            letterSpacing: '-0.03em',
          }}
        >
          Tu espacio de trabajo ágil,{' '}
          <span style={{ color: preset.accentHex, transition: 'color 0.4s' }}>
            privado y sin límites
          </span>
        </motion.h1>

        {/* Sub headline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          style={{
            fontSize: 'clamp(15px, 2vw, 19px)',
            color: 'var(--text-2)',
            maxWidth: '600px',
            lineHeight: 1.6,
            margin: '0 0 36px',
          }}
        >
          Notas Markdown · Kanban · Sprints · Daily Standups · Proyectos · Git.
          <br />
          Todo en un solo lugar, en tu navegador, sin servidores, sin suscripción.
        </motion.p>

        {/* Theme preset selector */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ marginBottom: '36px' }}
        >
          <p
            style={{
              fontSize: '11px',
              color: 'var(--text-3)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}
          >
            Elige tu tema antes de entrar
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => applyPreset(i)}
                title={`${p.label} — ${p.desc}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '7px 13px',
                  borderRadius: '8px',
                  border:
                    activePreset === i
                      ? `1.5px solid ${p.accentHex}`
                      : '1.5px solid var(--border-2)',
                  background: activePreset === i ? `${p.accentHex}18` : 'var(--bg-2)',
                  color: activePreset === i ? p.accentHex : 'var(--text-2)',
                  fontSize: '12px',
                  fontWeight: activePreset === i ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: p.accentHex,
                    flexShrink: 0,
                  }}
                />
                {p.label}
                {p.theme === 'light' && (
                  <span
                    style={{
                      fontSize: '9px',
                      opacity: 0.7,
                      background: p.accentHex + '30',
                      borderRadius: '4px',
                      padding: '1px 4px',
                    }}
                  >
                    Claro
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginBottom: '48px',
          }}
        >
          <button
            onClick={onEnter}
            style={ctaBtnStyle}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 8px 32px rgba(0,0,0,0.45)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLButtonElement).style.transform = ''
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 4px 24px rgba(0,0,0,0.35)'
            }}
          >
            Empezar ahora — gratis
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
          <button
            onClick={scrollToFeatures}
            style={secondaryBtnStyle}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-3)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-2)'
            }}
          >
            Ver funcionalidades
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </motion.div>

        {/* Quick stats bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          style={{
            display: 'flex',
            gap: 'clamp(16px, 4vw, 40px)',
            flexWrap: 'wrap',
            justifyContent: 'center',
            padding: '16px 24px',
            borderRadius: '12px',
            background: 'var(--bg-2)',
            border: '1px solid var(--border-1)',
            fontSize: '13px',
            color: 'var(--text-2)',
            marginBottom: '32px',
          }}
        >
          {[
            { val: '12+', label: 'Módulos integrados' },
            { val: '0', label: 'Servidores necesarios' },
            { val: '100%', label: 'Open Source' },
            { val: '∞', label: 'Notas sin límite' },
          ].map(({ val, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 'clamp(18px,3vw,26px)',
                  fontWeight: 800,
                  color: preset.accentHex,
                  transition: 'color 0.4s',
                  lineHeight: 1,
                }}
              >
                {val}
              </div>
              <div style={{ fontSize: '11px', marginTop: '3px', opacity: 0.8 }}>{label}</div>
            </div>
          ))}
        </motion.div>

        <ScrollArrow />
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN 2 — DEMOS INTERACTIVOS
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        ref={featuresRef}
        style={{
          padding: 'clamp(40px,8vh,80px) clamp(16px,4vw,60px)',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2
            style={{
              fontSize: 'clamp(22px,3.5vw,36px)',
              fontWeight: 800,
              margin: '0 0 10px',
              letterSpacing: '-0.02em',
            }}
          >
            Experimenta el producto, ahora mismo
          </h2>
          <p
            style={{
              color: 'var(--text-2)',
              fontSize: '15px',
              maxWidth: '480px',
              margin: '0 auto',
            }}
          >
            No son screenshots. Son componentes reales del producto.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          {/* ── Demo 1: Editor Markdown ──────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            style={{
              borderRadius: '14px',
              border: '1px solid var(--border-2)',
              overflow: 'hidden',
              background: 'var(--bg-2)',
            }}
          >
            {/* Tab bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderBottom: '1px solid var(--border-1)',
                background: 'var(--bg-1)',
              }}
            >
              <div style={{ display: 'flex', gap: '5px' }}>
                {['#ff5f57', '#febc2e', '#28c840'].map(c => (
                  <div
                    key={c}
                    style={{ width: 10, height: 10, borderRadius: '50%', background: c }}
                  />
                ))}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'monospace' }}>
                editor · mi-primera-nota.md
              </span>
            </div>
            {/* Split editor/preview */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '220px' }}>
              <textarea
                value={mdValue}
                onChange={e => setMdValue(e.target.value)}
                spellCheck={false}
                style={{
                  padding: '12px',
                  border: 'none',
                  borderRight: '1px solid var(--border-1)',
                  background: 'var(--bg-1)',
                  color: 'var(--text-0)',
                  fontFamily: 'var(--font-editor, monospace)',
                  fontSize: '12px',
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 1.6,
                }}
              />
              <div
                style={{
                  padding: '12px',
                  fontSize: '12px',
                  lineHeight: 1.7,
                  overflow: 'auto',
                  color: 'var(--text-0)',
                }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
            <div
              style={{
                padding: '8px 12px',
                background: 'var(--bg-1)',
                borderTop: '1px solid var(--border-1)',
                fontSize: '10px',
                color: 'var(--text-3)',
                fontFamily: 'var(--font-ui)',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <svg
                  width="11"
                  height="11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Editor Markdown interactivo — escribe algo arriba
              </span>
            </div>
          </motion.div>

          {/* ── Demo 2: Kanban ───────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{
              borderRadius: '14px',
              border: '1px solid var(--border-2)',
              overflow: 'hidden',
              background: 'var(--bg-2)',
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--border-1)',
                background: 'var(--bg-1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg
                width="13"
                height="13"
                fill="none"
                stroke={preset.accentHex}
                strokeWidth="2"
                viewBox="0 0 24 24"
                style={{ transition: 'stroke 0.4s' }}
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span
                style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-ui)' }}
              >
                kanban · sprint-14
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '12px',
                overflowX: 'auto',
                height: '220px',
              }}
            >
              {MINI_KANBAN.map(col => (
                <div
                  key={col.col}
                  style={{
                    flex: '0 0 150px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      marginBottom: '2px',
                    }}
                  >
                    <div
                      style={{ width: 7, height: 7, borderRadius: '50%', background: col.color }}
                    />
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: 'var(--text-2)',
                        fontFamily: 'var(--font-ui)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {col.col}
                    </span>
                  </div>
                  {col.tasks.map(t => (
                    <div
                      key={t}
                      style={{
                        padding: '7px 9px',
                        borderRadius: '7px',
                        background: 'var(--bg-1)',
                        border: '1px solid var(--border-1)',
                        fontSize: '11px',
                        color: 'var(--text-1)',
                        lineHeight: 1.4,
                        cursor: 'default',
                        userSelect: 'none',
                      }}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div
              style={{
                padding: '8px 12px',
                background: 'var(--bg-1)',
                borderTop: '1px solid var(--border-1)',
                fontSize: '10px',
                color: 'var(--text-3)',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <svg
                  width="11"
                  height="11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                Kanban drag-and-drop · 5 columnas · prioridad visual
              </span>
            </div>
          </motion.div>

          {/* ── Demo 3: Sprint ───────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{
              borderRadius: '14px',
              border: '1px solid var(--border-2)',
              overflow: 'hidden',
              background: 'var(--bg-2)',
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--border-1)',
                background: 'var(--bg-1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg
                width="13"
                height="13"
                fill="none"
                stroke={preset.accentHex}
                strokeWidth="2"
                viewBox="0 0 24 24"
                style={{ transition: 'stroke 0.4s' }}
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                sprints · Sprint-14 · activo
              </span>
            </div>
            <div
              style={{
                padding: '16px',
                height: '220px',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Sprint card */}
              <div
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'var(--bg-1)',
                  border: `1px solid ${preset.accentHex}40`,
                  transition: 'border-color 0.4s',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>Sprint 14 — Auth System</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>
                      28 Feb → 14 Mar · 7 días restantes
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 7px',
                      borderRadius: '20px',
                      background: `${preset.accentHex}20`,
                      color: preset.accentHex,
                      fontWeight: 700,
                      transition: 'all 0.4s',
                    }}
                  >
                    Activo
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{ marginBottom: '8px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '10px',
                      color: 'var(--text-3)',
                      marginBottom: '5px',
                    }}
                  >
                    <span>Progreso</span>
                    <span>{sprintProgress}%</span>
                  </div>
                  <div
                    style={{
                      height: '6px',
                      borderRadius: '3px',
                      background: 'var(--bg-3)',
                      overflow: 'hidden',
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${sprintProgress}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
                      style={{
                        height: '100%',
                        borderRadius: '3px',
                        background: preset.accentHex,
                        transition: 'background 0.4s',
                      }}
                    />
                  </div>
                </div>
                {/* Stats */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { l: '8 pts', d: 'Completados' },
                    { l: '4 pts', d: 'Restantes' },
                    { l: '2', d: 'Bloqueos' },
                  ].map(s => (
                    <div
                      key={s.d}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '6px',
                        borderRadius: '6px',
                        background: 'var(--bg-2)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: preset.accentHex,
                          transition: 'color 0.4s',
                        }}
                      >
                        {s.l}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-3)', marginTop: '1px' }}>
                        {s.d}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Mini daily entry */}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-1)',
                  border: '1px solid var(--border-1)',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-3)',
                    marginBottom: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <svg
                    width="10"
                    height="10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Daily · Hoy — 26 Feb
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-1)',
                    lineHeight: 1.7,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                    <svg
                      width="10"
                      height="10"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                      style={{ marginTop: '2px', flexShrink: 0 }}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Terminé el endpoint de login
                  </span>
                  <span style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                    <svg
                      width="10"
                      height="10"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                      style={{ marginTop: '2px', flexShrink: 0 }}
                    >
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                    </svg>
                    Revisando middleware JWT
                  </span>
                  <span style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                    <svg
                      width="10"
                      height="10"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                      style={{ marginTop: '2px', flexShrink: 0 }}
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Bloqueado por falta de certs SSL
                  </span>
                </div>
              </div>
            </div>
            <div
              style={{
                padding: '8px 12px',
                background: 'var(--bg-1)',
                borderTop: '1px solid var(--border-1)',
                fontSize: '10px',
                color: 'var(--text-3)',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <svg
                  width="11"
                  height="11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Sprints con burndown · Tareas · Daily · Impedimentos
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN 3 — FEATURES GRID
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          padding: 'clamp(40px,8vh,80px) clamp(16px,4vw,60px)',
          background: 'var(--bg-2)',
          borderTop: '1px solid var(--border-1)',
          borderBottom: '1px solid var(--border-1)',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <h2
              style={{
                fontSize: 'clamp(20px,3vw,32px)',
                fontWeight: 800,
                margin: '0 0 10px',
                letterSpacing: '-0.02em',
              }}
            >
              Todo lo que un equipo ágil necesita
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>
              Sin plugins. Sin integraciones de pago. Sin límites artificiales.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '14px',
            }}
          >
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'var(--bg-1)',
                  border: '1px solid var(--border-1)',
                  transition: 'border-color 0.2s',
                  cursor: 'default',
                }}
                whileHover={{ borderColor: preset.accentHex + '80', scale: 1.01 }}
              >
                <div
                  style={{
                    marginBottom: '8px',
                    color: preset.accentHex,
                    transition: 'color 0.4s',
                    lineHeight: 0,
                  }}
                >
                  {f.icon}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '5px' }}>
                  {f.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                  {f.desc}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN 4 — PILARES
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: 'clamp(40px,8vh,80px) clamp(16px,4vw,60px)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <h2
              style={{
                fontSize: 'clamp(20px,3vw,32px)',
                fontWeight: 800,
                margin: '0 0 10px',
                letterSpacing: '-0.02em',
              }}
            >
              Construido sobre principios que importan
            </h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
            }}
          >
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                style={{
                  padding: '24px 20px',
                  borderRadius: '14px',
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border-1)',
                  borderTop: `3px solid ${p.color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ color: p.color }}>{p.icon}</div>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>{p.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6 }}>
                  {p.desc}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN 5 — PARA QUIÉN ES
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          padding: 'clamp(40px,8vh,80px) clamp(16px,4vw,60px)',
          background: 'var(--bg-2)',
          borderTop: '1px solid var(--border-1)',
          borderBottom: '1px solid var(--border-1)',
        }}
      >
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <h2
              style={{
                fontSize: 'clamp(20px,3vw,32px)',
                fontWeight: 800,
                margin: '0 0 10px',
                letterSpacing: '-0.02em',
              }}
            >
              Diseñado para personas reales
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>
              Desde el dev solo hasta el equipo de producto más exigente.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            {PERSONAS.map((p, i) => (
              <motion.div
                key={p.role}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                style={{
                  padding: '20px',
                  borderRadius: '14px',
                  background: 'var(--bg-1)',
                  border: '1px solid var(--border-1)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    marginBottom: '10px',
                    color: preset.accentHex,
                    transition: 'color 0.4s',
                    lineHeight: 0,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  {p.icon}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    marginBottom: '8px',
                    color: preset.accentHex,
                    transition: 'color 0.4s',
                  }}
                >
                  {p.role}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.55 }}>
                  {p.desc}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN 6 — PWA + SELF HOSTED
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: 'clamp(40px,8vh,80px) clamp(16px,4vw,60px)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '20px',
            }}
          >
            {/* PWA */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              style={{
                padding: '28px 24px',
                borderRadius: '16px',
                background: `linear-gradient(135deg, ${preset.accentHex}18 0%, var(--bg-2) 100%)`,
                border: `1px solid ${preset.accentHex}40`,
                transition: 'all 0.4s',
              }}
            >
              <div style={{ marginBottom: '16px', lineHeight: 0 }}>
                <svg
                  width="36"
                  height="36"
                  fill="none"
                  stroke={preset.accentHex}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                  style={{ transition: 'stroke 0.4s' }}
                >
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 10px' }}>
                Instala como app nativa
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
                Agilens es una PWA completa. Instálala en iOS, Android, macOS, Windows o Linux —
                funciona offline, sin App Store, sin Play Store.
              </p>
              <AnimatePresence>
                {showInstallHint && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      marginTop: '14px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-1)',
                      border: '1px solid var(--border-2)',
                      fontSize: '11px',
                      color: 'var(--text-2)',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <svg
                        width="11"
                        height="11"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        viewBox="0 0 24 24"
                      >
                        <line x1="12" y1="2" x2="12" y2="6" />
                        <line x1="12" y1="18" x2="12" y2="22" />
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                        <line x1="2" y1="12" x2="6" y2="12" />
                        <line x1="18" y1="12" x2="22" y2="12" />
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                      </svg>
                      En Chrome/Edge: busca el icono de instalación en la barra de direcciones
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Self hosted */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{
                padding: '28px 24px',
                borderRadius: '16px',
                background: 'var(--bg-2)',
                border: '1px solid var(--border-1)',
              }}
            >
              <div style={{ marginBottom: '16px', lineHeight: 0 }}>
                <svg
                  width="36"
                  height="36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 10px' }}>
                Tus datos, tu servidor
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
                Cero servidores propietarios. Todo se guarda en tu navegador con localStorage +
                IndexedDB. Opcionalmente sincroniza con tu repositorio GitHub privado.
              </p>
              <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['localStorage', 'IndexedDB', 'isomorphic-git', 'GitHub sync'].map(t => (
                  <span
                    key={t}
                    style={{
                      fontSize: '10px',
                      padding: '3px 8px',
                      borderRadius: '20px',
                      background: 'var(--bg-3)',
                      color: 'var(--text-2)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN 7 — CTA FINAL
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        ref={ctaRef}
        style={{
          padding: 'clamp(60px,10vh,120px) clamp(16px,4vw,60px)',
          textAlign: 'center',
          background: `radial-gradient(ellipse at 50% 0%, ${preset.accentHex}20 0%, var(--bg-1) 70%)`,
          transition: 'background 0.6s',
          borderTop: '1px solid var(--border-1)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ maxWidth: '640px', margin: '0 auto' }}
        >
          <AgilensLogo size={44} showWordmark variant="color" />
          <h2
            style={{
              fontSize: 'clamp(24px,4vw,44px)',
              fontWeight: 900,
              margin: '24px 0 14px',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
            }}
          >
            Empieza a ser productivo
            <br />
            <span style={{ color: preset.accentHex, transition: 'color 0.4s' }}>
              hoy mismo. Sin registro.
            </span>
          </h2>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--text-2)',
              marginBottom: '36px',
              lineHeight: 1.6,
            }}
          >
            Sin cuenta. Sin tarjeta. Sin límites. Solo abre el navegador y empieza.
          </p>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '28px',
            }}
          >
            <button
              onClick={onEnter}
              style={{ ...ctaBtnStyle, padding: '15px 36px', fontSize: '16px' }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 12px 40px rgba(0,0,0,0.5)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLButtonElement).style.transform = ''
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 4px 24px rgba(0,0,0,0.35)'
              }}
            >
              Abrir Agilens →
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>
            Open Source · MIT License ·{' '}
            <a
              href="https://github.com/sazardev/agilens"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-400)', textDecoration: 'none' }}
            >
              github.com/sazardev/agilens
            </a>
          </p>
        </motion.div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer
        style={{
          padding: '20px clamp(16px,4vw,60px)',
          borderTop: '1px solid var(--border-1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '12px',
          color: 'var(--text-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AgilensLogo size={18} variant="color" />
          <span>Agilens v0.2.0</span>
        </div>
        <div>Construido con React · TypeScript · Vite · 0 servidores</div>
      </footer>
    </div>
  )
}
