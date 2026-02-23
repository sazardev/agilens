import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/router'
import { useAppDispatch } from '@/store'
import { gitDetect } from '@/store/slices/gitSlice'

function AppInner() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    // On startup, check if a Git repo already exists in LightningFS (IndexedDB)
    // and restore the Redux git state without requiring re-initialization
    dispatch(gitDetect())
  }, [dispatch])

  return <RouterProvider router={router} />
}

export default function App() {
  return <AppInner />
}
