import { error, type RequestEvent } from '@sveltejs/kit'
import { createRateLimiter } from '#api/_shared/index.js'
import { MOCK_MODE, jellyfinFetch } from '../../../_shared/jellyfin'

// Posters are requested once per visible row: the default 30/min was too low
// for the table and clipped images with 429 responses.
const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 300 })

export async function GET({ params, url, getClientAddress }: RequestEvent) {
  let headers: Record<string, string> = {}
  if (!MOCK_MODE) {
    const result = limiter.getHeaders(getClientAddress())
    headers = result.headers
    if (!result.allowed) {
      return new Response('Too Many Requests', { status: 429, headers })
    }
  }

  const { id } = params
  if (!id) {
    return new Response('Missing image ID', { status: 400 })
  }
  const imageParams = new URLSearchParams()
  for (const key of ['maxWidth', 'maxHeight'] as const) {
    const value = url.searchParams.get(key)
    if (value) imageParams.set(key, value)
  }
  const query = imageParams.toString()

  const response = await jellyfinFetch(
    `/Items/${encodeURIComponent(id)}/Images/Primary${query ? `?${query}` : ''}`
  )

  if (!response.ok) {
    throw error(response.status, `Image not found`)
  }

  const buffer = await response.arrayBuffer()

  return new Response(buffer, {
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
      'Cache-Control': MOCK_MODE
        ? response.headers.get('Cache-Control') || 'public, max-age=86400'
        : 'public, max-age=31536000, immutable',
      ...headers,
    },
  })
}
