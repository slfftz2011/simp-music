// 在 Vite 浏览器环境中读取 API 地址；在 Node 测试环境中安全回退，避免 import.meta.env 访问异常。
function detectApiBase() {
  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}
  if (env.VITE_MUSIC_API_BASE) return env.VITE_MUSIC_API_BASE.replace(/\/$/, '')

  // Android 端：模拟器通过 10.0.2.2 访问宿主机 sidecar API，真机通过局域网 IP 访问 PC 上的 api-enhanced 服务
  if (typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)) {
    if (/Android SDK built for x86|sdk_gphone|emulator|vbox86/i.test(navigator.userAgent)) {
      return 'http://10.0.2.2:3000'
    }
    return 'http://192.168.43.232:3000'
  }

  return 'http://localhost:3000'
}

const API_BASE_URL = detectApiBase()

export function buildApiUrl(path, params = {}) {
  const url = new URL(`${API_BASE_URL}${path}`)

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    url.searchParams.append(key, String(value))
  })

  return url.toString()
}

export function normalizeTrack(song = {}) {
  const artists = Array.isArray(song.artists)
    ? song.artists.map((artist) => artist?.name).filter(Boolean)
    : []

  return {
    id: song.id,
    title: song.name || song.title || '',
    artist: artists.join(' / ') || song.artist || '未知歌手',
    album: song.album?.name || song.al?.name || '未知专辑',
    duration: Number(song.duration ?? song.dt ?? 0),
    cover: song.album?.picUrl || song.al?.picUrl || '',
    raw: song,
  }
}

export function normalizeArtist(item = {}) {
  return {
    id: item.id,
    name: item.name || '未知歌手',
    alias: item.alias || [],
    picUrl: item.picUrl || item.img1v1Url || '',
    briefDesc: item.briefDesc || '歌手',
    raw: item,
  }
}

export function normalizeAlbum(item = {}) {
  return {
    id: item.id,
    title: item.name || '未知专辑',
    artist: item.artist?.name || item.artists?.[0]?.name || '未知歌手',
    cover: item.picUrl || item.blurPicUrl || '',
    publishTime: item.publishTime || 0,
    raw: item,
  }
}

export function normalizePlaylist(item = {}) {
  return {
    id: item.id,
    title: item.name || '未知歌单',
    cover: item.coverImgUrl || item.picUrl || '',
    creator: item.creator?.nickname || item.user?.nickname || '网易云用户',
    trackCount: item.trackCount || item.playCount || 0,
    raw: item,
  }
}

export function extractSearchList(response, key) {
  const list = response?.result?.[key] ?? response?.[key]
  return Array.isArray(list) ? list : []
}

async function apiFetch(path, params = {}, options = {}) {
  const response = await fetch(buildApiUrl(path, params), {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`音乐 API 请求失败: ${response.status}`)
  }

  return response.json()
}

export async function searchSongs(keywords, type = 1, limit = 10, offset = 0) {
  const result = await apiFetch('/search', {
    keywords,
    type,
    limit,
    offset,
  })

  const list = Array.isArray(result?.result?.songs)
    ? result.result.songs
    : Array.isArray(result?.songs)
      ? result.songs
      : []

  return list.map(normalizeTrack)
}

export async function searchByType(keywords, type = 1, limit = 10, offset = 0) {
  const result = await apiFetch('/search', {
    keywords,
    type,
    limit,
    offset,
  })

  const map = {
    1: 'songs',
    10: 'albums',
    100: 'artists',
    1000: 'playlists',
  }

  const key = map[type] || 'songs'
  const list = extractSearchList(result, key)

  if (type === 1) return list.map(normalizeTrack)
  if (type === 10) return list.map(normalizeAlbum)
  if (type === 100) return list.map(normalizeArtist)
  if (type === 1000) return list.map(normalizePlaylist)

  return list
}

export async function searchAll(keywords, limit = 12) {
  const [songs, albums, artists, playlists] = await Promise.all([
    searchByType(keywords, 1, limit),
    searchByType(keywords, 10, limit),
    searchByType(keywords, 100, limit),
    searchByType(keywords, 1000, limit),
  ])

  return {
    songs,
    albums,
    artists,
    playlists,
  }
}

export async function fetchSongUrl(id, br = 320000) {
  const result = await apiFetch('/song/url', { id, br })
  return Array.isArray(result?.data) ? result.data : []
}

export async function fetchSongUrls(ids, br = 320000) {
  const songIds = [...new Set(ids.map(String))]
  if (!songIds.length) return []

  const result = await apiFetch('/song/url', {
    id: songIds.join(','),
    br,
  })

  return Array.isArray(result?.data) ? result.data : []
}

export async function getPlaylistDetail(id, cookie = '') {
  return apiFetch('/playlist/detail', { id, cookie })
}

export async function fetchSongDetail(ids) {
  const result = await apiFetch('/song/detail', {
    ids: Array.isArray(ids) ? ids.join(',') : String(ids),
  })

  return Array.isArray(result?.songs) ? result.songs : []
}

export async function getQrKey() {
  const result = await apiFetch('/login/qr/key')
  return result?.data?.unikey || ''
}

export async function createQrCode(key) {
  const result = await apiFetch('/login/qr/create', { key, qrimg: true })
  return result?.data?.qrimg || result?.body?.data?.qrimg || ''
}

export async function checkQrLogin(key) {
  const result = await apiFetch('/login/qr/check', {
    key,
    timestamp: Date.now(),
  })

  return result || {}
}

export async function getLoginStatus(cookie = '') {
  const result = await apiFetch('/login/status', { cookie })
  return result?.data || result || {}
}

export async function getUserPlaylists(uid, cookie = '') {
  const result = await apiFetch(
    '/user/playlist',
    {
      uid,
      limit: 30,
      offset: 0,
      includeVideo: true,
      cookie,
    },
  )

  return result?.playlist ? { playlist: result.playlist } : result || { playlist: [] }
}
