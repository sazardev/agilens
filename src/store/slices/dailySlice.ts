import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { DailyEntry, Sprint } from '@/types'

interface DailyState {
  entries: DailyEntry[]
  sprints: Sprint[]
  activeSprintId: string | null
}

const initialState: DailyState = {
  entries: [],
  sprints: [],
  activeSprintId: null,
}

const dailySlice = createSlice({
  name: 'daily',
  initialState,
  reducers: {
    addEntry(state, action: PayloadAction<DailyEntry>) {
      state.entries.unshift(action.payload)
    },
    updateEntry(state, action: PayloadAction<Partial<DailyEntry> & { id: string }>) {
      const idx = state.entries.findIndex(e => e.id === action.payload.id)
      if (idx !== -1) state.entries[idx] = { ...state.entries[idx], ...action.payload }
    },
    deleteEntry(state, action: PayloadAction<string>) {
      state.entries = state.entries.filter(e => e.id !== action.payload)
    },
    addSprint(state, action: PayloadAction<Sprint>) {
      state.sprints.push(action.payload)
    },
    setActiveSprint(state, action: PayloadAction<string | null>) {
      state.activeSprintId = action.payload
    },
    setEntries(state, action: PayloadAction<DailyEntry[]>) {
      state.entries = action.payload
    },
    setSprints(state, action: PayloadAction<Sprint[]>) {
      state.sprints = action.payload
    },
  },
})

export const {
  addEntry,
  updateEntry,
  deleteEntry,
  addSprint,
  setActiveSprint,
  setEntries,
  setSprints,
} = dailySlice.actions

export default dailySlice.reducer
