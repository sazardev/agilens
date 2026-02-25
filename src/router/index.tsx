import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'

// ─── Lazy page chunks ─────────────────────────────────────────────────────────
// Each page is split into its own JS chunk — loaded only when first visited.

const NotesMapPage = lazy(() => import('@/pages/notes-map/NotesMapPage'))
const EditorPage = lazy(() => import('@/pages/editor/EditorPage'))
const DailyPage = lazy(() => import('@/pages/daily/DailyPage'))
const DailyHistoryPage = lazy(() => import('@/pages/daily/DailyHistoryPage'))
const GitPage = lazy(() => import('@/pages/git/GitPage'))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'))
const ImpedimentsPage = lazy(() => import('@/pages/impediments/ImpedimentsPage'))
const SprintsPage = lazy(() => import('@/pages/sprints/SprintsPage'))
const KanbanPage = lazy(() => import('@/pages/kanban/KanbanPage'))
const ProjectsPage = lazy(() => import('@/pages/projects/ProjectsPage'))

// Minimal spinner shown while a page chunk is downloading
function PageLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-3, #6b7280)',
        fontSize: '13px',
        gap: '8px',
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        style={{ animation: 'spin 0.8s linear infinite' }}
      >
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      Cargando…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/notes-map" replace />,
      },
      {
        path: 'notes-map',
        element: (
          <S>
            <NotesMapPage />
          </S>
        ),
      },
      {
        path: 'editor',
        element: (
          <S>
            <EditorPage />
          </S>
        ),
      },
      {
        path: 'editor/:noteId',
        element: (
          <S>
            <EditorPage />
          </S>
        ),
      },
      {
        path: 'daily',
        element: (
          <S>
            <DailyPage />
          </S>
        ),
      },
      {
        path: 'daily/history',
        element: (
          <S>
            <DailyHistoryPage />
          </S>
        ),
      },
      {
        path: 'daily/:date',
        element: (
          <S>
            <DailyPage />
          </S>
        ),
      },
      {
        path: 'git',
        element: (
          <S>
            <GitPage />
          </S>
        ),
      },
      {
        path: 'impediments',
        element: (
          <S>
            <ImpedimentsPage />
          </S>
        ),
      },
      {
        path: 'sprints',
        element: (
          <S>
            <SprintsPage />
          </S>
        ),
      },
      {
        path: 'kanban',
        element: (
          <S>
            <KanbanPage />
          </S>
        ),
      },
      {
        path: 'projects',
        element: (
          <S>
            <ProjectsPage />
          </S>
        ),
      },
      {
        path: 'settings',
        element: (
          <S>
            <SettingsPage />
          </S>
        ),
      },
    ],
  },
])
