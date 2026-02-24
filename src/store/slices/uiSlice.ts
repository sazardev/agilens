import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { UIState, NotesGroupBy, AutoOrganizeMode } from '@/types'

export const uiInitialState: UIState = {
  activeView: 'editor',
  sidebarOpen: true,
  sidebarWidth: 240,
  sidebarAutoHide: false,
  activeNoteId: null,
  editorPreviewMode: 'split',
  notesGroupBy: 'none',
  notesTypeFilter: null,
  autoOrganizeMode: 'off',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: uiInitialState,
  reducers: {
    setActiveView(state, action: PayloadAction<UIState['activeView']>) {
      state.activeView = action.payload
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload
    },
    setActiveNoteId(state, action: PayloadAction<string | null>) {
      state.activeNoteId = action.payload
    },
    setEditorPreviewMode(state, action: PayloadAction<UIState['editorPreviewMode']>) {
      state.editorPreviewMode = action.payload
    },
    setSidebarWidth(state, action: PayloadAction<number>) {
      state.sidebarWidth = Math.min(520, Math.max(180, action.payload))
    },
    setSidebarAutoHide(state, action: PayloadAction<boolean>) {
      state.sidebarAutoHide = action.payload
    },
    setNotesGroupBy(state, action: PayloadAction<NotesGroupBy>) {
      state.notesGroupBy = action.payload
    },
    setNotesTypeFilter(state, action: PayloadAction<string | null>) {
      state.notesTypeFilter = action.payload
    },
    setAutoOrganizeMode(state, action: PayloadAction<AutoOrganizeMode>) {
      state.autoOrganizeMode = action.payload
    },
  },
})

export const {
  setActiveView,
  toggleSidebar,
  setSidebarOpen,
  setActiveNoteId,
  setEditorPreviewMode,
  setSidebarWidth,
  setSidebarAutoHide,
  setNotesGroupBy,
  setNotesTypeFilter,
  setAutoOrganizeMode,
} = uiSlice.actions

export default uiSlice.reducer
