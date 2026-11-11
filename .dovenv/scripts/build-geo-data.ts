/**
 * Regenerates the static geodata used by the map.
 *
 *   pnpm geo:build
 *
 * Sources (both free and open):
 *   - Natural Earth 110m admin 0 countries (public domain) -> static/geo/countries.geojson
 *   - historical-basemaps by aourednik (GPL-3.0)           -> static/geo/historical.json
 *
 * Only the entities that no longer exist (or changed shape) are kept from
 * historical-basemaps, so the generated payload stays small.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type Position = [number, number]
type Ring = Position[]
type Polygon = Ring[]
type MultiPolygon = Polygon[]

interface RawGeometry {
  type: string
  coordinates?: unknown
}

interface GeoFeature<Properties = Record<string, unknown>> {
  type: 'Feature'
  properties: Properties
  geometry: RawGeometry
}

interface GeoCollection<Properties = Record<string, unknown>> {
  type: 'FeatureCollection'
  features: GeoFeature<Properties>[]
}

interface RoundGeometry {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: Polygon | MultiPolygon
}

interface CountryProperties {
  NAME: string
  NAME_EN: string | null
  NAME_ES: string | null
  ISO_A3: string | null
  ISO_A2: string | null
  ADM0_A3: string | null
  LABEL_X: number | null
  LABEL_Y: number | null
}

interface HistoricalEntityConfig {
  key: string
  name: string
  aliases: string[]
  years: number[]
  label: Position
}

interface HistoricalEpoch {
  year: number
  label: Position
  geometry: RoundGeometry
}

interface HistoricalEntity {
  name: string
  aliases: string[]
  label: Position
  epochs: HistoricalEpoch[]
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT_DIR = resolve(ROOT, 'static/geo')

const NE_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'
const HIST_BASE = 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson'

/** Countries that no longer exist (or were split) and need historical borders. */
const HISTORICAL_ENTITIES: HistoricalEntityConfig[] = [
  {
    key: 'ussr',
    name: 'USSR',
    aliases: ['USSR', 'Soviet Union', 'Union of Soviet Socialist Republics'],
    years: [1938, 1945, 1960],
    label: [37.6173, 55.7558],
  },
  {
    key: 'czechoslovakia',
    name: 'Czechoslovakia',
    aliases: ['Czechoslovakia', 'Czechoslovak Socialist Republic', 'Czech Republic and Slovakia'],
    years: [1920, 1930, 1938, 1945, 1960],
    label: [14.4378, 50.0755],
  },
  {
    key: 'yugoslavia',
    name: 'Yugoslavia',
    aliases: ['Yugoslavia', 'Yugoslav Socialist Republic'],
    years: [1920, 1930, 1938, 1945, 1960],
    label: [20.4573, 44.7872],
  },
  {
    key: 'east-germany',
    name: 'East Germany',
    aliases: ['East Germany', 'German Democratic Republic', 'GDR', 'DDR'],
    years: [1945, 1960],
    label: [13.405, 52.52],
  },
  {
    key: 'west-germany',
    name: 'West Germany',
    aliases: ['West Germany', 'Federal Republic of Germany', 'FRG'],
    years: [1945, 1960],
    label: [7.0982, 50.7374],
  },
  {
    key: 'ottoman-empire',
    name: 'Ottoman Empire',
    aliases: ['Ottoman Empire', 'Turkey (Ottoman)', 'Ottoman Turkey'],
    years: [1400, 1492, 1600, 1700, 1800, 1900, 1914],
    label: [28.9784, 41.0082],
  },
  {
    key: 'prussia',
    name: 'Prussia',
    aliases: ['Prussia', 'Kingdom of Prussia'],
    years: [1530, 1600, 1700, 1800],
    label: [13.405, 52.52],
  },
  {
    key: 'mandatory-palestine',
    name: 'Mandatory Palestine (GB)',
    aliases: ['Palestinian Territory', 'Palestine', 'Mandatory Palestine'],
    years: [1938],
    label: [35.2137, 31.7683],
  },
]

const PRECISION = 2

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return (await res.json()) as T
}

function roundCoord([lon, lat]: Position): Position {
  const factor = 10 ** PRECISION
  return [Math.round(lon * factor) / factor, Math.round(lat * factor) / factor]
}

function roundRing(ring: Ring): Ring {
  const rounded: Ring = []
  for (const coord of ring) {
    const point = roundCoord(coord)
    const last = rounded[rounded.length - 1]
    if (!last || last[0] !== point[0] || last[1] !== point[1]) rounded.push(point)
  }
  if (rounded.length > 1) {
    const first = rounded[0]!
    const last = rounded[rounded.length - 1]!
    if (first[0] !== last[0] || first[1] !== last[1]) rounded.push([...first])
  }
  return rounded
}

function roundPolygon(polygon: Polygon): Polygon {
  return polygon.map(roundRing).filter((ring) => ring.length >= 4)
}

function roundGeometry(geometry: RawGeometry | null | undefined): RoundGeometry | null {
  if (!geometry) return null
  if (geometry.type === 'Polygon') {
    const polygon = roundPolygon(geometry.coordinates as Polygon)
    return polygon.length ? { type: 'Polygon', coordinates: polygon } : null
  }
  if (geometry.type === 'MultiPolygon') {
    const polygons = (geometry.coordinates as MultiPolygon)
      .map(roundPolygon)
      .filter((polygon) => polygon.length)
    return polygons.length ? { type: 'MultiPolygon', coordinates: polygons } : null
  }
  return null
}

function ringArea(ring: Ring): number {
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const current = ring[i]!
    const previous = ring[j]!
    area += (previous[0] + current[0]) * (previous[1] - current[1])
  }
  return Math.abs(area / 2)
}

function ringCentroid(ring: Ring): Position {
  let area = 0
  let x = 0
  let y = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const current = ring[i]!
    const previous = ring[j]!
    const cross = previous[0] * current[1] - current[0] * previous[1]
    area += cross
    x += (previous[0] + current[0]) * cross
    y += (previous[1] + current[1]) * cross
  }
  area /= 2
  if (!area || !ring[0]) return [0, 0]
  return [x / (6 * area), y / (6 * area)]
}

/** Approximate label point: centroid of the largest ring of the geometry. */
function geometryLabel(geometry: RoundGeometry): Position {
  const polygons =
    geometry.type === 'Polygon'
      ? [geometry.coordinates as Polygon]
      : (geometry.coordinates as MultiPolygon)
  let best: Ring | null = null
  let bestArea = -1
  for (const polygon of polygons) {
    for (const ring of polygon) {
      const area = ringArea(ring)
      if (area > bestArea) {
        bestArea = area
        best = ring
      }
    }
  }
  return best ? ringCentroid(best) : [0, 0]
}

function mergeFeatures(features: GeoFeature[]): RawGeometry | null {
  if (features.length === 1) return features[0]!.geometry
  const polygons: Polygon[] = []
  for (const feature of features) {
    const geometry = feature.geometry
    if (geometry.type === 'Polygon') polygons.push(geometry.coordinates as Polygon)
    else if (geometry.type === 'MultiPolygon') {
      polygons.push(...(geometry.coordinates as MultiPolygon))
    }
  }
  return polygons.length ? { type: 'MultiPolygon', coordinates: polygons } : null
}

async function buildModernCountries(): Promise<GeoCollection<CountryProperties>> {
  const data = await fetchJson<GeoCollection<Record<string, unknown>>>(NE_URL)
  const features: GeoFeature<CountryProperties>[] = []
  for (const feature of data.features) {
    const geometry = roundGeometry(feature.geometry)
    if (!geometry) continue
    const p = feature.properties
    features.push({
      type: 'Feature',
      properties: {
        NAME: String(p.NAME ?? ''),
        NAME_EN: typeof p.NAME_EN === 'string' ? p.NAME_EN : null,
        NAME_ES: typeof p.NAME_ES === 'string' ? p.NAME_ES : null,
        ISO_A3: p.ISO_A3 && p.ISO_A3 !== '-99' ? String(p.ISO_A3) : null,
        ISO_A2: p.ISO_A2 && p.ISO_A2 !== '-99' ? String(p.ISO_A2) : null,
        ADM0_A3: p.ADM0_A3 && p.ADM0_A3 !== '-99' ? String(p.ADM0_A3) : null,
        LABEL_X: typeof p.LABEL_X === 'number' ? p.LABEL_X : null,
        LABEL_Y: typeof p.LABEL_Y === 'number' ? p.LABEL_Y : null,
      },
      geometry,
    })
  }
  return { type: 'FeatureCollection', features }
}

async function buildHistoricalEntities(): Promise<Record<string, HistoricalEntity>> {
  const cache = new Map<number, Promise<GeoCollection>>()
  const loadYear = (year: number): Promise<GeoCollection> => {
    if (!cache.has(year)) {
      cache.set(year, fetchJson<GeoCollection>(`${HIST_BASE}/world_${year}.geojson`))
    }
    return cache.get(year)!
  }

  const result: Record<string, HistoricalEntity> = {}
  for (const entity of HISTORICAL_ENTITIES) {
    const epochs: HistoricalEpoch[] = []
    for (const year of entity.years) {
      let data: GeoCollection
      try {
        data = await loadYear(year)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`  ! ${entity.name} ${year}: ${message}`)
        continue
      }
      const matches = data.features.filter((feature) => feature.properties?.NAME === entity.name)
      if (!matches.length) continue
      const merged = mergeFeatures(matches)
      const geometry = roundGeometry(merged)
      if (!geometry) continue
      epochs.push({ year, label: geometryLabel(geometry), geometry })
    }
    if (!epochs.length) {
      console.warn(`  ! ${entity.name}: no epochs found`)
      continue
    }
    result[entity.key] = {
      name: entity.name,
      aliases: entity.aliases,
      label: entity.label,
      epochs,
    }
    console.log(`  + ${entity.name}: ${epochs.map((epoch) => epoch.year).join(', ')}`)
  }
  return result
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true })

  console.log('Building modern country borders (Natural Earth 110m)...')
  const modern = await buildModernCountries()
  const modernPath = resolve(OUT_DIR, 'countries.geojson')
  await writeFile(modernPath, JSON.stringify(modern))
  console.log(`  -> ${modernPath} (${modern.features.length} features)`)

  console.log('Building historical country borders (historical-basemaps)...')
  const historical = await buildHistoricalEntities()
  const historicalPath = resolve(OUT_DIR, 'historical.json')
  await writeFile(historicalPath, JSON.stringify(historical))
  console.log(`  -> ${historicalPath} (${Object.keys(historical).length} entities)`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
