import { json } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'
import { createRateLimiter } from '#api/_shared/index.js'
import { MOCK_MODE, jellyfinFetch } from '../../../_shared/jellyfin'

const limiter = createRateLimiter()

export async function GET({ params, getClientAddress }: RequestEvent) {
  let headers: Record<string, string> = {}
  if (!MOCK_MODE) {
    const result = limiter.getHeaders(getClientAddress())
    headers = result.headers
    if (!result.allowed) {
      return new Response('Too Many Requests', { status: 429, headers })
    }
  }

  const id = params.id?.trim()
  if (!id) return new Response('Missing person ID', { status: 400 })

  try {
    const query = new URLSearchParams({
      PersonIds: id,
      Recursive: 'true',
      IncludeItemTypes: 'Movie,Series',
      Fields: 'ProductionLocations,Overview,Genres,RunTimeTicks,CommunityRating,ProviderIds',
    })
    const detailQuery = new URLSearchParams({
      Ids: id,
      Fields: 'Overview,PremiereDate,ProviderIds,ProductionLocations',
    })
    const [response, personResponse] = await Promise.all([
      jellyfinFetch(`/Items?${query}`),
      jellyfinFetch(`/Items?${detailQuery}`),
    ])
    if (!response.ok) {
      return new Response(await response.text(), { status: response.status })
    }
    const data = (await response.json()) as {
      Items?: unknown[]
      TotalRecordCount?: number
    }
    const personData = personResponse.ok
      ? ((await personResponse.json()) as { Items?: unknown[] })
      : null
    let person = personData?.Items?.[0] ?? null
    if (!person) {
      const fallback = await jellyfinFetch(`/Persons/${id}`)
      if (fallback.ok) person = await fallback.json()
    }
    return json(
      {
        Items: data.Items ?? [],
        TotalRecordCount: data.TotalRecordCount ?? 0,
        person,
      },
      { headers: MOCK_MODE ? { 'Cache-Control': 'no-store' } : headers }
    )
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Internal Server Error', {
      status: 500,
    })
  }
}
