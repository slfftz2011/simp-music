import { reactive } from 'vue'

const LOCAL_PLAYLISTS_KEY = 'simp-music-local-playlists'
const PLAYER_STATE_KEY = 'simp-music-player-state'

const fallbackLocalPlaylists = [
  {
    id: 'local-favorite',
    name: '我喜欢的音乐',
    source: 'local',
    tracks: [],
    cover: '',
  },
  {
    id: 'local-recent',
    name: '最近播放',
    source: 'local',
    tracks: [],
    cover: '',
  },
  {
    id: 'local-download',
    name: '已下载',
    source: 'local',
    tracks: [],
    cover: '',
  },
]

function readLocalStorage(key, fallback) {
  if (typeof localStorage === 'undefined') {
    return fallback
  }

  try {
    const value = localStorage.getItem(key)
    if (!value) return fallback

    const parsed = JSON.parse(value)
    return parsed ?? fallback
  } catch {
    const rawValue = localStorage.getItem(key) || ''
    return rawValue || fallback
  }
}

function safeWrite(key, value) {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 忽略写入异常，保持客户端轻量运行
  }
}

const initialState = {
  queue: [],
  currentIndex: 0,
  currentTrack: null,
  isPlaying: false,
  volume: 0.8,
  playbackRate: 1,
  localPlaylists: readLocalStorage(LOCAL_PLAYLISTS_KEY, fallbackLocalPlaylists),
  userPlaylists: [],
  loginUser: null,
  cookie: readLocalStorage('simp-music-cookie', ''),
}

export const playerState = reactive({
  ...initialState,
})

export function savePlayerState() {
  safeWrite(PLAYER_STATE_KEY, {
    queue: playerState.queue,
    currentIndex: playerState.currentIndex,
    currentTrack: playerState.currentTrack,
    isPlaying: playerState.isPlaying,
    volume: playerState.volume,
    playbackRate: playerState.playbackRate,
  })

  safeWrite(LOCAL_PLAYLISTS_KEY, playerState.localPlaylists)
}

export function restorePlayerState() {
  const state = readLocalStorage(PLAYER_STATE_KEY, null)
  if (!state) return

  playerState.queue = Array.isArray(state.queue) ? state.queue : []
  playerState.currentIndex = Number.isFinite(state.currentIndex) ? state.currentIndex : 0
  playerState.currentTrack = state.currentTrack || null
  playerState.isPlaying = Boolean(state.isPlaying)
  playerState.volume = Number(state.volume) || 0.8
  playerState.playbackRate = Number(state.playbackRate) || 1
}

export function playTrack(track, queue = []) {
  if (!track) return

  const nextQueue = Array.isArray(queue) && queue.length ? queue : [track]
  const index = nextQueue.findIndex((item) => String(item.id) === String(track.id))

  playerState.queue = nextQueue
  playerState.currentIndex = index >= 0 ? index : 0
  playerState.currentTrack = nextQueue[playerState.currentIndex] || track
  playerState.isPlaying = true
  addTrackToLocalPlaylist(track, 'local-recent')
  savePlayerState()
}

export function setCurrentTrack(track, queue = []) {
  const nextQueue = Array.isArray(queue) && queue.length ? queue : track ? [track] : []
  const index = nextQueue.findIndex((item) => String(item.id) === String(track?.id))

  playerState.queue = nextQueue
  playerState.currentIndex = index >= 0 ? index : 0
  playerState.currentTrack = nextQueue[playerState.currentIndex] || track || null
  savePlayerState()
}

export function togglePlayStatus() {
  playerState.isPlaying = !playerState.isPlaying
  savePlayerState()
}

export function nextTrack() {
  if (!playerState.queue.length) return

  const nextIndex = (playerState.currentIndex + 1) % playerState.queue.length
  playerState.currentIndex = nextIndex
  playerState.currentTrack = playerState.queue[nextIndex]
  playerState.isPlaying = true
  savePlayerState()
}

export function prevTrack() {
  if (!playerState.queue.length) return

  const prevIndex =
    (playerState.currentIndex - 1 + playerState.queue.length) % playerState.queue.length
  playerState.currentIndex = prevIndex
  playerState.currentTrack = playerState.queue[prevIndex]
  playerState.isPlaying = true
  savePlayerState()
}

export function setPlaybackRate(rate) {
  playerState.playbackRate = rate
  savePlayerState()
}

export function setVolume(volume) {
  playerState.volume = volume
  savePlayerState()
}

export function addTrackToLocalPlaylist(track, playlistId = 'local-favorite') {
  const target = playerState.localPlaylists.find((item) => item.id === playlistId)
  if (!target) return

  if (!Array.isArray(target.tracks)) target.tracks = []
  const exists = target.tracks.some((item) => String(item.id) === String(track.id))
  if (!exists) {
    const { raw, url, ...savedTrack } = track
    target.tracks.unshift(savedTrack)
    safeWrite(LOCAL_PLAYLISTS_KEY, playerState.localPlaylists)
  }
}

export function removeTrackFromLocalPlaylist(trackId, playlistId) {
  const target = playerState.localPlaylists.find((item) => item.id === playlistId)
  if (!target || !Array.isArray(target.tracks)) return

  target.tracks = target.tracks.filter((track) => String(track.id) !== String(trackId))
  safeWrite(LOCAL_PLAYLISTS_KEY, playerState.localPlaylists)
}

export function isTrackInLocalPlaylist(trackId, playlistId = 'local-favorite') {
  const target = playerState.localPlaylists.find((item) => item.id === playlistId)
  return Boolean(target?.tracks?.some((track) => String(track.id) === String(trackId)))
}

export function setLoginInfo(loginUser, cookie = '') {
  playerState.loginUser = loginUser
  playerState.cookie = cookie
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('simp-music-cookie', JSON.stringify(cookie || ''))
  }
}
