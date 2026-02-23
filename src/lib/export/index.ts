import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { Note } from '@/types'

// ─── Single note ─────────────────────────────────────────────────────────────

export function downloadNoteAsMarkdown(note: Note) {
  const blob = new Blob([note.content], { type: 'text/markdown;charset=utf-8' })
  const filename = `${slugify(note.title)}.md`
  saveAs(blob, filename)
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

export function printNote(note: Note, renderedHtml: string) {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${note.title}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #111; }
          pre { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; }
          code { font-family: 'Fira Code', monospace; font-size: 0.9em; }
          blockquote { border-left: 4px solid #7c3aed; padding-left: 16px; color: #555; }
          h1, h2, h3 { color: #1a1a1a; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>${renderedHtml}</body>
    </html>
  `)
  win.document.close()
  win.print()
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
