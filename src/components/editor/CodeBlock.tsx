/**
 * Syntax-highlighted code block powered by Shiki.
 * Renders inline (no WASM loading delay after first use thanks to singleton).
 */
import { useEffect, useRef, useState } from 'react'
import { getSingletonHighlighter } from 'shiki'
import type { BundledLanguage } from 'shiki'

// ─── Shiki theme IDs per UI mode ─────────────────────────────────────────────
const THEME_DARK = 'github-dark'
const THEME_LIGHT = 'github-light'

// Pre-warm: start loading the highlighter as soon as this module is imported
const warmup = getSingletonHighlighter({ themes: [THEME_DARK, THEME_LIGHT], langs: [] })

// ─── Supported languages (lazy-loaded per block) ──────────────────────────────
const KNOWN_LANGS: BundledLanguage[] = [
  'typescript',
  'javascript',
  'tsx',
  'jsx',
  'python',
  'rust',
  'go',
  'java',
  'c',
  'cpp',
  'csharp',
  'bash',
  'sh',
  'zsh',
  'powershell',
  'css',
  'scss',
  'html',
  'xml',
  'json',
  'jsonc',
  'yaml',
  'toml',
  'sql',
  'graphql',
  'markdown',
  'mdx',
  'diff',
  'dockerfile',
]

function normalizeLang(raw: string | undefined): BundledLanguage | 'text' {
  if (!raw) return 'text'
  const l = raw.toLowerCase().trim()
  // Common aliases
  const MAP: Record<string, BundledLanguage> = {
    ts: 'typescript',
    js: 'javascript',
    py: 'python',
    rb: 'ruby',
    shell: 'bash',
    sh: 'bash',
    zsh: 'bash',
    yml: 'yaml',
  }
  if (MAP[l]) return MAP[l]
  if ((KNOWN_LANGS as string[]).includes(l)) return l as BundledLanguage
  return 'text'
}

// ─── Copy button ─────────────────────────────────────────────────────────────
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copiado' : 'Copiar código'}
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        padding: '4px 8px',
        borderRadius: 'var(--radius-md)',
        background: copied ? 'var(--accent-600)' : 'rgba(128,128,160,0.12)',
        border: '1px solid',
        borderColor: copied ? 'var(--accent-500)' : 'rgba(128,128,160,0.18)',
        color: copied ? '#fff' : 'var(--text-2)',
        fontSize: '11px',
        fontFamily: 'var(--font-ui)',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        opacity: 0,
        pointerEvents: 'all',
      }}
      className="copy-btn"
    >
      {copied ? '✓ Copiado' : 'Copiar'}
    </button>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
interface Props {
  code: string
  className?: string
  isDark: boolean
  showCopy: boolean
  highlight: boolean
}

export default function CodeBlock({ code, className, isDark, showCopy, highlight }: Props) {
  const lang = normalizeLang(className?.replace('language-', ''))
  const [html, setHtml] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const codeRef = useRef<string>(code)
  codeRef.current = code

  useEffect(() => {
    if (!highlight) {
      setHtml(null)
      return
    }
    let cancelled = false

    warmup.then(async hl => {
      if (cancelled) return

      // Load language if not already loaded
      if (lang !== 'text') {
        try {
          await hl.loadLanguage(lang)
        } catch {
          /* use text fallback */
        }
      }

      if (cancelled) return

      try {
        const rendered = hl.codeToHtml(codeRef.current.trimEnd(), {
          lang: lang === 'text' ? 'text' : lang,
          theme: isDark ? THEME_DARK : THEME_LIGHT,
          transformers: [
            {
              pre(node) {
                // Remove inline styles that would conflict with our CSS
                node.properties.style = ''
                node.properties['data-lang'] = lang
              },
              code(node) {
                node.properties.style = ''
              },
            },
          ],
        })
        if (!cancelled) setHtml(rendered)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })

    return () => {
      cancelled = true
    }
    // Re-run when code, lang, or theme changes
  }, [code, lang, isDark, highlight]) // eslint-disable-line react-hooks/exhaustive-deps

  const codeText = code.trimEnd()
  const container: React.CSSProperties = {
    position: 'relative',
    margin: '1.25em 0',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-2)',
    overflow: 'hidden',
    background: isDark ? '#0d1117' : '#f6f8fa',
    fontSize: '0.875em',
  }

  // ── Language label ────────────────────────────────────────────────────────
  const langLabel =
    lang !== 'text' ? (
      <span
        style={{
          position: 'absolute',
          top: '10px',
          left: '14px',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: isDark ? 'rgba(180,180,200,0.45)' : 'rgba(90,90,120,0.5)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {lang}
      </span>
    ) : null

  // Fallback: plain pre/code if shiki hasn't rendered yet or is disabled
  const fallback = (
    <pre
      style={{
        margin: 0,
        padding: lang !== 'text' ? '34px 14px 14px' : '14px',
        overflowX: 'auto',
        color: isDark ? '#e0e0e4' : '#1c1c2a',
        fontFamily: 'var(--font-mono)',
        lineHeight: 1.65,
        background: 'transparent',
      }}
    >
      <code>{codeText}</code>
    </pre>
  )

  return (
    <div style={container} className="code-block-wrapper">
      {langLabel}
      {showCopy && <CopyButton code={codeText} />}
      {highlight && html && !failed ? (
        <div
          dangerouslySetInnerHTML={{ __html: html }}
          style={{ lineHeight: 1.65 }}
          className={`shiki-block ${isDark ? 'shiki-dark' : 'shiki-light'}`}
        />
      ) : (
        fallback
      )}
    </div>
  )
}
