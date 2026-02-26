/**
 * Git client powered by isomorphic-git + LightningFS
 * All operations run in the browser — no server required.
 */
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/web'
import LightningFS from '@isomorphic-git/lightning-fs'
import type {
  GitCommit,
  GitFileStatus,
  GitBranch,
  GitHubConfig,
  AppSettings,
  Note,
  DailyEntry,
  Sprint,
  Impediment,
  Folder,
  Project,
  NoteTemplate,
} from '@/types'

// ─── Filesystem ────────────────────────────────────────────────────────────────

const FS_NAME = 'agilens'
export const fs = new LightningFS(FS_NAME)
export const pfs = fs.promises

// ─── Helpers ───────────────────────────────────────────────────────────────────

export async function ensureDir(dir: string) {
  try {
    await pfs.mkdir(dir)
  } catch {
    // already exists
  }
}

// ─── Init ──────────────────────────────────────────────────────────────────────

export async function initRepo(dir: string, author: { name: string; email: string }) {
  await ensureDir(dir)
  await git.init({ fs, dir })
  // Create an initial .gitignore
  await pfs.writeFile(`${dir}/.gitignore`, 'node_modules\n.DS_Store\n')
  await git.add({ fs, dir, filepath: '.gitignore' })
  await git.commit({
    fs,
    dir,
    author,
    message: 'chore: init agilens notes',
  })
}

// ─── Status ─────────────────────────────────────────────────────────────────────

export async function getStatus(dir: string): Promise<GitFileStatus[]> {
  const matrix = await git.statusMatrix({ fs, dir })
  return matrix
    .filter(([, head, workdir, stage]) => !(head === 1 && workdir === 1 && stage === 1))
    .map(([filepath, head, workdir]) => {
      let status: GitFileStatus['status'] = 'untracked'
      if (head === 0 && workdir === 2) status = 'added'
      else if (head === 1 && workdir === 2) status = 'modified'
      else if (head === 1 && workdir === 0) status = 'deleted'
      else if (head === 1 && workdir === 1) status = 'unmodified'
      return { path: String(filepath), status }
    })
}

// ─── Commit ─────────────────────────────────────────────────────────────────────

export async function commitAll(
  dir: string,
  message: string,
  author: { name: string; email: string }
): Promise<string> {
  await git.add({ fs, dir, filepath: '.' })
  const oid = await git.commit({ fs, dir, author, message })
  return oid
}

// ─── Log ───────────────────────────────────────────────────────────────────────

export async function getLog(dir: string, depth = 30): Promise<GitCommit[]> {
  const log = await git.log({ fs, dir, depth })
  return log.map(entry => ({
    oid: entry.oid,
    message: entry.commit.message.trim(),
    author: entry.commit.author.name,
    timestamp: entry.commit.author.timestamp,
  }))
}

/** Returns commits that touched a specific note file, newest first. */
export async function getNoteLog(dir: string, noteId: string): Promise<GitCommit[]> {
  try {
    const log = await git.log({ fs, dir, filepath: `notes/${noteId}.md` })
    return log.map(entry => ({
      oid: entry.oid,
      message: entry.commit.message.trim(),
      author: entry.commit.author.name,
      timestamp: entry.commit.author.timestamp,
    }))
  } catch {
    return []
  }
}

// ─── Branches ──────────────────────────────────────────────────────────────────

/**
 * Returns the OID that the remote tracking ref (refs/remotes/origin/<branch>)
 * points to, or null if the ref doesn't exist (never pushed / no remote).
 */
export async function getRemoteOid(dir: string, branch: string): Promise<string | null> {
  try {
    return await git.resolveRef({ fs, dir, ref: `refs/remotes/origin/${branch}` })
  } catch {
    return null
  }
}

export async function getBranches(dir: string): Promise<GitBranch[]> {
  const [local, current] = await Promise.all([
    git.listBranches({ fs, dir }),
    git.currentBranch({ fs, dir, fullname: false }),
  ])
  return local.map(name => ({
    name,
    isCurrent: name === current,
    isRemote: false,
  }))
}

export async function createBranch(dir: string, name: string) {
  await git.branch({ fs, dir, ref: name })
}

export async function checkoutBranch(dir: string, ref: string) {
  await git.checkout({ fs, dir, ref })
}

// ─── Push to GitHub ────────────────────────────────────────────────────────────

export async function pushToGitHub(dir: string, config: GitHubConfig) {
  // Use the actual local branch as ref so master → main works on first push
  const localBranch = (await git.currentBranch({ fs, dir, fullname: false })) ?? 'master'
  await git.push({
    fs,
    http,
    dir,
    remote: 'origin',
    ref: localBranch,
    remoteRef: config.branch,
    corsProxy: 'https://cors.isomorphic-git.org',
    onAuth: () => ({ username: config.token }),
  })
}

// ─── Pull from GitHub ────────────────────────────────────────────────────────

export async function pullFromGitHub(
  dir: string,
  config: GitHubConfig,
  author: { name: string; email: string }
): Promise<void> {
  await setRemote(dir, config)
  await git.pull({
    fs,
    http,
    dir,
    remote: 'origin',
    ref: config.branch,
    singleBranch: true,
    author,
    corsProxy: 'https://cors.isomorphic-git.org',
    onAuth: () => ({ username: config.token }),
  })
}

// ─── Clone from GitHub (first-time import of existing repo) ──────────────────

export async function cloneFromGitHub(
  dir: string,
  config: GitHubConfig,
  author: { name: string; email: string }
): Promise<void> {
  await ensureDir(dir)
  // If git is already initialized, just pull instead of clone
  let alreadyInit = false
  try {
    await git.resolveRef({ fs, dir, ref: 'HEAD' })
    alreadyInit = true
  } catch {
    alreadyInit = false
  }
  if (alreadyInit) {
    await pullFromGitHub(dir, config, author)
    return
  }
  const url = `https://github.com/${config.owner}/${config.repo}.git`
  await git.clone({
    fs,
    http,
    dir,
    url,
    ref: config.branch,
    singleBranch: true,
    depth: 50,
    corsProxy: 'https://cors.isomorphic-git.org',
    onAuth: () => ({ username: config.token }),
  })
}

// ─── Read note files from FS ─────────────────────────────────────────────────

export async function readNoteFilesFromFS(
  dir: string
): Promise<Array<{ id: string; content: string }>> {
  const notesDir = `${dir}/notes`
  try {
    const files = (await pfs.readdir(notesDir)) as string[]
    const result: Array<{ id: string; content: string }> = []
    for (const file of files) {
      if (!file.endsWith('.md')) continue
      try {
        const content = (await pfs.readFile(`${notesDir}/${file}`, 'utf8')) as string
        result.push({ id: file.slice(0, -3), content })
      } catch {
        /* skip unreadable files */
      }
    }
    return result
  } catch {
    return []
  }
}

export async function setRemote(dir: string, config: GitHubConfig) {
  const url = `https://github.com/${config.owner}/${config.repo}.git`
  try {
    await git.deleteRemote({ fs, dir, remote: 'origin' })
  } catch {
    // no remote yet
  }
  await git.addRemote({ fs, dir, remote: 'origin', url })
}

// ─── Write / delete note files ─────────────────────────────────────────────────

export async function writeNoteFile(dir: string, noteId: string, content: string) {
  const notesDir = `${dir}/notes`
  await ensureDir(notesDir)
  await pfs.writeFile(`${notesDir}/${noteId}.md`, content, 'utf8')
}

export async function deleteNoteFile(dir: string, noteId: string) {
  try {
    await pfs.unlink(`${dir}/notes/${noteId}.md`)
  } catch {
    // file may not exist yet (never committed)
  }
}

// ─── Config file ───────────────────────────────────────────────────────────────

/**
 * Write agilens.config.json to the root of the virtual FS.
 * github.token is omitted (never persisted). lockPasswordHash is a
 * one-way SHA-256 hash — safe to store in a private repo.
 */
export async function writeConfigFile(dir: string, settings: AppSettings): Promise<void> {
  const safe = {
    generatedAt: new Date().toISOString(),
    version: '1.0',
    userName: settings.userName,
    userEmail: settings.userEmail,
    uiTheme: settings.uiTheme,
    accentColor: settings.accentColor,
    customAccentHex: settings.customAccentHex,
    editorFont: settings.editorFont,
    editorFontSize: settings.editorFontSize,
    editorTheme: settings.editorTheme,
    uiDensity: settings.uiDensity,
    lineHeight: settings.lineHeight,
    wordWrap: settings.wordWrap,
    markdownPreviewFont: settings.markdownPreviewFont,
    markdownProseWidth: settings.markdownProseWidth,
    markdownShowReadingTime: settings.markdownShowReadingTime,
    markdownHeadingAnchors: settings.markdownHeadingAnchors,
    markdownCopyCode: settings.markdownCopyCode,
    markdownCodeHighlight: settings.markdownCodeHighlight,
    markdownTabSize: settings.markdownTabSize,
    markdownSpellcheck: settings.markdownSpellcheck,
    // Security — hash is one-way SHA-256, safe to persist in private repo
    lockEnabled: settings.lockEnabled,
    lockPasswordHash: settings.lockPasswordHash,
    lockTimeoutMinutes: settings.lockTimeoutMinutes,
    lockOnHide: settings.lockOnHide,
    defaultSprintId: settings.defaultSprintId ?? null,
    // GitHub config — token intentionally omitted
    github: settings.github
      ? {
          owner: settings.github.owner,
          repo: settings.github.repo,
          branch: settings.github.branch,
        }
      : null,
  }
  await pfs.writeFile(`${dir}/agilens.config.json`, JSON.stringify(safe, null, 2), 'utf8')
}

/**
 * Read agilens.config.json from the virtual FS and return the stored
 * settings as a Partial<AppSettings>. Returns null if the file is absent
 * or unparseable. github.token is NOT restored (user must re-enter it).
 */
export async function readConfigFile(dir: string): Promise<Partial<AppSettings> | null> {
  try {
    const raw = (await pfs.readFile(`${dir}/agilens.config.json`, 'utf8')) as string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d: Record<string, any> = JSON.parse(raw)
    const p: Partial<AppSettings> = {}
    if (d.userName != null) p.userName = d.userName
    if (d.userEmail != null) p.userEmail = d.userEmail
    if (d.uiTheme != null) p.uiTheme = d.uiTheme
    if (d.accentColor != null) p.accentColor = d.accentColor
    if (d.customAccentHex != null) p.customAccentHex = d.customAccentHex
    if (d.editorFont != null) p.editorFont = d.editorFont
    if (d.editorFontSize != null) p.editorFontSize = d.editorFontSize
    if (d.editorTheme != null) p.editorTheme = d.editorTheme
    if (d.uiDensity != null) p.uiDensity = d.uiDensity
    if (d.lineHeight != null) p.lineHeight = d.lineHeight
    if (d.wordWrap != null) p.wordWrap = d.wordWrap
    if (d.markdownPreviewFont != null) p.markdownPreviewFont = d.markdownPreviewFont
    if (d.markdownProseWidth != null) p.markdownProseWidth = d.markdownProseWidth
    if (d.markdownShowReadingTime != null) p.markdownShowReadingTime = d.markdownShowReadingTime
    if (d.markdownHeadingAnchors != null) p.markdownHeadingAnchors = d.markdownHeadingAnchors
    if (d.markdownCopyCode != null) p.markdownCopyCode = d.markdownCopyCode
    if (d.markdownCodeHighlight != null) p.markdownCodeHighlight = d.markdownCodeHighlight
    if (d.markdownTabSize != null) p.markdownTabSize = d.markdownTabSize
    if (d.markdownSpellcheck != null) p.markdownSpellcheck = d.markdownSpellcheck
    if (d.lockEnabled != null) p.lockEnabled = d.lockEnabled
    if (d.lockPasswordHash != null) p.lockPasswordHash = d.lockPasswordHash
    if (d.lockTimeoutMinutes != null) p.lockTimeoutMinutes = d.lockTimeoutMinutes
    if (d.lockOnHide != null) p.lockOnHide = d.lockOnHide
    if (d.defaultSprintId != null) p.defaultSprintId = d.defaultSprintId
    return p
  } catch {
    return null
  }
}

// ─── App state snapshot (full data — notes metadata, daily, sprints, etc.) ─────────────────

/**
 * Note metadata stored in agilens-app-state.json.
 * `content` is intentionally excluded — it lives in notes/*.md for
 * clean diffs, human readability and efficient git history.
 */
export type NoteMetadata = Omit<Note, 'content'>

export interface AppStateData {
  notes: NoteMetadata[] // no content — read from .md files on restore
  dailyEntries: DailyEntry[]
  sprints: Sprint[]
  impediments: Impediment[]
  folders: Folder[]
  projects: Project[]
  templates: NoteTemplate[]
  defaultTemplateId: string
}

/**
 * Write agilens-app-state.json — note metadata + all other Redux data.
 * Note content is NOT stored here — it lives in notes/*.md files.
 * Attachment dataUrls (blobs) are also excluded.
 *
 * Accepts full Note[] from Redux and strips content + blobs before writing.
 */
export async function writeAppStateFile(
  dir: string,
  data: Omit<AppStateData, 'notes'> & { notes: Note[] }
): Promise<void> {
  const toStore: AppStateData = {
    ...data,
    // Strip content (lives in .md) and blob dataUrls (live in IndexedDB)
    notes: data.notes.map(({ content: _c, attachments, ...meta }) => ({
      ...meta,
      attachments: (attachments ?? []).map(({ dataUrl: _d, ...rest }) => rest),
    })),
  }
  await pfs.writeFile(`${dir}/agilens-app-state.json`, JSON.stringify(toStore, null, 2), 'utf8')
}

/**
 * Read agilens-app-state.json from LightningFS.
 * Returns null if the file is absent or unparseable.
 */
export async function readAppStateFile(dir: string): Promise<AppStateData | null> {
  try {
    const raw = (await pfs.readFile(`${dir}/agilens-app-state.json`, 'utf8')) as string
    return JSON.parse(raw) as AppStateData
  } catch {
    return null
  }
}

/**
 * Sync the entire notes array to LightningFS:
 *  - Write/overwrite every note that exists in Redux
 *  - Delete any .md file in /notes that no longer has a matching note ID
 */
export async function syncNoteFiles(dir: string, notes: Array<{ id: string; content: string }>) {
  const notesDir = `${dir}/notes`
  await ensureDir(notesDir)

  // Write all current notes
  for (const note of notes) {
    await pfs.writeFile(`${notesDir}/${note.id}.md`, note.content, 'utf8')
  }

  // Remove orphan files (deleted notes)
  const knownIds = new Set(notes.map(n => `${n.id}.md`))
  try {
    const files = (await pfs.readdir(notesDir)) as string[]
    for (const file of files) {
      if (file.endsWith('.md') && !knownIds.has(file)) {
        try {
          await pfs.unlink(`${notesDir}/${file}`)
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    // notesDir may not exist yet
  }
}

// ─── Diff utilities ────────────────────────────────────────────────────────────

/** Returns the text content of a file at a specific commit. Returns '' if absent. */
export async function getFileContentAtCommit(
  dir: string,
  commitOid: string,
  filepath: string
): Promise<string> {
  try {
    const { blob } = await git.readBlob({ fs, dir, oid: commitOid, filepath })
    return new TextDecoder().decode(blob)
  } catch {
    return ''
  }
}

export interface CommitFileChange {
  path: string
  status: 'added' | 'modified' | 'deleted'
}

/**
 * Returns the list of files that changed between a commit and its parent.
 * For the initial commit returns all files as 'added'.
 */
export async function getChangedFilesInCommit(
  dir: string,
  commitOid: string
): Promise<CommitFileChange[]> {
  const { commit } = await git.readCommit({ fs, dir, oid: commitOid })
  const parentOid = commit.parent[0] ?? null

  if (!parentOid) {
    // Initial commit — everything is new
    const files = await git.listFiles({ fs, dir, ref: commitOid })
    return files.map(path => ({ path, status: 'added' as const }))
  }

  const results: CommitFileChange[] = []

  await git.walk({
    fs,
    dir,
    trees: [git.TREE({ ref: commitOid }), git.TREE({ ref: parentOid })],
    map: async (filepath, [head, base]) => {
      if (filepath === '.') return // root — recurse but don't emit
      const [headType, baseType] = await Promise.all([head?.type(), base?.type()])
      // For directory entries (tree), return undefined so git.walk recurses into them
      if (headType === 'tree' || baseType === 'tree') return
      if (headType !== 'blob' && baseType !== 'blob') return null
      const [headOid, baseOid] = await Promise.all([head?.oid(), base?.oid()])
      if (!baseOid && headOid) results.push({ path: filepath, status: 'added' })
      else if (baseOid && !headOid) results.push({ path: filepath, status: 'deleted' })
      else if (headOid !== baseOid) results.push({ path: filepath, status: 'modified' })
      return null
    },
  })

  return results
}

/** Returns the parent commit OID for a given commit (null if initial commit). */
export async function getParentCommitOid(dir: string, commitOid: string): Promise<string | null> {
  const { commit } = await git.readCommit({ fs, dir, oid: commitOid })
  return commit.parent[0] ?? null
}

// ─── Write attachment ─────────────────────────────────────────────────────────

/**
 * Persist an attachment file in the virtual FS so it's tracked by git.
 * The dataUrl is converted to a binary Uint8Array before writing.
 * Path: {dir}/attachments/{noteId}/{attachmentId}-{filename}
 */
export async function writeAttachmentFile(
  dir: string,
  noteId: string,
  attachmentId: string,
  filename: string,
  dataUrl: string
): Promise<string> {
  const attachDir = `${dir}/attachments`
  const noteAttachDir = `${attachDir}/${noteId}`
  await ensureDir(attachDir)
  await ensureDir(noteAttachDir)
  // Convert dataUrl → Uint8Array
  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const filePath = `${noteAttachDir}/${attachmentId}-${filename}`
  await pfs.writeFile(filePath, bytes)
  return filePath
}

/** Delete an attachment file from the virtual FS */
export async function deleteAttachmentFile(
  dir: string,
  noteId: string,
  attachmentId: string,
  filename: string
): Promise<void> {
  const filePath = `${dir}/attachments/${noteId}/${attachmentId}-${filename}`
  try {
    await pfs.unlink(filePath)
  } catch {
    // file may not exist yet (e.g. if git was initialized after attach)
  }
}
