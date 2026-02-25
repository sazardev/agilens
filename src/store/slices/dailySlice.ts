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
    updateSprint(state, action: PayloadAction<Partial<Sprint> & { id: string }>) {
      const idx = state.sprints.findIndex(s => s.id === action.payload.id)
      if (idx !== -1) state.sprints[idx] = { ...state.sprints[idx], ...action.payload }
    },
    deleteSprint(state, action: PayloadAction<string>) {
      if (state.activeSprintId === action.payload) state.activeSprintId = null
      state.sprints = state.sprints.filter(s => s.id !== action.payload)
    },
    /** Set the projects linked to a daily entry */
    setEntryProjects(state, action: PayloadAction<{ entryId: string; projectIds: string[] }>) {
      const e = state.entries.find(e => e.id === action.payload.entryId)
      if (e) e.projectIds = action.payload.projectIds
    },
    /** Set the repos referenced in a daily entry */
    setEntryRepos(state, action: PayloadAction<{ entryId: string; repoRefs: string[] }>) {
      const e = state.entries.find(e => e.id === action.payload.entryId)
      if (e) e.repoRefs = action.payload.repoRefs
    },
    /** Set the projects involved in a sprint */
    setSprintProjects(state, action: PayloadAction<{ sprintId: string; projectIds: string[] }>) {
      const s = state.sprints.find(s => s.id === action.payload.sprintId)
      if (s) s.projectIds = action.payload.projectIds
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
  updateSprint,
  deleteSprint,
  setEntryProjects,
  setEntryRepos,
  setSprintProjects,
} = dailySlice.actions

export default dailySlice.reducer
