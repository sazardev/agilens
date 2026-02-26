import { useAppDispatch, useAppSelector } from '@/store'
import { updateSettings } from '@/store/slices/settingsSlice'
import { useState, useRef } from 'react'
import { useMobile } from '@/hooks/useMobile'
import type { AccentColor, EditorFont, UIDensity, UITheme, MarkdownPreviewFont } from '@/types'
import AgilensLogo from '@/components/layout/AgilensLogo'
import LandingPage from '@/pages/landing/LandingPage'
import GitHubConnect from '@/components/github/GitHubConnect'
import { hashPassword, clearActivity, touchActivity } from '@/components/security/LockScreen'
import { setNotes } from '@/store/slices/notesSlice'
import { setEntries, setSprints } from '@/store/slices/dailySlice'
import { setImpediments } from '@/store/slices/impedimentsSlice'
import { clearAllFolders } from '@/store/slices/foldersSlice'
import { reset as resetGit } from '@/store/slices/gitSlice'

// ─── Data ─────────────────────────────────────────────────────────────────────

const ACCENTS: { id: AccentColor; hex: string; label: string }[] = [
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

const FONTS: { id: EditorFont; label: string; stack: string }[] = [
  { id: 'fira-code', label: 'Fira Code', stack: '"Fira Code", monospace' },
  { id: 'jetbrains-mono', label: 'JetBrains Mono', stack: '"JetBrains Mono", monospace' },
  { id: 'cascadia', label: 'Cascadia Code', stack: '"Cascadia Code", monospace' },
  { id: 'ibm-plex', label: 'IBM Plex Mono', stack: '"IBM Plex Mono", monospace' },
  { id: 'inconsolata', label: 'Inconsolata', stack: '"Inconsolata", monospace' },
  { id: 'source-code', label: 'Source Code Pro', stack: '"Source Code Pro", monospace' },
  { id: 'system-mono', label: 'Sistema (mono)', stack: 'ui-monospace, monospace' },
]

const DENSITIES: { id: UIDensity; label: string; desc: string }[] = [
  { id: 'compact', label: 'Compacto', desc: 'Mayor densidad' },
  { id: 'default', label: 'Normal', desc: 'Equilibrado' },
  { id: 'relaxed', label: 'Holgado', desc: 'Más espacio' },
]

const PROSE_FONTS: { id: MarkdownPreviewFont; label: string; preview: string }[] = [
  { id: 'sans', label: 'Sin serifa (UI)', preview: 'Texto de ejemplo en sans-serif' },
  { id: 'serif', label: 'Serifa', preview: 'Texto de ejemplo en fuente serifa' },
  { id: 'mono', label: 'Monoespaciada', preview: 'Texto de ejemplo en monoespaciado' },
]

const PREVIEW_CODE = 'const fn = (x: number) => x * 2'

// ─── Sub-components ──────────────────────────────────────────────────────────

function SettRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
      <div>
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-0)' }}>{label}</span>
        {hint && (
          <p style={{ fontSize: '11px', color: 'var(--text-2)', margin: '2px 0 0' }}>{hint}</p>
        )}
      </div>
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div
        style={{
          borderBottom: '1px solid var(--border-1)',
          paddingBottom: '8px',
          marginBottom: '18px',
        }}
      >
        <h2
          style={{
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            color: 'var(--text-2)',
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>
        {children}
      </div>
    </section>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: '40px',
        height: '22px',
        borderRadius: '11px',
        border: 'none',
        cursor: 'pointer',
        background: checked ? 'var(--accent-600)' : 'var(--border-3)',
        position: 'relative' as const,
        flexShrink: 0,
        transition: 'background var(--transition-fast)',
      }}
    >
      <span
        style={{
          position: 'absolute' as const,
          top: '3px',
          left: checked ? '21px' : '3px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: '#fff',
          transition: 'left var(--transition-fast)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const dispatch = useAppDispatch()
  const s = useAppSelector(st => st.settings)
  const [showLanding, setShowLanding] = useState(false)

  // ── Lock / security state ──────────────────────────────────────────────────
  const [pwdStep, setPwdStep] = useState<'idle' | 'set' | 'change' | 'remove'>('idle')
  const [pwdNew, setPwdNew] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [pwdCurrent, setPwdCurrent] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdSaved, setPwdSaved] = useState(false)

  // ── Data management state ─────────────────────────────────────────────────
  const [confirmReset, setConfirmReset] = useState<string | null>(null)
  const [resetDone, setResetDone] = useState<string | null>(null)
  const confirmInputRef = useRef<HTMLInputElement>(null)

  // ── Delete auth (password gate before destructive actions) ────────────────
  const [deleteAuthStep, setDeleteAuthStep] = useState<string | null>(null)
  const [deleteAuthPwd, setDeleteAuthPwd] = useState('')
  const [deleteAuthError, setDeleteAuthError] = useState('')

  const set = (patch: Parameters<typeof updateSettings>[0]) => dispatch(updateSettings(patch))

  const lh = s.lineHeight ?? 1.7
  const isMobile = useMobile()

  return (
    <>
      <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg-1)' }}>
        <div
          style={{
            maxWidth: '640px',
            margin: '0 auto',
            padding: isMobile ? '16px 16px 80px' : '28px 24px 60px',
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '32px',
          }}
        >
          {/*  Header */}
          <div>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--text-0)',
                margin: '0 0 4px',
                letterSpacing: '-0.02em',
              }}
            >
              Ajustes
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0 }}>
              Personalización de Agilens
            </p>
          </div>

          {/* Apariencia */}
          <Section title="Apariencia">
            {/* Tema claro/oscuro */}
            <SettRow label="Tema de interfaz" hint="Alterna entre modo claro y oscuro">
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['dark', 'light'] as UITheme[]).map(t => (
                  <button
                    key={t}
                    onClick={() => set({ uiTheme: t })}
                    style={{
                      flex: 1,
                      padding: '12px 10px',
                      borderRadius: 'var(--radius-lg)',
                      border: `1px solid ${s.uiTheme === t ? 'var(--accent-600)' : 'var(--border-2)'}`,
                      background: s.uiTheme === t ? 'var(--accent-glow)' : 'var(--bg-2)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      display: 'flex',
                      flexDirection: 'column' as const,
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {/* Mini preview */}
                    <div
                      style={{
                        width: '100%',
                        height: '36px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        background: t === 'dark' ? '#0f0f12' : '#f8f8fc',
                        border: '1px solid',
                        borderColor: t === 'dark' ? '#21212a' : '#dcdce8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 7px',
                      }}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '100%',
                          background: t === 'dark' ? '#16161a' : '#ececf2',
                          borderRadius: '2px',
                        }}
                      />
                      <div
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column' as const,
                          gap: '3px',
                        }}
                      >
                        <div
                          style={{
                            height: '4px',
                            borderRadius: '2px',
                            background: t === 'dark' ? '#2c2c36' : '#d0d0de',
                            width: '70%',
                          }}
                        />
                        <div
                          style={{
                            height: '4px',
                            borderRadius: '2px',
                            background: t === 'dark' ? '#21212a' : '#dcdce8',
                            width: '50%',
                          }}
                        />
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: s.uiTheme === t ? 'var(--accent-400)' : 'var(--text-1)',
                      }}
                    >
                      {t === 'dark' ? 'Oscuro' : 'Claro'}
                    </span>
                  </button>
                ))}
              </div>
            </SettRow>

            {/* Color de acento */}
            <SettRow label="Color de acento">
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px' }}>
                {ACCENTS.map(a => (
                  <button
                    key={a.id}
                    title={a.label}
                    onClick={() => set({ accentColor: a.id })}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: 'var(--radius-sm)',
                      background: a.hex,
                      border: '2px solid transparent',
                      cursor: 'pointer',
                      boxShadow:
                        s.accentColor === a.id
                          ? `0 0 0 2px var(--bg-1), 0 0 0 4px ${a.hex}`
                          : 'none',
                      transition: 'box-shadow var(--transition-fast)',
                      flexShrink: 0,
                    }}
                  />
                ))}
                {/* Custom color */}
                <div style={{ position: 'relative' as const }}>
                  <button
                    title="Color personalizado"
                    onClick={() => set({ accentColor: 'custom' })}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: 'var(--radius-sm)',
                      background: `conic-gradient(red, yellow, lime, cyan, blue, magenta, red)`,
                      border: '2px solid transparent',
                      cursor: 'pointer',
                      boxShadow:
                        s.accentColor === 'custom'
                          ? `0 0 0 2px var(--bg-1), 0 0 0 4px ${s.customAccentHex ?? '#6366f1'}`
                          : 'none',
                      transition: 'box-shadow var(--transition-fast)',
                    }}
                  />
                </div>
              </div>
              {/* Custom hex input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="color"
                  value={s.customAccentHex ?? '#4f46e5'}
                  onChange={e => {
                    set({ accentColor: 'custom', customAccentHex: e.target.value })
                  }}
                  style={{
                    width: '36px',
                    height: '28px',
                    padding: '2px',
                    border: '1px solid var(--border-2)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-2)',
                    cursor: 'pointer',
                  }}
                />
                <input
                  type="text"
                  value={s.customAccentHex ?? '#4f46e5'}
                  maxLength={7}
                  placeholder="#4f46e5"
                  onChange={e => {
                    const v = e.target.value
                    if (/^#[0-9a-f]{6}$/i.test(v))
                      set({ accentColor: 'custom', customAccentHex: v })
                    else set({ customAccentHex: v })
                  }}
                  style={{
                    width: '90px',
                    padding: '5px 9px',
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border-2)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-0)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                  Color personalizado
                </span>
              </div>
            </SettRow>

            {/* Densidad */}
            <SettRow label="Densidad de la UI">
              <div style={{ display: 'flex', gap: '8px' }}>
                {DENSITIES.map(d => (
                  <button
                    key={d.id}
                    onClick={() => set({ uiDensity: d.id })}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      borderRadius: 'var(--radius-lg)',
                      border: `1px solid ${s.uiDensity === d.id ? 'var(--accent-600)' : 'var(--border-2)'}`,
                      background: s.uiDensity === d.id ? 'var(--accent-glow)' : 'var(--bg-2)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      textAlign: 'center' as const,
                    }}
                  >
                    <p
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: s.uiDensity === d.id ? 'var(--accent-400)' : 'var(--text-0)',
                        margin: '0 0 3px',
                      }}
                    >
                      {d.label}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-2)', margin: 0 }}>{d.desc}</p>
                  </button>
                ))}
              </div>
            </SettRow>
          </Section>

          {/* Editor */}
          <Section title="Editor">
            {/* Fuente del editor */}
            <SettRow label="Fuente del editor">
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
                {FONTS.map(f => (
                  <label
                    key={f.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: s.editorFont === f.id ? 'var(--accent-glow)' : 'transparent',
                      border: `1px solid ${s.editorFont === f.id ? 'var(--accent-600)' : 'transparent'}`,
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <input
                      type="radio"
                      name="editorFont"
                      checked={s.editorFont === f.id}
                      onChange={() => set({ editorFont: f.id })}
                      style={{ accentColor: 'var(--accent-500)', flexShrink: 0 }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '12px',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: s.editorFont === f.id ? 'var(--accent-400)' : 'var(--text-0)',
                          flexShrink: 0,
                        }}
                      >
                        {f.label}
                      </span>
                      <code
                        style={{
                          fontFamily: f.stack,
                          fontSize: '12px',
                          color: 'var(--text-2)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap' as const,
                        }}
                      >
                        {PREVIEW_CODE}
                      </code>
                    </div>
                  </label>
                ))}
              </div>
            </SettRow>

            {/* Tamaño fuente */}
            <SettRow label={`Tamaño de fuente — ${s.editorFontSize}px`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="range"
                  min={11}
                  max={22}
                  value={s.editorFontSize}
                  onChange={e => set({ editorFontSize: Number(e.target.value) })}
                  style={{ flex: 1, accentColor: 'var(--accent-500)', cursor: 'pointer' }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: 'var(--accent-400)',
                    width: '34px',
                    textAlign: 'right' as const,
                  }}
                >
                  {s.editorFontSize}px
                </span>
              </div>
            </SettRow>

            {/* Interlineado */}
            <SettRow label={`Interlineado — ${lh.toFixed(1)}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="range"
                  min={1.2}
                  max={2.4}
                  step={0.1}
                  value={lh}
                  onChange={e => set({ lineHeight: Number(e.target.value) })}
                  style={{ flex: 1, accentColor: 'var(--accent-500)', cursor: 'pointer' }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: 'var(--accent-400)',
                    width: '34px',
                    textAlign: 'right' as const,
                  }}
                >
                  {lh.toFixed(1)}
                </span>
              </div>
            </SettRow>

            {/* Word wrap */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-0)' }}>
                  Ajuste de línea
                </span>
                <p style={{ fontSize: '11px', color: 'var(--text-2)', margin: '2px 0 0' }}>
                  Romper líneas largas automáticamente
                </p>
              </div>
              <Toggle checked={s.wordWrap ?? true} onChange={v => set({ wordWrap: v })} />
            </div>
          </Section>

          {/* Markdown */}
          <Section title="Vista previa Markdown">
            {/* Fuente del prose */}
            <SettRow
              label="Fuente de la vista previa"
              hint="Tipografía usada en el artículo renderizado"
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                {PROSE_FONTS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => set({ markdownPreviewFont: f.id })}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      borderRadius: 'var(--radius-lg)',
                      textAlign: 'center' as const,
                      border: `1px solid ${s.markdownPreviewFont === f.id ? 'var(--accent-600)' : 'var(--border-2)'}`,
                      background:
                        s.markdownPreviewFont === f.id ? 'var(--accent-glow)' : 'var(--bg-2)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <p
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color:
                          s.markdownPreviewFont === f.id ? 'var(--accent-400)' : 'var(--text-0)',
                        margin: '0 0 3px',
                      }}
                    >
                      {f.label}
                    </p>
                    <p
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-2)',
                        margin: 0,
                        fontFamily:
                          f.id === 'sans'
                            ? 'var(--font-ui)'
                            : f.id === 'serif'
                              ? 'Georgia, serif'
                              : 'var(--font-mono)',
                      }}
                    >
                      {f.preview}
                    </p>
                  </button>
                ))}
              </div>
            </SettRow>

            {/* Ancho máximo del prose */}
            <SettRow
              label={`Ancho máximo del contenido — ${s.markdownProseWidth ?? 760}px`}
              hint="Restric d´ ancho para legibilidad óptima"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="range"
                  min={560}
                  max={1000}
                  step={20}
                  value={s.markdownProseWidth ?? 760}
                  onChange={e => set({ markdownProseWidth: Number(e.target.value) })}
                  style={{ flex: 1, accentColor: 'var(--accent-500)', cursor: 'pointer' }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: 'var(--accent-400)',
                    width: '48px',
                    textAlign: 'right' as const,
                  }}
                >
                  {s.markdownProseWidth ?? 760}px
                </span>
              </div>
            </SettRow>

            {/* Toggles */}
            {(
              [
                {
                  key: 'markdownShowReadingTime' as const,
                  label: 'Tiempo de lectura',
                  hint: 'Muestra estimado de lectura y conteo de palabras',
                },
                {
                  key: 'markdownHeadingAnchors' as const,
                  label: 'Anclas en encabezados',
                  hint: 'Botón # visible al pasar el cursor sobre headings',
                },
                {
                  key: 'markdownCopyCode' as const,
                  label: 'Botón copiar código',
                  hint: 'Muestra un botón "Copiar" en bloques de código',
                },
                {
                  key: 'markdownCodeHighlight' as const,
                  label: 'Resaltado de sintaxis',
                  hint: 'Colorea el código con Shiki (github-dark / github-light)',
                },
                {
                  key: 'markdownSpellcheck' as const,
                  label: 'Corrector ortográfico',
                  hint: 'Activa el spellcheck del navegador en el editor',
                },
              ] as const
            ).map(({ key, label, hint }) => (
              <div
                key={key}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-0)' }}>
                    {label}
                  </span>
                  <p style={{ fontSize: '11px', color: 'var(--text-2)', margin: '2px 0 0' }}>
                    {hint}
                  </p>
                </div>
                <Toggle checked={(s[key] as boolean) ?? true} onChange={v => set({ [key]: v })} />
              </div>
            ))}

            {/* Tab size */}
            <SettRow
              label="Tamaño de tabulación en editor"
              hint="Caracteres por nivel de indentación"
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                {([2, 4] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => set({ markdownTabSize: n })}
                    style={{
                      padding: '7px 20px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${(s.markdownTabSize ?? 2) === n ? 'var(--accent-600)' : 'var(--border-2)'}`,
                      background:
                        (s.markdownTabSize ?? 2) === n ? 'var(--accent-glow)' : 'var(--bg-2)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: (s.markdownTabSize ?? 2) === n ? 'var(--accent-400)' : 'var(--text-0)',
                    }}
                  >
                    {n} espacios
                  </button>
                ))}
              </div>
            </SettRow>
          </Section>

          {/* Identidad Git */}
          <Section title="Identidad Git">
            {(
              [
                { label: 'Nombre', key: 'userName', type: 'text', ph: 'Tu Nombre' },
                { label: 'Email', key: 'userEmail', type: 'email', ph: 'tu@email.com' },
              ] as const
            ).map(({ label, key, type, ph }) => (
              <SettRow key={key} label={label}>
                <input
                  type={type}
                  placeholder={ph}
                  value={(s[key as keyof typeof s] as string) ?? ''}
                  onChange={e => dispatch(updateSettings({ [key]: e.target.value }))}
                  className="input-base"
                />
              </SettRow>
            ))}
          </Section>

          {/* GitHub */}
          <Section title="GitHub">
            <GitHubConnect />
          </Section>

          {/* ─── SEGURIDAD ────────────────────────────────────────────────────────── */}
          <Section title="Seguridad">
            {/* Bloqueo — toggle principal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-0)' }}>
                  Bloqueo con contraseña
                </span>
                <p style={{ fontSize: '11px', color: 'var(--text-2)', margin: '2px 0 0' }}>
                  Muestra una pantalla de bloqueo al abrir o al expirar la sesión
                </p>
              </div>
              <Toggle
                checked={s.lockEnabled}
                onChange={async v => {
                  if (v && !s.lockPasswordHash) {
                    setPwdStep('set')
                  } else if (!v) {
                    set({ lockEnabled: false })
                    clearActivity()
                  } else {
                    set({ lockEnabled: true })
                    touchActivity()
                  }
                }}
              />
            </div>

            {/* Acciones rápidas cuando está habilitado */}
            {s.lockEnabled && pwdStep === 'idle' && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setPwdStep('change')
                    setPwdNew('')
                    setPwdConfirm('')
                    setPwdCurrent('')
                    setPwdError('')
                  }}
                  style={{
                    padding: '6px 13px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-2)',
                    background: 'var(--bg-3)',
                    color: 'var(--text-1)',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Cambiar contraseña
                </button>
                <button
                  onClick={() => {
                    setPwdStep('remove')
                    setPwdCurrent('')
                    setPwdError('')
                  }}
                  style={{
                    padding: '6px 13px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    background: 'rgba(239,68,68,0.08)',
                    color: '#ef4444',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Quitar contraseña
                </button>
                <button
                  onClick={() => {
                    set({ lockEnabled: true })
                    clearActivity()
                    window.location.reload()
                  }}
                  style={{
                    padding: '6px 13px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-2)',
                    background: 'var(--bg-3)',
                    color: 'var(--text-2)',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Bloquear ahora
                </button>
              </div>
            )}

            {/* ── Formulario: establecer contraseña ── */}
            {pwdStep === 'set' && (
              <div
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border-1)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)' }}>
                  Establecer contraseña
                </div>
                <input
                  type="password"
                  placeholder="Nueva contraseña"
                  autoFocus
                  value={pwdNew}
                  onChange={e => {
                    setPwdNew(e.target.value)
                    setPwdError('')
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-2)',
                    background: 'var(--bg-3)',
                    color: 'var(--text-0)',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box' as const,
                  }}
                />
                <input
                  type="password"
                  placeholder="Confirmar contraseña"
                  value={pwdConfirm}
                  onChange={e => {
                    setPwdConfirm(e.target.value)
                    setPwdError('')
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-2)',
                    background: 'var(--bg-3)',
                    color: 'var(--text-0)',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box' as const,
                  }}
                />
                {pwdError && <div style={{ fontSize: '11px', color: '#ef4444' }}>{pwdError}</div>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={async () => {
                      if (!pwdNew.trim()) return setPwdError('La contraseña no puede estar vacía')
                      if (pwdNew !== pwdConfirm) return setPwdError('Las contraseñas no coinciden')
                      if (pwdNew.length < 4) return setPwdError('Mínimo 4 caracteres')
                      const hash = await hashPassword(pwdNew)
                      set({ lockEnabled: true, lockPasswordHash: hash })
                      touchActivity()
                      setPwdStep('idle')
                      setPwdNew('')
                      setPwdConfirm('')
                      setPwdSaved(true)
                      setTimeout(() => setPwdSaved(false), 2500)
                    }}
                    style={{
                      padding: '7px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: 'var(--accent-600)',
                      color: '#fff',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setPwdStep('idle')
                      setPwdNew('')
                      setPwdConfirm('')
                    }}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-2)',
                      background: 'transparent',
                      color: 'var(--text-1)',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    Cancelar
                  </button>
                </div>
                {pwdSaved && (
                  <div style={{ fontSize: '11px', color: '#34d399' }}>✓ Contraseña establecida</div>
                )}
              </div>
            )}

            {/* ── Formulario: cambiar contraseña ── */}
            {pwdStep === 'change' && (
              <div
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border-1)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)' }}>
                  Cambiar contraseña
                </div>
                {[
                  { ph: 'Contraseña actual', val: pwdCurrent, set: setPwdCurrent },
                  { ph: 'Nueva contraseña', val: pwdNew, set: setPwdNew },
                  { ph: 'Confirmar nueva contraseña', val: pwdConfirm, set: setPwdConfirm },
                ].map(({ ph, val, set: setter }, i) => (
                  <input
                    key={ph}
                    type="password"
                    placeholder={ph}
                    autoFocus={i === 0}
                    value={val}
                    onChange={e => {
                      setter(e.target.value)
                      setPwdError('')
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-2)',
                      background: 'var(--bg-3)',
                      color: 'var(--text-0)',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box' as const,
                    }}
                  />
                ))}
                {pwdError && <div style={{ fontSize: '11px', color: '#ef4444' }}>{pwdError}</div>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={async () => {
                      if (s.lockPasswordHash) {
                        const currentHash = await hashPassword(pwdCurrent)
                        if (currentHash !== s.lockPasswordHash)
                          return setPwdError('Contraseña actual incorrecta')
                      }
                      if (!pwdNew.trim())
                        return setPwdError('La nueva contraseña no puede estar vacía')
                      if (pwdNew !== pwdConfirm) return setPwdError('Las contraseñas no coinciden')
                      if (pwdNew.length < 4) return setPwdError('Mínimo 4 caracteres')
                      const hash = await hashPassword(pwdNew)
                      set({ lockPasswordHash: hash })
                      setPwdStep('idle')
                      setPwdNew('')
                      setPwdConfirm('')
                      setPwdCurrent('')
                      setPwdSaved(true)
                      setTimeout(() => setPwdSaved(false), 2500)
                    }}
                    style={{
                      padding: '7px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: 'var(--accent-600)',
                      color: '#fff',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setPwdStep('idle')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-2)',
                      background: 'transparent',
                      color: 'var(--text-1)',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    Cancelar
                  </button>
                </div>
                {pwdSaved && (
                  <div style={{ fontSize: '11px', color: '#34d399' }}>✓ Contraseña actualizada</div>
                )}
              </div>
            )}

            {/* ── Formulario: quitar contraseña ── */}
            {pwdStep === 'remove' && (
              <div
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)' }}>
                  Quitar contraseña
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-2)', margin: 0 }}>
                  Confirma tu contraseña actual para desactivar el bloqueo.
                </p>
                <input
                  type="password"
                  placeholder="Contraseña actual"
                  autoFocus
                  value={pwdCurrent}
                  onChange={e => {
                    setPwdCurrent(e.target.value)
                    setPwdError('')
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${pwdError ? '#ef4444' : 'var(--border-2)'}`,
                    background: 'var(--bg-3)',
                    color: 'var(--text-0)',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box' as const,
                  }}
                />
                {pwdError && <div style={{ fontSize: '11px', color: '#ef4444' }}>{pwdError}</div>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={async () => {
                      const hash = await hashPassword(pwdCurrent)
                      if (hash !== s.lockPasswordHash) return setPwdError('Contraseña incorrecta')
                      set({ lockEnabled: false, lockPasswordHash: '' })
                      clearActivity()
                      setPwdStep('idle')
                      setPwdCurrent('')
                    }}
                    style={{
                      padding: '7px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      background: 'rgba(239,68,68,0.12)',
                      color: '#ef4444',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Eliminar contraseña
                  </button>
                  <button
                    onClick={() => setPwdStep('idle')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-2)',
                      background: 'transparent',
                      color: 'var(--text-1)',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* ── Tiempo de inactividad ── */}
            {s.lockEnabled && (
              <SettRow
                label="Tiempo de inactividad"
                hint="Bloquea automáticamente tras X minutos sin actividad. «Nunca» desactiva el auto-bloqueo."
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                    gap: '6px',
                  }}
                >
                  {[
                    { v: 0, label: 'Nunca' },
                    { v: 5, label: '5 min' },
                    { v: 15, label: '15 min' },
                    { v: 30, label: '30 min' },
                    { v: 60, label: '1 hora' },
                    { v: 240, label: '4 h' },
                    { v: 480, label: '8 h' },
                  ].map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => set({ lockTimeoutMinutes: v })}
                      style={{
                        padding: '7px 4px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${(s.lockTimeoutMinutes ?? 0) === v ? 'var(--accent-600)' : 'var(--border-2)'}`,
                        background:
                          (s.lockTimeoutMinutes ?? 0) === v ? 'var(--accent-glow)' : 'var(--bg-2)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 500,
                        fontFamily: 'inherit',
                        color:
                          (s.lockTimeoutMinutes ?? 0) === v ? 'var(--accent-400)' : 'var(--text-1)',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </SettRow>
            )}

            {/* ── Bloquear al perder el foco ── */}
            {s.lockEnabled && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-0)' }}>
                    Bloquear al minimizar / cambiar pestaña
                  </span>
                  <p style={{ fontSize: '11px', color: 'var(--text-2)', margin: '2px 0 0' }}>
                    La app se bloquea en cuanto pierde el foco de la ventana
                  </p>
                </div>
                <Toggle checked={s.lockOnHide ?? false} onChange={v => set({ lockOnHide: v })} />
              </div>
            )}
          </Section>

          {/* ─── GESTIÓN DE DATOS ───────────────────────────────────────────────── */}
          <Section title="Gestión de datos">
            {/* Descripción */}
            <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6 }}>
              Elimina datos por categoría o reinicia la app por completo.{' '}
              <strong style={{ color: 'var(--text-1)' }}>Estas acciones son irreversibles</strong>
              {s.lockEnabled && s.lockPasswordHash
                ? ' y requieren tu contraseña de seguridad.'
                : ' y requieren confirmación.'}
            </div>

            {/* Filas por categoría */}
            {(
              [
                {
                  key: 'notes',
                  label: 'Notas',
                  desc: 'Todas las notas y archivos adjuntos',
                  color: '#f97316',
                  action: () => dispatch(setNotes([])),
                },
                {
                  key: 'daily',
                  label: 'Daily entries',
                  desc: 'Todo el historial de dailies',
                  color: '#60a5fa',
                  action: () => dispatch(setEntries([])),
                },
                {
                  key: 'sprints',
                  label: 'Sprints',
                  desc: 'Todos los sprints del daily',
                  color: '#f472b6',
                  action: () => dispatch(setSprints([])),
                },
                {
                  key: 'impediments',
                  label: 'Bloqueos',
                  desc: 'Todos los impedimentos registrados',
                  color: '#ef4444',
                  action: () => dispatch(setImpediments([])),
                },
                {
                  key: 'folders',
                  label: 'Carpetas',
                  desc: 'Toda la estructura de carpetas',
                  color: '#a78bfa',
                  action: () => dispatch(clearAllFolders()),
                },
                {
                  key: 'git',
                  label: 'Repositorio Git',
                  desc: 'Elimina el historial de commits, ramas y archivos versionados localmente',
                  color: '#34d399',
                  action: () => {
                    dispatch(resetGit())
                    void indexedDB.deleteDatabase('agilens')
                    setTimeout(() => window.location.reload(), 350)
                  },
                },
              ] as const
            ).map(({ key, label, desc, color, action }) => (
              <div
                key={key}
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border-1)',
                  borderLeft: `3px solid ${color}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {/* Cabecera de fila */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-0)' }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{desc}</div>
                  </div>
                  {/* Botón eliminar — sólo visible en estado idle */}
                  {deleteAuthStep !== key && confirmReset !== key && (
                    <>
                      {resetDone === key ? (
                        <span style={{ fontSize: '11px', color: '#34d399', flexShrink: 0 }}>
                          ✓ Eliminado
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            if (s.lockEnabled && s.lockPasswordHash) {
                              setDeleteAuthStep(key)
                              setDeleteAuthPwd('')
                              setDeleteAuthError('')
                            } else {
                              setConfirmReset(key)
                            }
                          }}
                          style={{
                            padding: '5px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            background: 'rgba(239,68,68,0.07)',
                            color: '#ef4444',
                            fontSize: '11px',
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            fontWeight: 500,
                            flexShrink: 0,
                          }}
                        >
                          Eliminar
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Verificación de contraseña */}
                {deleteAuthStep === key && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--border-1)',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                      Ingresa tu contraseña para continuar:
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="password"
                        placeholder="Contraseña"
                        autoFocus
                        value={deleteAuthPwd}
                        onChange={e => {
                          setDeleteAuthPwd(e.target.value)
                          setDeleteAuthError('')
                        }}
                        onKeyDown={async e => {
                          if (e.key !== 'Enter') return
                          const h = await hashPassword(deleteAuthPwd)
                          if (h !== s.lockPasswordHash)
                            return setDeleteAuthError('Contraseña incorrecta')
                          setDeleteAuthStep(null)
                          setConfirmReset(key)
                          setDeleteAuthPwd('')
                        }}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid ${deleteAuthError ? '#ef4444' : 'var(--border-2)'}`,
                          background: 'var(--bg-3)',
                          color: 'var(--text-0)',
                          fontSize: '12px',
                          fontFamily: 'inherit',
                          outline: 'none',
                          minWidth: 0,
                        }}
                      />
                      <button
                        onClick={async () => {
                          const h = await hashPassword(deleteAuthPwd)
                          if (h !== s.lockPasswordHash)
                            return setDeleteAuthError('Contraseña incorrecta')
                          setDeleteAuthStep(null)
                          setConfirmReset(key)
                          setDeleteAuthPwd('')
                        }}
                        style={{
                          padding: '7px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: 'none',
                          background: 'var(--accent-600)',
                          color: '#fff',
                          fontSize: '12px',
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        Verificar
                      </button>
                      <button
                        onClick={() => {
                          setDeleteAuthStep(null)
                          setDeleteAuthPwd('')
                          setDeleteAuthError('')
                        }}
                        style={{
                          padding: '7px 10px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-2)',
                          background: 'transparent',
                          color: 'var(--text-2)',
                          fontSize: '12px',
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    {deleteAuthError && (
                      <div style={{ fontSize: '11px', color: '#ef4444' }}>{deleteAuthError}</div>
                    )}
                  </div>
                )}

                {/* Confirmación final */}
                {confirmReset === key && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--border-1)',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: 'var(--text-1)', flex: 1 }}>
                      ¿Eliminar todo? Esta acción no se puede deshacer.
                    </span>
                    <button
                      onClick={() => {
                        action()
                        setConfirmReset(null)
                        setResetDone(key)
                        setTimeout(() => setResetDone(null), 2500)
                      }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: '#ef4444',
                        color: '#fff',
                        fontSize: '11px',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setConfirmReset(null)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-2)',
                        background: 'transparent',
                        color: 'var(--text-2)',
                        fontSize: '11px',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* ── Restablecer todo ── */}
            <div
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444' }}>
                  Restablecer todo
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '3px' }}>
                  Elimina absolutamente todo: notas, dailies, sprints, impedimentos, carpetas,
                  repositorio git, ajustes y tutorial de inicio. La app volverá al estado de primera
                  visita como si fuera una instalación nueva.
                </div>
              </div>

              {/* Verificación de contraseña para reset nuclear */}
              {deleteAuthStep === 'all-auth' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-1)' }}>
                    Ingresa tu contraseña para continuar:
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="password"
                      placeholder="Contraseña"
                      autoFocus
                      value={deleteAuthPwd}
                      onChange={e => {
                        setDeleteAuthPwd(e.target.value)
                        setDeleteAuthError('')
                      }}
                      onKeyDown={async e => {
                        if (e.key !== 'Enter') return
                        const h = await hashPassword(deleteAuthPwd)
                        if (h !== s.lockPasswordHash)
                          return setDeleteAuthError('Contraseña incorrecta')
                        setDeleteAuthStep(null)
                        setConfirmReset('all')
                        setDeleteAuthPwd('')
                        setTimeout(() => confirmInputRef.current?.focus(), 100)
                      }}
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${deleteAuthError ? '#ef4444' : 'var(--border-2)'}`,
                        background: 'var(--bg-2)',
                        color: 'var(--text-0)',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        outline: 'none',
                        minWidth: 0,
                      }}
                    />
                    <button
                      onClick={async () => {
                        const h = await hashPassword(deleteAuthPwd)
                        if (h !== s.lockPasswordHash)
                          return setDeleteAuthError('Contraseña incorrecta')
                        setDeleteAuthStep(null)
                        setConfirmReset('all')
                        setDeleteAuthPwd('')
                        setTimeout(() => confirmInputRef.current?.focus(), 100)
                      }}
                      style={{
                        padding: '7px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: 'var(--accent-600)',
                        color: '#fff',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      Verificar
                    </button>
                    <button
                      onClick={() => {
                        setDeleteAuthStep(null)
                        setDeleteAuthPwd('')
                        setDeleteAuthError('')
                      }}
                      style={{
                        padding: '7px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-2)',
                        background: 'transparent',
                        color: 'var(--text-2)',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  {deleteAuthError && (
                    <div style={{ fontSize: '11px', color: '#ef4444' }}>{deleteAuthError}</div>
                  )}
                </div>
              )}

              {confirmReset === 'all' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-1)' }}>
                    Escribe <strong>RESTABLECER</strong> para confirmar:
                  </div>
                  <input
                    ref={confirmInputRef}
                    placeholder="RESTABLECER"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(239,68,68,0.35)',
                      background: 'var(--bg-2)',
                      color: 'var(--text-0)',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box' as const,
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && confirmInputRef.current?.value === 'RESTABLECER') {
                        dispatch(setNotes([]))
                        dispatch(setEntries([]))
                        dispatch(setSprints([]))
                        dispatch(setImpediments([]))
                        dispatch(clearAllFolders())
                        dispatch(resetGit())
                        set({ lockEnabled: false, lockPasswordHash: '' })
                        clearActivity()
                        localStorage.removeItem('agilens_onboarded')
                        localStorage.removeItem('agilens_state')
                        void indexedDB.deleteDatabase('agilens')
                        void indexedDB.deleteDatabase('agilens_attachments')
                        setConfirmReset(null)
                        setTimeout(() => window.location.reload(), 350)
                      }
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      style={{
                        padding: '7px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: '#ef4444',
                        color: '#fff',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                      onClick={() => {
                        if (confirmInputRef.current?.value !== 'RESTABLECER') return
                        dispatch(setNotes([]))
                        dispatch(setEntries([]))
                        dispatch(setSprints([]))
                        dispatch(setImpediments([]))
                        dispatch(clearAllFolders())
                        dispatch(resetGit())
                        set({ lockEnabled: false, lockPasswordHash: '' })
                        clearActivity()
                        localStorage.removeItem('agilens_onboarded')
                        localStorage.removeItem('agilens_state')
                        void indexedDB.deleteDatabase('agilens')
                        void indexedDB.deleteDatabase('agilens_attachments')
                        setConfirmReset(null)
                        setTimeout(() => window.location.reload(), 350)
                      }}
                    >
                      Restablecer todo
                    </button>
                    <button
                      onClick={() => setConfirmReset(null)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-2)',
                        background: 'transparent',
                        color: 'var(--text-1)',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                deleteAuthStep !== 'all-auth' && (
                  <button
                    style={{
                      alignSelf: 'flex-start',
                      padding: '7px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(239,68,68,0.35)',
                      background: 'rgba(239,68,68,0.14)',
                      color: '#ef4444',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                    onClick={() => {
                      if (s.lockEnabled && s.lockPasswordHash) {
                        setDeleteAuthStep('all-auth')
                        setDeleteAuthPwd('')
                        setDeleteAuthError('')
                      } else {
                        setConfirmReset('all')
                        setTimeout(() => confirmInputRef.current?.focus(), 100)
                      }
                    }}
                  >
                    Restablecer app
                  </button>
                )
              )}
            </div>
          </Section>

          {/* About */}
          <Section title="Acerca de">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              {/* Brand block */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border-1)',
                }}
              >
                <AgilensLogo size={48} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: '16px',
                      color: 'var(--accent-400)',
                      letterSpacing: '-0.03em',
                      marginBottom: '3px',
                    }}
                  >
                    Agilens
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-3)',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginBottom: '6px',
                    }}
                  >
                    Documenta · Sprinta · Entrega
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-2)',
                      fontFamily: 'var(--font-ui)',
                      lineHeight: 1.5,
                    }}
                  >
                    Workspace personal de desarrollo ágil: notas, sprints, dailies, impedimentos y
                    Git integrado.
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-3)',
                    background: 'var(--bg-3)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    flexShrink: 0,
                  }}
                >
                  v{__APP_VERSION__}
                </span>
              </div>

              {/* Badges */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  '100% local',
                  'Sin cuenta',
                  'Open source',
                  'Sin suscripción',
                  'Markdown nativo',
                ].map(p => (
                  <span
                    key={p}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '999px',
                      background: 'var(--accent-glow)',
                      border: '1px solid var(--accent-700)',
                      color: 'var(--accent-400)',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>

              {/* Relaunch tutorial button */}
              <button
                onClick={() => setShowLanding(true)}
                style={{
                  alignSelf: 'flex-start',
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-2)',
                  background: 'transparent',
                  color: 'var(--text-1)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Ver presentación del producto
              </button>
            </div>
          </Section>
        </div>
      </div>
      {showLanding && (
        <LandingPage onEnter={() => setShowLanding(false)} onClose={() => setShowLanding(false)} />
      )}
    </>
  )
}

declare const __APP_VERSION__: string
