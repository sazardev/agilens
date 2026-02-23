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

// ─── Write note ────────────────────────────────────────────────────────────────

export async function writeNoteFile(dir: string, noteId: string, content: string) {
  const notesDir = `${dir}/notes`
  await ensureDir(notesDir)
  await pfs.writeFile(`${notesDir}/${noteId}.md`, content, 'utf8')
}
