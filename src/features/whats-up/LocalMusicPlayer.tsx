import { useEffect, useMemo, useRef, useState } from 'react'
import { Music2, Pause, Play, SkipBack, SkipForward, Shuffle, Repeat1, Upload, Trash2, HardDrive, Headphones } from 'lucide-react'
import { deleteMediaAsset, deleteSong, getMediaAsset, saveMediaAsset, saveSong } from '../../db'
import type { MediaAsset, Song } from './types'

type Props = { songs: Song[]; onRefresh: () => Promise<void> }

const MAX_AUDIO_SIZE = 50 * 1024 * 1024
const supportedExtensions = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm)$/i
const timestamp = () => new Date().toISOString()

export default function LocalMusicPlayer({ songs, onRefresh }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [message, setMessage] = useState('')
  const [shuffle, setShuffle] = useState(false)
  const [repeatOne, setRepeatOne] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  const localSongs = useMemo(() => songs.filter(song => Boolean(song.localAudioAssetId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [songs])
  const currentIndex = currentSong ? localSongs.findIndex(song => song.id === currentSong.id) : -1

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  useEffect(() => {
    const session = navigator.mediaSession
    if (!session) return
    if (currentSong) {
      session.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artists.join(', ') || 'Solace local library',
        album: currentSong.album || 'Solace'
      })
    } else {
      session.metadata = null
    }
    session.playbackState = isPlaying ? 'playing' : 'paused'
    const play = () => { void audioRef.current?.play().catch(() => setMessage('Tap play to resume audio.')) }
    const pause = () => audioRef.current?.pause()
    const next = () => { void moveTrack(1) }
    const previous = () => { void moveTrack(-1) }
    try {
      session.setActionHandler('play', play)
      session.setActionHandler('pause', pause)
      session.setActionHandler('nexttrack', next)
      session.setActionHandler('previoustrack', previous)
      session.setActionHandler('seekbackward', details => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - (details.seekOffset || 10)) })
      session.setActionHandler('seekforward', details => { if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.duration || duration, audioRef.current.currentTime + (details.seekOffset || 10)) })
    } catch { /* Some browsers expose only a subset of media actions. */ }
    return () => {
      for (const action of ['play', 'pause', 'nexttrack', 'previoustrack', 'seekbackward', 'seekforward'] as MediaSessionAction[]) {
        try { session.setActionHandler(action, null) } catch { /* Unsupported action. */ }
      }
    }
  }, [currentSong, isPlaying, duration, localSongs, shuffle, repeatOne])

  async function importFile(file?: File) {
    if (!file) return
    if (!(file.type.startsWith('audio/') || supportedExtensions.test(file.name))) {
      setMessage('Choose a supported audio file.')
      return
    }
    if (file.size > MAX_AUDIO_SIZE) {
      setMessage('That file is over 50 MB. Choose a smaller audio file.')
      return
    }
    setIsImporting(true)
    setMessage('')
    try {
      const id = crypto.randomUUID()
      const createdAt = timestamp()
      const asset: MediaAsset = {
        id,
        blob: file,
        mimeType: file.type || 'application/octet-stream',
        fileName: file.name,
        size: file.size,
        createdAt,
        updatedAt: createdAt
      }
      await saveMediaAsset(asset)
      const cleanName = file.name.replace(/\.[^.]+$/, '').trim() || 'Untitled track'
      await saveSong({
        id: crypto.randomUUID(),
        title: cleanName,
        artists: [],
        categories: ['want_to_listen'],
        localAudioAssetId: id,
        localFileName: file.name,
        createdAt,
        updatedAt: createdAt
      })
      await onRefresh()
      setMessage('Added to your offline library on this device.')
    } catch {
      setMessage('Could not save that file. Your device may be low on available storage.')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function playSong(song: Song) {
    if (!song.localAudioAssetId || !audioRef.current) return
    try {
      const asset = await getMediaAsset(song.localAudioAssetId)
      if (!asset) {
        setMessage('The audio file is missing from local storage.')
        return
      }
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const url = URL.createObjectURL(asset.blob)
      objectUrlRef.current = url
      const audio = audioRef.current
      audio.src = url
      audio.load()
      setCurrentSong(song)
      setCurrentTime(0)
      setDuration(0)
      await audio.play()
      setIsPlaying(true)
      setMessage('')
    } catch {
      setIsPlaying(false)
      setMessage('This audio format may not be supported by your browser.')
    }
  }

  async function moveTrack(direction: number) {
    if (!localSongs.length) return
    let nextIndex = currentIndex
    if (nextIndex < 0) nextIndex = direction > 0 ? 0 : localSongs.length - 1
    else if (shuffle && direction > 0 && localSongs.length > 1) {
      const choices = localSongs.map((_, index) => index).filter(index => index !== currentIndex)
      nextIndex = choices[Math.floor(Math.random() * choices.length)]
    } else nextIndex = (nextIndex + direction + localSongs.length) % localSongs.length
    await playSong(localSongs[nextIndex])
  }

  async function removeTrack(song: Song) {
    if (currentSong?.id === song.id) {
      audioRef.current?.pause()
      if (audioRef.current) audioRef.current.removeAttribute('src')
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
      setCurrentSong(null)
      setIsPlaying(false)
    }
    if (song.localAudioAssetId) await deleteMediaAsset(song.localAudioAssetId)
    await deleteSong(song.id)
    await onRefresh()
  }

  function handleEnded() {
    if (repeatOne && audioRef.current) {
      audioRef.current.currentTime = 0
      void audioRef.current.play()
      return
    }
    if (currentIndex >= 0 && currentIndex < localSongs.length - 1) void moveTrack(1)
    else setIsPlaying(false)
  }

  const formatTime = (value: number) => {
    if (!Number.isFinite(value)) return '0:00'
    return Math.floor(value / 60) + ':' + String(Math.floor(value % 60)).padStart(2, '0')
  }

  return <section className="local-music-player">
    <div className="local-music-heading">
      <div><span className="eyebrow muted">SOLACE · LOCAL AUDIO</span><h2>Your offline player</h2><p>Audio files you own or have permission to use, stored on this device.</p></div>
      <button type="button" className="new-button" onClick={() => fileInputRef.current?.click()} disabled={isImporting}><Upload size={14}/>{isImporting ? 'Importing…' : 'Import audio'}</button>
      <input ref={fileInputRef} className="local-audio-input" type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac,.webm" multiple onChange={event => { const files = Array.from(event.target.files || []); void (async () => { for (const file of files) await importFile(file) })() }}/>
    </div>
    <div className="local-player-panel">
      <div className="local-player-art"><Music2 size={30}/><span>LOCAL LIBRARY</span></div>
      <div className="local-player-main">
        <div className="local-now-playing"><span className="eyebrow muted">NOW PLAYING</span><strong>{currentSong?.title || 'Choose a track'}</strong><small>{currentSong?.artists.join(', ') || (currentSong ? 'Local audio file' : 'Your music, on your device')}</small></div>
        <audio ref={audioRef} className="local-audio-element" controls preload="metadata" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onLoadedMetadata={event => setDuration(event.currentTarget.duration || 0)} onTimeUpdate={event => { const audio = event.currentTarget; setCurrentTime(audio.currentTime); if (navigator.mediaSession?.setPositionState && Number.isFinite(audio.duration)) { try { navigator.mediaSession.setPositionState({ duration: audio.duration, playbackRate: audio.playbackRate, position: audio.currentTime }) } catch { /* Position state is optional. */ } } }} onEnded={handleEnded}/>
        <div className="local-player-controls">
          <button type="button" className={shuffle ? 'active' : ''} aria-label="Toggle shuffle" aria-pressed={shuffle} onClick={() => setShuffle(value => !value)}><Shuffle size={16}/></button>
          <button type="button" aria-label="Previous track" onClick={() => void moveTrack(-1)} disabled={!localSongs.length}><SkipBack size={18}/></button>
          <button type="button" className="local-play-button" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={() => { if (isPlaying) audioRef.current?.pause(); else if (currentSong) void audioRef.current?.play().catch(() => setMessage('Tap play again to resume.')); else void moveTrack(1) }}>{isPlaying ? <Pause size={18}/> : <Play size={18}/>}</button>
          <button type="button" aria-label="Next track" onClick={() => void moveTrack(1)} disabled={!localSongs.length}><SkipForward size={18}/></button>
          <button type="button" className={repeatOne ? 'active' : ''} aria-label="Toggle repeat one" aria-pressed={repeatOne} onClick={() => setRepeatOne(value => !value)}><Repeat1 size={16}/></button>
        </div>
        <div className="local-player-time"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
      </div>
    </div>
    {message && <p className="local-player-message" role="status">{message}</p>}
    <div className="local-library-heading"><div><strong>Offline library</strong><span>{localSongs.length} {localSongs.length === 1 ? 'track' : 'tracks'} stored on this device</span></div><HardDrive size={16}/></div>
    {localSongs.length ? <div className="local-track-list">{localSongs.map((song, index) => <div className={'local-track-row ' + (currentSong?.id === song.id ? 'current' : '')} key={song.id}><button type="button" className="local-track-play" onClick={() => void playSong(song)} aria-label={'Play ' + song.title}>{currentSong?.id === song.id && isPlaying ? <Pause size={15}/> : <Play size={15}/>}</button><button type="button" className="local-track-info" onClick={() => void playSong(song)}><strong>{song.title}</strong><span>{song.localFileName || 'Audio file'} · Track {index + 1}</span></button><button type="button" className="local-track-delete" aria-label={'Remove ' + song.title} onClick={() => void removeTrack(song)}><Trash2 size={14}/></button></div>)}</div> : <div className="local-player-empty"><Headphones size={22}/><strong>No offline tracks yet.</strong><span>Import an audio file to start your personal library.</span></div>}
    <p className="local-player-footnote">Files stay in this browser's local storage. Keep Solace installed and avoid clearing its app data. Supported formats depend on your browser. Background playback and lock-screen controls are supported where Android and the browser allow them.</p>
  </section>
}
