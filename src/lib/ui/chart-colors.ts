function hexToRgb(hex: string): [number, number, number] | null {
  const value = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-f]{6}$/i.test(value)) return null
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ]
}

/** Mixes a hex color with another one (`amount` 0–1 of the target color). */
export function mixHex(color: string, target: string, amount = 0.5): string {
  const from = hexToRgb(color)
  const to = hexToRgb(target)
  if (!from || !to) return color
  const ratio = Math.min(1, Math.max(0, amount))
  return `#${from
    .map((channel, index) => toHex(channel + (to[index]! - channel) * ratio))
    .join('')}`
}

/**
 * Title-count scale, low to high: red → orange → yellow → green → light blue
 * → blue → violet → pink, with intermediate stops between every named color.
 * Stops are `[hue, saturation, lightness]`.
 */
export const COUNT_SCALE_STOPS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 78, 55], // red
  [20, 88, 55], // red-orange
  [40, 92, 53], // orange
  [60, 90, 50], // amber-yellow
  [80, 72, 45], // yellow-green
  [100, 62, 42], // lime
  [120, 62, 42], // green
  [140, 58, 40], // deep green
  [160, 58, 40], // teal
  [180, 62, 42], // cyan
  [200, 76, 48], // light blue
  [220, 78, 54], // sky blue
  [240, 76, 58], // blue
  [260, 68, 60], // blue-violet
  [280, 62, 60], // violet
  [300, 64, 60], // magenta
  [320, 72, 62], // pink
]

function hslToRgb(hue: number, saturation: number, lightness: number): [number, number, number] {
  const sat = saturation / 100
  const light = lightness / 100
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12
    const a = sat * Math.min(light, 1 - light)
    return light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [Math.round(255 * channel(0)), Math.round(255 * channel(8)), Math.round(255 * channel(4))]
}

function toHex(value: number): string {
  return Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, '0')
}

/** Maps a 0–1 position onto the count scale (red → … → pink). */
export function countColor(t: number): string {
  const position = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0
  const scaled = position * (COUNT_SCALE_STOPS.length - 1)
  const index = Math.min(COUNT_SCALE_STOPS.length - 2, Math.floor(scaled))
  const local = scaled - index
  const from = COUNT_SCALE_STOPS[index]!
  const to = COUNT_SCALE_STOPS[index + 1]!
  const hue = from[0] + (to[0] - from[0]) * local
  const saturation = from[1] + (to[1] - from[1]) * local
  const lightness = from[2] + (to[2] - from[2]) * local
  const rgb = hslToRgb(hue, saturation, lightness)
  return `#${rgb.map(toHex).join('')}`
}

/**
 * Assigns a sequential color per country so the map and the chart use the same
 * color scale: the country with the fewest titles is red and the one with the
 * most goes through orange, yellow, green, light blue, blue and violet to pink.
 * The square root spreads low counts so a single blockbuster doesn't flatten
 * every other country into one shade.
 */
export function countryColorMap(counts: Record<string, number>): Record<string, string> {
  const entries = Object.entries(counts)
  const colors: Record<string, string> = Object.create(null)
  if (!entries.length) return colors

  const values = entries.map(([, count]) => count)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min

  for (const [country, count] of entries) {
    const ratio = span === 0 ? 0.5 : Math.sqrt((count - min) / span)
    colors[country] = countColor(ratio)
  }
  return colors
}
