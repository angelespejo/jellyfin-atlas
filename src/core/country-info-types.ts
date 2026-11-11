export interface CountryInfo {
  name: string
  description?: string
  extract?: string
  wikipediaUrl?: string
  thumbnail?: string
  flagUrl?: string
  /** Coat of arms / emblem (Wikidata P94), used as the country logo. */
  coatOfArmsUrl?: string
  flagEmoji?: string
  capital?: string
  population?: { value: number; year?: number }
  areaKm2?: number
  languages?: string[]
  currency?: string
  continent?: string
  iso2?: string
  iso3?: string
  inceptionYear?: number
  dissolvedYear?: number
}

export interface CachedCountryInfo extends CountryInfo {
  fetchedAt: number
}

export function countryInfoKey(name: string, locale: string): string {
  return `${locale}:${name.trim().toLowerCase()}`
}
