import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { GitFileStatus, GitCommit, GitBranch, GitHubConfig } from '@/types'
import * as gitClient from '@/lib/git/client'
import { updateSettings } from '@/store/slices/settingsSlice'
import { setNotes } from '@/store/slices/notesSlice'
import { setEntries, setSprints } from '@/store/slices/dailySlice'
import { setImpediments } from '@/store/slices/impedimentsSlice'
import { setProjects } from '@/store/slices/projectsSlice'
import { setFolders } from '@/store/slices/foldersSlice'
import { restoreTemplates } from '@/store/slices/templatesSlice'

export const GIT_DIR = '/agilens'

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function snapshot(dir: string) {
  const [status, log, branches] = await Promise.all([
    gitClient.getStatus(dir),
    gitClient.getLog(dir),
    gitClient.getBranches(dir),
  ])
  const currentBranch = branches.find(b => b.isCurrent)?.name ?? 'main'
  // Resolve the remote tracking ref so we know which commits are already on GitHub
  const remoteOid = await gitClient.getRemoteOid(dir, currentBranch)
  return { status, log, branches, currentBranch, remoteOid }
}

// ─── Async thunks ─────────────────────────────────────────────────────────────

export const gitInit = createAsyncThunk(
  'git/init',
  async (
    {
      name,
      email,
      notes = [],
    }: {
      name: string
      email: string
      notes?: Array<{ id: string; content: string }>
    },
    { getState }
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = getState() as any
    await gitClient.initRepo(GIT_DIR, { name, email })
    // Write all existing notes to the virtual FS before the initial commit
    for (const note of notes) {
      await gitClient.writeNoteFile(GIT_DIR, note.id, note.content)
    }
    // Always write the config file so settings are tracked in git
    if (state.settings) {
      await gitClient.writeConfigFile(GIT_DIR, state.settings)
    }
    // Write full app state so it can be restored on clone/pull
    await gitClient.writeAppStateFile(GIT_DIR, {
      notes: state.notes?.notes ?? [],
      dailyEntries: state.daily?.entries ?? [],
      sprints: state.daily?.sprints ?? [],
      impediments: state.impediments?.impediments ?? [],
      folders: state.folders?.folders ?? [],
      projects: state.projects?.projects ?? [],
      templates: state.templates?.templates ?? [],
      defaultTemplateId: state.templates?.defaultTemplateId ?? 'tpl-note',
    })
    // stage + commit notes + config
    await gitClient.commitAll(GIT_DIR, 'chore: init agilens repo', { name, email })
    const snap = await snapshot(GIT_DIR)
    return { rootDir: GIT_DIR, ...snap }
  }
)

export const gitRefresh = createAsyncThunk('git/refresh', async (dir: string) => {
  return snapshot(dir)
})

/**
 * Sync all note files to LightningFS (write existing, remove deleted),
 * then refresh git status. This is the correct way to see pending changes
 * before committing.
 */
export const gitSyncStatus = createAsyncThunk(
  'git/syncStatus',
  async ({ dir, notes }: { dir: string; notes: Array<{ id: string; content: string }> }) => {
    await gitClient.syncNoteFiles(dir, notes)
    return snapshot(dir)
  }
)

export const gitCommit = createAsyncThunk(
  'git/commit',
  async (
    {
      dir,
      message,
      name,
      email,
      notes = [],
    }: {
      dir: string
      message: string
      name: string
      email: string
      /** Current notes from Redux — written to LightningFS before committing */
      notes?: Array<{ id: string; content: string }>
    },
    { getState }
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = getState() as any
    // Sync note content to virtual FS so git has real file state
    for (const note of notes) {
      await gitClient.writeNoteFile(dir, note.id, note.content)
    }
    // Always include updated settings in the commit
    if (state.settings) {
      await gitClient.writeConfigFile(dir, state.settings)
    }
    // Write full app state so it can be restored on clone/pull
    await gitClient.writeAppStateFile(dir, {
      notes: state.notes?.notes ?? [],
      dailyEntries: state.daily?.entries ?? [],
      sprints: state.daily?.sprints ?? [],
      impediments: state.impediments?.impediments ?? [],
      folders: state.folders?.folders ?? [],
      projects: state.projects?.projects ?? [],
      templates: state.templates?.templates ?? [],
      defaultTemplateId: state.templates?.defaultTemplateId ?? 'tpl-note',
    })
    await gitClient.commitAll(dir, message, { name, email })
    return snapshot(dir)
  }
)

export const gitPush = createAsyncThunk(
  'git/push',
  async ({ dir, config }: { dir: string; config: GitHubConfig }) => {
    await gitClient.setRemote(dir, config)
    await gitClient.pushToGitHub(dir, config)
  }
)

export const gitCreateBranch = createAsyncThunk(
  'git/createBranch',
  async ({ dir, name }: { dir: string; name: string }) => {
    await gitClient.createBranch(dir, name)
    const branches = await gitClient.getBranches(dir)
    return branches
  }
)

export const gitCheckout = createAsyncThunk(
  'git/checkout',
  async ({ dir, ref }: { dir: string; ref: string }) => {
    await gitClient.checkoutBranch(dir, ref)
    const snap = await snapshot(dir)
    return snap
  }
)

/**
 * Detect an existing repo in LightningFS on app startup.
 * If the repo exists, loads state and sets initialized = true.
 * If not, silently resolves as null.
 */
export const gitDetect = createAsyncThunk('git/detect', async () => {
  try {
    // getLog will throw if .git doesn't exist
    const snap = await snapshot(GIT_DIR)
    return { rootDir: GIT_DIR, ...snap }
  } catch {
    return null
  }
})

/**
 * Silently write + commit a single note file.
 * Used by auto-commit listeners (note creation, note switch).
 * No-op when git is not initialized or rootDir is null.
 */
export const gitAutoCommit = createAsyncThunk(
  'git/autoCommit',
  async (
    { noteId, noteTitle, content }: { noteId: string; noteTitle: string; content: string },
    { getState }
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = getState() as any
    const initialized: boolean = state.git?.initialized ?? false
    const rootDir: string | null = state.git?.rootDir ?? null
    if (!initialized || !rootDir) return null

    const name: string = state.settings?.userName || 'Agilens'
    const email: string = state.settings?.userEmail || 'notes@agilens.app'

    if (state.settings) {
      await gitClient.writeConfigFile(rootDir, state.settings)
    }
    // Write full app state so it can be restored on clone/pull
    await gitClient.writeAppStateFile(rootDir, {
      notes: state.notes?.notes ?? [],
      dailyEntries: state.daily?.entries ?? [],
      sprints: state.daily?.sprints ?? [],
      impediments: state.impediments?.impediments ?? [],
      folders: state.folders?.folders ?? [],
      projects: state.projects?.projects ?? [],
      templates: state.templates?.templates ?? [],
      defaultTemplateId: state.templates?.defaultTemplateId ?? 'tpl-note',
    })
    await gitClient.writeNoteFile(rootDir, noteId, content)
    try {
      await gitClient.commitAll(rootDir, `note: ${noteTitle.slice(0, 60)}`, { name, email })
    } catch {
      // nothing to commit (content identical to last commit)
      return null
    }
    return await snapshot(rootDir)
  }
)

export const gitPull = createAsyncThunk(
  'git/pull',
  async ({ dir, config }: { dir: string; config: GitHubConfig }, { getState, dispatch }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = getState() as any
    const name: string = state.settings?.userName || 'Agilens'
    const email: string = state.settings?.userEmail || 'notes@agilens.app'
    await gitClient.pullFromGitHub(dir, config, { name, email })
    // Restore settings (including lock config) from the pulled config file
    const savedSettings = await gitClient.readConfigFile(dir)
    if (savedSettings) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(dispatch as any)(updateSettings(savedSettings))
    }
    // Restore full app state from the saved snapshot in the repo
    const appState = await gitClient.readAppStateFile(dir)
    const noteFiles = await gitClient.readNoteFilesFromFS(dir)
    if (appState) {
      // Merge note metadata (from JSON) with note content (from .md files)
      const contentMapPull = new Map(noteFiles.map(f => [f.id, f.content]))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(dispatch as any)(
        setNotes(
          appState.notes.map(meta => ({
            ...meta,
            content: contentMapPull.get(meta.id) ?? '',
          }))
        )
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(dispatch as any)(setEntries(appState.dailyEntries))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(dispatch as any)(setSprints(appState.sprints))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(dispatch as any)(setImpediments(appState.impediments))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(dispatch as any)(setFolders(appState.folders))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(dispatch as any)(setProjects(appState.projects))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(dispatch as any)(
        restoreTemplates({
          templates: appState.templates,
          defaultTemplateId: appState.defaultTemplateId,
        })
      )
    } else if (noteFiles.length > 0) {
      // Fallback for repos without agilens-app-state.json (imported/older repos)
      const now = new Date().toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(dispatch as any)(
        setNotes(
          noteFiles.map(f => {
            const firstLine = f.content.split('\n').find(l => l.trim()) ?? ''
            const title = firstLine.startsWith('#') ? firstLine.replace(/^#+\s*/, '').trim() : f.id
            return {
              id: f.id,
              title: title || f.id,
              content: f.content,
              noteType: 'note' as const,
              tags: [],
              createdAt: now,
              updatedAt: now,
              attachments: [],
            }
          })
        )
      )
    }
    const snap = await snapshot(dir)
    return { ...snap, noteFiles }
  }
)

export const gitClone = createAsyncThunk(
  'git/clone',
  async ({ dir, config }: { dir: string; config: GitHubConfig }, { getState, dispatch }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = getState() as any
    const name: string = state.settings?.userName || 'Agilens'
    const email: string = state.settings?.userEmail || 'notes@agilens.app'
    await gitClient.cloneFromGitHub(dir, config, { name, email })
    // Restore all settings (theme, fonts, lock config, etc.) from config file
    const savedSettings = await gitClient.readConfigFile(dir)
    if (savedSettings) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(dispatch as any)(updateSettings(savedSettings))
    }
    // Restore full app state from the saved snapshot in the repo
    const appState = await gitClient.readAppStateFile(dir)
    const noteFiles = await gitClient.readNoteFilesFromFS(dir)
    if (appState) {
      // Merge note metadata (from JSON) with note content (from .md files)
      const contentMapClone = new Map(noteFiles.map(f => [f.id, f.content]))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(dispatch as any)(
        setNotes(
          appState.notes.map(meta => ({
            ...meta,
            content: contentMapClone.get(meta.id) ?? '',
          }))
        )
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(dispatch as any)(setEntries(appState.dailyEntries))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(dispatch as any)(setSprints(appState.sprints))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(dispatch as any)(setImpediments(appState.impediments))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(dispatch as any)(setFolders(appState.folders))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(dispatch as any)(setProjects(appState.projects))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(dispatch as any)(
        restoreTemplates({
          templates: appState.templates,
          defaultTemplateId: appState.defaultTemplateId,
        })
      )
    } else if (noteFiles.length > 0) {
      // Fallback for repos without agilens-app-state.json (imported/older repos)
      const now = new Date().toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(dispatch as any)(
        setNotes(
          noteFiles.map(f => {
            const firstLine = f.content.split('\n').find(l => l.trim()) ?? ''
            const title = firstLine.startsWith('#') ? firstLine.replace(/^#+\s*/, '').trim() : f.id
            return {
              id: f.id,
              title: title || f.id,
              content: f.content,
              noteType: 'note' as const,
              tags: [],
              createdAt: now,
              updatedAt: now,
              attachments: [],
            }
          })
        )
      )
    }
    const snap = await snapshot(dir)
    return { rootDir: dir, ...snap, noteFiles }
  }
)

// ─── State ────────────────────────────────────────────────────────────────────

interface GitState {
  initialized: boolean
  rootDir: string | null
  status: GitFileStatus[]
  log: GitCommit[]
  branches: GitBranch[]
  currentBranch: string
  loading: boolean
  error: string | null
  pushStatus: 'idle' | 'pushing' | 'success' | 'error'
  pullStatus: 'idle' | 'pulling' | 'success' | 'error'
  /** Unix ms timestamp of the last successful auto-commit — used to trigger HistoryPanel refresh */
  lastAutoCommitAt: number
  /** OID of the most recent commit that was successfully pushed to remote (null = never pushed) */
  lastPushedOid: string | null
}

const initialState: GitState = {
  initialized: false,
  rootDir: null,
  status: [],
  log: [],
  branches: [],
  currentBranch: 'main',
  loading: false,
  error: null,
  pushStatus: 'idle',
  pullStatus: 'idle',
  lastAutoCommitAt: 0,
  lastPushedOid: null,
}

// ─── Slice ────────────────────────────────────────────────────────────────────

const gitSlice = createSlice({
  name: 'git',
  initialState,
  reducers: {
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload
    },
    reset() {
      return initialState
    },
  },
  extraReducers: builder => {
    // ── gitInit ──
    builder
      .addCase(gitInit.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(gitInit.fulfilled, (state, a) => {
        state.loading = false
        state.initialized = true
        state.rootDir = a.payload.rootDir
        state.status = a.payload.status
        state.log = a.payload.log
        state.branches = a.payload.branches
        state.currentBranch = a.payload.currentBranch
        state.lastPushedOid = a.payload.remoteOid ?? null
      })
      .addCase(gitInit.rejected, (state, a) => {
        state.loading = false
        state.error = a.error.message ?? 'Error al inicializar'
      })

    // ── gitRefresh ──
    builder
      .addCase(gitRefresh.pending, state => {
        state.loading = true
      })
      .addCase(gitRefresh.fulfilled, (state, a) => {
        state.loading = false
        state.status = a.payload.status
        state.log = a.payload.log
        state.branches = a.payload.branches
        state.currentBranch = a.payload.currentBranch
        state.lastPushedOid = a.payload.remoteOid ?? null
      })
      .addCase(gitRefresh.rejected, (state, a) => {
        state.loading = false
        state.error = a.error.message ?? 'Error al refrescar'
      })

    // ── gitSyncStatus ──
    builder
      .addCase(gitSyncStatus.pending, state => {
        state.loading = true
      })
      .addCase(gitSyncStatus.fulfilled, (state, a) => {
        state.loading = false
        state.status = a.payload.status
        state.log = a.payload.log
        state.branches = a.payload.branches
        state.currentBranch = a.payload.currentBranch
        state.lastPushedOid = a.payload.remoteOid ?? null
      })
      .addCase(gitSyncStatus.rejected, (state, a) => {
        state.loading = false
        state.error = a.error.message ?? 'Error al sincronizar estado'
      })

    // ── gitCommit ──
    builder
      .addCase(gitCommit.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(gitCommit.fulfilled, (state, a) => {
        state.loading = false
        state.status = a.payload.status
        state.log = a.payload.log
        state.branches = a.payload.branches
        state.currentBranch = a.payload.currentBranch
        state.lastPushedOid = a.payload.remoteOid ?? null
      })
      .addCase(gitCommit.rejected, (state, a) => {
        state.loading = false
        state.error = a.error.message ?? 'Error al hacer commit'
      })

    // ── gitPush ──
    builder
      .addCase(gitPush.pending, state => {
        state.pushStatus = 'pushing'
        state.error = null
      })
      .addCase(gitPush.fulfilled, state => {
        state.pushStatus = 'success'
        // Record the commit that was just pushed so we can compute "unpushed" count
        state.lastPushedOid = state.log[0]?.oid ?? null
        setTimeout(() => {
          state.pushStatus = 'idle'
        }, 3000)
      })
      .addCase(gitPush.rejected, (state, a) => {
        state.pushStatus = 'error'
        state.error = a.error.message ?? 'Error al hacer push'
      })

    // ── gitCreateBranch ──
    builder.addCase(gitCreateBranch.fulfilled, (state, a) => {
      state.branches = a.payload
    })

    // ── gitCheckout ──
    builder.addCase(gitCheckout.fulfilled, (state, a) => {
      state.status = a.payload.status
      state.log = a.payload.log
      state.branches = a.payload.branches
      state.currentBranch = a.payload.currentBranch
      state.lastPushedOid = a.payload.remoteOid ?? null
    })

    // ── gitAutoCommit ──
    builder.addCase(gitAutoCommit.fulfilled, (state, a) => {
      if (!a.payload) return
      state.log = a.payload.log
      state.status = a.payload.status
      state.branches = a.payload.branches
      state.currentBranch = a.payload.currentBranch
      state.lastAutoCommitAt = Date.now()
      state.lastPushedOid = a.payload.remoteOid ?? null
    })

    // ── gitDetect ──
    builder.addCase(gitDetect.fulfilled, (state, a) => {
      if (!a.payload) return // no repo found
      state.initialized = true
      state.rootDir = a.payload.rootDir
      state.status = a.payload.status
      state.log = a.payload.log
      state.branches = a.payload.branches
      state.currentBranch = a.payload.currentBranch
      state.lastPushedOid = a.payload.remoteOid ?? null
    })

    // ── gitPull ──
    builder
      .addCase(gitPull.pending, state => {
        state.pullStatus = 'pulling'
        state.error = null
      })
      .addCase(gitPull.fulfilled, (state, a) => {
        state.pullStatus = 'success'
        state.status = a.payload.status
        state.log = a.payload.log
        state.branches = a.payload.branches
        state.currentBranch = a.payload.currentBranch
        state.lastPushedOid = a.payload.remoteOid ?? null
      })
      .addCase(gitPull.rejected, (state, a) => {
        state.pullStatus = 'error'
        state.error = a.error.message ?? 'Error al hacer pull'
      })

    // ── gitClone ──
    builder
      .addCase(gitClone.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(gitClone.fulfilled, (state, a) => {
        state.loading = false
        state.initialized = true
        state.rootDir = a.payload.rootDir
        state.status = a.payload.status
        state.log = a.payload.log
        state.branches = a.payload.branches
        state.currentBranch = a.payload.currentBranch
        state.lastPushedOid = a.payload.remoteOid ?? null
      })
      .addCase(gitClone.rejected, (state, a) => {
        state.loading = false
        state.error = a.error.message ?? 'Error al clonar'
      })
  },
})

export const { setError, reset } = gitSlice.actions

export default gitSlice.reducer
