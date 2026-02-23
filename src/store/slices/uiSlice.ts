import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { UIState } from '@/types'

const initialState: UIState = {
  activeView: 'editor',
  sidebarOpen: true,
  sidebarWidth: 240,
  sidebarAutoHide: false,
  activeNoteId: null,
  editorPreviewMode: 'split',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
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
} = uiSlice.actions

export default uiSlice.reducer
