import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import notesReducer, { removeAttachment } from './slices/notesSlice'
import dailyReducer from './slices/dailySlice'
import gitReducer from './slices/gitSlice'
import settingsReducer, { defaultSettings } from './slices/settingsSlice'
import uiReducer from './slices/uiSlice'
import templatesReducer from './slices/templatesSlice'
import { BUILTIN_TEMPLATES } from './slices/templatesSlice'
import foldersReducer from './slices/foldersSlice'
import impedimentsReducer from './slices/impedimentsSlice'
import { deleteAttachmentBlob } from '@/lib/attachmentsDb'

// ─── Listener middleware (side-effects tied to actions) ────────────────────────

const listenerMiddleware = createListenerMiddleware()

// Clean up IndexedDB blob whenever an attachment is removed
listenerMiddleware.startListening({
  actionCreator: removeAttachment,
  effect: async action => {
    void deleteAttachmentBlob(action.payload.attachmentId)
  },
})

// ─── Persistence helpers ───────────────────────────────────────────────────────

const STORAGE_KEY = 'agilens_state'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const saved = JSON.parse(raw) as {
      notes?: { notes?: Array<Record<string, unknown>>; loading?: boolean }
      daily?: unknown
      settings?: Record<string, unknown>
      templates?: { templates?: unknown[]; defaultTemplateId?: string }
      impediments?: unknown
    }
    // Merge stored settings with current defaults — ensures new fields are always present
    if (saved.settings) {
      saved.settings = {
        ...(defaultSettings as unknown as Record<string, unknown>),
        ...saved.settings,
      }
    }
    // Migrate notes: ensure noteType exists
    if (saved.notes?.notes) {
      saved.notes.notes = saved.notes.notes.map(n => (n.noteType ? n : { ...n, noteType: 'note' }))
    }
    // Ensure builtins are always present in templates
    if (saved.templates?.templates) {
      const stored = saved.templates.templates as Array<{ id: string }>
      const storedIds = new Set(stored.map(t => t.id))
      const missing = BUILTIN_TEMPLATES.filter(t => !storedIds.has(t.id))
      saved.templates.templates = [...missing, ...stored]
    }
    // Migrate notes: ensure attachments array exists
    if (saved.notes?.notes) {
      saved.notes.notes = saved.notes.notes.map(n =>
        n.attachments ? n : { ...n, attachments: [] }
      )
    }
    return saved
  } catch {
    return undefined
  }
}

function saveState(state: ReturnType<typeof store.getState>) {
  try {
    const { notes, daily, settings, templates, folders, impediments } = state
    // Strip dataUrl from attachments before saving to localStorage.
    // Blobs are persisted separately in IndexedDB (see src/lib/attachmentsDb.ts).
    const notesWithoutBlobs = {
      ...notes,
      notes: notes.notes.map(n => ({
        ...n,
        attachments: n.attachments.map(({ dataUrl: _dataUrl, ...rest }) => rest),
      })),
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ notes: notesWithoutBlobs, daily, settings, templates, folders, impediments })
    )
  } catch {
    // storage full or unavailable
  }
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const store = configureStore({
  reducer: {
    notes: notesReducer,
    daily: dailyReducer,
    git: gitReducer,
    settings: settingsReducer,
    ui: uiReducer,
    templates: templatesReducer,
    folders: foldersReducer,
    impediments: impedimentsReducer,
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware().prepend(listenerMiddleware.middleware),
  preloadedState: loadState() as undefined,
})

// Persist notes + daily + settings to localStorage on every change
store.subscribe(() => saveState(store.getState()))

// ─── Types ─────────────────────────────────────────────────────────────────────

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// ─── Typed hooks ───────────────────────────────────────────────────────────────

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector = <T>(selector: (state: RootState) => T) => useSelector(selector)
