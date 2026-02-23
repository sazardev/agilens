import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { AppSettings } from '@/types'

export const defaultSettings: AppSettings = {
  github: null,
  editorFontSize: 14,
  editorTheme: 'dark',
  uiTheme: 'dark',
  accentColor: 'indigo',
  customAccentHex: '#4f46e5',
  editorFont: 'fira-code',
  uiDensity: 'default',
  defaultSprintId: undefined,
  userName: '',
  userEmail: '',
  lineHeight: 1.7,
  wordWrap: true,
  // ─── Markdown preview ─────────────────────────────────────────────────────
  markdownPreviewFont: 'sans',
  markdownProseWidth: 760,
  markdownShowReadingTime: true,
  markdownHeadingAnchors: true,
  markdownCopyCode: true,
  markdownCodeHighlight: true,
  markdownTabSize: 2,
  markdownSpellcheck: false,
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState: defaultSettings,
  reducers: {
    updateSettings(state, action: PayloadAction<Partial<AppSettings>>) {
      return { ...state, ...action.payload }
    },
    setGitHubConfig(state, action: PayloadAction<AppSettings['github']>) {
      state.github = action.payload
    },
    resetSettings() {
      return defaultSettings
    },
  },
})

export const { updateSettings, setGitHubConfig, resetSettings } = settingsSlice.actions

export default settingsSlice.reducer
