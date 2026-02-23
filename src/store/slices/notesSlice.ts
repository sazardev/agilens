import { createSlice, PayloadAction } from '@reduxjs/toolkit'
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
} = notesSlice.actions

export default notesSlice.reducer
