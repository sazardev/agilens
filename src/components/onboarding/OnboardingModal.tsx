/**
 * OnboardingModal — Experiencia de bienvenida en el primer inicio.
 * Paso extra: configuración del proyecto (local / GitHub nuevo / importar / saltar).
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AgilensLogo from '@/components/layout/AgilensLogo'
import { useAppDispatch, useAppSelector } from '@/store'
import { gitInit, gitClone, GIT_DIR } from '@/store/slices/gitSlice'
import { setGitHubConfig, updateSettings } from '@/store/slices/settingsSlice'
import { verifyToken, createRepo } from '@/lib/github/api'
import type { AccentColor, EditorFont, UITheme } from '@/types'

interface Props {
  onClose: () => void
}

// ─── Feature data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    title: 'Notas',
    desc: '7 tipos: daily, tecnica, reunion, evidencia, tarea, sprint y general. Editor Markdown con preview en vivo.',
    color: 'var(--accent-400)',
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
      >
        <polyline points="13 17 18 12 13 7" />
        <polyline points="6 17 11 12 6 7" />
      </svg>
    ),
    title: 'Sprints',
    desc: 'Crea sprints con fechas, tareas y retrospectivas. Vincula notas, evidencias e impedimentos.',
    color: '#f472b6',
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: 'Daily Standup',
    desc: 'Formato hice / hare / bloqueado. Historial en calendario, rachas y contexto de sprint.',
    color: '#60a5fa',
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    title: 'Bloqueos',
    desc: 'Registra impedimentos con severidad, asignado, sprint vinculado y ciclo de resolucion.',
    color: '#ef4444',
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="18" r="3" />
        <circle cx="6" cy="6" r="3" />
        <circle cx="18" cy="6" r="3" />
        <line x1="18" y1="9" x2="18" y2="12" />
        <path d="M6 9v3a6 6 0 006 6" />
      </svg>
    ),
    title: 'Git',
    desc: 'Control de versiones con isomorphic-git. Commits, diff, ramas y push a GitHub.',
    color: '#34d399',
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    title: 'Carpetas',
    desc: 'Organizacion manual con drag & drop, o automatica por tipo de nota y sprint.',
    color: '#fbbf24',
  },
]

// ─── Quick-start steps ────────────────────────────────────────────────────────

const QS_STEPS = [
  {
    n: '1',
    title: 'Crea tu primera nota',
    desc: 'Haz clic en el "+" del sidebar o presiona Ctrl+K y elige un tipo de nota.',
    tip: 'Ctrl + K',
    color: 'var(--accent-400)',
  },
  {
    n: '2',
    title: 'Abre un Sprint',
    desc: 'Ve a Sprints > Nuevo sprint. Define nombre, fechas y objetivo.',
    tip: 'Sidebar > Sprints',
    color: '#f472b6',
  },
  {
    n: '3',
    title: 'Registra tu Daily',
    desc: 'Cada dia en Daily documenta que hiciste, que haras y si algo te bloquea.',
    tip: 'Sidebar > Daily',
    color: '#60a5fa',
  },
  {
    n: '4',
    title: 'Versiona con Git',
    desc: 'Ve a Git, inicializa el repo y haz tu primer commit. Luego conecta GitHub.',
    tip: 'Sidebar > Git',
    color: '#34d399',
  },
]

// ─── Project option type ──────────────────────────────────────────────────────

type ProjectOption = 'local' | 'github-new' | 'github-import' | 'skip'

// ─── Dots ─────────────────────────────────────────────────────────────────────

function Dots({
  total,
  current,
  onGoto,
}: {
  total: number
  current: number
  onGoto: (i: number) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onGoto(i)}
          style={{
            width: i === current ? '20px' : '6px',
            height: '6px',
            borderRadius: '3px',
            background: i === current ? 'var(--accent-400)' : 'var(--border-2)',
            transition: 'all 0.2s ease',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        />
      ))}
    </div>
  )
}

// ─── Step labels ──────────────────────────────────────────────────────────────

const STEP_LABELS = [
  'Bienvenida',
  'Características',
  'Inicio rápido',
  'Apariencia',
  'Tu proyecto',
  'Listo',
]

// ─── Appearance presets ───────────────────────────────────────────────────────

const PRESETS: {
  label: string
  desc: string
  theme: UITheme
  accent: AccentColor
  accentHex: string
  font: EditorFont
}[] = [
  {
    label: 'Oscuro Pro',
    desc: 'Clásico para largas sesiones',
    theme: 'dark',
    accent: 'indigo',
    accentHex: '#4f46e5',
    font: 'fira-code',
  },
  {
    label: 'Violeta',
    desc: 'Creativo y dinámico',
    theme: 'dark',
    accent: 'violet',
    accentHex: '#7c3aed',
    font: 'jetbrains-mono',
  },
  {
    label: 'Esmeralda',
    desc: 'Fresco y enfocado',
    theme: 'dark',
    accent: 'emerald',
    accentHex: '#059669',
    font: 'cascadia',
  },
  {
    label: 'Cian Tech',
    desc: 'Limpio y técnico',
    theme: 'dark',
    accent: 'cyan',
    accentHex: '#0891b2',
    font: 'ibm-plex',
  },
  {
    label: 'Rosa',
    desc: 'Vibrante y llamativo',
    theme: 'dark',
    accent: 'pink',
    accentHex: '#db2777',
    font: 'inconsolata',
  },
  {
    label: 'Minimalista',
    desc: 'Sobrio y sin ruido visual',
    theme: 'dark',
    accent: 'slate',
    accentHex: '#475569',
    font: 'system-mono',
  },
  // ── Temas claros ──────────────────────────────────────────────────────────
  {
    label: 'Claro Pro',
    desc: 'Nítido y profesional',
    theme: 'light',
    accent: 'indigo',
    accentHex: '#4f46e5',
    font: 'fira-code',
  },
  {
    label: 'Aurora',
    desc: 'Natural y descansado',
    theme: 'light',
    accent: 'emerald',
    accentHex: '#059669',
    font: 'cascadia',
  },
  {
    label: 'Cielo',
    desc: 'Sereno y concentrado',
    theme: 'light',
    accent: 'cyan',
    accentHex: '#0891b2',
    font: 'ibm-plex',
  },
  {
    label: 'Ámbar',
    desc: 'Cálido y enérgico',
    theme: 'light',
    accent: 'orange',
    accentHex: '#ea580c',
    font: 'inconsolata',
  },
  {
    label: 'Coral',
    desc: 'Suave y elegante',
    theme: 'light',
    accent: 'rose',
    accentHex: '#e11d48',
    font: 'jetbrains-mono',
  },
  {
    label: 'Menta',
    desc: 'Tranquilo y ordenado',
    theme: 'light',
    accent: 'teal',
    accentHex: '#0d9488',
    font: 'source-code',
  },
]

const ACCENTS_OB: { id: AccentColor; hex: string; label: string }[] = [
  { id: 'indigo', hex: '#4f46e5', label: 'Indigo' },
  { id: 'violet', hex: '#7c3aed', label: 'Violeta' },
  { id: 'blue', hex: '#2563eb', label: 'Azul' },
  { id: 'emerald', hex: '#059669', label: 'Esmeralda' },
  { id: 'orange', hex: '#ea580c', label: 'Naranja' },
  { id: 'pink', hex: '#db2777', label: 'Rosa' },
  { id: 'cyan', hex: '#0891b2', label: 'Cian' },
  { id: 'rose', hex: '#e11d48', label: 'Rojo' },
  { id: 'teal', hex: '#0d9488', label: 'Teal' },
  { id: 'slate', hex: '#475569', label: 'Slate' },
]

const FONTS_OB: { id: EditorFont; label: string }[] = [
  { id: 'fira-code', label: 'Fira Code' },
  { id: 'jetbrains-mono', label: 'JetBrains Mono' },
  { id: 'cascadia', label: 'Cascadia Code' },
  { id: 'ibm-plex', label: 'IBM Plex Mono' },
  { id: 'inconsolata', label: 'Inconsolata' },
  { id: 'source-code', label: 'Source Code Pro' },
  { id: 'system-mono', label: 'Sistema' },
]

// ─── Spinner ─────────────────────────────────────────────────────────────────

const IcoSpinner = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    style={{ animation: 'ob-spin 0.7s linear infinite', flexShrink: 0 }}
  >
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
)

// ─── GitHub token eye icon ────────────────────────────────────────────────────

const IcoEye = ({ show }: { show: boolean }) =>
  show ? (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingModal({ onClose }: Props) {
  const dispatch = useAppDispatch()
  const settings = useAppSelector(s => s.settings)
  const gitInitialized = useAppSelector(s => s.git.initialized)

  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const TOTAL = 6

  // ── Appearance state ──────────────────────────────────────────────────────
  const [appearTab, setAppearTab] = useState<'presets' | 'custom'>('presets')
  const [selectedPreset, setSelectedPreset] = useState<number | null>(0)
  const currAccent = settings.accentColor ?? 'indigo'
  const currFont = settings.editorFont ?? 'fira-code'
  const currTheme = (settings.uiTheme ?? 'dark') as UITheme

  // ── Project setup state ───────────────────────────────────────────────────
  const [projectOption, setProjectOption] = useState<ProjectOption>('local')
  const [ghToken, setGhToken] = useState('')
  const [ghTokenVisible, setGhTokenVisible] = useState(false)
  const [ghRepo, setGhRepo] = useState('')
  const [ghBranch, setGhBranch] = useState('main')
  const [ghVerifiedUser, setGhVerifiedUser] = useState<string | null>(null)
  const [ghVerifying, setGhVerifying] = useState(false)
  const [ghTokenError, setGhTokenError] = useState<string | null>(null)
  const [projectLoading, setProjectLoading] = useState(false)
  const [projectError, setProjectError] = useState<string | null>(null)
  const [projectDone, setProjectDone] = useState(false)

  function go(n: number) {
    setDir(n > step ? 1 : -1)
    setStep(n)
  }

  // ── GitHub token verify ───────────────────────────────────────────────────
  async function handleVerifyToken() {
    if (!ghToken.trim()) return
    setGhVerifying(true)
    setGhTokenError(null)
    setGhVerifiedUser(null)
    const result = await verifyToken(ghToken.trim())
    if (result) {
      setGhVerifiedUser(result.login)
    } else {
      setGhTokenError('Token inválido o sin permisos (scope "repo" requerido).')
    }
    setGhVerifying(false)
  }

  // ── Execute project setup ─────────────────────────────────────────────────
  async function handleProjectSetup() {
    if (projectOption === 'skip') {
      go(step + 1)
      return
    }
    if (gitInitialized) {
      go(step + 1)
      return
    }

    setProjectLoading(true)
    setProjectError(null)

    const name = settings.userName || 'Agilens User'
    const email = settings.userEmail || 'dev@agilens.app'

    try {
      if (projectOption === 'local') {
        await dispatch(gitInit({ name, email })).unwrap()
        setProjectDone(true)
        go(step + 1)
      } else if (projectOption === 'github-new' || projectOption === 'github-import') {
        if (!ghVerifiedUser) {
          setProjectError('Primero verifica el token de GitHub.')
          setProjectLoading(false)
          return
        }
        if (!ghRepo.trim()) {
          setProjectError('Escribe el nombre del repositorio.')
          setProjectLoading(false)
          return
        }

        const config = {
          token: ghToken.trim(),
          owner: ghVerifiedUser,
          repo: ghRepo.trim(),
          branch: ghBranch.trim() || 'main',
        }

        if (projectOption === 'github-new') {
          const created = await createRepo(config, {
            private: true,
            description: 'Agilens — notas de desarrollo ágil',
          })
          if (!created) {
            setProjectError(
              'No se pudo crear el repositorio. Verifica que el nombre no exista ya o que el token tenga permisos de creación.'
            )
            setProjectLoading(false)
            return
          }
          dispatch(setGitHubConfig(config))
          await dispatch(gitInit({ name, email })).unwrap()
        } else {
          // github-import
          dispatch(setGitHubConfig(config))
          await dispatch(gitClone({ dir: GIT_DIR, config })).unwrap()
        }

        setProjectDone(true)
        go(step + 1)
      }
    } catch (err) {
      setProjectError(err instanceof Error ? err.message : 'Ocurrió un error, intenta de nuevo.')
    } finally {
      setProjectLoading(false)
    }
  }

  async function next() {
    if (step === 4) {
      await handleProjectSetup()
    } else if (step < TOTAL - 1) {
      go(step + 1)
    } else {
      onClose()
    }
  }

  function prev() {
    if (step > 0) go(step - 1)
  }

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -40 : 40 }),
  }

  // ── Project option card ───────────────────────────────────────────────────
  function OptionCard({
    id,
    icon,
    title,
    desc,
    color,
  }: {
    id: ProjectOption
    icon: React.ReactNode
    title: string
    desc: string
    color: string
  }) {
    const active = projectOption === id
    return (
      <button
        onClick={() => {
          setProjectOption(id)
          setProjectError(null)
        }}
        style={{
          textAlign: 'left',
          padding: '14px 16px',
          borderRadius: '10px',
          background: active ? `color-mix(in srgb, ${color} 10%, var(--bg-2))` : 'var(--bg-2)',
          border: `1.5px solid ${active ? color : 'var(--border-1)'}`,
          cursor: 'pointer',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
          transition: 'all 0.15s',
          width: '100%',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: active ? `color-mix(in srgb, ${color} 18%, var(--bg-3))` : 'var(--bg-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: active ? color : 'var(--text-3)',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
        >
          {icon}
        </div>
        <div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: active ? 'var(--text-0)' : 'var(--text-1)',
              fontFamily: 'var(--font-ui)',
              marginBottom: '3px',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-1)',
              lineHeight: 1.5,
              fontFamily: 'var(--font-ui)',
            }}
          >
            {desc}
          </div>
        </div>
        <div
          style={{
            marginLeft: 'auto',
            flexShrink: 0,
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            border: `2px solid ${active ? color : 'var(--border-2)'}`,
            background: active ? color : 'transparent',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {active && (
            <div
              style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'white' }}
            />
          )}
        </div>
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <style>{`@keyframes ob-spin { to { transform: rotate(360deg) } }`}</style>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: '820px',
          height: 'min(90vh, 680px)',
          background: 'var(--bg-1)',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: '18px 28px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-1)',
            flexShrink: 0,
          }}
        >
          <AgilensLogo size={26} showWordmark variant="color" />

          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            {STEP_LABELS.map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <button
                  onClick={() => go(i)}
                  style={{
                    padding: '2px 9px',
                    borderRadius: '99px',
                    border: 'none',
                    background: i === step ? 'var(--bg-3)' : 'transparent',
                    color: i === step ? 'var(--text-1)' : 'var(--text-3)',
                    fontSize: '11px',
                    fontFamily: 'var(--font-ui)',
                    fontWeight: i === step ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </button>
                {i < STEP_LABELS.length - 1 && (
                  <span style={{ color: 'var(--text-3)', fontSize: '10px', opacity: 0.4 }}>/</span>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="12"
              height="12"
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

        {/* ── Content ── */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <AnimatePresence custom={dir} mode="wait">
            <motion.div
              key={step}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                inset: 0,
                overflowY: 'auto',
                padding: '32px 40px 20px',
              }}
            >
              {/* STEP 0 — Bienvenida */}
              {step === 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '28px',
                    textAlign: 'center',
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05, duration: 0.3, ease: 'easeOut' }}
                  >
                    <AgilensLogo size={80} variant="color" />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.25 }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      alignItems: 'center',
                    }}
                  >
                    <h1
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        fontSize: '34px',
                        color: 'var(--text-0)',
                        margin: 0,
                        letterSpacing: '-0.04em',
                        lineHeight: 1.1,
                      }}
                    >
                      Bienvenido a <span style={{ color: 'var(--accent-400)' }}>Agilens</span>
                    </h1>
                    <p
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        color: 'var(--text-2)',
                        margin: 0,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Documenta · Sprinta · Entrega
                    </p>
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.18, duration: 0.25 }}
                    style={{
                      fontSize: '15px',
                      color: 'var(--text-1)',
                      lineHeight: 1.65,
                      margin: 0,
                      maxWidth: '500px',
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    Tu workspace personal de desarrollo ágil. Todo en un solo lugar, sin
                    suscripciones, sin la nube, sin distracciones.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25, duration: 0.25 }}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                    }}
                  >
                    {[
                      '100% local',
                      'Sin cuenta',
                      'Open source',
                      'Sin suscripción',
                      'Markdown nativo',
                      'Git integrado',
                    ].map(label => (
                      <span
                        key={label}
                        style={{
                          padding: '4px 12px',
                          borderRadius: '999px',
                          background: 'var(--bg-3)',
                          border: '1px solid var(--border-2)',
                          color: 'var(--text-1)',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {label}
                      </span>
                    ))}
                  </motion.div>
                </div>
              )}

              {/* STEP 1 — Características */}
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <h2
                      style={{
                        fontSize: '22px',
                        fontWeight: 700,
                        color: 'var(--text-0)',
                        margin: '0 0 6px',
                        fontFamily: 'var(--font-ui)',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      Todo lo que necesitas, nada mas.
                    </h2>
                    <p
                      style={{
                        fontSize: '14px',
                        color: 'var(--text-1)',
                        margin: 0,
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      Agilens cubre el ciclo completo de desarrollo agil en una sola app local.
                    </p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    {FEATURES.map((f, i) => (
                      <motion.div
                        key={f.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.2 }}
                        style={{
                          padding: '16px',
                          borderRadius: '10px',
                          background: 'var(--bg-2)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ color: f.color }}>{f.icon}</div>
                        <div>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: 'var(--text-0)',
                              marginBottom: '4px',
                              fontFamily: 'var(--font-ui)',
                            }}
                          >
                            {f.title}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-2)',
                              lineHeight: 1.5,
                              fontFamily: 'var(--font-ui)',
                            }}
                          >
                            {f.desc}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2 — Inicio rápido */}
              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <h2
                      style={{
                        fontSize: '22px',
                        fontWeight: 700,
                        color: 'var(--text-0)',
                        margin: '0 0 6px',
                        fontFamily: 'var(--font-ui)',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      Empieza en 4 pasos.
                    </h2>
                    <p
                      style={{
                        fontSize: '14px',
                        color: 'var(--text-1)',
                        margin: 0,
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      Flujo recomendado para el primer dia.
                    </p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {QS_STEPS.map((s, i) => (
                      <motion.div
                        key={s.n}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.2 }}
                        style={{
                          padding: '16px',
                          borderRadius: '10px',
                          background: 'var(--bg-2)',
                          display: 'flex',
                          gap: '14px',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '18px',
                            fontWeight: 700,
                            color: s.color,
                            flexShrink: 0,
                            lineHeight: 1,
                            paddingTop: '2px',
                            width: '20px',
                          }}
                        >
                          {s.n}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: 'var(--text-0)',
                              marginBottom: '4px',
                              fontFamily: 'var(--font-ui)',
                            }}
                          >
                            {s.title}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-2)',
                              lineHeight: 1.5,
                              fontFamily: 'var(--font-ui)',
                              marginBottom: '6px',
                            }}
                          >
                            {s.desc}
                          </div>
                          <code
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              color: s.color,
                              background: 'var(--bg-3)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {s.tip}
                          </code>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      background: 'var(--bg-2)',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center',
                    }}
                  >
                    <code
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--accent-400)',
                        background: 'var(--bg-3)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      Ctrl + K
                    </code>
                    <span
                      style={{
                        fontFamily: 'var(--font-ui)',
                        fontSize: '12px',
                        color: 'var(--text-2)',
                      }}
                    >
                      Abre el command palette: buscar notas, navegar, lanzar acciones.
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 3 — Apariencia */}
              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h2
                      style={{
                        fontSize: '22px',
                        fontWeight: 700,
                        color: 'var(--text-0)',
                        margin: '0 0 6px',
                        fontFamily: 'var(--font-ui)',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      Personaliza tu espacio.
                    </h2>
                    <p
                      style={{
                        fontSize: '14px',
                        color: 'var(--text-1)',
                        margin: 0,
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      Elige un preset o ajusta cada detalle a tu gusto. Puedes cambiarlo en
                      cualquier momento desde{' '}
                      <strong style={{ color: 'var(--text-0)' }}>Ajustes → Apariencia</strong>.
                    </p>
                  </div>

                  {/* Tab switcher */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '4px',
                      background: 'var(--bg-3)',
                      padding: '3px',
                      borderRadius: '8px',
                      width: 'fit-content',
                    }}
                  >
                    {(['presets', 'custom'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setAppearTab(t)}
                        style={{
                          padding: '5px 16px',
                          borderRadius: '6px',
                          border: 'none',
                          background: appearTab === t ? 'var(--bg-1)' : 'transparent',
                          color: appearTab === t ? 'var(--text-0)' : 'var(--text-3)',
                          fontSize: '12px',
                          fontWeight: appearTab === t ? 600 : 400,
                          fontFamily: 'var(--font-ui)',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          boxShadow: appearTab === t ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                        }}
                      >
                        {t === 'presets' ? '✦ Presets' : '⚙ Personalizado'}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {appearTab === 'presets' ? (
                      <motion.div
                        key="presets"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {(['dark', 'light'] as const).map(themeGroup => (
                            <div
                              key={themeGroup}
                              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                            >
                              {/* Section header */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  paddingBottom: '2px',
                                  borderBottom: '1px solid var(--border-1)',
                                }}
                              >
                                {themeGroup === 'dark' ? (
                                  <svg
                                    width="12"
                                    height="12"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    style={{ color: 'var(--text-1)', flexShrink: 0 }}
                                  >
                                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                                  </svg>
                                ) : (
                                  <svg
                                    width="12"
                                    height="12"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    style={{ color: 'var(--text-1)', flexShrink: 0 }}
                                  >
                                    <circle cx="12" cy="12" r="5" />
                                    <line x1="12" y1="1" x2="12" y2="3" />
                                    <line x1="12" y1="21" x2="12" y2="23" />
                                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                    <line x1="1" y1="12" x2="3" y2="12" />
                                    <line x1="21" y1="12" x2="23" y2="12" />
                                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                                  </svg>
                                )}
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: 'var(--text-1)',
                                    fontFamily: 'var(--font-ui)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.07em',
                                  }}
                                >
                                  {themeGroup === 'dark' ? 'Oscuro' : 'Claro'}
                                </span>
                              </div>
                              {/* Preset grid for this theme group */}
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr 1fr',
                                  gap: '10px',
                                }}
                              >
                                {PRESETS.filter(p => p.theme === themeGroup).map(p => {
                                  const i = PRESETS.indexOf(p)
                                  const active = selectedPreset === i
                                  return (
                                    <button
                                      key={p.label}
                                      onClick={() => {
                                        setSelectedPreset(i)
                                        dispatch(
                                          updateSettings({
                                            accentColor: p.accent,
                                            editorFont: p.font,
                                            uiTheme: p.theme,
                                          })
                                        )
                                      }}
                                      style={{
                                        textAlign: 'left',
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        background: active
                                          ? `color-mix(in srgb, ${p.accentHex} 10%, var(--bg-2))`
                                          : 'var(--bg-2)',
                                        border: `1.5px solid ${active ? p.accentHex : 'var(--border-1)'}`,

                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px',
                                        transition: 'all 0.15s',
                                      }}
                                    >
                                      {/* Color swatch row */}
                                      <div
                                        style={{
                                          display: 'flex',
                                          gap: '5px',
                                          alignItems: 'center',
                                        }}
                                      >
                                        <div
                                          style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '7px',
                                            background: p.accentHex,
                                            flexShrink: 0,
                                            boxShadow: `0 2px 8px ${p.accentHex}55`,
                                          }}
                                        />
                                        <div style={{ flex: 1 }}>
                                          <div
                                            style={{
                                              fontSize: '12px',
                                              fontWeight: 700,
                                              color: active ? 'var(--text-0)' : 'var(--text-1)',
                                              fontFamily: 'var(--font-ui)',
                                            }}
                                          >
                                            {p.label}
                                          </div>
                                          <div
                                            style={{
                                              fontSize: '11px',
                                              color: 'var(--text-2)',
                                              fontFamily: 'var(--font-ui)',
                                              marginTop: '1px',
                                            }}
                                          >
                                            {p.desc}
                                          </div>
                                        </div>
                                        {active && (
                                          <svg
                                            width="14"
                                            height="14"
                                            fill="none"
                                            stroke={p.accentHex}
                                            strokeWidth="2.5"
                                            viewBox="0 0 24 24"
                                          >
                                            <polyline
                                              points="20 6 9 17 4 12"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            />
                                          </svg>
                                        )}
                                      </div>
                                      {/* Font tag */}
                                      <code
                                        style={{
                                          fontFamily: 'var(--font-mono)',
                                          fontSize: '10px',
                                          color: active ? p.accentHex : 'var(--text-2)',
                                          background: 'var(--bg-3)',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          width: 'fit-content',
                                        }}
                                      >
                                        {FONTS_OB.find(f => f.id === p.font)?.label ?? p.font}
                                      </code>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="custom"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                          {/* Theme */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-2)',
                                fontFamily: 'var(--font-mono)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                              }}
                            >
                              Tema
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {(['dark', 'light', 'system'] as UITheme[]).map(t => {
                                const LABELS: Record<UITheme, string> = {
                                  dark: '🌙 Oscuro',
                                  light: '☀ Claro',
                                  system: '⬡ Sistema',
                                }
                                const active = currTheme === t
                                return (
                                  <button
                                    key={t}
                                    onClick={() => dispatch(updateSettings({ uiTheme: t }))}
                                    style={{
                                      flex: 1,
                                      padding: '8px 10px',
                                      borderRadius: '8px',
                                      border: `1.5px solid ${active ? 'var(--accent-400)' : 'var(--border-1)'}`,
                                      background: active
                                        ? 'color-mix(in srgb, var(--accent-500) 10%, var(--bg-2))'
                                        : 'var(--bg-2)',
                                      color: active ? 'var(--accent-400)' : 'var(--text-2)',
                                      fontSize: '12px',
                                      fontFamily: 'var(--font-ui)',
                                      fontWeight: active ? 600 : 400,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s',
                                    }}
                                  >
                                    {LABELS[t]}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          {/* Accent */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-2)',
                                fontFamily: 'var(--font-mono)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                              }}
                            >
                              Color de acento
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {ACCENTS_OB.map(a => {
                                const active = currAccent === a.id
                                return (
                                  <button
                                    key={a.id}
                                    title={a.label}
                                    onClick={() => {
                                      dispatch(updateSettings({ accentColor: a.id }))
                                      setSelectedPreset(null)
                                    }}
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '50%',
                                      background: a.hex,
                                      border: active
                                        ? `3px solid var(--text-0)`
                                        : '2px solid transparent',
                                      outline: active ? `2px solid ${a.hex}` : 'none',
                                      outlineOffset: '2px',
                                      cursor: 'pointer',
                                      transition: 'all 0.12s',
                                      boxShadow: active ? `0 0 10px ${a.hex}66` : 'none',
                                    }}
                                  />
                                )
                              })}
                            </div>
                          </div>

                          {/* Font */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-2)',
                                fontFamily: 'var(--font-mono)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                              }}
                            >
                              Fuente del editor
                            </div>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '6px',
                              }}
                            >
                              {FONTS_OB.map(f => {
                                const active = currFont === f.id
                                return (
                                  <button
                                    key={f.id}
                                    onClick={() => {
                                      dispatch(updateSettings({ editorFont: f.id }))
                                      setSelectedPreset(null)
                                    }}
                                    style={{
                                      padding: '7px 10px',
                                      borderRadius: '7px',
                                      border: `1.5px solid ${active ? 'var(--accent-400)' : 'var(--border-1)'}`,
                                      background: active
                                        ? 'color-mix(in srgb, var(--accent-500) 10%, var(--bg-2))'
                                        : 'var(--bg-2)',
                                      color: active ? 'var(--accent-400)' : 'var(--text-2)',
                                      fontSize: '11px',
                                      fontFamily: '"' + f.id + '", monospace',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                      fontWeight: active ? 600 : 400,
                                      transition: 'all 0.12s',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {f.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* STEP 4 — Tu proyecto */}
              {step === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h2
                      style={{
                        fontSize: '22px',
                        fontWeight: 700,
                        color: 'var(--text-0)',
                        margin: '0 0 6px',
                        fontFamily: 'var(--font-ui)',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      ¿Cómo quieres guardar tu trabajo?
                    </h2>
                    <p
                      style={{
                        fontSize: '13px',
                        color: 'var(--text-2)',
                        margin: 0,
                        fontFamily: 'var(--font-ui)',
                        lineHeight: 1.6,
                      }}
                    >
                      Elige cómo configurar el versionado. Puedes cambiar esto en cualquier momento
                      desde la sección <strong style={{ color: 'var(--text-1)' }}>Git</strong>.
                    </p>
                  </div>

                  {gitInitialized ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        padding: '20px',
                        borderRadius: '10px',
                        background: 'rgba(52,211,153,0.07)',
                        border: '1px solid rgba(52,211,153,0.25)',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'rgba(52,211,153,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          width="18"
                          height="18"
                          fill="none"
                          stroke="#34d399"
                          strokeWidth="2.5"
                          viewBox="0 0 24 24"
                        >
                          <polyline
                            points="20 6 9 17 4 12"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#34d399' }}>
                          Repositorio ya configurado
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                          Tu proyecto ya tiene un repositorio Git activo. Haz clic en Siguiente para
                          continuar.
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      {/* Option cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <OptionCard
                          id="local"
                          color="var(--accent-400)"
                          title="Proyecto local"
                          desc="Crea un repositorio Git en el navegador. Sin cuenta, sin internet. Tus notas siempre versionadas."
                          icon={
                            <svg
                              width="16"
                              height="16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              viewBox="0 0 24 24"
                            >
                              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                              <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                          }
                        />
                        <OptionCard
                          id="github-new"
                          color="#60a5fa"
                          title="Nuevo en GitHub"
                          desc="Crea un repo privado en tu cuenta de GitHub y sincroniza las notas automáticamente."
                          icon={
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                            </svg>
                          }
                        />
                        <OptionCard
                          id="github-import"
                          color="#a78bfa"
                          title="Importar de GitHub"
                          desc="Ya tienes un repo con notas en GitHub. Clónalo aquí y continúa desde donde lo dejaste."
                          icon={
                            <svg
                              width="16"
                              height="16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              viewBox="0 0 24 24"
                            >
                              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          }
                        />
                        <OptionCard
                          id="skip"
                          color="#6b7280"
                          title="Continuar sin proyecto"
                          desc="Usa Agilens sin versionado por ahora. Puedes configurar Git más adelante en cualquier momento."
                          icon={
                            <svg
                              width="16"
                              height="16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              viewBox="0 0 24 24"
                            >
                              <line x1="5" y1="12" x2="19" y2="12" />
                              <polyline points="12 5 19 12 12 19" />
                            </svg>
                          }
                        />
                      </div>

                      {/* GitHub inline form */}
                      <AnimatePresence mode="wait">
                        {(projectOption === 'github-new' || projectOption === 'github-import') && (
                          <motion.div
                            key="gh-form"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div
                              style={{
                                padding: '16px',
                                borderRadius: '10px',
                                background: 'var(--bg-2)',
                                border: '1px solid var(--border-1)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                              }}
                            >
                              {/* Token field */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label
                                  style={{
                                    fontSize: '11px',
                                    color: 'var(--text-3)',
                                    fontFamily: 'var(--font-mono)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                  }}
                                >
                                  Personal Access Token
                                </label>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <div style={{ position: 'relative', flex: 1 }}>
                                    <input
                                      type={ghTokenVisible ? 'text' : 'password'}
                                      value={ghToken}
                                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                      autoComplete="off"
                                      onChange={e => {
                                        setGhToken(e.target.value)
                                        setGhTokenError(null)
                                        setGhVerifiedUser(null)
                                      }}
                                      onKeyDown={e => e.key === 'Enter' && void handleVerifyToken()}
                                      className="input-base"
                                      style={{
                                        width: '100%',
                                        paddingRight: '36px',
                                        fontSize: '12px',
                                        boxSizing: 'border-box',
                                        borderColor: ghTokenError
                                          ? 'rgba(239,68,68,0.5)'
                                          : undefined,
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setGhTokenVisible(v => !v)}
                                      style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-3)',
                                        padding: '2px',
                                        lineHeight: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <IcoEye show={ghTokenVisible} />
                                    </button>
                                  </div>
                                  <button
                                    className="btn btn-ghost"
                                    onClick={() => void handleVerifyToken()}
                                    disabled={!ghToken.trim() || ghVerifying}
                                    style={{
                                      fontSize: '12px',
                                      flexShrink: 0,
                                      display: 'flex',
                                      gap: '5px',
                                      alignItems: 'center',
                                    }}
                                  >
                                    {ghVerifying ? (
                                      <>
                                        <IcoSpinner /> Verificando…
                                      </>
                                    ) : ghVerifiedUser ? (
                                      '✓ Verificado'
                                    ) : (
                                      'Verificar'
                                    )}
                                  </button>
                                </div>
                                {ghTokenError && (
                                  <div style={{ fontSize: '11px', color: '#f87171' }}>
                                    {ghTokenError}
                                  </div>
                                )}
                                {ghVerifiedUser && (
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      color: '#34d399',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                    }}
                                  >
                                    <img
                                      src={`https://github.com/${ghVerifiedUser}.png?size=16`}
                                      alt=""
                                      width="16"
                                      height="16"
                                      style={{ borderRadius: '50%' }}
                                      onError={e => {
                                        ;(e.target as HTMLImageElement).style.display = 'none'
                                      }}
                                    />
                                    @{ghVerifiedUser}
                                  </div>
                                )}
                              </div>

                              {/* Repo + branch */}
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <div
                                  style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '5px',
                                  }}
                                >
                                  <label
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--text-2)',
                                      fontFamily: 'var(--font-mono)',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.06em',
                                    }}
                                  >
                                    {projectOption === 'github-import'
                                      ? 'Repositorio existente'
                                      : 'Nombre del nuevo repo'}
                                  </label>
                                  <input
                                    type="text"
                                    value={ghRepo}
                                    placeholder={
                                      projectOption === 'github-import'
                                        ? 'agilens-notes'
                                        : 'mis-notas-agilens'
                                    }
                                    onChange={e => setGhRepo(e.target.value)}
                                    className="input-base"
                                    style={{ fontSize: '12px' }}
                                  />
                                </div>
                                <div
                                  style={{
                                    width: '100px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '5px',
                                  }}
                                >
                                  <label
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--text-2)',
                                      fontFamily: 'var(--font-mono)',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.06em',
                                    }}
                                  >
                                    Rama
                                  </label>
                                  <input
                                    type="text"
                                    value={ghBranch}
                                    placeholder="main"
                                    onChange={e => setGhBranch(e.target.value)}
                                    className="input-base"
                                    style={{ fontSize: '12px' }}
                                  />
                                </div>
                              </div>

                              <div
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--text-2)',
                                  lineHeight: 1.5,
                                }}
                              >
                                Necesitas un{' '}
                                <a
                                  href="https://github.com/settings/tokens/new?scopes=repo"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: 'var(--accent-400)' }}
                                >
                                  Personal Access Token
                                </a>{' '}
                                con scope{' '}
                                <code
                                  style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '10px',
                                    background: 'var(--bg-3)',
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                  }}
                                >
                                  repo
                                </code>
                                .
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Error */}
                      {projectError && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            fontSize: '12px',
                            color: '#f87171',
                            lineHeight: 1.5,
                          }}
                        >
                          {projectError}
                        </motion.div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* STEP 5 — Listo */}
              {step === 5 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '32px',
                    textAlign: 'center',
                    paddingTop: '12px',
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05, duration: 0.3, ease: 'easeOut' }}
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      background: 'var(--bg-3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg
                      width="32"
                      height="32"
                      fill="none"
                      stroke="var(--accent-400)"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <polyline
                        points="20 6 9 17 4 12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.22 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                  >
                    <h2
                      style={{
                        fontSize: '28px',
                        fontWeight: 700,
                        color: 'var(--text-0)',
                        margin: 0,
                        fontFamily: 'var(--font-ui)',
                        letterSpacing: '-0.03em',
                      }}
                    >
                      {projectDone ? '¡Proyecto configurado!' : 'Todo listo.'}
                    </h2>
                    <p
                      style={{
                        fontSize: '14px',
                        color: 'var(--text-2)',
                        margin: 0,
                        lineHeight: 1.6,
                        fontFamily: 'var(--font-ui)',
                        maxWidth: '400px',
                      }}
                    >
                      Puedes revisar este tutorial en cualquier momento desde{' '}
                      <strong style={{ color: 'var(--accent-400)' }}>Ajustes → Acerca de</strong>.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.22 }}
                    style={{
                      padding: '20px 28px',
                      borderRadius: '12px',
                      background: 'var(--bg-2)',
                      width: '100%',
                      maxWidth: '440px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-2)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        marginBottom: '14px',
                      }}
                    >
                      Atajos esenciales
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                      {[
                        { key: 'Ctrl + K', desc: 'Command palette' },
                        { key: 'Ctrl + N', desc: 'Nueva nota rapida' },
                        { key: 'Ctrl + \\', desc: 'Abrir / cerrar sidebar' },
                        { key: 'Ctrl + P', desc: 'Alternar preview / editor' },
                      ].map(({ key, desc }) => (
                        <div
                          key={key}
                          style={{ display: 'flex', alignItems: 'center', gap: '14px' }}
                        >
                          <code
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              color: 'var(--accent-400)',
                              background: 'var(--bg-3)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            {key}
                          </code>
                          <span
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-2)',
                              fontFamily: 'var(--font-ui)',
                              textAlign: 'left',
                            }}
                          >
                            {desc}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: '14px 28px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border-1)',
            flexShrink: 0,
          }}
        >
          <Dots total={TOTAL} current={step} onGoto={go} />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {step > 0 ? (
              <button
                onClick={prev}
                disabled={projectLoading}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--bg-3)',
                  color: 'var(--text-2)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                }}
              >
                Anterior
              </button>
            ) : (
              <button
                onClick={onClose}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-3)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                }}
              >
                Omitir
              </button>
            )}
            <button
              onClick={() => void next()}
              disabled={projectLoading}
              style={{
                padding: '8px 22px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--accent-500)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: 'var(--font-ui)',
                cursor: projectLoading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                opacity: projectLoading ? 0.75 : 1,
              }}
            >
              {projectLoading && <IcoSpinner />}
              {step === 4 && projectLoading
                ? 'Configurando…'
                : step === 4 && projectOption === 'skip'
                  ? 'Saltar'
                  : step === 3
                    ? selectedPreset !== null || appearTab === 'custom'
                      ? 'Aplicar y continuar'
                      : 'Continuar'
                    : step < TOTAL - 1
                      ? 'Siguiente'
                      : 'Empezar'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
