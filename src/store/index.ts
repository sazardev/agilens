import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import notesReducer, { removeAttachment, addNote, bulkSetNoteFolders } from './slices/notesSlice'
import dailyReducer from './slices/dailySlice'
import gitReducer, { gitAutoCommit } from './slices/gitSlice'
import settingsReducer, { defaultSettings } from './slices/settingsSlice'
import uiReducer, { uiInitialState, setActiveNoteId } from './slices/uiSlice'
import templatesReducer from './slices/templatesSlice'
import { BUILTIN_TEMPLATES } from './slices/templatesSlice'
import foldersReducer, { autoOrganize, buildAutoFolders } from './slices/foldersSlice'
import impedimentsReducer from './slices/impedimentsSlice'
import projectsReducer from './slices/projectsSlice'
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

// Auto-organize folders whenever a note is added
listenerMiddleware.startListening({
  actionCreator: addNote,
  effect: (_, api) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = api.getState() as any
    const mode: string = state.ui?.autoOrganizeMode ?? 'off'
    if (mode === 'off') return
    const notes = state.notes?.notes ?? []
    const sprints = state.daily?.sprints ?? []
    const folders = state.folders?.folders ?? []
    const { assignments } = buildAutoFolders(
      folders,
      notes,
      sprints,
      mode as 'type' | 'sprint' | 'both'
    )
    api.dispatch(autoOrganize({ notes, sprints, mode: mode as 'type' | 'sprint' | 'both' }))
    api.dispatch(bulkSetNoteFolders(assignments))
  },
})

// Auto-commit when a new note is created
listenerMiddleware.startListening({
  actionCreator: addNote,
  effect: (action, api) => {
    const { id, title, content } = action.payload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (api.dispatch as any)(gitAutoCommit({ noteId: id, noteTitle: title, content }))
  },
})

// Auto-commit the previous note when the user switches to a different note
listenerMiddleware.startListening({
  actionCreator: setActiveNoteId,
  effect: (action, api) => {
    const prevState = api.getOriginalState() as RootState
    const prevNoteId = prevState.ui.activeNoteId
    if (!prevNoteId || prevNoteId === action.payload) return
    const prevNote = prevState.notes.notes.find(n => n.id === prevNoteId)
    if (!prevNote) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (api.dispatch as any)(
      gitAutoCommit({ noteId: prevNoteId, noteTitle: prevNote.title, content: prevNote.content })
    )
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
      autoOrganizeMode?: string
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
    // Remove stale partial `ui` key (saved in a previous session) so that
    // uiSlice can use its own initialState (sidebarWidth, sidebarOpen, etc.).
    delete (saved as Record<string, unknown>).ui
    // Restore only autoOrganizeMode into a full ui object (merges with defaults).
    const autoOrganizeMode = saved.autoOrganizeMode
    delete (saved as Record<string, unknown>).autoOrganizeMode
    return {
      ...saved,
      ...(autoOrganizeMode ? { ui: { ...uiInitialState, autoOrganizeMode } } : {}),
    }
  } catch {
    return undefined
  }
}

function saveState(state: ReturnType<typeof store.getState>) {
  try {
    const { notes, daily, settings, templates, folders, impediments, projects } = state
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
      JSON.stringify({
        notes: notesWithoutBlobs,
        daily,
        settings,
        templates,
        folders,
        impediments,
        projects,
        autoOrganizeMode: state.ui.autoOrganizeMode,
      })
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
    projects: projectsReducer,
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
