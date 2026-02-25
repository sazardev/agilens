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

// ─── List user repos (for Projects import) ────────────────────────────────────

export interface GitHubRepoMeta {
  fullName: string // e.g. "owner/repo"
  name: string
  description: string | null
  private: boolean
  language: string | null
  htmlUrl: string
  pushedAt: string | null
  topics: string[]
}

/**
 * Lists repos accessible to the authenticated user.
 * affiliation=owner,collaborator,organization_member ensures that
 * repos from all orgs the user belongs to are included.
 *
 * Required token scopes:
 *  - `repo`  — to see private repos (personal + org)
 *  - `read:org` — if the org has SSO/SAML enforced and `repo` alone isn't enough
 */
export async function listUserRepos(
  token: string,
  page = 1,
  perPage = 50
): Promise<GitHubRepoMeta[]> {
  const url =
    `${BASE}/user/repos?affiliation=owner,collaborator,organization_member&sort=pushed` +
    `&per_page=${perPage}&page=${page}`
  try {
    const res = await fetch(url, { headers: headers(token) })
    if (!res.ok) return []
    const data = (await res.json()) as RawRepo[]
    return data.map(mapRepo)
  } catch {
    return []
  }
}

// ─── List orgs the user belongs to ───────────────────────────────────────────

export interface GitHubOrgMeta {
  login: string
  avatarUrl: string
  description: string | null
}

/**
 * Returns all organizations the authenticated user is a member of.
 * Requires the `read:org` scope (or `repo` which implies it).
 */
export async function listUserOrgs(token: string): Promise<GitHubOrgMeta[]> {
  try {
    const res = await fetch(`${BASE}/user/orgs?per_page=100`, {
      headers: headers(token),
    })
    if (!res.ok) return []
    const data = (await res.json()) as Array<{
      login: string
      avatar_url: string
      description: string | null
    }>
    return data.map(o => ({
      login: o.login,
      avatarUrl: o.avatar_url,
      description: o.description,
    }))
  } catch {
    return []
  }
}

// ─── List repos for a specific org ───────────────────────────────────────────

/**
 * Returns repos in an organization.
 * Requires `repo` scope for private repos; `public_repo` for public-only.
 */
export async function listOrgRepos(
  token: string,
  org: string,
  page = 1,
  perPage = 50
): Promise<GitHubRepoMeta[]> {
  const url =
    `${BASE}/orgs/${encodeURIComponent(org)}/repos?sort=pushed&type=all` +
    `&per_page=${perPage}&page=${page}`
  try {
    const res = await fetch(url, { headers: headers(token) })
    if (!res.ok) return []
    const data = (await res.json()) as RawRepo[]
    return data.map(mapRepo)
  } catch {
    return []
  }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

interface RawRepo {
  full_name: string
  name: string
  description: string | null
  private: boolean
  language: string | null
  html_url: string
  pushed_at: string | null
  topics?: string[]
}

function mapRepo(r: RawRepo): GitHubRepoMeta {
  return {
    fullName: r.full_name,
    name: r.name,
    description: r.description,
    private: r.private,
    language: r.language,
    htmlUrl: r.html_url,
    pushedAt: r.pushed_at,
    topics: r.topics ?? [],
  }
}
