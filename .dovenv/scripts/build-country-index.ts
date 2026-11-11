/**
 * Generates the compact country data used by the client and the country API.
 * It keeps only the fields we need instead of shipping the full
 * `world-countries` dataset (translations, borders, maps, …).
 *
 * Usage: pnpm countries:build
 */
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import worldCountries from 'world-countries'

const ROOT = process.cwd()
const CLIENT_OUTPUT = join(ROOT, 'src/core/country-index.json')
const SERVER_OUTPUT = join(ROOT, 'src/routes/api/wikidata/country/country-facts.json')

interface WorldCountry {
  cca2?: string
  cca3?: string
  cioc?: string
  name: {
    common: string
    official: string
    native?: Record<string, { common?: string; official?: string }>
  }
  demonyms?: Record<string, string | { f?: string; m?: string }>
  latlng?: [number, number]
  capital?: string[]
  population?: number
  area?: number
  region?: string
  subregion?: string
  flag?: string
  languages?: Record<string, string>
  currencies?: Record<string, { name?: string; symbol?: string }>
}

function strings(value: unknown): string[] {
  if (!value) return []
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

const world = worldCountries as unknown as WorldCountry[]

const client = world
  .map((country) => ({
    c2: country.cca2 || undefined,
    c3: country.cca3 || undefined,
    ci: country.cioc || undefined,
    n: country.name.common,
    o: country.name.official,
    nn: strings(country.name.native),
    d: strings(country.demonyms),
    ll: country.latlng,
  }))
  .filter(
    (country): country is typeof country & { ll: [number, number] } => country.ll?.length === 2
  )

const server = world.map((country) => ({
  c2: country.cca2 || undefined,
  c3: country.cca3 || undefined,
  n: country.name.common,
  o: country.name.official,
  nn: strings(country.name.native),
  capital: country.capital,
  population: country.population,
  area: country.area,
  region: country.region,
  subregion: country.subregion,
  flag: country.flag,
  languages: country.languages,
  currencies: country.currencies,
}))

async function write(output: string, data: unknown): Promise<void> {
  const json = JSON.stringify(data)
  await writeFile(output, json)
  console.log(`✔ ${output} (${(json.length / 1024).toFixed(0)} kB)`)
}

await Promise.all([write(CLIENT_OUTPUT, client), write(SERVER_OUTPUT, server)])
