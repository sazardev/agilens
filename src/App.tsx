import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/router'
import { useAppDispatch, useAppSelector } from '@/store'
import { gitDetect } from '@/store/slices/gitSlice'
import { hydrateAttachments } from '@/store/slices/notesSlice'
import { loadAllAttachmentBlobs, saveAttachmentBlob } from '@/lib/attachmentsDb'
import InstallPrompt from '@/components/pwa/InstallPrompt'

function AppInner() {
  const dispatch = useAppDispatch()
  // Used only during the one-time migration of legacy dataUrls from localStorage → IndexedDB
  const notes = useAppSelector(s => s.notes.notes)

  useEffect(() => {
    // Restore git state if a repo already exists in LightningFS
    dispatch(gitDetect())

    // ── Attachment blob hydration ────────────────────────────────────────────
    // 1. Migrate legacy dataUrls that were loaded from localStorage on this first run
    const migrationPromises: Promise<void>[] = []
    for (const note of notes) {
      for (const att of note.attachments) {
        if (att.dataUrl) {
          // Save legacy blob to IndexedDB so it persists after localStorage is cleaned
          migrationPromises.push(saveAttachmentBlob(att.id, att.dataUrl))
        }
      }
    }
    // 2. After migration, load all blobs from IndexedDB and patch Redux state
    void Promise.all(migrationPromises).then(() =>
      loadAllAttachmentBlobs().then(blobs => {
        if (Object.keys(blobs).length > 0) {
          dispatch(hydrateAttachments(blobs))
        }
      })
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally runs once on mount only

  return <RouterProvider router={router} />
}

export default function App() {
  return (
    <>
      <AppInner />
      <InstallPrompt />
    </>
  )
}
