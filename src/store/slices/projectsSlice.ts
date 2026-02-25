import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Project } from '@/types'

// ─── State ────────────────────────────────────────────────────────────────────

interface ProjectsState {
  projects: Project[]
}

const initialState: ProjectsState = {
  projects: [],
}

// ─── Slice ────────────────────────────────────────────────────────────────────

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    addProject(state, action: PayloadAction<Project>) {
      state.projects.unshift(action.payload)
    },

    updateProject(state, action: PayloadAction<Partial<Project> & { id: string }>) {
      const idx = state.projects.findIndex(p => p.id === action.payload.id)
      if (idx !== -1) {
        state.projects[idx] = {
          ...state.projects[idx],
          ...action.payload,
          updatedAt: new Date().toISOString(),
        }
      }
    },

    deleteProject(state, action: PayloadAction<string>) {
      state.projects = state.projects.filter(p => p.id !== action.payload)
    },

    setProjects(state, action: PayloadAction<Project[]>) {
      state.projects = action.payload
    },

    archiveProject(state, action: PayloadAction<string>) {
      const p = state.projects.find(p => p.id === action.payload)
      if (p) {
        p.archived = true
        p.updatedAt = new Date().toISOString()
      }
    },

    unarchiveProject(state, action: PayloadAction<string>) {
      const p = state.projects.find(p => p.id === action.payload)
      if (p) {
        p.archived = false
        p.updatedAt = new Date().toISOString()
      }
    },

    /** Add a GitHub repo to a project (if not already linked) */
    linkRepo(state, action: PayloadAction<{ projectId: string; repoFullName: string }>) {
      const p = state.projects.find(p => p.id === action.payload.projectId)
      if (p && !p.repoFullNames.includes(action.payload.repoFullName)) {
        p.repoFullNames.push(action.payload.repoFullName)
        p.updatedAt = new Date().toISOString()
      }
    },

    unlinkRepo(state, action: PayloadAction<{ projectId: string; repoFullName: string }>) {
      const p = state.projects.find(p => p.id === action.payload.projectId)
      if (p) {
        p.repoFullNames = p.repoFullNames.filter(r => r !== action.payload.repoFullName)
        p.updatedAt = new Date().toISOString()
      }
    },
  },
})

export const {
  addProject,
  updateProject,
  deleteProject,
  setProjects,
  archiveProject,
  unarchiveProject,
  linkRepo,
  unlinkRepo,
} = projectsSlice.actions

export default projectsSlice.reducer
