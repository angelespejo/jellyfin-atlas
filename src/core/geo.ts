import { countries } from './country-index'

const SPECIAL_NAMES: Record<string, [number, number]> = {
  'Soviet Union': [55.75, 60.0],
  Czechoslovakia: [50.0755, 14.4378],
  'Palestinian Territory': [31.5, 34.46],
  Unknown: [0, -30],
}

/** Builds a lookup index from country names (common, official, codes, natives, demonyms) to lat/lng coordinates. */
function buildNameIndex(): Map<string, [number, number]> {
  const index = new Map<string, [number, number]>()

  for (const c of countries) {
    const latlng = c.ll
    if (!latlng) continue

    index.set(c.n.toLowerCase(), latlng)
    index.set(c.o.toLowerCase(), latlng)

    if (c.c2) index.set(c.c2.toLowerCase(), latlng)
    if (c.c3) index.set(c.c3.toLowerCase(), latlng)

    if (c.ci) index.set(c.ci.toLowerCase(), latlng)

    for (const native of c.nn ?? []) {
      index.set(native.toLowerCase(), latlng)
    }

    for (const demonym of c.d ?? []) {
      index.set(demonym.toLowerCase(), latlng)
    }
  }

  for (const [name, coords] of Object.entries(SPECIAL_NAMES)) {
    index.set(name.toLowerCase(), coords)
  }

  index.set('uk', index.get('united kingdom') ?? [54, -2])
  index.set('usa', index.get('united states') ?? [38, -97])
  index.set('uae', index.get('united arab emirates') ?? [24, 54])

  return index
}

const nameIndex = buildNameIndex()

/** Resolves a production country to its representative country-level map coordinate. */
export async function getCountryCoords(name: string): Promise<[number, number]> {
  const lower = name.toLowerCase().trim()
  return nameIndex.get(lower) ?? [20, 0]
}

/** Returns true if the country name is known in the local index (no API call needed). */
export function hasCountryCoords(name: string): boolean {
  return nameIndex.has(name.toLowerCase().trim())
}
