/**
 * OnboardingModal — Experiencia de bienvenida en el primer inicio.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AgilensLogo from '@/components/layout/AgilensLogo'

interface Props {
  onClose: () => void
}

// ─── Feature data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
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
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
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
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
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
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
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
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
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
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
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

// ─── Dots ─────────────────────────────────────────────────────────────────────

function Dots({ total, current, onGoto }: { total: number; current: number; onGoto: (i: number) => void }) {
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

const STEP_LABELS = ['Bienvenida', 'Caracteristicas', 'Inicio rapido', 'Listo']

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingModal({ onClose }: Props) {
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const TOTAL = 4

  function go(n: number) {
    setDir(n > step ? 1 : -1)
    setStep(n)
  }

  function next() {
    if (step < TOTAL - 1) go(step + 1)
    else onClose()
  }

  function prev() {
    if (step > 0) go(step - 1)
  }

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -40 : 40 }),
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
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: '820px',
          height: 'min(86vh, 640px)',
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
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
              style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '32px 40px 20px' }}
            >

              {/* STEP 0 */}
              {step === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px', textAlign: 'center' }}>
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
                    style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}
                  >
                    <h1 style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '34px', color: 'var(--text-0)', margin: 0, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                      Bienvenido a <span style={{ color: 'var(--accent-400)' }}>Agilens</span>
                    </h1>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', margin: 0, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                      Documenta · Sprinta · Entrega
                    </p>
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.18, duration: 0.25 }}
                    style={{ fontSize: '15px', color: 'var(--text-2)', lineHeight: 1.65, margin: 0, maxWidth: '500px', fontFamily: 'var(--font-ui)' }}
                  >
                    Tu workspace personal de desarrollo agil. Todo en un solo lugar, sin suscripciones, sin la nube, sin distracciones.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25, duration: 0.25 }}
                    style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}
                  >
                    {['100% local', 'Sin cuenta', 'Open source', 'Sin suscripcion', 'Markdown nativo', 'Git integrado'].map(label => (
                      <span key={label} style={{ padding: '4px 12px', borderRadius: '999px', background: 'var(--bg-3)', color: 'var(--text-2)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                        {label}
                      </span>
                    ))}
                  </motion.div>
                </div>
              )}

              {/* STEP 1 */}
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-0)', margin: '0 0 6px', fontFamily: 'var(--font-ui)', letterSpacing: '-0.02em' }}>
                      Todo lo que necesitas, nada mas.
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0, fontFamily: 'var(--font-ui)' }}>
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
                        style={{ padding: '16px', borderRadius: '10px', background: 'var(--bg-2)', display: 'flex', flexDirection: 'column', gap: '10px' }}
                      >
                        <div style={{ color: f.color }}>{f.icon}</div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)', marginBottom: '4px', fontFamily: 'var(--font-ui)' }}>{f.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.5, fontFamily: 'var(--font-ui)' }}>{f.desc}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-0)', margin: '0 0 6px', fontFamily: 'var(--font-ui)', letterSpacing: '-0.02em' }}>
                      Empieza en 4 pasos.
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0, fontFamily: 'var(--font-ui)' }}>
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
                        style={{ padding: '16px', borderRadius: '10px', background: 'var(--bg-2)', display: 'flex', gap: '14px' }}
                      >
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color: s.color, flexShrink: 0, lineHeight: 1, paddingTop: '2px', width: '20px' }}>
                          {s.n}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)', marginBottom: '4px', fontFamily: 'var(--font-ui)' }}>{s.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.5, fontFamily: 'var(--font-ui)', marginBottom: '6px' }}>{s.desc}</div>
                          <code style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: s.color, background: 'var(--bg-3)', padding: '1px 6px', borderRadius: '4px' }}>{s.tip}</code>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--bg-2)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--accent-400)', background: 'var(--bg-3)', padding: '2px 8px', borderRadius: '4px' }}>Ctrl + K</code>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', color: 'var(--text-3)' }}>
                      Abre el command palette: buscar notas, navegar, lanzar acciones.
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', textAlign: 'center', paddingTop: '12px' }}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05, duration: 0.3, ease: 'easeOut' }}
                    style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg width="32" height="32" fill="none" stroke="var(--accent-400)" strokeWidth="2.5" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.22 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                  >
                    <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-0)', margin: 0, fontFamily: 'var(--font-ui)', letterSpacing: '-0.03em' }}>
                      Todo listo.
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0, lineHeight: 1.6, fontFamily: 'var(--font-ui)', maxWidth: '400px' }}>
                      Puedes revisar este tutorial en cualquier momento desde{' '}
                      <strong style={{ color: 'var(--accent-400)' }}>Ajustes &rarr; Acerca de</strong>.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.22 }}
                    style={{ padding: '20px 28px', borderRadius: '12px', background: 'var(--bg-2)', width: '100%', maxWidth: '440px' }}
                  >
                    <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>
                      Atajos esenciales
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                      {[
                        { key: 'Ctrl + K', desc: 'Command palette' },
                        { key: 'Ctrl + N', desc: 'Nueva nota rapida' },
                        { key: 'Ctrl + \\', desc: 'Abrir / cerrar sidebar' },
                        { key: 'Ctrl + P', desc: 'Alternar preview / editor' },
                      ].map(({ key, desc }) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <code style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-400)', background: 'var(--bg-3)', padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}>{key}</code>
                          <span style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--font-ui)', textAlign: 'left' }}>{desc}</span>
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
                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: 'var(--bg-3)', color: 'var(--text-2)', fontSize: '13px', fontFamily: 'var(--font-ui)', cursor: 'pointer' }}
              >
                Anterior
              </button>
            ) : (
              <button
                onClick={onClose}
                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--text-3)', fontSize: '13px', fontFamily: 'var(--font-ui)', cursor: 'pointer' }}
              >
                Omitir
              </button>
            )}
            <button
              onClick={next}
              style={{ padding: '8px 22px', borderRadius: '8px', border: 'none', background: 'var(--accent-500)', color: '#fff', fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-ui)', cursor: 'pointer' }}
            >
              {step < TOTAL - 1 ? 'Siguiente' : 'Empezar'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
