<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchSongUrls, searchAll } from '@/lib/musicClient.js'
import { addTrackToLocalPlaylist, playTrack as queueTrack } from '@/lib/playerState.js'

const keyword = ref('')
const router = useRouter()
const activeType = ref('song')
const results = ref({ songs: [], albums: [], artists: [], playlists: [] })
const loading = ref(false)
const errorMessage = ref('')

const tabs = [
  { key: 'song', label: '歌曲', type: 1 },
  { key: 'album', label: '专辑', type: 10 },
  { key: 'artist', label: '歌手', type: 100 },
  { key: 'playlist', label: '歌单', type: 1000 },
]

const resultKeyByType = {
  song: 'songs',
  album: 'albums',
  artist: 'artists',
  playlist: 'playlists',
}
const currentResults = computed(() => results.value[resultKeyByType[activeType.value]] || [])

const runSearch = async () => {
  const trimmed = keyword.value.trim()
  if (!trimmed) {
    results.value = { songs: [], albums: [], artists: [], playlists: [] }
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    results.value = await searchAll(trimmed, 8)
  } catch (err) {
    errorMessage.value = err?.message || '搜索失败，请稍后重试。'
    results.value = { songs: [], albums: [], artists: [], playlists: [] }
  } finally {
    loading.value = false
  }
}

const playTrack = async (track) => {
  try {
    const songs = results.value.songs
    const urlList = await fetchSongUrls(songs.map((song) => song.id))
    const urlsById = new Map(urlList.map((entry) => [String(entry.id), entry.url]))
    const queue = songs.map((song) => ({
      ...song,
      url: urlsById.get(String(song.id)) || '',
    }))
    const nextTrack = queue.find((song) => String(song.id) === String(track.id)) || track

    queueTrack(nextTrack, queue)
  } catch (err) {
    errorMessage.value = err?.message || '无法获取播放地址。'
  }
}

const addFavorite = (track) => {
  addTrackToLocalPlaylist(track)
}

const openResult = (item) => {
  if (activeType.value === 'playlist') {
    router.push({ name: 'playlist-detail', params: { id: item.id } })
  }
}

onMounted(() => {
  const searchParam = new URLSearchParams(window.location.search).get('q')
  if (searchParam) {
    keyword.value = searchParam
    runSearch()
  }
})
</script>

<template>
  <section class="panel">
    <h2>搜索</h2>

    <div class="search-bar">
      <input
        v-model="keyword"
        placeholder="输入歌名、歌手、专辑或歌单"
        @keyup.enter="runSearch"
      />
      <button @click="runSearch" :disabled="loading">
        {{ loading ? '搜索中...' : '搜索' }}
      </button>
    </div>

    <div class="tab-row">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="{ active: activeType === tab.key }"
        @click="activeType = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div v-if="currentResults.length" class="result-list">
      <div v-for="item in currentResults" :key="item.id" class="result-item">
        <div class="cover-box">
          <img v-if="item.cover || item.picUrl" :src="item.cover || item.picUrl" :alt="item.title || item.name" />
          <span v-else>♫</span>
        </div>

        <div class="meta">
          <strong>{{ item.title || item.name }}</strong>
          <span>{{ item.artist || item.creator || item.briefDesc || '未知来源' }}</span>
          <small>{{ item.album || item.trackCount ? `${item.album || ''}${item.trackCount ? ` · ${item.trackCount} 首` : ''}` : '' }}</small>
        </div>

        <button v-if="activeType === 'song'" class="play-button" @click="playTrack(item)">播放</button>
        <button v-if="activeType === 'song'" class="secondary-button" @click="addFavorite(item)">收藏</button>
        <button v-else class="play-button" @click="openResult(item)">查看</button>
      </div>
    </div>

    <p v-else-if="!loading" class="empty">暂无搜索结果</p>
  </section>
</template>

<style scoped>
.panel {
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 1.25rem;
  color: #f3f4f6;
}

h2 {
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.search-bar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.search-bar input {
  flex: 1;
  padding: 0.8rem 1rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
}

.search-bar button,
.play-button,
.secondary-button,
.tab-row button {
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  color: white;
  padding: 0.75rem 1rem;
  cursor: pointer;
}

.secondary-button {
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 0.65rem 0.8rem;
  background: transparent;
  color: #dce6e7;
  cursor: pointer;
}

.tab-row {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.tab-row button {
  padding: 0.5rem 0.9rem;
  opacity: 0.7;
  background: rgba(255, 255, 255, 0.06);
}

.tab-row button.active {
  opacity: 1;
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
}

.result-list {
  list-style: none;
  display: grid;
  gap: 0.8rem;
  margin-top: 1rem;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
}

.cover-box {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  overflow: hidden;
  background: #1f2937;
  display: grid;
  place-items: center;
  color: #f9a8d4;
  font-size: 1.1rem;
}

.cover-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.meta strong,
.meta span,
.meta small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty,
.error {
  margin-top: 1rem;
  color: #fca5a5;
}
</style>
