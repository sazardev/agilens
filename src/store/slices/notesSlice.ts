import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Note, NoteAttachment } from '@/types'

interface NotesState {
  notes: Note[]
  loading: boolean
}

const initialState: NotesState = {
  notes: [],
  loading: false,
}

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    setNotes(state, action: PayloadAction<Note[]>) {
      state.notes = action.payload
    },
    addNote(state, action: PayloadAction<Note>) {
      state.notes.unshift(action.payload)
    },
    updateNote(state, action: PayloadAction<Partial<Note> & { id: string }>) {
      const idx = state.notes.findIndex(n => n.id === action.payload.id)
      if (idx !== -1) {
        state.notes[idx] = {
          ...state.notes[idx],
          ...action.payload,
          updatedAt: new Date().toISOString(),
        }
      }
    },
    deleteNote(state, action: PayloadAction<string>) {
      state.notes = state.notes.filter(n => n.id !== action.payload)
    },
    addAttachment(state, action: PayloadAction<{ noteId: string; attachment: NoteAttachment }>) {
      const note = state.notes.find(n => n.id === action.payload.noteId)
      if (note) note.attachments.push(action.payload.attachment)
    },
    removeAttachment(state, action: PayloadAction<{ noteId: string; attachmentId: string }>) {
      const note = state.notes.find(n => n.id === action.payload.noteId)
      if (note) {
        note.attachments = note.attachments.filter(a => a.id !== action.payload.attachmentId)
      }
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
    /** Move a single note to a folder (or root when null) */
    setNoteFolder(state, action: PayloadAction<{ noteId: string; folderId: string | null }>) {
      const note = state.notes.find(n => n.id === action.payload.noteId)
      if (note) note.folderId = action.payload.folderId ?? undefined
    },
    /** Bulk assign — used by auto-organize  */
    bulkSetNoteFolders(state, action: PayloadAction<Record<string, string>>) {
      for (const [noteId, folderId] of Object.entries(action.payload)) {
        const note = state.notes.find(n => n.id === noteId)
        if (note) note.folderId = folderId
      }
    },
    /** Clear all folder assignments (when folders are cleared) */
    clearNoteFolders(state) {
      state.notes.forEach(n => {
        n.folderId = undefined
      })
    },
    /**
     * Restore attachment dataUrls from IndexedDB after page load.
     * Payload: id → dataUrl map for every persisted blob.
     */
    hydrateAttachments(state, action: PayloadAction<Record<string, string>>) {
      const blobs = action.payload
      for (const note of state.notes) {
        for (const att of note.attachments) {
          if (blobs[att.id]) att.dataUrl = blobs[att.id]
        }
      }
    },
    /** Toggle pinned state — pinned notes float to the top of the list */
    toggleNotePin(state, action: PayloadAction<string>) {
      const note = state.notes.find(n => n.id === action.payload)
      if (note) note.pinned = !note.pinned
    },
    /** Toggle locked (read-only) state */
    toggleNoteLocked(state, action: PayloadAction<string>) {
      const note = state.notes.find(n => n.id === action.payload)
      if (note) note.locked = !note.locked
    },
    /** Set a highlight color label (hex string) or clear it (undefined) */
    setNoteColor(state, action: PayloadAction<{ id: string; color: string | undefined }>) {
      const note = state.notes.find(n => n.id === action.payload.id)
      if (note) note.color = action.payload.color
    },
    /** Set kanban column status for a task note */
    setKanbanStatus(
      state,
      action: PayloadAction<{ id: string; status: import('@/types').KanbanStatus }>
    ) {
      const note = state.notes.find(n => n.id === action.payload.id)
      if (note) note.kanbanStatus = action.payload.status
    },
    /** Set priority for a task note */
    setNotePriority(
      state,
      action: PayloadAction<{ id: string; priority: import('@/types').TaskPriority | undefined }>
    ) {
      const note = state.notes.find(n => n.id === action.payload.id)
      if (note) note.priority = action.payload.priority
    },
    /** Set story points for a task note */
    setStoryPoints(state, action: PayloadAction<{ id: string; points: number | undefined }>) {
      const note = state.notes.find(n => n.id === action.payload.id)
      if (note) note.storyPoints = action.payload.points
    },
    /** Link a note to a Project (or clear with undefined) */
    setNoteProject(state, action: PayloadAction<{ id: string; projectId: string | undefined }>) {
      const note = state.notes.find(n => n.id === action.payload.id)
      if (note) note.projectId = action.payload.projectId
    },
  },
})

export const {
  setNotes,
  addNote,
  updateNote,
  deleteNote,
  addAttachment,
  removeAttachment,
  setLoading,
  setNoteFolder,
  bulkSetNoteFolders,
  clearNoteFolders,
  hydrateAttachments,
  toggleNotePin,
  toggleNoteLocked,
  setNoteColor,
  setKanbanStatus,
  setNotePriority,
  setStoryPoints,
  setNoteProject,
} = notesSlice.actions

export default notesSlice.reducer
