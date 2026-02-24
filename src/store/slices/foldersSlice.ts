import { createSlice, nanoid } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Folder, Note, NoteType, Sprint } from '@/types'
import { NOTE_TYPE_META } from '@/types'

// ─── State ────────────────────────────────────────────────────────────────────

interface FoldersState {
  folders: Folder[]
}

const initialState: FoldersState = {
  folders: [],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFolder(
  partial: Omit<Folder, 'id' | 'createdAt' | 'sortIndex'> & { sortIndex?: number }
): Folder {
  return {
    id: nanoid(),
    createdAt: new Date().toISOString(),
    sortIndex: partial.sortIndex ?? 0,
    ...partial,
  }
}

/** All NoteType keys in display order */
const NOTE_TYPE_ORDER: NoteType[] = [
  'note',
  'daily',
  'evidence',
  'technical',
  'meeting',
  'sprint',
  'task',
]

// ─── Auto-organize algorithm ──────────────────────────────────────────────────

/**
 * Given current folders, all notes and sprints, rebuild the "system" folder
 * tree.  Manual (non-system) folders are NOT touched.
 * Returns updated folders[] and a mapping noteId → folderId.
 */
export function buildAutoFolders(
  existingFolders: Folder[],
  notes: Note[],
  sprints: Sprint[],
  mode: 'type' | 'sprint' | 'both'
): { folders: Folder[]; assignments: Record<string, string> } {
  // Preserve manual folders unchanged
  const manualFolders = existingFolders.filter(f => !f.isSystem)

  const systemFolders: Folder[] = []
  const assignments: Record<string, string> = {} // noteId → folderId

  if (mode === 'type' || mode === 'both') {
    // Root: "Por tipo"
    const rootKey = 'auto:type-root'
    let typeRoot = existingFolders.find(f => f.systemKey === rootKey)
    if (!typeRoot) {
      typeRoot = makeFolder({
        name: 'Por tipo',
        parentId: null,
        isSystem: true,
        systemKey: rootKey,
        sortIndex: 0,
      })
    }
    systemFolders.push(typeRoot)

    NOTE_TYPE_ORDER.forEach((type, i) => {
      const key = `auto:type:${type}`
      let folder = existingFolders.find(f => f.systemKey === key)
      if (!folder) {
        folder = makeFolder({
          name: NOTE_TYPE_META[type].label,
          parentId: typeRoot!.id,
          isSystem: true,
          systemKey: key,
          color: NOTE_TYPE_META[type].color,
          sortIndex: i,
        })
      }
      systemFolders.push(folder)

      // Assign notes of this type
      notes
        .filter(n => n.noteType === type)
        .forEach(n => {
          assignments[n.id] = folder!.id
        })
    })
  }

  if (mode === 'sprint' || mode === 'both') {
    const rootKey = 'auto:sprint-root'
    let sprintRoot = existingFolders.find(f => f.systemKey === rootKey)
    if (!sprintRoot) {
      sprintRoot = makeFolder({
        name: 'Por sprint',
        parentId: null,
        isSystem: true,
        systemKey: rootKey,
        sortIndex: 1,
      })
    }
    systemFolders.push(sprintRoot)

    sprints.forEach((sprint, i) => {
      const key = `auto:sprint:${sprint.id}`
      let folder = existingFolders.find(f => f.systemKey === key)
      if (!folder) {
        folder = makeFolder({
          name: sprint.name,
          parentId: sprintRoot!.id,
          isSystem: true,
          systemKey: key,
          color: '#f472b6',
          sortIndex: i,
        })
      }
      systemFolders.push(folder)

      notes
        .filter(n => n.sprintId === sprint.id)
        .forEach(n => {
          // Sprint assignment takes precedence over type when in 'both' mode
          assignments[n.id] = folder!.id
        })
    })

    // Notes with no sprint → "Sin sprint" bucket
    const noSprintKey = 'auto:sprint:none'
    let noSprintFolder = existingFolders.find(f => f.systemKey === noSprintKey)
    if (!noSprintFolder) {
      noSprintFolder = makeFolder({
        name: 'Sin sprint',
        parentId: sprintRoot!.id,
        isSystem: true,
        systemKey: noSprintKey,
        sortIndex: sprints.length,
        color: '#6b7280',
      })
    }
    systemFolders.push(noSprintFolder)
    notes
      .filter(n => !n.sprintId && !assignments[n.id])
      .forEach(n => {
        assignments[n.id] = noSprintFolder!.id
      })
  }

  return { folders: [...systemFolders, ...manualFolders], assignments }
}

// ─── Slice ────────────────────────────────────────────────────────────────────

const foldersSlice = createSlice({
  name: 'folders',
  initialState,
  reducers: {
    // Manual CRUD
    addFolder(state, action: PayloadAction<{ name: string; parentId: string | null }>) {
      const { name, parentId } = action.payload
      const siblings = state.folders.filter(f => f.parentId === parentId)
      const folder = makeFolder({
        name,
        parentId,
        isSystem: false,
        sortIndex: siblings.length,
      })
      state.folders.push(folder)
    },

    renameFolder(state, action: PayloadAction<{ id: string; name: string }>) {
      const folder = state.folders.find(f => f.id === action.payload.id)
      if (folder && !folder.isSystem) folder.name = action.payload.name
    },

    deleteFolder(state, action: PayloadAction<{ id: string; reassignTo: string | null }>) {
      const { id, reassignTo: _reassign } = action.payload
      // Collect entire subtree
      const toDelete = new Set<string>()
      const queue = [id]
      while (queue.length) {
        const cur = queue.pop()!
        toDelete.add(cur)
        state.folders.filter(f => f.parentId === cur).forEach(f => queue.push(f.id))
      }
      state.folders = state.folders.filter(f => !toDelete.has(f.id))
    },

    moveFolder(state, action: PayloadAction<{ id: string; newParentId: string | null }>) {
      const folder = state.folders.find(f => f.id === action.payload.id)
      if (folder && !folder.isSystem) folder.parentId = action.payload.newParentId
    },

    reorderFolders(
      state,
      action: PayloadAction<{ id: string; newSortIndex: number; parentId: string | null }>
    ) {
      const { id, newSortIndex, parentId } = action.payload
      const siblings = state.folders
        .filter(f => f.parentId === parentId)
        .sort((a, b) => a.sortIndex - b.sortIndex)
      const idx = siblings.findIndex(f => f.id === id)
      if (idx === -1) return
      const [moved] = siblings.splice(idx, 1)
      siblings.splice(newSortIndex, 0, moved)
      siblings.forEach((f, i) => {
        const stateFolder = state.folders.find(sf => sf.id === f.id)
        if (stateFolder) stateFolder.sortIndex = i
      })
    },

    setFolderColor(state, action: PayloadAction<{ id: string; color: string }>) {
      const folder = state.folders.find(f => f.id === action.payload.id)
      if (folder) folder.color = action.payload.color
    },

    setFolderIcon(state, action: PayloadAction<{ id: string; icon: string }>) {
      const folder = state.folders.find(f => f.id === action.payload.id)
      if (folder) folder.icon = action.payload.icon
    },

    // Auto-organize
    autoOrganize(
      state,
      action: PayloadAction<{
        notes: Note[]
        sprints: Sprint[]
        mode: 'type' | 'sprint' | 'both'
      }>
    ) {
      const { notes, sprints, mode } = action.payload
      const { folders } = buildAutoFolders(state.folders, notes, sprints, mode)
      state.folders = folders
    },

    clearSystemFolders(state) {
      state.folders = state.folders.filter(f => !f.isSystem)
    },

    clearAllFolders(state) {
      state.folders = []
    },
  },
})

export const {
  addFolder,
  renameFolder,
  deleteFolder,
  moveFolder,
  reorderFolders,
  setFolderColor,
  setFolderIcon,
  autoOrganize,
  clearSystemFolders,
  clearAllFolders,
} = foldersSlice.actions

// ─── Selectors ────────────────────────────────────────────────────────────────

/** Returns root-level folders sorted by sortIndex */
export function selectRootFolders(folders: Folder[]): Folder[] {
  return folders.filter(f => f.parentId === null).sort((a, b) => a.sortIndex - b.sortIndex)
}

/** Returns children of a given parentId sorted by sortIndex */
export function selectChildFolders(folders: Folder[], parentId: string): Folder[] {
  return folders.filter(f => f.parentId === parentId).sort((a, b) => a.sortIndex - b.sortIndex)
}

/** Returns all descendant ids of a folder (inclusive) */
export function selectSubtreeIds(folders: Folder[], rootId: string): Set<string> {
  const ids = new Set<string>()
  const queue = [rootId]
  while (queue.length) {
    const cur = queue.pop()!
    ids.add(cur)
    folders.filter(f => f.parentId === cur).forEach(f => queue.push(f.id))
  }
  return ids
}

/**
 * Returns a stable mapping: folderId → Note[]
 */
export function selectNotesByFolder(folders: Folder[], notes: Note[]): Map<string, Note[]> {
  const map = new Map<string, Note[]>()
  for (const folder of folders) map.set(folder.id, [])
  for (const note of notes) {
    if (note.folderId && map.has(note.folderId)) {
      map.get(note.folderId)!.push(note)
    }
  }
  return map
}

export default foldersSlice.reducer
