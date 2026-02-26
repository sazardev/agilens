import { useEffect, useState, useCallback } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/router'
import { useAppDispatch, useAppSelector } from '@/store'
import { gitDetect } from '@/store/slices/gitSlice'
import { hydrateAttachments } from '@/store/slices/notesSlice'
import { loadAllAttachmentBlobs, saveAttachmentBlob } from '@/lib/attachmentsDb'
import InstallPrompt from '@/components/pwa/InstallPrompt'
import LockScreen, { touchActivity, getLastActivity } from '@/components/security/LockScreen'
import LandingPage from '@/pages/landing/LandingPage'

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']

function AppInner() {
  const dispatch = useAppDispatch()
  const notes = useAppSelector(s => s.notes.notes)
  const lockEnabled = useAppSelector(s => s.settings.lockEnabled)
  const lockPasswordHash = useAppSelector(s => s.settings.lockPasswordHash)
  const lockTimeoutMinutes = useAppSelector(s => s.settings.lockTimeoutMinutes)
  const lockOnHide = useAppSelector(s => s.settings.lockOnHide)

  const [showLanding, setShowLanding] = useState(() => !localStorage.getItem('agilens_onboarded'))

  const [locked, setLocked] = useState(() => {
    if (!lockEnabled || !lockPasswordHash) return false
    if (lockTimeoutMinutes <= 0) {
      // Check if previously unlocked this session
      return getLastActivity() === 0
    }
    const elapsed = (Date.now() - getLastActivity()) / 60000
    return elapsed >= lockTimeoutMinutes
  })

  // ── Activity tracking ──────────────────────────────────────────────────────
  const bumpActivity = useCallback(() => {
    if (lockEnabled && lockTimeoutMinutes > 0) touchActivity()
  }, [lockEnabled, lockTimeoutMinutes])

  useEffect(() => {
    if (!lockEnabled || lockTimeoutMinutes <= 0) return
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, bumpActivity, { passive: true }))
    return () => ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, bumpActivity))
  }, [lockEnabled, lockTimeoutMinutes, bumpActivity])

  // ── Timeout check (every 30s) ─────────────────────────────────────────────
  useEffect(() => {
    if (!lockEnabled || lockTimeoutMinutes <= 0) return
    const id = setInterval(() => {
      const elapsed = (Date.now() - getLastActivity()) / 60000
      if (elapsed >= lockTimeoutMinutes) setLocked(true)
    }, 30_000)
    return () => clearInterval(id)
  }, [lockEnabled, lockTimeoutMinutes])

  // ── Lock on hide (visibilitychange) ───────────────────────────────────────
  useEffect(() => {
    if (!lockEnabled || !lockOnHide) return
    const handler = () => {
      if (document.hidden) setLocked(true)
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [lockEnabled, lockOnHide])

  // ── Re-evaluate when settings change ─────────────────────────────────────
  useEffect(() => {
    if (!lockEnabled || !lockPasswordHash) {
      setLocked(false)
      return
    }
    if (lockTimeoutMinutes <= 0) {
      setLocked(getLastActivity() === 0)
    } else {
      const elapsed = (Date.now() - getLastActivity()) / 60000
      setLocked(elapsed >= lockTimeoutMinutes)
    }
  }, [lockEnabled, lockPasswordHash, lockTimeoutMinutes])

  useEffect(() => {
    dispatch(gitDetect())
    const migrationPromises: Promise<void>[] = []
    for (const note of notes) {
      for (const att of note.attachments) {
        if (att.dataUrl) {
          migrationPromises.push(saveAttachmentBlob(att.id, att.dataUrl))
        }
      }
    }
    void Promise.all(migrationPromises).then(() =>
      loadAllAttachmentBlobs().then(blobs => {
        if (Object.keys(blobs).length > 0) {
          dispatch(hydrateAttachments(blobs))
        }
      })
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (locked && lockEnabled && lockPasswordHash) {
    return (
      <LockScreen
        passwordHash={lockPasswordHash}
        onUnlock={() => {
          touchActivity()
          setLocked(false)
        }}
      />
    )
  }

  if (showLanding) {
    return (
      <LandingPage
        onEnter={() => {
          localStorage.setItem('agilens_onboarded', '1')
          setShowLanding(false)
        }}
      />
    )
  }

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
