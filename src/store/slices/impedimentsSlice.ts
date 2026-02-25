import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Impediment } from '@/types'

interface ImpedimentsState {
  impediments: Impediment[]
}

const initialState: ImpedimentsState = {
  impediments: [],
}

const impedimentsSlice = createSlice({
  name: 'impediments',
  initialState,
  reducers: {
    addImpediment(state, action: PayloadAction<Impediment>) {
      state.impediments.unshift(action.payload)
    },
    updateImpediment(state, action: PayloadAction<Partial<Impediment> & { id: string }>) {
      const idx = state.impediments.findIndex(i => i.id === action.payload.id)
      if (idx !== -1) state.impediments[idx] = { ...state.impediments[idx], ...action.payload }
    },
    deleteImpediment(state, action: PayloadAction<string>) {
      state.impediments = state.impediments.filter(i => i.id !== action.payload)
    },
    setImpediments(state, action: PayloadAction<Impediment[]>) {
      state.impediments = action.payload
    },
    /** Link a daily entry to an impediment */
    linkEntry(state, action: PayloadAction<{ impedimentId: string; entryId: string }>) {
      const imp = state.impediments.find(i => i.id === action.payload.impedimentId)
      if (imp) {
        imp.linkedEntryIds = imp.linkedEntryIds ?? []
        if (!imp.linkedEntryIds.includes(action.payload.entryId)) {
          imp.linkedEntryIds.push(action.payload.entryId)
        }
      }
    },
    unlinkEntry(state, action: PayloadAction<{ impedimentId: string; entryId: string }>) {
      const imp = state.impediments.find(i => i.id === action.payload.impedimentId)
      if (imp && imp.linkedEntryIds) {
        imp.linkedEntryIds = imp.linkedEntryIds.filter(id => id !== action.payload.entryId)
      }
    },
    /** Link a note (task) to an impediment */
    linkNote(state, action: PayloadAction<{ impedimentId: string; noteId: string }>) {
      const imp = state.impediments.find(i => i.id === action.payload.impedimentId)
      if (imp) {
        imp.linkedNoteIds = imp.linkedNoteIds ?? []
        if (!imp.linkedNoteIds.includes(action.payload.noteId)) {
          imp.linkedNoteIds.push(action.payload.noteId)
        }
      }
    },
    unlinkNote(state, action: PayloadAction<{ impedimentId: string; noteId: string }>) {
      const imp = state.impediments.find(i => i.id === action.payload.impedimentId)
      if (imp && imp.linkedNoteIds) {
        imp.linkedNoteIds = imp.linkedNoteIds.filter(id => id !== action.payload.noteId)
      }
    },
    /** Link an impediment to a project */
    setImpedimentProject(
      state,
      action: PayloadAction<{ impedimentId: string; projectId: string | undefined }>
    ) {
      const imp = state.impediments.find(i => i.id === action.payload.impedimentId)
      if (imp) imp.projectId = action.payload.projectId
    },
  },
})

export const {
  addImpediment,
  updateImpediment,
  deleteImpediment,
  setImpediments,
  linkEntry,
  unlinkEntry,
  linkNote,
  unlinkNote,
  setImpedimentProject,
} = impedimentsSlice.actions

export default impedimentsSlice.reducer
