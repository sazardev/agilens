/**
 * AgilensLogo — komponente del logo/marca de la app.
 * Se usa en el Sidebar, MainLayout y splash de onboarding.
 */

interface Props {
  /** Tamaño del ícono en px */
  size?: number
  /** Mostrar el wordmark "Agilens" junto al ícono */
  showWordmark?: boolean
  /** Mostrar el lema debajo del wordmark */
  showTagline?: boolean
  /** Variante de color: 'color' (default) | 'white' | 'mono' */
  variant?: 'color' | 'white' | 'mono'
}

export default function AgilensLogo({
  size = 28,
  showWordmark = false,
  showTagline = false,
  variant = 'color',
}: Props) {
  const isWhite = variant === 'white'
  const isMono = variant === 'mono'

  const bgFill = isWhite ? 'rgba(255,255,255,0.15)' : isMono ? 'transparent' : 'var(--accent-500)'
  const ringStroke = isWhite
    ? 'rgba(255,255,255,0.5)'
    : isMono
      ? 'currentColor'
      : 'var(--accent-300)'
  const letterStroke = isWhite ? 'white' : isMono ? 'currentColor' : 'white'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: showWordmark ? '9px' : 0,
        flexShrink: 0,
      }}
    >
      {/* ─── SVG Icon ──────────────────────────────────────────────────── */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
        aria-label="Agilens logo"
      >
        {/* Background rounded square */}
        <rect width="32" height="32" rx="7" fill={bgFill} />

        {/* Sprint ring arc */}
        <path
          d="M16 5 A11 11 0 1 1 25 24"
          stroke={ringStroke}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.65"
        />
        {/* Arrow on ring end */}
        <polygon points="27.5,21.5 22.5,27 21,22" fill={ringStroke} opacity="0.75" />

        {/* A lettermark */}
        <path
          d="M10 24 L16 10 L22 24"
          stroke={letterStroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Crossbar with arrow tip */}
        <line
          x1="12.5"
          y1="19.5"
          x2="18.5"
          y2="19.5"
          stroke={letterStroke}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <polygon points="21,19.5 18,17.5 18,21.5" fill={letterStroke} />
      </svg>

      {/* ─── Wordmark ──────────────────────────────────────────────────── */}
      {showWordmark && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: `${Math.round(size * 0.5)}px`,
              color: isWhite ? '#fff' : isMono ? 'currentColor' : 'var(--accent-400)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            Agilens
          </span>
          {showTagline && (
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: `${Math.round(size * 0.3)}px`,
                color: isWhite ? 'rgba(255,255,255,0.55)' : 'var(--text-3)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              Documenta · Sprinta · Entrega
            </span>
          )}
        </div>
      )}
    </div>
  )
}
