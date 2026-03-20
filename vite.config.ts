import { defineConfig } from 'vite'

/**
 * GitHub Actions sets GITHUB_REPOSITORY=owner/repo.
 * Project Pages: https://<user>.github.io/<repo>/
 * User/org site (repo name *.github.io): served at domain root → base '/'
 */
function githubPagesBase(): string {
  const full = process.env.GITHUB_REPOSITORY
  if (!full) return '/'
  const repo = full.split('/')[1]
  if (!repo) return '/'
  if (repo.endsWith('.github.io')) return '/'
  return `/${repo}/`
}

export default defineConfig({
  base: githubPagesBase(),
})
