import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import StatusBar from '@/components/layout/StatusBar'
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

export default function MainLayout() {
  const dispatch = useAppDispatch()
  const sidebarOpen = useAppSelector(s => s.ui.sidebarOpen)
  const sidebarWidth = useAppSelector(s => s.ui.sidebarWidth)
  const sidebarAutoHide = useAppSelector(s => s.ui.sidebarAutoHide)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const w = sidebarOpen && !sidebarAutoHide ? `${sidebarWidth}px` : 'var(--sidebar-w-closed)'

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
              width: '34px',
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
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 700,
              fontSize: '14px',
              color: 'var(--accent-400)',
              letterSpacing: '-0.02em',
            }}
          >
            Agilens
          </span>
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
          }}
        >
          <Outlet />
        </main>
      </div>
      <StatusBar />
    </div>
  )
}
