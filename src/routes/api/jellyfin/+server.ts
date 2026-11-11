import { json } from '@sveltejs/kit'
import { JELLYFIN_USER_ID } from '$app/env/private'
import type { RequestEvent } from '@sveltejs/kit'
import type { JellyfinApiResponse } from '#core'
import { createRateLimiter } from '#api/_shared/index.js'
import { MOCK_MODE, jellyfinFetch, jellyfinPublicUrl } from '../_shared/jellyfin'

const limiter = createRateLimiter()

let cachedUserId: string | null | undefined

/**
 * Jellyfin only returns per-user data (played, favorite, resume) when a user id
 * is supplied. Prefer an explicit JELLYFIN_USER_ID, otherwise reuse the first
 * user exposed by the server.
 */
async function resolveUserId(): Promise<string | null> {
  if (JELLYFIN_USER_ID) return JELLYFIN_USER_ID
  if (cachedUserId !== undefined) return cachedUserId

  try {
    const response = await jellyfinFetch('/Users')
    if (!response.ok) {
      cachedUserId = null
      return null
    }
    const users = (await response.json()) as Array<{ Id?: string }>
    cachedUserId = Array.isArray(users) ? (users.find((user) => user?.Id)?.Id ?? null) : null
  } catch {
    cachedUserId = null
  }

  return cachedUserId
}

async function fetchResumeIds(userId: string): Promise<string[]> {
  try {
    const params = new URLSearchParams({
      IncludeItemTypes: 'Movie,Series',
      Recursive: 'true',
      MediaTypes: 'Video',
      Limit: '300',
    })
    const response = await jellyfinFetch(`/Users/${userId}/Items/Resume?${params}`)
    if (!response.ok) return []
    const data = (await response.json()) as { Items?: Array<{ Id?: string }> }
    return (data.Items ?? []).map((item) => item.Id).filter((id): id is string => Boolean(id))
  } catch {
    return []
  }
}

export async function GET({ getClientAddress }: RequestEvent) {
  if (!MOCK_MODE) {
    const { allowed, headers: rateHeaders } = limiter.getHeaders(getClientAddress())
    if (!allowed) {
      return new Response('Too Many Requests', { status: 429, headers: rateHeaders })
    }
  }

  try {
    const userId = await resolveUserId()
    const params = new URLSearchParams({
      IncludeItemTypes: 'Movie,Series',
      Recursive: 'true',
      Fields: 'ProductionLocations,Overview',
    })
    if (userId) params.set('userId', userId)

    const response = await jellyfinFetch(`/Items?${params}`)

    if (!response.ok) {
      return new Response(await response.text(), { status: response.status })
    }

    const data = await response.json()
    const resumeIds = userId ? await fetchResumeIds(userId) : []
    const result: JellyfinApiResponse = {
      ...data,
      serverURL: jellyfinPublicUrl(),
      resumeIds,
      ...(MOCK_MODE ? { mock: true } : {}),
    }
    return json(result, { headers: MOCK_MODE ? { 'Cache-Control': 'no-store' } : undefined })
  } catch (err) {
    return new Response(err instanceof Error ? err.message : 'Internal Server Error', {
      status: 500,
    })
  }
}
