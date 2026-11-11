import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { JellyfinItem } from '../../../../core/types'
import libraryJson from './library.json'
import { fallbackArtwork } from './artwork'
import type { MockLibrary } from './types'

/**
 * Minimal Jellyfin API emulation used by `pnpm dev` and `JELLYFIN_MOCK=true`.
 * It covers the endpoints consumed by the app, so the UI can be developed
 * without a real server. See .dovenv/scripts/build-mock-library.ts for the data.
 */

const library = libraryJson as MockLibrary
// Downloaded artwork lives outside `static/` so it never enters the build.
// When it is missing (production, Docker, CI) generated SVG artwork is used.
const IMAGE_DIR = join(process.cwd(), '.dovenv/mock/images')
const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

const itemsById = new Map<string, JellyfinItem>()
for (const item of library.items) itemsById.set(item.Id, item)
for (const person of library.people) itemsById.set(person.Id, person)

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

function split(value: string | null): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function filterLibrary(params: URLSearchParams): JellyfinItem[] {
  const ids = split(params.get('Ids'))
  const personIds = params
    .getAll('PersonIds')
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
  const includeTypes = split(params.get('IncludeItemTypes'))

  let items: JellyfinItem[]
  if (ids.length > 0) {
    // Item details (movies/series) and person details share the `Ids` query.
    items = ids.map((id) => itemsById.get(id)).filter((item): item is JellyfinItem => Boolean(item))
  } else {
    items = [...library.items]
    if (personIds.length > 0) {
      items = items.filter((item) => item.People?.some((person) => personIds.includes(person.Id)))
    }
    if (includeTypes.length > 0) {
      items = items.filter((item) => includeTypes.includes(item.Type ?? ''))
    }
  }

  const start = Math.max(0, Number(params.get('StartIndex') ?? 0) || 0)
  const limit = Number(params.get('Limit') ?? 0)
  if (limit > 0) items = items.slice(start, start + limit)
  else if (start > 0) items = items.slice(start)

  return items
}

function resumeItems(): JellyfinItem[] {
  const ids = new Set(library.resumeIds)
  return library.items.filter((item) => ids.has(item.Id))
}

async function artworkResponse(id: string, params: URLSearchParams): Promise<Response> {
  const safeId = /^[A-Za-z0-9_-]+$/.test(id) ? id : ''
  if (safeId) {
    for (const extension of ['jpg', 'png', 'webp']) {
      try {
        const buffer = await readFile(join(IMAGE_DIR, `${safeId}.${extension}`))
        return new Response(new Uint8Array(buffer), {
          headers: {
            'Content-Type': MIME[extension],
            'Cache-Control': 'public, max-age=86400',
          },
        })
      } catch {
        // Try the next extension, then fall back to generated artwork.
      }
    }
  }

  const entry = itemsById.get(id)
  const svg = fallbackArtwork(
    id,
    entry?.Name ?? 'Jellyfin Atlas',
    entry?.Type,
    params.get('maxWidth'),
    params.get('maxHeight'),
    entry?.ProductionYear
  )
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

export async function mockJellyfinRequest(path: string, init?: RequestInit): Promise<Response> {
  if (init?.method && init.method !== 'GET') {
    return json({ error: 'Method not allowed in demo mode' }, 405)
  }

  const url = new URL(path, 'http://demo.jellyfin.local')
  const { pathname, searchParams } = url

  if (pathname === '/Users') {
    return json([{ Id: 'demo-user', Name: 'JellyFin Atlas demo' }])
  }

  if (/^\/Users\/[^/]+\/Items\/Resume$/.test(pathname)) {
    const items = resumeItems()
    return json({ Items: items, TotalRecordCount: items.length })
  }

  if (pathname === '/Items') {
    const items = filterLibrary(searchParams)
    return json({ Items: items, TotalRecordCount: items.length })
  }

  const imageMatch = /^\/Items\/([^/]+)\/Images\/Primary$/.exec(pathname)
  if (imageMatch) return artworkResponse(decodeURIComponent(imageMatch[1]), searchParams)

  const personMatch = /^\/Persons\/([^/]+)$/.exec(pathname)
  if (personMatch) {
    const person = itemsById.get(decodeURIComponent(personMatch[1]))
    return person ? json(person) : json({ error: 'Person not found' }, 404)
  }

  return json({ error: `Demo API does not implement ${pathname}` }, 404)
}
