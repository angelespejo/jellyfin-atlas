import { json } from '@sveltejs/kit'
import { APP_VERSION } from '#const'
import { MOCK_MODE, jellyfinBaseUrl, jellyfinToken } from '../_shared/jellyfin'

/**
 * Runtime status used as the Docker healthcheck and by the About dialog.
 * It answers 200 even when Jellyfin is unreachable (the app itself keeps
 * running), with `status: 'degraded'` so monitoring can react.
 */

const CACHE_TTL_MS = 30_000
let cached: { at: number; reachable: boolean } | null = null

async function probe(): Promise<boolean> {
  if (MOCK_MODE) return true
  const base = jellyfinBaseUrl()
  if (!base || !jellyfinToken()) return false

  try {
    const response = await fetch(`${base}/System/Info/Public`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4_000),
      cache: 'no-store',
    })
    return response.ok
  } catch {
    return false
  }
}

export async function GET() {
  const now = Date.now()
  if (!cached || now - cached.at > CACHE_TTL_MS) {
    cached = { at: now, reachable: await probe() }
  }

  const configured = MOCK_MODE || Boolean(jellyfinBaseUrl() && jellyfinToken())

  return json(
    {
      status: cached.reachable ? 'ok' : 'degraded',
      version: APP_VERSION,
      mock: MOCK_MODE,
      jellyfin: { configured, reachable: cached.reachable },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
