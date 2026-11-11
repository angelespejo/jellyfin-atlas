import data from './country-index.json'

/** Compact subset of `world-countries` needed by the client. */
export interface CountryIndexEntry {
  c2?: string
  c3?: string
  ci?: string
  n: string
  o: string
  nn: string[]
  d: string[]
  ll: [number, number]
}

export const countries = data as CountryIndexEntry[]

/** Regional-indicator flag emoji for an ISO 3166-1 alpha-2 code. */
export function flagEmoji(code: string | undefined): string | undefined {
  if (!code || code.length !== 2) return undefined
  return [...code.toUpperCase()]
    .map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
    .join('')
}
