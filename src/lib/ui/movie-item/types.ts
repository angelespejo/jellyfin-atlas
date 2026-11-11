import type { JellyfinItem } from '../../../core/types'

export interface MovieItemProps {
  movie: JellyfinItem
  /** Show the poster thumbnail (default `true`). */
  showPoster?: boolean
  showYear?: boolean
  showCountries?: boolean
  showGenres?: boolean
  showType?: boolean
  /** Tighter spacing for narrow lists. */
  compact?: boolean
}
