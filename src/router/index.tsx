import { createBrowserRouter, Navigate } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import EditorPage from '@/pages/editor/EditorPage'
import NotesMapPage from '@/pages/notes-map/NotesMapPage'
import DailyPage from '@/pages/daily/DailyPage'
import DailyHistoryPage from '@/pages/daily/DailyHistoryPage'
import GitPage from '@/pages/git/GitPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import ImpedimentsPage from '@/pages/impediments/ImpedimentsPage'
import SprintsPage from '@/pages/sprints/SprintsPage'

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
        element: <NotesMapPage />,
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
        path: 'impediments',
        element: <ImpedimentsPage />,
      },
      {
        path: 'sprints',
        element: <SprintsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
])
