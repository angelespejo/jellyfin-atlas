import * as m from '#i18n/messages.js'

export type StatusFilter = 'all' | 'played' | 'unplayed' | 'favorite' | 'continue'

export function itemTypeLabel(type?: string): string {
  if (type === 'Movie') return m['type.movie']()
  if (type === 'Series') return m['type.series']()
  if (type === 'Person') return m['type.person']()
  return type?.trim() || m['type.other']()
}

export function itemTypeIcon(type?: string): string {
  if (type === 'Series') return 'tv'
  if (type === 'Person') return 'user'
  return 'film'
}

export function statusLabel(status: StatusFilter): string {
  switch (status) {
    case 'played':
      return m['filter.played']()
    case 'unplayed':
      return m['filter.unplayed']()
    case 'favorite':
      return m['filter.favorite']()
    case 'continue':
      return m['filter.continueWatching']()
    default:
      return m['filter.all']()
  }
}

export function statusIcon(status: StatusFilter): string {
  switch (status) {
    case 'played':
      return 'circle-check'
    case 'unplayed':
      return 'circle'
    case 'favorite':
      return 'heart'
    case 'continue':
      return 'play'
    default:
      return 'list'
  }
}
