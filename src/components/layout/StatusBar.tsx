import { useAppSelector } from '@/store'

export default function StatusBar() {
  const activeNoteId = useAppSelector(s => s.ui.activeNoteId)
  const note = useAppSelector(s => s.notes.notes.find(n => n.id === activeNoteId))
  const branch = useAppSelector(s => s.git.currentBranch)
  const initialized = useAppSelector(s => s.git.initialized)
  const mode = useAppSelector(s => s.ui.editorPreviewMode)

  const wordCount = note
    ? note.content
        .replace(/```[\s\S]*?```/g, '')
        .trim()
        .split(/\s+/)
        .filter(Boolean).length
    : 0

  const saved = note
    ? new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <footer
      style={{
        height: 'var(--statusbar-h)',
        backgroundColor: 'var(--accent-700)',
        borderTop: '1px solid var(--accent-600)',
        color: 'rgba(255,255,255,0.75)',
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        gap: '16px',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {initialized && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontFamily: 'var(--font-mono)' }}>⎇</span>
            <span>{branch}</span>
          </span>
        )}
        {!initialized && <span style={{ opacity: 0.5 }}>git: no init</span>}
      </div>

      {/* Center — note title */}
      <div
        style={{
          flex: 1,
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {note ? note.title : 'Agilens'}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
        {note && (
          <>
            <span>{wordCount} palabras</span>
            <span style={{ opacity: 0.5 }}>|</span>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{mode}</span>
            {saved && (
              <>
                <span style={{ opacity: 0.5 }}>|</span>
                <span>guardado {saved}</span>
              </>
            )}
          </>
        )}
        <span style={{ opacity: 0.5 }}>|</span>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>v{__APP_VERSION__}</span>
      </div>
    </footer>
  )
}

declare const __APP_VERSION__: string
