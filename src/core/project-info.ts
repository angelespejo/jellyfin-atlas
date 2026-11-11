import { DATA } from '#const'

export interface ProjectAuthor {
  name: string
  url?: string
}

export interface ProjectInfo {
  name: string
  productName: string
  version: string
  license?: string
  homepageUrl?: string
  repositoryUrl?: string
  issuesUrl?: string
  fundingUrls: string[]
  author?: ProjectAuthor
}

interface PackageLike {
  name?: string
  version?: string
  license?: string
  homepage?: string
  extra?: { productName?: string }
  repository?: string | { url?: string }
  bugs?: string | { url?: string }
  funding?: string | { url?: string } | Array<string | { url?: string }>
  author?: string | { name?: string; url?: string }
}

function normalizeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  let url = value.trim()
  if (!url) return undefined
  if (/^github:/i.test(url)) url = `https://github.com/${url.slice('github:'.length)}`
  if (url.startsWith('git+')) url = url.slice('git+'.length)
  if (url.startsWith('git@')) url = `https://${url.slice('git@'.length).replace(':', '/')}`
  url = url.replace(/\.git$/, '')
  if (!/^https?:\/\//i.test(url)) return undefined
  return url
}

function fundingList(value: PackageLike['funding']): string[] {
  const entries = Array.isArray(value) ? value : value ? [value] : []
  return entries
    .map((entry) => normalizeUrl(typeof entry === 'string' ? entry : entry?.url))
    .filter((url): url is string => Boolean(url))
}

/**
 * Project metadata read from `package.json` at build time through `APP_DATA`.
 * Values are never duplicated in the UI: only translated labels live in i18n.
 */
export function getProjectInfo(): ProjectInfo {
  const pkg = DATA.PKG as unknown as PackageLike
  const author =
    typeof pkg.author === 'string'
      ? { name: pkg.author }
      : pkg.author?.name
        ? { name: pkg.author.name, url: normalizeUrl(pkg.author.url) }
        : undefined

  return {
    name: pkg.name ?? '',
    productName: pkg.extra?.productName ?? pkg.name ?? '',
    version: pkg.version ?? '',
    license: pkg.license,
    homepageUrl: normalizeUrl(pkg.homepage),
    repositoryUrl: normalizeUrl(
      typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url
    ),
    issuesUrl: normalizeUrl(typeof pkg.bugs === 'string' ? pkg.bugs : pkg.bugs?.url),
    fundingUrls: fundingList(pkg.funding),
    author,
  }
}
