/**
 * Deterministic SVG artwork used when the demo library has no downloaded
 * poster/portrait for an id. Everything is generated locally: no network, no
 * remote markup and all interpolated text is XML-escaped.
 */

const MAX_SIDE = 800
const MIN_SIDE = 48

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

function hash(value: string): number {
  let result = 2166136261
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return result >>> 0
}

function size(value: string | null, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(MAX_SIDE, Math.max(MIN_SIDE, Math.round(parsed)))
}

function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxChars && current) {
      lines.push(current)
      current = word
      if (lines.length === maxLines) break
    } else {
      current = candidate
    }
  }
  if (lines.length < maxLines && current) lines.push(current)
  if (!lines.length) lines.push(text.slice(0, maxChars))
  const consumed = lines.join(' ').length
  if (consumed < text.length)
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[\s.…]+$/, '')}…`
  return lines.slice(0, maxLines)
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function fallbackArtwork(
  catalogId: string,
  title: string,
  itemType: string | undefined,
  maxWidth: string | null,
  maxHeight: string | null,
  productionYear?: number
): string {
  const seed = hash(catalogId || title)
  const person = itemType === 'Person'
  const hue = seed % 360
  const width = size(maxWidth, person ? 300 : 300)
  const height = person ? width : size(maxHeight, Math.round(width * 1.5))
  const accent = `hsl(${(hue + 42) % 360} 68% 62%)`
  const start = `hsl(${hue} 46% 34%)`
  const end = `hsl(${(hue + 60) % 360} 52% 14%)`
  const label = escapeXml(title || 'Jellyfin')
  const fontSize = Math.max(9, Math.round(width / (person ? 2.6 : 9)))

  if (person) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${start}"/>
      <stop offset="1" stop-color="${end}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <circle cx="${width * 0.84}" cy="${height * 0.18}" r="${width * 0.34}" fill="${accent}" opacity="0.18"/>
  <text x="50%" y="50%" fill="rgba(255,255,255,0.94)" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="${Math.round(width * 0.3)}" font-weight="700" text-anchor="middle" dominant-baseline="central">${escapeXml(initials(title))}</text>
  <text x="50%" y="${height * 0.82}" fill="rgba(255,255,255,0.7)" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="${Math.round(width * 0.055)}" text-anchor="middle">${label}</text>
</svg>`
  }

  const lines = wrap(title, Math.max(8, Math.round(width / 18)), 3)
  const lineHeight = fontSize * 1.22
  const totalHeight = lines.length * lineHeight
  const firstBaseline = height * 0.52 - totalHeight / 2 + lineHeight * 0.8
  const text = lines
    .map(
      (line, index) =>
        `<tspan x="${width / 2}" y="${firstBaseline + index * lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${start}"/>
      <stop offset="1" stop-color="${end}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <circle cx="${width * 0.8}" cy="${height * 0.16}" r="${width * 0.55}" fill="${accent}" opacity="0.16"/>
  <rect x="0" y="${height - 6}" width="${width}" height="6" fill="${accent}" opacity="0.75"/>
  <text fill="rgba(255,255,255,0.95)" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="${fontSize}" font-weight="700" text-anchor="middle">${text}</text>
  <text x="${width / 2}" y="${height - Math.round(width / 20)}" fill="rgba(255,255,255,0.62)" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="${Math.round(width / 22)}" text-anchor="middle">${escapeXml(
    [productionYear, itemType === 'Series' ? 'Series' : 'Movie'].filter(Boolean).join(' · ')
  )}</text>
</svg>`
}
