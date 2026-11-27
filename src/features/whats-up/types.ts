import type { BaseRecord, MediaAssetReference } from '../skills-hobbies/types'

export type EntertainmentType = 'movie' | 'tv_show'
export type EntertainmentStatus = 'favourite' | 'watching' | 'watchlist' | 'completed' | 'paused' | 'dropped'

export interface EntertainmentItem extends BaseRecord {
  title: string
  type: EntertainmentType
  description?: string
  poster?: MediaAssetReference
  backdrop?: MediaAssetReference
  posterUrl?: string
  backdropUrl?: string
  releaseYear?: number
  genres: string[]
  status: EntertainmentStatus
  personalRating?: number
  personalNotes?: string
  startedAt?: string
  completedAt?: string
  externalIds?: { tmdb?: string; imdb?: string }
}

export interface Song extends BaseRecord {
  title: string
  artists: string[]
  album?: string
  albumArtwork?: MediaAssetReference
  durationMs?: number
  releaseDate?: string
  spotifyTrackId?: string
  spotifyUrl?: string
  localAudioAssetId?: string
  localFileName?: string
  personalNotes?: string
  categories: Array<'favourite' | 'discovered' | 'want_to_listen'>
}

export type PlaylistSource = 'manual' | 'spotify'
export interface MusicPlaylist extends BaseRecord {
  name: string
  description?: string
  coverImage?: MediaAssetReference
  source: PlaylistSource
  spotifyPlaylistId?: string
  spotifyUrl?: string
  trackIds: string[]
  isFavourite: boolean
}

export interface CurrentActivity extends BaseRecord {
  type: 'listening' | 'watching' | 'discovering' | 'other'
  referenceType?: 'song' | 'entertainment'
  referenceId?: string
  title: string
  description?: string
  startedAt?: string
  isActive: boolean
}

export interface SpotifyConnection {
  spotifyUserId: string
  displayName?: string
  connectedAt: string
  lastImportedAt?: string
}

export interface SpotifyImportRecord extends BaseRecord {
  spotifyPlaylistId: string
  playlistName: string
  importedTrackIds: string[]
  importedAt: string
  importStatus: 'completed' | 'partial' | 'failed'
}

export interface MediaAsset extends BaseRecord {
  id: string
  blob: Blob
  mimeType: string
  fileName: string
  size: number
}
