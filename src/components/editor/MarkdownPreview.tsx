import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import rehypeKatex from 'rehype-katex'
import mermaid from 'mermaid'
import 'katex/dist/katex.min.css'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/store'
import CodeBlock from './CodeBlock'
import type { Components } from 'react-markdown'
import type { ExtraProps } from 'react-markdown'
import type { Note, NoteAttachment } from '@/types'

// ─── Mermaid diagram block ────────────────────────────────────────────────────
// Bump this key whenever mermaid config changes to force re-initialization
const MERMAID_CONFIG_KEY = 'v3'
let _mermaidTheme: string | null = null
function ensureMermaid(isDark: boolean) {
  const theme = `${isDark ? 'dark' : 'default'}-${MERMAID_CONFIG_KEY}`
  if (_mermaidTheme === theme) return
  _mermaidTheme = theme
  const baseTheme = isDark ? 'dark' : 'default'
  mermaid.initialize({
    startOnLoad: false,
    theme: baseTheme,
    // htmlLabels MUST be false inside flowchart to fix "Could not find a
    // suitable point for the given distance" with diamond {} nodes in dagre
    flowchart: { htmlLabels: false, curve: 'basis' },
    sequence: { useMaxWidth: false },
    themeVariables: isDark
      ? { background: 'transparent', primaryColor: '#7c3aed', primaryTextColor: '#e2e8f0' }
      : { background: 'transparent' },
    securityLevel: 'loose',
    fontFamily: 'system-ui, sans-serif',
  })
}

let _mermaidCounter = 0

// Debounce delay: diagram only re-renders after the user stops typing for this long
const MERMAID_DEBOUNCE_MS = 600

function MermaidBlock({ code, isDark }: { code: string; isDark: boolean }) {
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')
  // Debounced code — only updates after user pauses typing
  const [debouncedCode, setDebouncedCode] = useState(code)
  const renderIdRef = useRef(`mermaid-tmp-${++_mermaidCounter}`)

  // Debounce: update debouncedCode after MERMAID_DEBOUNCE_MS of inactivity
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCode(code), MERMAID_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [code])

  useEffect(() => {
    let cancelled = false
    ensureMermaid(isDark)

    // Each render call needs a unique ID — reuse causes mermaid to find stale elements
    const renderId = `mermaid-tmp-${++_mermaidCounter}`
    renderIdRef.current = renderId

    document.getElementById(renderId)?.remove()

    void mermaid
      .render(renderId, debouncedCode)
      .then(({ svg: rendered }) => {
        if (cancelled) return
        // Strip mermaid's hardcoded background rect so theme shows through
        const clean = rendered
          .replace(/(<rect[^>]*class="background"[^>]*>)/g, '')
          .replace(/background-color:[^;;"']*(;|")/g, '')
        setSvg(clean)
        setError('')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        document.getElementById(renderId)?.remove()
      })

    return () => {
      cancelled = true
    }
  }, [debouncedCode, isDark])

  return (
    <div
      style={{
        textAlign: 'center',
        margin: '16px 0',
        overflow: 'auto',
        padding: '12px',
        borderRadius: '8px',
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      }}
    >
      {error ? (
        <pre style={{ color: '#ef4444', fontSize: '12px', textAlign: 'left', margin: 0 }}>
          {error}
        </pre>
      ) : svg ? (
        // eslint-disable-next-line react/no-danger
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <span style={{ fontSize: '12px', color: 'var(--text-3)', opacity: 0.5 }}>
          Renderizando diagrama…
        </span>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rehypeKatexPlugin = rehypeKatex as any

// ─── Wiki links preprocessing ────────────────────────────────────────────────
function preprocessWikiLinks(text: string, notesList: Note[]): string {
  // Split by fenced code blocks and inline code so we don't mangle them
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g)
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part // inside code — leave untouched
      return part.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, display) => {
        const title = target.trim()
        const label = display?.trim() ?? title
        const found = notesList.find(n => n.title.toLowerCase() === title.toLowerCase())
        return found
          ? `[${label}](wiki:${found.id})`
          : `[${label}](wiki-notfound:${encodeURIComponent(title)})`
      })
    })
    .join('')
}

// ─── Reading time ─────────────────────────────────────────────────────────────
function calcReadingTime(text: string): string {
  const words = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/[#*_~[\]()>|]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
  const mins = Math.max(1, Math.round(words / 200))
  return `${mins} min · ${words.toLocaleString()} palabras`
}

// ─── Slug ─────────────────────────────────────────────────────────────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// ─── Font stacks ─────────────────────────────────────────────────────────────
const FONT_STACKS: Record<string, string> = {
  sans: 'var(--font-ui)',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'var(--font-mono)',
}

interface Props {
  content: string
  attachments?: NoteAttachment[]
}

export default function MarkdownPreview({ content, attachments = [] }: Props) {
  const navigate = useNavigate()
  const fontSize = useAppSelector(s => s.settings.editorFontSize)
  const lineHeight = useAppSelector(s => s.settings.lineHeight ?? 1.7)
  const uiTheme = useAppSelector(s => s.settings.uiTheme)
  const proseFont = useAppSelector(s => s.settings.markdownPreviewFont ?? 'sans')
  const proseWidth = useAppSelector(s => s.settings.markdownProseWidth ?? 760)
  const showReadingTime = useAppSelector(s => s.settings.markdownShowReadingTime ?? true)
  const showAnchors = useAppSelector(s => s.settings.markdownHeadingAnchors ?? true)
  const showCopy = useAppSelector(s => s.settings.markdownCopyCode ?? true)
  const highlight = useAppSelector(s => s.settings.markdownCodeHighlight ?? true)
  const allNotes = useAppSelector(s => s.notes.notes)
  const isDark = uiTheme === 'dark'

  // ── Heading factory ───────────────────────────────────────────────────────
  function makeH(level: 1 | 2 | 3 | 4 | 5 | 6) {
    return function H({
      children,
      ...rest
    }: React.HTMLAttributes<HTMLHeadingElement> & ExtraProps) {
      const text = Array.isArray(children)
        ? children.map(c => (typeof c === 'string' ? c : '')).join('')
        : typeof children === 'string'
          ? children
          : ''
      const slug = slugify(text)
      type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      const Tag = `h${level}` as HeadingTag
      return (
        <Tag id={slug} style={{ scrollMarginTop: '8px' }} {...(rest as object)}>
          {children}
          {showAnchors && slug && (
            <a
              href={`#${slug}`}
              aria-hidden="true"
              className="heading-anchor"
              onClick={e => {
                e.preventDefault()
                window.location.hash = slug
              }}
            >
              #
            </a>
          )}
        </Tag>
      )
    }
  }

  // ── Code block ────────────────────────────────────────────────────────────
  function Code({ children, className, ...rest }: React.HTMLAttributes<HTMLElement> & ExtraProps) {
    // Mermaid diagrams
    if (className === 'language-mermaid') {
      return <MermaidBlock code={String(children).trim()} isDark={isDark} />
    }
    if (className?.startsWith('language-')) {
      return (
        <CodeBlock
          code={String(children)}
          className={className}
          isDark={isDark}
          showCopy={showCopy}
          highlight={highlight}
        />
      )
    }
    return (
      <code className={className} {...(rest as object)}>
        {children}
      </code>
    )
  }

  // ── Blockquote ────────────────────────────────────────────────────────────
  function Blockquote({ children, ...rest }: React.HTMLAttributes<HTMLQuoteElement> & ExtraProps) {
    return (
      <blockquote
        {...(rest as object)}
        className={`md-blockquote ${isDark ? 'md-blockquote--dark' : 'md-blockquote--light'}`}
      >
        {children}
      </blockquote>
    )
  }

  // ── Table ─────────────────────────────────────────────────────────────────
  function Table({ children, ...rest }: React.HTMLAttributes<HTMLTableElement> & ExtraProps) {
    return (
      <div className="md-table-wrap">
        <table {...(rest as object)}>{children}</table>
      </div>
    )
  }
  function Th({ children, ...rest }: React.ThHTMLAttributes<HTMLTableCellElement> & ExtraProps) {
    return (
      <th className="md-th" {...(rest as object)}>
        {children}
      </th>
    )
  }
  function Td({ children, ...rest }: React.TdHTMLAttributes<HTMLTableCellElement> & ExtraProps) {
    return (
      <td className="md-td" {...(rest as object)}>
        {children}
      </td>
    )
  }
  function Tr({ children, ...rest }: React.HTMLAttributes<HTMLTableRowElement> & ExtraProps) {
    return (
      <tr className="md-tr" {...(rest as object)}>
        {children}
      </tr>
    )
  }

  // ── HR ────────────────────────────────────────────────────────────────────
  function Hr(rest: React.HTMLAttributes<HTMLHRElement> & ExtraProps) {
    return <hr className="md-hr" {...(rest as object)} />
  }

  // ── Links ─────────────────────────────────────────────────────────────────
  function A({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & ExtraProps) {
    // Internal wiki link — found
    if (href?.startsWith('wiki:')) {
      const id = href.slice(5)
      return (
        <a
          href={`/editor/${id}`}
          onClick={e => {
            e.preventDefault()
            navigate(`/editor/${id}`)
          }}
          className="md-link md-wikilink"
          title="Enlace interno"
        >
          <span style={{ fontSize: '0.8em', opacity: 0.7, marginRight: '2px' }}>[[</span>
          {children}
          <span style={{ fontSize: '0.8em', opacity: 0.7, marginLeft: '2px' }}>]]</span>
        </a>
      )
    }
    // Internal wiki link — broken (note not found)
    if (href?.startsWith('wiki-notfound:')) {
      const title = decodeURIComponent(href.slice(14))
      return (
        <span
          className="md-wikilink-broken"
          title={`Nota no encontrada: ${title}`}
          style={{
            color: 'var(--text-3)',
            textDecoration: 'underline',
            textDecorationStyle: 'dashed',
            cursor: 'default',
            fontSize: 'inherit',
          }}
        >
          <span style={{ fontSize: '0.8em', opacity: 0.5, marginRight: '2px' }}>[[</span>
          {children}
          <span style={{ fontSize: '0.8em', opacity: 0.5, marginLeft: '2px' }}>]]</span>
        </span>
      )
    }
    const isExt = href?.startsWith('http')
    return (
      <a
        href={href}
        target={isExt ? '_blank' : undefined}
        rel={isExt ? 'noopener noreferrer' : undefined}
        className="md-link"
        {...(rest as object)}
      >
        {children}
      </a>
    )
  }

  // ── Image ─────────────────────────────────────────────────────────────────
  function Img({
    src,
    alt,
    node,
    ...rest
  }: React.ImgHTMLAttributes<HTMLImageElement> & ExtraProps) {
    // react-markdown strips non-http URLs via urlTransform — read original src from hast node
    const rawSrc: string = (node?.properties?.src as string | undefined) ?? src ?? ''
    // Resolve attachment:ID references to local data URLs
    let resolvedSrc = rawSrc
    if (rawSrc.startsWith('attachment:')) {
      const id = rawSrc.slice('attachment:'.length)
      const found = attachments.find(a => a.id === id)
      resolvedSrc = found?.dataUrl ?? ''
    }
    if (!resolvedSrc) return null
    return (
      <figure className="md-figure">
        <img src={resolvedSrc} alt={alt} className="md-img" {...(rest as object)} />
        {alt && <figcaption className="md-figcaption">{alt}</figcaption>}
      </figure>
    )
  }

  // ── Paragraph (avoid invalid nesting when paragraph wraps an image) ────────
  function P({ children, node, ...rest }: React.HTMLAttributes<HTMLParagraphElement> & ExtraProps) {
    const hasImg = node?.children?.some(
      (c: { type: string; tagName?: string }) => c.type === 'element' && c.tagName === 'img'
    )
    if (hasImg) {
      return (
        <div className="md-img-para" {...(rest as object)}>
          {children}
        </div>
      )
    }
    return <p {...(rest as object)}>{children}</p>
  }

  // Memoize components so ReactMarkdown reuses the same instances between
  // renders — prevents MermaidBlock from unmounting/remounting on every keystroke
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const components: Components = useMemo<Components>(
    () => ({
      h1: makeH(1),
      h2: makeH(2),
      h3: makeH(3),
      h4: makeH(4),
      h5: makeH(5),
      h6: makeH(6),
      code: Code,
      blockquote: Blockquote,
      table: Table,
      th: Th,
      td: Td,
      tr: Tr,
      hr: Hr,
      a: A,
      img: Img,
      p: P,
      // deps that affect how the above renderers behave
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [isDark, showCopy, highlight, showAnchors, navigate, attachments, allNotes]
  )

  return (
    <div
      id="md-print-preview"
      className="md-preview-root"
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '20px 28px 80px',
        fontSize: `${fontSize}px`,
        lineHeight,
      }}
    >
      {/* Reading time badge */}
      {showReadingTime && content.trim().length > 60 && (
        <div className={`md-reading-time ${isDark ? 'md-reading-time--dark' : ''}`}>
          <svg
            width="11"
            height="11"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {calcReadingTime(content)}
        </div>
      )}

      {/* Main article */}
      <article
        className={`md-prose ${isDark ? 'md-prose--dark' : 'md-prose--light'}`}
        style={{
          maxWidth: `${proseWidth}px`,
          margin: '0 auto',
          fontFamily: FONT_STACKS[proseFont] ?? FONT_STACKS.sans,
        }}
      >
        {content.trim() ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatexPlugin]}
            components={components}
            urlTransform={(url: string) => (url.startsWith('javascript:') ? '' : url)}
          >
            {preprocessWikiLinks(content, allNotes)}
          </ReactMarkdown>
        ) : (
          <p className="md-empty">La vista previa aparece aqui…</p>
        )}
      </article>
    </div>
  )
}
