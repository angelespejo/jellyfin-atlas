import { error, type RequestEvent } from '@sveltejs/kit'
import { createRateLimiter } from '#api/_shared/index.js'
import { MOCK_MODE, jellyfinFetch } from '../../../_shared/jellyfin'

const limiter = createRateLimiter()

export async function GET({ params: { id }, getClientAddress }: RequestEvent) {
  let headers: Record<string, string> = {}
  if (!MOCK_MODE) {
    const { allowed, headers: rateHeaders } = limiter.getHeaders(getClientAddress())
    headers = rateHeaders
    if (!allowed) {
      return new Response('Too Many Requests', { status: 429, headers })
    }
  }

  if (!id) {
    return new Response('Missing item ID', { status: 400 })
  }

  const urlParams = new URLSearchParams({
    Ids: id,
    Fields: 'People,ProviderIds,Taglines,ProductionLocations,Overview',
    Recursive: 'true',
    IncludeItemTypes: 'Movie,Series',
  })

  const response = await jellyfinFetch(`/Items?${urlParams}`)

  if (!response.ok) {
    throw error(response.status, 'Failed to fetch item details')
  }

  const data = await response.json()
  const item = data.Items?.[0]

  if (!item) {
    throw error(404, 'Item not found')
  }

  return new Response(JSON.stringify(item), {
    headers: {
      'Content-Type': 'application/json',
      ...(MOCK_MODE ? { 'Cache-Control': 'no-store' } : headers),
    },
  })
}
