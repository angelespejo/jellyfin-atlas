import {
  JELLYFIN_API_KEY,
  JELLYFIN_MOCK,
  JELLYFIN_PUBLIC_URL,
  JELLYFIN_URL,
} from '$app/env/private'

/**
 * True when the app must serve the bundled demo library instead of a real
 * Jellyfin server. `pnpm dev` starts Vite with `--mode mock`; Docker demos can
 * set `JELLYFIN_MOCK=true` at runtime.
 */
export const MOCK_MODE =
  import.meta.env.MODE === 'mock' || JELLYFIN_MOCK === 'true' || JELLYFIN_MOCK === '1'

export function jellyfinBaseUrl(): string {
  return (JELLYFIN_URL ?? '').trim().replace(/\/+$/, '')
}

/**
 * URL the browser should use for deep links. In Docker `JELLYFIN_URL` may be an
 * internal hostname (`http://jellyfin:8096`), so let deployments override it
 * with the public URL while the proxy keeps using the internal one.
 */
export function jellyfinPublicUrl(): string {
  return (JELLYFIN_PUBLIC_URL || JELLYFIN_URL || '').trim().replace(/\/+$/, '')
}

export function jellyfinToken(): string {
  return (JELLYFIN_API_KEY ?? '').trim()
}

export function authHeaders(): Record<string, string> {
  return {
    Authorization: `MediaBrowser Token=${jellyfinToken()}`,
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  }
}

/**
 * Single entry point for every Jellyfin request made by the API routes:
 * proxies to the configured server or answers from the demo library.
 */
export async function jellyfinFetch(path: string, init?: RequestInit): Promise<Response> {
  if (MOCK_MODE) {
    const { mockJellyfinRequest } = await import('./mock/api')
    return mockJellyfinRequest(path, init)
  }

  const base = jellyfinBaseUrl()
  if (!base || !jellyfinToken()) {
    throw new Error(
      'Jellyfin is not configured. Set JELLYFIN_URL and JELLYFIN_API_KEY in .env, or run `pnpm dev` to use the demo library.'
    )
  }

  return fetch(`${base}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers as Record<string, string> | undefined) },
    cache: 'no-store',
  })
}
