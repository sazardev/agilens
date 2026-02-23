import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/store'
import CodeBlock from './CodeBlock'
import type { Components } from 'react-markdown'
import type { ExtraProps } from 'react-markdown'
import type { Note } from '@/types'

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
}

export default function MarkdownPreview({ content }: Props) {
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
      const Tag = `h${level}` as keyof JSX.IntrinsicElements
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
  function Img({ src, alt, ...rest }: React.ImgHTMLAttributes<HTMLImageElement> & ExtraProps) {
    return (
      <figure className="md-figure">
        <img src={src} alt={alt} className="md-img" {...(rest as object)} />
        {alt && <figcaption className="md-figcaption">{alt}</figcaption>}
      </figure>
    )
  }

  const components: Components = {
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
  }

  return (
    <div
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
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {preprocessWikiLinks(content, allNotes)}
          </ReactMarkdown>
        ) : (
          <p className="md-empty">La vista previa aparece aqui…</p>
        )}
      </article>
    </div>
  )
}
