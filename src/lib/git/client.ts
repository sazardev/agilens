/**
 * Git client powered by isomorphic-git + LightningFS
 * All operations run in the browser — no server required.
 */
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/web'
import LightningFS from '@isomorphic-git/lightning-fs'
import type { GitCommit, GitFileStatus, GitBranch, GitHubConfig } from '@/types'

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
  await git.push({
    fs,
    http,
    dir,
    remote: 'origin',
    ref: config.branch,
    onAuth: () => ({ username: config.token }),
  })
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
      if (filepath === '.') return null
      const [headType, baseType] = await Promise.all([head?.type(), base?.type()])
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
