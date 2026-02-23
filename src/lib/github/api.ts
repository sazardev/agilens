/**
 * GitHub REST API v3 utilities.
 * Used as a complement to isomorphic-git for repo management tasks.
 */
import type { GitHubConfig } from '@/types'

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}

const BASE = 'https://api.github.com'

// ─── Verify token ─────────────────────────────────────────────────────────────

export async function verifyToken(token: string): Promise<{ login: string } | null> {
  try {
    const res = await fetch(`${BASE}/user`, { headers: headers(token) })
    if (!res.ok) return null
    const data = (await res.json()) as { login: string }
    return data
  } catch {
    return null
  }
}

// ─── Create repo ──────────────────────────────────────────────────────────────

export async function createRepo(
  config: GitHubConfig,
  opts: { private?: boolean; description?: string } = {}
) {
  const res = await fetch(`${BASE}/user/repos`, {
    method: 'POST',
    headers: headers(config.token),
    body: JSON.stringify({
      name: config.repo,
      description: opts.description ?? 'Agilens dev notes',
      private: opts.private ?? true,
      auto_init: false,
    }),
  })
  return res.ok ? ((await res.json()) as { html_url: string }) : null
}

// ─── Enable GitHub Pages ──────────────────────────────────────────────────────

export async function enablePages(config: GitHubConfig) {
  const res = await fetch(`${BASE}/repos/${config.owner}/${config.repo}/pages`, {
    method: 'POST',
    headers: headers(config.token),
    body: JSON.stringify({
      source: { branch: config.branch, path: '/' },
    }),
  })
  return res.ok ? ((await res.json()) as { html_url: string }) : null
}

// ─── List branches ────────────────────────────────────────────────────────────

export async function listRemoteBranches(config: GitHubConfig): Promise<string[]> {
  const res = await fetch(`${BASE}/repos/${config.owner}/${config.repo}/branches?per_page=100`, {
    headers: headers(config.token),
  })
  if (!res.ok) return []
  const data = (await res.json()) as Array<{ name: string }>
  return data.map(b => b.name)
}
