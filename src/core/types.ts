export interface JellyfinPerson {
  Name: string
  Id: string
  Role?: string
  Type: 'Actor' | 'Director' | 'Writer' | 'Producer' | string
}

export interface JellyfinUserData {
  Played?: boolean
  IsFavorite?: boolean
  PlaybackPositionTicks?: number
  PlayedPercentage?: number
  UnplayedItemCount?: number
  LastPlayedDate?: string
}

export interface JellyfinItem {
  Id: string
  Name: string
  Type?: 'Movie' | 'Series' | string
  ProductionYear?: number
  ProductionLocations?: string[]
  Genres?: string[]
  Overview?: string
  CommunityRating?: number
  RunTimeTicks?: number
  OfficialRating?: string
  People?: JellyfinPerson[]
  ProviderIds?: Record<string, string>
  Taglines?: string[]
  PremiereDate?: string
  CriticRating?: number
  UserData?: JellyfinUserData
}

export interface JellyfinApiResponse {
  Items: JellyfinItem[]
  TotalRecordCount: number
  serverURL: string
  /** Ids of items returned by Jellyfin's "Continue watching" endpoint. */
  resumeIds?: string[]
  /** True when the response comes from the bundled demo library. */
  mock?: boolean
}
