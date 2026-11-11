import { APP_USER_AGENT } from '#const'

const getWikiUrl = (subdomain: string = 'en') => `https://${subdomain}.wikipedia.org`

type SearchData = {
  imdbId?: string
  title?: string
}

async function fetchWikiUrlByImdbId(imdbId: string): Promise<string | null> {
  try {
    const formattedImdb = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`
    const sparqlQuery = `
      SELECT ?article WHERE {
        ?item wdt:P345 "${formattedImdb}".
        ?article schema:about ?item;
                 schema:isPartOf ?site.
        FILTER(?site = <${getWikiUrl('es')}/> || ?site = <${getWikiUrl('en')}/>)
      }
      ORDER BY DESC(?site = <${getWikiUrl('es')}/>)
      LIMIT 1
    `
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': APP_USER_AGENT,
      },
    })

    if (!res.ok) return null
    const data = await res.json()
    return data?.results?.bindings?.[0]?.article?.value ?? null
  } catch {
    return null
  }
}

async function fetchWikiUrlByTitle(title: string): Promise<string | null> {
  try {
    const searchParams = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: title,
      format: 'json',
      origin: '*',
      srlimit: '1',
    })

    const url = `${getWikiUrl('en')}/w/api.php?${searchParams.toString()}`
    const res = await fetch(url, {
      headers: { 'User-Agent': APP_USER_AGENT },
    })

    if (!res.ok) return null
    const data = await res.json()
    const pageTitle = data?.query?.search?.[0]?.title

    if (!pageTitle) return null
    return `${getWikiUrl('en')}/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`
  } catch {
    return null
  }
}

/**
 * Fetches the Wikipedia article URL for a movie or TV show.
 *
 * Prioritizes querying Wikidata using the IMDb ID (preferring Spanish first, then English).
 * If no IMDb ID is provided or the SPARQL query fails, it falls back to a title-based
 * search using the English Wikipedia API.
 *
 * @param params - Search parameters.
 * @param params.imdbId - Optional IMDb identifier (e.g., "tt1234567" or "1234567").
 * @param params.title - Optional title to search on Wikipedia as a fallback.
 *
 * @returns A promise that resolves to the Wikipedia article URL if found, or `null` otherwise.
 */
export async function getWikipediaUrl({ imdbId, title }: SearchData): Promise<string | null> {
  if (imdbId) {
    const wikidataUrl = await fetchWikiUrlByImdbId(imdbId)
    if (wikidataUrl) return wikidataUrl
  }

  if (title) {
    const searchUrl = await fetchWikiUrlByTitle(title)
    if (searchUrl) return searchUrl
  }

  return null
}
