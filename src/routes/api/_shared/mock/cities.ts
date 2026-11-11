import type { JellyfinItem } from '../../../../core/types'
import library from './library.json'
import type { MockLibrary } from './types'

/**
 * Offline filming cities for the demo library. Real coordinates of one city
 * per production country, nudged deterministically per title so markers do not
 * overlap. Used instead of querying Wikidata in mock mode.
 */

interface City {
  name: string
  lat: number
  lon: number
}

const CITIES: Record<string, City> = {
  Argentina: { name: 'Buenos Aires', lat: -34.6037, lon: -58.3816 },
  Australia: { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
  Austria: { name: 'Vienna', lat: 48.2082, lon: 16.3738 },
  Belgium: { name: 'Brussels', lat: 50.8503, lon: 4.3517 },
  Brazil: { name: 'São Paulo', lat: -23.5505, lon: -46.6333 },
  Canada: { name: 'Toronto', lat: 43.6532, lon: -79.3832 },
  Chile: { name: 'Santiago', lat: -33.4489, lon: -70.6693 },
  China: { name: 'Shanghai', lat: 31.2304, lon: 121.4737 },
  Colombia: { name: 'Bogotá', lat: 4.711, lon: -74.0721 },
  Czechia: { name: 'Prague', lat: 50.0755, lon: 14.4378 },
  Denmark: { name: 'Copenhagen', lat: 55.6761, lon: 12.5683 },
  Egypt: { name: 'Cairo', lat: 30.0444, lon: 31.2357 },
  Finland: { name: 'Helsinki', lat: 60.1699, lon: 24.9384 },
  France: { name: 'Paris', lat: 48.8566, lon: 2.3522 },
  Germany: { name: 'Berlin', lat: 52.52, lon: 13.405 },
  Greece: { name: 'Athens', lat: 37.9838, lon: 23.7275 },
  Hungary: { name: 'Budapest', lat: 47.4979, lon: 19.0402 },
  India: { name: 'Mumbai', lat: 19.076, lon: 72.8777 },
  Iran: { name: 'Tehran', lat: 35.6892, lon: 51.389 },
  Ireland: { name: 'Dublin', lat: 53.3498, lon: -6.2603 },
  Israel: { name: 'Tel Aviv', lat: 32.0853, lon: 34.7818 },
  Italy: { name: 'Rome', lat: 41.9028, lon: 12.4964 },
  Japan: { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  Mexico: { name: 'Mexico City', lat: 19.4326, lon: -99.1332 },
  Morocco: { name: 'Casablanca', lat: 33.5731, lon: -7.5898 },
  Netherlands: { name: 'Amsterdam', lat: 52.3676, lon: 4.9041 },
  'New Zealand': { name: 'Auckland', lat: -36.8485, lon: 174.7633 },
  Nigeria: { name: 'Lagos', lat: 6.5244, lon: 3.3792 },
  Norway: { name: 'Oslo', lat: 59.9139, lon: 10.7522 },
  Poland: { name: 'Warsaw', lat: 52.2297, lon: 21.0122 },
  Portugal: { name: 'Lisbon', lat: 38.7223, lon: -9.1393 },
  Romania: { name: 'Bucharest', lat: 44.4268, lon: 26.1025 },
  Russia: { name: 'Moscow', lat: 55.7558, lon: 37.6173 },
  'South Africa': { name: 'Cape Town', lat: -33.9249, lon: 18.4241 },
  'South Korea': { name: 'Seoul', lat: 37.5665, lon: 126.978 },
  Spain: { name: 'Madrid', lat: 40.4168, lon: -3.7038 },
  Sweden: { name: 'Stockholm', lat: 59.3293, lon: 18.0686 },
  Switzerland: { name: 'Zurich', lat: 47.3769, lon: 8.5417 },
  Thailand: { name: 'Bangkok', lat: 13.7563, lon: 100.5018 },
  Turkey: { name: 'Istanbul', lat: 41.0082, lon: 28.9784 },
  'United Kingdom': { name: 'London', lat: 51.5074, lon: -0.1278 },
  'United States of America': { name: 'New York City', lat: 40.7128, lon: -74.006 },
}

function hash(value: string): number {
  let result = 2166136261
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return result >>> 0
}

export function mockCities(imdbIds: string[]): Record<string, City[]> {
  const byImdb = new Map<string, JellyfinItem>()
  for (const item of (library as MockLibrary).items) {
    const imdb = item.ProviderIds?.Imdb
    if (imdb) byImdb.set(imdb, item as JellyfinItem)
  }

  const result: Record<string, City[]> = {}
  for (const imdb of imdbIds) {
    const item = byImdb.get(imdb)
    if (!item) continue
    const cities = (item.ProductionLocations ?? [])
      .map((country) => CITIES[country])
      .filter((city): city is City => Boolean(city))
      .slice(0, 2)
    if (!cities.length) continue
    const seed = hash(item.Id) / 0xffffffff
    result[imdb] = cities.map((city, index) => ({
      name: city.name,
      lat: Number((city.lat + (seed - 0.5) * 0.6).toFixed(4)),
      lon: Number((city.lon + (((seed * 97) % 1) - 0.5) * 0.8).toFixed(4)),
      country: item.ProductionLocations?.[index],
    }))
  }
  return result
}
