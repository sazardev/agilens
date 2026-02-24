import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { Note } from '@/types'

// ─── Single note ─────────────────────────────────────────────────────────────

export function downloadNoteAsMarkdown(note: Note) {
  const blob = new Blob([note.content], { type: 'text/markdown;charset=utf-8' })
  const filename = `${slugify(note.title)}.md`
  saveAs(blob, filename)
}

// ─── Export as HTML file ──────────────────────────────────────────────────────

export function downloadNoteAsHtml(note: Note, renderedHtml: string) {
  const html = buildPrintDocument(note.title, renderedHtml)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  saveAs(blob, `${slugify(note.title)}.html`)
}

// ─── Copy HTML to clipboard ───────────────────────────────────────────────────

export async function copyNoteAsHtml(renderedHtml: string): Promise<void> {
  const blob = new Blob([renderedHtml], { type: 'text/html' })
  const item = new ClipboardItem({ 'text/html': blob })
  await navigator.clipboard.write([item])
}

// ─── Collection ZIP ───────────────────────────────────────────────────────────

export async function downloadNotesAsZip(notes: Note[], zipName = 'agilens-notes') {
  const zip = new JSZip()
  const folder = zip.folder('notes')!

  for (const note of notes) {
    const filename = `${slugify(note.title)}.md`
    folder.file(filename, note.content)
  }

  // Add manifest
  const manifest = {
    exportedAt: new Date().toISOString(),
    count: notes.length,
    notes: notes.map(n => ({ id: n.id, title: n.title, tags: n.tags, updatedAt: n.updatedAt })),
  }
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))

  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, `${zipName}.zip`)
}

// ─── Print / PDF ─────────────────────────────────────────────────────────────

export function printNote(
  note: Note,
  capturedHtml: string,
  preOpenedWin?: Window | null,
  cssVars = ''
) {
  const html = buildPrintDocument(note.title, capturedHtml, cssVars)

  // Use the pre-opened window when available (opened synchronously before any
  // await, so the browser does not treat it as a popup).
  const win = preOpenedWin ?? window.open('', '_blank')

  if (!win) {
    // Last-resort fallback: download as an .html file
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${note.title.replace(/[^\w\s-]/g, '').trim() || 'nota'}.html`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    return
  }

  // Write the HTML directly — no blob URL needed, avoids CSP/CORS issues
  win.document.open()
  win.document.write(html)
  win.document.close()

  // Wait for fonts then trigger the print dialog
  win.addEventListener('load', () => {
    win.focus()
    win.print()
  })

  // Safety timeout in case 'load' never fires
  setTimeout(() => {
    try {
      win.focus()
      win.print()
    } catch {
      /* already printed */
    }
  }, 1800)
}

// ─── Shared document builder ──────────────────────────────────────────────────

function buildPrintDocument(title: string, bodyHtml: string, cssVars = ''): string {
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>${escapeHtml(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" rel="stylesheet" />
    <style>
      /* ── Injected theme vars ─────────────────────────────────────── */
      :root {
${cssVars}
        /* Print-safe overrides — always white background */
        --bg-0: #ffffff;
        --bg-1: #ffffff;
        --bg-2: #f6f6f8;
        --bg-3: #eeeeF2;
        --bg-4: #e4e4ec;
        --bg-5: #d8d8e4;
        --border-0: #e8e8f0;
        --border-1: #dcdce8;
        --border-2: #d0d0de;
        --border-3: #c0c0d0;
        --text-0: #101018;
        --text-1: #4a4a5a;
        --text-2: #787890;
        --text-3: #a8a8bc;
        --font-ui: 'Inter', system-ui, -apple-system, sans-serif;
        --font-mono: 'Fira Code', 'Cascadia Code', monospace;
        --radius-xs: 2px; --radius-sm: 3px; --radius-md: 4px;
        --radius-lg: 6px; --radius-xl: 8px;
      }

      /* ── Reset ───────────────────────────────────────────────────── */
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      @page { size: A4; margin: 20mm 18mm; }

      /* ── Base ────────────────────────────────────────────────────── */
      body {
        font-family: var(--font-ui);
        font-size: 13px;
        line-height: 1.7;
        color: var(--text-0);
        background: #ffffff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      code, pre, kbd, samp { font-family: var(--font-mono); }

      /* ── md-preview-root ─────────────────────────────────────────── */
      .md-preview-root {
        max-width: 780px;
        margin: 0 auto;
        padding: 0;
        background: transparent;
      }

      /* ── Reading time badge ──────────────────────────────────────── */
      .md-reading-time {
        display: inline-flex; align-items: center; gap: 6px;
        margin-bottom: 20px; padding: 4px 10px;
        border-radius: var(--radius-md);
        background: rgba(128,128,160,0.08);
        border: 1px solid var(--border-1);
        color: var(--text-3);
        font-size: 11px; font-family: var(--font-mono);
      }

      /* ── Prose ───────────────────────────────────────────────────── */
      .md-prose {
        color: var(--text-0);
        line-height: 1.75;
        word-break: break-word;
        overflow-wrap: break-word;
      }
      .md-prose h1,.md-prose h2,.md-prose h3,
      .md-prose h4,.md-prose h5,.md-prose h6 {
        font-family: var(--font-ui); font-weight: 700;
        letter-spacing: -0.02em; color: var(--text-0);
        margin: 1.5em 0 0.5em; line-height: 1.25; position: relative;
        page-break-after: avoid;
      }
      .md-prose h1 {
        font-size: 1.875em;
        border-bottom: 2px solid var(--border-2);
        padding-bottom: 0.35em;
      }
      .md-prose h2 { font-size: 1.5em; border-bottom: 1px solid var(--border-1); padding-bottom: 0.25em; }
      .md-prose h3 { font-size: 1.25em; }
      .md-prose h4 { font-size: 1.1em; }
      .md-prose h5,.md-prose h6 { font-size: 1em; }
      .md-prose :is(h1,h2,h3,h4,h5,h6):first-child { margin-top: 0; }

      .heading-anchor { display: none !important; }

      .md-prose p { margin: 0.9em 0; }
      .md-prose p:first-child { margin-top: 0; }
      .md-prose strong { font-weight: 700; }
      .md-prose em { font-style: italic; }
      .md-prose del { text-decoration: line-through; color: var(--text-3); }

      /* Inline code */
      .md-prose code {
        font-family: var(--font-mono); font-size: 0.875em;
        padding: 2px 6px; border-radius: var(--radius-sm);
        background: var(--bg-3); border: 1px solid var(--border-2);
        color: var(--accent-500); white-space: nowrap;
      }

      /* Lists */
      .md-prose ul,.md-prose ol { padding-left: 1.5em; margin: 0.85em 0; }
      .md-prose li { margin: 0.3em 0; }
      .md-prose ul > li { list-style-type: disc; }
      .md-prose ol > li { list-style-type: decimal; }
      .md-prose input[type='checkbox'] { accent-color: var(--accent-500); margin-right: 6px; }

      /* Blockquote */
      .md-blockquote {
        margin: 1.25em 0; padding: 0.65em 1.1em;
        border-left: 3px solid var(--accent-500);
        border-radius: 0 var(--radius-md) var(--radius-md) 0;
        font-style: italic; page-break-inside: avoid;
      }
      .md-blockquote--dark, .md-blockquote--light {
        background: rgba(99,102,241,0.06); color: var(--text-1);
      }
      .md-blockquote p { margin: 0.25em 0 !important; }

      .md-hr { border: none; border-top: 1px solid var(--border-2); margin: 2em 0; }

      /* Links */
      .md-link { color: var(--accent-500) !important; text-decoration: underline; text-underline-offset: 3px; }
      .md-wikilink { color: var(--accent-500) !important; }

      /* Tables */
      .md-table-wrap {
        overflow-x: auto; border-radius: var(--radius-lg);
        border: 1px solid var(--border-2); margin: 1.25em 0;
        page-break-inside: avoid;
      }
      .md-table-wrap table { border-collapse: collapse; width: 100%; margin: 0; }
      .md-th {
        padding: 8px 14px; text-align: left;
        font-size: 11px; font-weight: 700;
        letter-spacing: 0.05em; text-transform: uppercase;
        color: var(--text-2); background: var(--bg-2);
        border-bottom: 1px solid var(--border-2);
      }
      .md-td {
        padding: 8px 14px; font-size: 13px;
        border-bottom: 1px solid var(--border-1);
        color: var(--text-0); line-height: 1.5; vertical-align: top;
      }
      .md-tr:last-child .md-td { border-bottom: none; }

      /* Images */
      .md-figure { margin: 1.5em 0; text-align: center; page-break-inside: avoid; }
      .md-img { max-width: 100%; border-radius: var(--radius-lg); border: 1px solid var(--border-2); display: inline-block; }
      .md-figcaption { margin-top: 6px; font-size: 12px; color: var(--text-3); font-style: italic; }
      .md-img-para { text-align: center; margin: 1.5em 0; }

      /* ── Code blocks (Shiki) ─────────────────────────────────────── */
      .code-block-wrapper {
        position: relative; margin: 1.25em 0;
        border-radius: var(--radius-lg); border: 1px solid var(--border-2);
        overflow: hidden; font-size: 0.875em; page-break-inside: avoid;
      }
      .code-block-wrapper pre, .shiki-block pre, .shiki-block .shiki {
        margin: 0; padding: 14px !important;
        overflow-x: auto; background: transparent !important;
        font-family: var(--font-mono); line-height: 1.65; tab-size: 2;
      }
      .code-block-wrapper[data-lang] pre { padding-top: 34px !important; }
      .shiki-block code { background: transparent !important; border: none !important; padding: 0 !important; white-space: pre; }
      .shiki-light pre, .shiki-light .shiki { background: #f6f8fa !important; }
      .shiki-dark pre, .shiki-dark .shiki { background: #0d1117 !important; }
      /* Lang label */
      .code-block-wrapper::before {
        content: attr(data-lang);
        position: absolute; top: 0; left: 0; right: 0;
        padding: 4px 14px; font-size: 10px; font-family: var(--font-mono);
        color: var(--text-3); background: var(--bg-2);
        border-bottom: 1px solid var(--border-2);
        text-transform: uppercase; letter-spacing: 0.06em;
      }
      /* Copy button — hidden in print */
      .copy-btn { display: none !important; }

      /* ── Mermaid diagrams ────────────────────────────────────────── */
      .md-prose svg { max-width: 100%; height: auto; }

      /* ── Print media ─────────────────────────────────────────────── */
      @media print {
        body { font-size: 11pt; }
        a[href]::after { content: none !important; }
        .md-reading-time { display: none; }
        h1,h2,h3,h4,h5,h6 { page-break-after: avoid; }
        pre, blockquote, figure, table { page-break-inside: avoid; }
        .code-block-wrapper { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <div class="md-preview-root">
      <article class="md-prose md-prose--light">
        ${bodyHtml}
      </article>
    </div>
  </body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── Utils ─────────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 80) || 'nota'
  )
}
