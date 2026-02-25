import { useRef, forwardRef, useImperativeHandle, useMemo } from 'react'
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorView, keymap } from '@codemirror/view'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { Prec } from '@codemirror/state'
import { createTheme } from '@uiw/codemirror-themes'
import { tags as t } from '@lezer/highlight'
import { useAppSelector } from '@/store'

// ─── Public API ───────────────────────────────────────────────────────────────
export type FormatCmd =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'inlineCode'
  | 'codeBlock'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'link'
  | 'image'
  | 'bulletList'
  | 'numberedList'
  | 'blockquote'
  | 'hr'
  | 'table'
  | 'wikiLink'

export interface MarkdownEditorHandle {
  format: (cmd: FormatCmd) => void
  focus: () => void
  insertText: (text: string) => void
  /** Returns the current document text directly from CodeMirror state */
  getValue: () => string
}

// ─── Dark theme ───────────────────────────────────────────────────────────────
const agilensThemeDark = createTheme({
  theme: 'dark',
  settings: {
    background: '#0f0f12',
    backgroundImage: '',
    foreground: '#e0e0e4',
    caret: 'var(--accent-500, #6366f1)',
    selection: 'var(--accent-glow-strong, rgba(79,70,229,0.20))',
    selectionMatch: 'rgba(255,255,255,0.05)',
    lineHighlight: 'rgba(255,255,255,0.02)',
    gutterBackground: '#0f0f12',
    gutterForeground: '#3a3a46',
    gutterBorder: 'transparent',
    gutterActiveForeground: '#5c5c6e',
    fontFamily: 'var(--font-mono, "Fira Code", monospace)',
  },
  styles: [
    { tag: t.heading1, color: '#f0f0f4', fontWeight: '700', fontSize: '1.35em' },
    { tag: t.heading2, color: '#e8e8ec', fontWeight: '600', fontSize: '1.2em' },
    { tag: t.heading3, color: '#e0e0e4', fontWeight: '600', fontSize: '1.1em' },
    { tag: [t.heading4, t.heading5, t.heading6], color: '#d0d0d8', fontWeight: '600' },
    { tag: t.emphasis, fontStyle: 'italic', color: '#c4b5fd' },
    { tag: t.strong, fontWeight: '700', color: '#ffffff' },
    { tag: t.strikethrough, textDecoration: 'line-through', color: '#5c5c6e' },
    { tag: t.monospace, color: '#a78bfa', fontFamily: 'var(--font-mono)' },
    { tag: t.processingInstruction, color: '#818cf8' },
    { tag: t.link, color: '#60a5fa', textDecoration: 'underline' },
    { tag: t.url, color: '#60a5fa' },
    { tag: t.punctuation, color: '#3a3a46' },
    { tag: t.meta, color: '#4a4a56' },
    { tag: t.tagName, color: '#a78bfa' },
    { tag: t.attributeName, color: '#34d399' },
    { tag: t.quote, color: '#6b7280', fontStyle: 'italic' },
    { tag: t.list, color: 'var(--accent-400, #818cf8)' },
    { tag: t.comment, color: '#3a3a46', fontStyle: 'italic' },
    { tag: t.string, color: '#a3e635' },
    { tag: t.atom, color: '#fb923c' },
    { tag: t.number, color: '#fb923c' },
    { tag: t.keyword, color: '#f472b6' },
    { tag: t.operator, color: '#94a3b8' },
    { tag: t.contentSeparator, color: '#2c2c36' },
  ],
})

// ─── Light theme ──────────────────────────────────────────────────────────────
const agilensThemeLight = createTheme({
  theme: 'light',
  settings: {
    background: '#ffffff',
    backgroundImage: '',
    foreground: '#101018',
    caret: 'var(--accent-500, #4f46e5)',
    selection: 'var(--accent-glow-strong, rgba(79,70,229,0.14))',
    selectionMatch: 'rgba(0,0,0,0.05)',
    lineHighlight: 'rgba(0,0,0,0.025)',
    gutterBackground: '#f4f4f8',
    gutterForeground: '#a8a8bc',
    gutterBorder: 'transparent',
    gutterActiveForeground: '#787890',
    fontFamily: 'var(--font-mono, "Fira Code", monospace)',
  },
  styles: [
    { tag: t.heading1, color: '#101018', fontWeight: '700', fontSize: '1.35em' },
    { tag: t.heading2, color: '#1a1a28', fontWeight: '600', fontSize: '1.2em' },
    { tag: t.heading3, color: '#202030', fontWeight: '600', fontSize: '1.1em' },
    { tag: [t.heading4, t.heading5, t.heading6], color: '#2a2a3a', fontWeight: '600' },
    { tag: t.emphasis, fontStyle: 'italic', color: '#4338ca' },
    { tag: t.strong, fontWeight: '700', color: '#101018' },
    { tag: t.strikethrough, textDecoration: 'line-through', color: '#a8a8bc' },
    { tag: t.monospace, color: '#6d28d9', fontFamily: 'var(--font-mono)' },
    { tag: t.processingInstruction, color: '#7c3aed' },
    { tag: t.link, color: '#2563eb', textDecoration: 'underline' },
    { tag: t.url, color: '#2563eb' },
    { tag: t.punctuation, color: '#c0c0d0' },
    { tag: t.meta, color: '#b0b0c4' },
    { tag: t.tagName, color: '#7c3aed' },
    { tag: t.attributeName, color: '#059669' },
    { tag: t.quote, color: '#6b7280', fontStyle: 'italic' },
    { tag: t.list, color: 'var(--accent-600, #4f46e5)' },
    { tag: t.comment, color: '#c0c0d0', fontStyle: 'italic' },
    { tag: t.string, color: '#16a34a' },
    { tag: t.atom, color: '#c2410c' },
    { tag: t.number, color: '#c2410c' },
    { tag: t.keyword, color: '#be185d' },
    { tag: t.operator, color: '#64748b' },
    { tag: t.contentSeparator, color: '#dcdce8' },
  ],
})

// ─── Layout theme factory ─────────────────────────────────────────────────────
function makeLayoutTheme(isDark: boolean) {
  return EditorView.theme({
    '&': { height: '100%', overflow: 'hidden', background: isDark ? '#0f0f12' : '#ffffff' },
    '.cm-scroller': { overflow: 'auto', padding: '20px 24px', paddingBottom: '80px' },
    '.cm-content': { caretColor: 'var(--accent-500)', maxWidth: '760px', margin: '0 auto' },
    '.cm-line': { lineHeight: 'var(--editor-line-height, 1.8)', padding: '0' },
    '.cm-gutters': { display: 'none' },
    '.cm-activeLine': {
      background: isDark ? 'rgba(255,255,255,0.02) !important' : 'rgba(0,0,0,0.025) !important',
      borderRadius: '3px',
    },
    '.cm-selectionBackground': { background: 'var(--accent-glow-strong) !important' },
    '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--accent-500)', borderLeftWidth: '2px' },
    '.cm-placeholder': { color: isDark ? '#3a3a46' : '#c0c0d0' },
    // Horizontal rule highlighting
    '.cm-hr': { color: isDark ? '#2c2c36' : '#dcdce8' },
  })
}

// ─── Markdown formatting helpers ─────────────────────────────────────────────
function wrapSelection(view: EditorView, before: string, after: string, placeholder = '') {
  const { state } = view
  const { from, to } = state.selection.main
  const selected = state.sliceDoc(from, to)

  if (selected) {
    // Toggle: if already wrapped, unwrap
    if (selected.startsWith(before) && selected.endsWith(after)) {
      const unwrapped = selected.slice(before.length, selected.length - after.length)
      view.dispatch({
        changes: { from, to, insert: unwrapped },
        selection: { anchor: from, head: from + unwrapped.length },
      })
      view.focus()
      return
    }
    // Check if the surrounding characters are the markers (selection inside markers)
    const beforeSel = state.sliceDoc(from - before.length, from)
    const afterSel = state.sliceDoc(to, to + after.length)
    if (beforeSel === before && afterSel === after) {
      view.dispatch({
        changes: [
          { from: from - before.length, to: from, insert: '' },
          { from: to, to: to + after.length, insert: '' },
        ],
        selection: { anchor: from - before.length, head: to - before.length },
      })
      view.focus()
      return
    }
    // Wrap selection
    view.dispatch({
      changes: { from, to, insert: before + selected + after },
      selection: { anchor: from + before.length, head: from + before.length + selected.length },
    })
  } else {
    // No selection: insert placeholder and select it
    view.dispatch({
      changes: { from, to, insert: before + placeholder + after },
      selection: { anchor: from + before.length, head: from + before.length + placeholder.length },
    })
  }
  view.focus()
}

function prependLine(view: EditorView, prefix: string) {
  const { state } = view
  const { from } = state.selection.main
  const line = state.doc.lineAt(from)
  const current = line.text
  // Toggle: if already prefixed, remove; otherwise add
  const alreadyPrefixed = current.startsWith(prefix)
  view.dispatch({
    changes: {
      from: line.from,
      to: line.to,
      insert: alreadyPrefixed ? current.slice(prefix.length) : prefix + current,
    },
  })
  view.focus()
}

function insertAtCursor(view: EditorView, text: string) {
  const { from, to } = view.state.selection.main
  view.dispatch({ changes: { from, to, insert: text } })
  view.focus()
}

export function applyFormat(view: EditorView, cmd: FormatCmd) {
  switch (cmd) {
    case 'bold':
      return wrapSelection(view, '**', '**', 'texto en negrita')
    case 'italic':
      return wrapSelection(view, '*', '*', 'texto en cursiva')
    case 'strikethrough':
      return wrapSelection(view, '~~', '~~', 'texto tachado')
    case 'inlineCode':
      return wrapSelection(view, '`', '`', 'código')
    case 'codeBlock': {
      const { from, to } = view.state.selection.main
      const sel = view.state.sliceDoc(from, to) || 'código aquí'
      view.dispatch({ changes: { from, to, insert: '```\n' + sel + '\n```' } })
      view.focus()
      return
    }
    case 'h1':
      return prependLine(view, '# ')
    case 'h2':
      return prependLine(view, '## ')
    case 'h3':
      return prependLine(view, '### ')
    case 'blockquote':
      return prependLine(view, '> ')
    case 'bulletList':
      return prependLine(view, '- ')
    case 'numberedList':
      return prependLine(view, '1. ')
    case 'link': {
      const { from, to } = view.state.selection.main
      const sel = view.state.sliceDoc(from, to) || 'texto del enlace'
      view.dispatch({ changes: { from, to, insert: `[${sel}](url)` } })
      view.focus()
      return
    }
    case 'image': {
      const { from, to } = view.state.selection.main
      const sel = view.state.sliceDoc(from, to) || 'descripción'
      view.dispatch({ changes: { from, to, insert: `![${sel}](url)` } })
      view.focus()
      return
    }
    case 'hr':
      return insertAtCursor(view, '\n\n---\n\n')
    case 'table':
      return insertAtCursor(
        view,
        '\n| Columna 1 | Columna 2 | Columna 3 |\n|-----------|-----------|------------|\n| Celda     | Celda     | Celda      |\n'
      )
    case 'wikiLink': {
      const { from, to } = view.state.selection.main
      const sel = view.state.sliceDoc(from, to)
      if (sel) {
        view.dispatch({ changes: { from, to, insert: `[[${sel}]]` } })
      } else {
        view.dispatch({
          changes: { from, to, insert: '[[]]' },
          selection: { anchor: from + 2 },
        })
      }
      view.focus()
      return
    }
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

// ─── Component ───────────────────────────────────────────────────────────────
const MarkdownEditor = forwardRef<MarkdownEditorHandle, Props>(function MarkdownEditor(
  { value, onChange, placeholder },
  ref
) {
  const cmRef = useRef<ReactCodeMirrorRef>(null)

  const fontSize = useAppSelector(s => s.settings.editorFontSize)
  const lineHeight = useAppSelector(s => s.settings.lineHeight ?? 1.7)
  const wordWrap = useAppSelector(s => s.settings.wordWrap ?? true)
  const uiTheme = useAppSelector(s => s.settings.uiTheme)
  const tabSize = useAppSelector(s => s.settings.markdownTabSize ?? 2)
  const spellcheck = useAppSelector(s => s.settings.markdownSpellcheck ?? false)

  const isDark = uiTheme === 'dark'

  // Expose format + focus to parent
  useImperativeHandle(ref, () => ({
    format(cmd: FormatCmd) {
      const view = cmRef.current?.view
      if (view) applyFormat(view, cmd)
    },
    focus() {
      cmRef.current?.view?.focus()
    },
    insertText(text: string) {
      const view = cmRef.current?.view
      if (view) insertAtCursor(view, text)
    },
    getValue() {
      return cmRef.current?.view?.state.doc.toString() ?? ''
    },
  }))

  const activeTheme = isDark ? agilensThemeDark : agilensThemeLight
  const layoutTheme = useMemo(() => makeLayoutTheme(isDark), [isDark])

  // ─── Custom format keymap — Prec.highest wins over basicSetup keymaps ───────
  const formatKeymap = useMemo(
    () =>
      Prec.highest(
        keymap.of([
          {
            key: 'Mod-b',
            run(view) {
              applyFormat(view, 'bold')
              return true
            },
          },
          {
            key: 'Mod-i',
            run(view) {
              applyFormat(view, 'italic')
              return true
            },
          },
          {
            key: 'Mod-`',
            run(view) {
              applyFormat(view, 'inlineCode')
              return true
            },
          },
          {
            key: 'Mod-Shift-x',
            run(view) {
              applyFormat(view, 'strikethrough')
              return true
            },
          },
          {
            key: 'Mod-1',
            run(view) {
              applyFormat(view, 'h1')
              return true
            },
          },
          {
            key: 'Mod-2',
            run(view) {
              applyFormat(view, 'h2')
              return true
            },
          },
          {
            key: 'Mod-3',
            run(view) {
              applyFormat(view, 'h3')
              return true
            },
          },
          {
            key: 'Mod-Shift-7',
            run(view) {
              applyFormat(view, 'bulletList')
              return true
            },
          },
          {
            key: 'Mod-Shift-8',
            run(view) {
              applyFormat(view, 'numberedList')
              return true
            },
          },
          {
            key: 'Mod-Shift-.',
            run(view) {
              applyFormat(view, 'blockquote')
              return true
            },
          },
        ])
      ),
    []
  )

  const extensions = useMemo(
    () => [
      markdown({ base: markdownLanguage }),
      layoutTheme,
      history(),
      formatKeymap,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      ...(wordWrap ? [EditorView.lineWrapping] : []),
    ],
    [layoutTheme, wordWrap, formatKeymap]
  )

  return (
    <div
      style={
        {
          height: '100%',
          overflow: 'hidden',
          fontSize: `${fontSize}px`,
          '--editor-line-height': lineHeight,
        } as React.CSSProperties
      }
    >
      <CodeMirror
        ref={cmRef}
        value={value}
        height="100%"
        style={{ height: '100%' }}
        theme={activeTheme}
        extensions={extensions}
        onChange={onChange}
        placeholder={placeholder}
        indentWithTab={false}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: true,
          searchKeymap: true,
          autocompletion: false,
          bracketMatching: true,
          closeBrackets: false,
          indentOnInput: false,
          tabSize,
        }}
        data-spellcheck={spellcheck ? 'true' : 'false'}
      />
    </div>
  )
})

export default MarkdownEditor
