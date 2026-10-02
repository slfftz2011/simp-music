<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchSongUrls, getPlaylistDetail, normalizeTrack } from '@/lib/musicClient.js'
import {
  addTrackToLocalPlaylist,
  playerState,
  playTrack as queueTrack,
} from '@/lib/playerState.js'

const route = useRoute()
const playlist = ref(null)
const tracks = ref([])
const loading = ref(false)
const errorMessage = ref('')
const isLocal = computed(() => String(route.params.id).startsWith('local-'))

const readCookie = () => {
  const value = localStorage.getItem('simp-music-cookie') || ''
  try {
    return JSON.parse(value) || ''
  } catch {
    return value
  }
}

const loadPlaylist = async () => {
  loading.value = true
  errorMessage.value = ''
  tracks.value = []

  try {
    if (isLocal.value) {
      playlist.value = playerState.localPlaylists.find(
        (item) => item.id === route.params.id,
      ) || null
      const localTracks = playlist.value?.tracks || []
      const missingUrls = localTracks.filter((track) => !track.url)
      const urls = await fetchSongUrls(missingUrls.map((track) => track.id))
      const urlsById = new Map(urls.map((item) => [String(item.id), item.url]))
      tracks.value = localTracks.map((track) => ({
        ...track,
        url: track.url || urlsById.get(String(track.id)) || '',
      }))
      return
    }

    const response = await getPlaylistDetail(route.params.id, readCookie())
    const data = response?.playlist || response?.result?.playlist
    if (!data) throw new Error(response?.message || '无法读取歌单详情。')

    playlist.value = data
    const songList = Array.isArray(data.tracks) ? data.tracks : []
    const normalized = songList.map(normalizeTrack)
    const urls = await fetchSongUrls(normalized.map((track) => track.id))
    const urlsById = new Map(urls.map((item) => [String(item.id), item.url]))
    tracks.value = normalized.map((track) => ({
      ...track,
      url: urlsById.get(String(track.id)) || '',
    }))
  } catch (error) {
    errorMessage.value = error?.message || '歌单加载失败。'
  } finally {
    loading.value = false
  }
}

const play = (track) => {
  queueTrack(track, tracks.value)
}

const playAll = () => {
  if (tracks.value.length) play(tracks.value[0])
}

const favorite = (track) => {
  addTrackToLocalPlaylist(track)
}

const download = (track) => {
  if (!track.url) return
  addTrackToLocalPlaylist(track, 'local-download')
  const link = document.createElement('a')
  link.href = track.url
  link.download = `${track.title || 'song'}.mp3`
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

watch(() => route.params.id, loadPlaylist, { immediate: true })
</script>

<template>
  <section class="playlist-page">
    <header class="playlist-header">
      <div class="cover">
        <img
          v-if="playlist?.coverImgUrl || playlist?.cover"
          :src="playlist.coverImgUrl || playlist.cover"
          :alt="playlist.name"
        />
        <span v-else>♫</span>
      </div>
      <div class="heading">
        <span class="eyebrow">{{ isLocal ? '本地歌单' : '网易云歌单' }}</span>
        <h1>{{ playlist?.name || '歌单详情' }}</h1>
        <p>{{ playlist?.description || `${tracks.length} 首歌曲` }}</p>
        <button class="primary" :disabled="!tracks.length" @click="playAll">播放全部</button>
      </div>
    </header>

    <p v-if="loading" class="message">歌单加载中...</p>
    <p v-else-if="errorMessage" class="message error">{{ errorMessage }}</p>
    <p v-else-if="!tracks.length" class="message">这个歌单还没有歌曲。</p>

    <div v-else class="track-list">
      <div class="track-head">
        <span>#</span><span>歌曲</span><span>专辑</span><span>时长</span><span>操作</span>
      </div>
      <div v-for="(track, index) in tracks" :key="track.id" class="track-row">
        <span class="index">{{ String(index + 1).padStart(2, '0') }}</span>
        <button class="track-title" @click="play(track)">
          <strong>{{ track.title }}</strong>
          <small>{{ track.artist }}</small>
        </button>
        <span class="album">{{ track.album }}</span>
        <span class="duration">{{ Math.floor(track.duration / 60000) }}:{{ String(Math.floor(track.duration / 1000) % 60).padStart(2, '0') }}</span>
        <div class="actions">
          <button title="收藏到我喜欢的音乐" @click="favorite(track)">收藏</button>
          <button title="下载并记录到本地歌单" :disabled="!track.url" @click="download(track)">下载</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.playlist-page {
  color: #f3f4f6;
}

.playlist-header {
  display: flex;
  align-items: end;
  gap: 1.5rem;
  padding: 1rem 0 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.cover {
  width: 180px;
  aspect-ratio: 1;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 12px;
  background: #234c55;
  color: #b8ece3;
  font-size: 3rem;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.heading h1 {
  margin: 0.35rem 0;
  font-size: 1.8rem;
}

.heading p,
.eyebrow,
.message {
  color: #aab8bd;
}

.eyebrow {
  font-size: 0.8rem;
}

.primary {
  margin-top: 0.7rem;
  border: 0;
  border-radius: 7px;
  padding: 0.65rem 1rem;
  background: #c1f06b;
  color: #182414;
  cursor: pointer;
}

.primary:disabled,
.actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.track-list {
  margin-top: 1rem;
}

.track-head,
.track-row {
  display: grid;
  grid-template-columns: 42px minmax(180px, 1.5fr) minmax(120px, 1fr) 64px 120px;
  align-items: center;
  gap: 0.8rem;
  min-height: 58px;
  padding: 0.5rem 0.75rem;
}

.track-head {
  min-height: 38px;
  color: #91a1a5;
  font-size: 0.8rem;
}

.track-row:nth-child(odd) {
  background: rgba(255, 255, 255, 0.035);
}

.index,
.duration,
.album {
  color: #aab8bd;
  font-size: 0.9rem;
}

.track-title {
  display: grid;
  justify-items: start;
  gap: 0.2rem;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.track-title strong,
.track-title small,
.album {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-title small {
  color: #aab8bd;
}

.actions {
  display: flex;
  gap: 0.35rem;
}

.actions button {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 0.35rem 0.45rem;
  background: transparent;
  color: #dce6e7;
  cursor: pointer;
}

.message {
  margin-top: 1.5rem;
}

.error {
  color: #ff9f91;
}

@media (max-width: 680px) {
  .playlist-header {
    align-items: center;
  }

  .cover {
    width: 112px;
  }

  .heading h1 {
    font-size: 1.35rem;
  }

  .track-head,
  .track-row {
    grid-template-columns: 28px minmax(0, 1fr) 92px;
  }

  .track-head span:nth-child(3),
  .track-head span:nth-child(4),
  .album,
  .duration {
    display: none;
  }
}
</style>