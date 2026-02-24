import { createBrowserRouter, Navigate } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import EditorPage from '@/pages/editor/EditorPage'
import DailyPage from '@/pages/daily/DailyPage'
import DailyHistoryPage from '@/pages/daily/DailyHistoryPage'
import GitPage from '@/pages/git/GitPage'
import SettingsPage from '@/pages/settings/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/editor" replace />,
      },
      {
        path: 'editor',
        element: <EditorPage />,
      },
      {
        path: 'editor/:noteId',
        element: <EditorPage />,
      },
      {
        path: 'daily',
        element: <DailyPage />,
      },
      {
        path: 'daily/history',
        element: <DailyHistoryPage />,
      },
      {
        path: 'daily/:date',
        element: <DailyPage />,
      },
      {
        path: 'git',
        element: <GitPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
])
