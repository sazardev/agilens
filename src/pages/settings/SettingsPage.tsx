import { useAppDispatch, useAppSelector } from '@/store'
import { updateSettings } from '@/store/slices/settingsSlice'
import { useState } from 'react'
import type { AccentColor, EditorFont, UIDensity, UITheme, MarkdownPreviewFont } from '@/types'
import AgilensLogo from '@/components/layout/AgilensLogo'
import OnboardingModal from '@/components/onboarding/OnboardingModal'
import GitHubConnect from '@/components/github/GitHubConnect'

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
  const [showOnboarding, setShowOnboarding] = useState(false)

  const set = (patch: Parameters<typeof updateSettings>[0]) => dispatch(updateSettings(patch))

  const lh = s.lineHeight ?? 1.7

  return (
    <>
      <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg-1)' }}>
        <div
          style={{
            maxWidth: '640px',
            margin: '0 auto',
            padding: '28px 24px 60px',
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
                onClick={() => setShowOnboarding(true)}
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
                Ver tutorial de inicio
              </button>
            </div>
          </Section>
        </div>
      </div>
      {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
    </>
  )
}

declare const __APP_VERSION__: string
