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
} = notesSlice.actions

export default notesSlice.reducer
