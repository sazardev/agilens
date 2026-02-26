import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import StatusBar from '@/components/layout/StatusBar'
import CommandPalette from '@/components/command/CommandPalette'
import KeyboardShortcutsModal from '@/components/shortcuts/KeyboardShortcutsModal'
import AgilensLogo from '@/components/layout/AgilensLogo'
import { useAppDispatch, useAppSelector } from '@/store'
import { toggleSidebar } from '@/store/slices/uiSlice'
import { useEffect, useState } from 'react'

function HamburgerIcon() {
  return (
    <svg
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

// ── Bottom navigation icons ───────────────────────────────────────────────────

function IcoNotes() {
  return (
    <svg
      width="21"
      height="21"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function IcoKanban() {
  return (
    <svg
      width="21"
      height="21"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <rect x="3" y="3" width="5" height="18" rx="1" />
      <rect x="10" y="3" width="5" height="12" rx="1" />
      <rect x="17" y="3" width="5" height="8" rx="1" />
    </svg>
  )
}

function IcoDaily() {
  return (
    <svg
      width="21"
      height="21"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IcoSprints() {
  return (
    <svg
      width="21"
      height="21"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
  )
}

function IcoSearch() {
  return (
    <svg
      width="21"
      height="21"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

// ── Bottom Nav Bar ────────────────────────────────────────────────────────────

interface NavItem {
  icon: React.ReactNode
  label: string
  matchPaths?: string[]
  action: () => void
}

function BottomNavBar({ items, currentPath }: { items: NavItem[]; currentPath: string }) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: 'var(--bg-1)',
        borderTop: '1px solid var(--border-1)',
        display: 'flex',
        alignItems: 'stretch',
        zIndex: 200,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {items.map((item, i) => {
        const isActive = item.matchPaths
          ? item.matchPaths.some(p => (p === '/' ? currentPath === '/' : currentPath.startsWith(p)))
          : false
        return (
          <button
            key={i}
            onClick={item.action}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? 'var(--accent-400)' : 'var(--text-2)',
              fontSize: '9px',
              fontFamily: 'var(--font-ui)',
              fontWeight: isActive ? 600 : 400,
              transition: 'color 0.15s',
              minHeight: 0,
              minWidth: 0,
              padding: '4px 2px',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '28px',
                borderRadius: 'var(--radius-lg)',
                background: isActive ? 'var(--accent-glow)' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              {item.icon}
            </span>
            <span style={{ letterSpacing: '0.02em' }}>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default function MainLayout() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const sidebarOpen = useAppSelector(s => s.ui.sidebarOpen)
  const sidebarWidth = useAppSelector(s => s.ui.sidebarWidth)
  const sidebarAutoHide = useAppSelector(s => s.ui.sidebarAutoHide)
  const [isMobile, setIsMobile] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  // Global Ctrl+K / ? / F1 listeners
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const inInput =
        tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(prev => !prev)
        return
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !inInput) {
        if (e.key === '?' || e.key === 'F1') {
          e.preventDefault()
          setShortcutsOpen(prev => !prev)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const w = sidebarOpen && !sidebarAutoHide ? `${sidebarWidth}px` : 'var(--sidebar-w-closed)'

  const bottomNavItems: NavItem[] = [
    {
      icon: <IcoNotes />,
      label: 'Notas',
      matchPaths: ['/', '/editor'],
      action: () => navigate('/'),
    },
    {
      icon: <IcoKanban />,
      label: 'Kanban',
      matchPaths: ['/kanban'],
      action: () => navigate('/kanban'),
    },
    {
      icon: <IcoDaily />,
      label: 'Daily',
      matchPaths: ['/daily'],
      action: () => navigate('/daily'),
    },
    {
      icon: <IcoSprints />,
      label: 'Sprints',
      matchPaths: ['/sprints'],
      action: () => navigate('/sprints'),
    },
    {
      icon: <IcoSearch />,
      label: 'Buscar',
      action: () => setCmdOpen(true),
    },
  ]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        overflow: 'hidden',
        background: 'var(--bg-1)',
        color: 'var(--text-0)',
      }}
    >
      {/* Mobile top bar */}
      {isMobile && (
        <div
          style={{
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '0 14px',
            borderBottom: '1px solid var(--border-1)',
            background: 'var(--bg-1)',
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          <button
            onClick={() => dispatch(toggleSidebar())}
            aria-label="Menu"
            style={{
              width: '36px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              border: '1px solid var(--border-2)',
              color: 'var(--text-1)',
              cursor: 'pointer',
            }}
          >
            <HamburgerIcon />
          </button>
          <AgilensLogo size={26} showWordmark variant="color" />
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main
          style={{
            flex: 1,
            overflow: 'hidden',
            marginLeft: isMobile ? 0 : w,
            transition: 'margin-left var(--transition-base)',
            display: 'flex',
            flexDirection: 'column',
            paddingBottom: isMobile ? '56px' : 0,
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* Bottom navigation — mobile only */}
      {isMobile && <BottomNavBar items={bottomNavItems} currentPath={location.pathname} />}

      {/* Status bar — only on desktop */}
      {!isMobile && <StatusBar />}

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      {shortcutsOpen && <KeyboardShortcutsModal onClose={() => setShortcutsOpen(false)} />}
    </div>
  )
}
