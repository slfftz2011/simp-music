<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  addTrackToLocalPlaylist,
  nextTrack,
  playerState,
  playTrack,
  prevTrack,
  setPlaybackRate,
  setVolume,
  togglePlayStatus,
} from '@/lib/playerState.js'

const audioRef = ref(null)
const progress = ref(0)
const duration = ref(0)
const queueOpen = ref(false)
const rates = [1, 1.25, 1.5, 2]

const currentTrack = computed(() => playerState.currentTrack)
const isPlaying = computed(() => playerState.isPlaying)
const playbackRate = computed(() => playerState.playbackRate)
const volume = computed(() => playerState.volume)

watch(
  () => currentTrack.value?.id,
  (trackId) => {
    if (!trackId || !audioRef.value) return

    const currentUrl = currentTrack.value?.url || ''
    audioRef.value.src = currentUrl
    audioRef.value.load()

    if (playerState.isPlaying) {
      audioRef.value.play().catch(() => {})
    }
  },
  { immediate: true },
)

watch(
  () => playerState.isPlaying,
  (value) => {
    if (!audioRef.value) return

    if (value) {
      audioRef.value.play().catch(() => {})
    } else {
      audioRef.value.pause()
    }
  },
)

watch(
  () => playerState.playbackRate,
  (value) => {
    if (audioRef.value) {
      audioRef.value.playbackRate = value
    }
  },
)

watch(
  () => playerState.volume,
  (value) => {
    if (audioRef.value) {
      audioRef.value.volume = value
    }
  },
)

onMounted(() => {
  if (audioRef.value) {
    audioRef.value.volume = playerState.volume
    audioRef.value.playbackRate = playerState.playbackRate
  }
})

const handleTimeUpdate = () => {
  if (!audioRef.value) return
  progress.value = audioRef.value.currentTime
}

const handleLoadedMetadata = () => {
  if (!audioRef.value) return
  duration.value = audioRef.value.duration || 0
}

const handleEnded = () => {
  nextTrack()
}

const handleSeek = (event) => {
  if (!audioRef.value) return
  audioRef.value.currentTime = Number(event.target.value)
  progress.value = audioRef.value.currentTime
}

const formatTime = (value) => {
  if (!Number.isFinite(value) || value <= 0) return '00:00'
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const togglePlay = () => {
  togglePlayStatus()
}

const downloadCurrent = () => {
  if (!currentTrack.value?.url) return

  addTrackToLocalPlaylist(currentTrack.value, 'local-download')

  const link = document.createElement('a')
  link.href = currentTrack.value.url
  link.download = `${currentTrack.value.title || 'song'}.mp3`
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const saveFavorite = () => {
  if (currentTrack.value) addTrackToLocalPlaylist(currentTrack.value)
}

const selectQueueTrack = (track) => {
  playTrack(track, playerState.queue)
}

const changeRate = (rate) => {
  setPlaybackRate(rate)
}

const changeVolume = (event) => {
  setVolume(Number(event.target.value))
}
</script>

<template>
  <div v-if="currentTrack" class="player-bar">
    <audio
      ref="audioRef"
      :src="currentTrack.url"
      @timeupdate="handleTimeUpdate"
      @loadedmetadata="handleLoadedMetadata"
      @ended="handleEnded"
      @play="playerState.isPlaying = true"
      @pause="playerState.isPlaying = false"
    />

    <div class="track-panel">
      <div class="cover">
        <img v-if="currentTrack.cover" :src="currentTrack.cover" :alt="currentTrack.title" />
        <span v-else>♫</span>
      </div>

      <div class="meta">
        <strong>{{ currentTrack.title }}</strong>
        <span>{{ currentTrack.artist }}</span>
      </div>
    </div>

    <div class="controls">
      <button class="mini" @click="prevTrack">⏮</button>
      <button class="play-toggle" @click="togglePlay">
        {{ isPlaying ? '⏸' : '▶' }}
      </button>
      <button class="mini" @click="nextTrack">⏭</button>
      <button class="mini" title="收藏到我喜欢的音乐" @click="saveFavorite">♥</button>
      <button class="mini" title="加入下载记录并下载" @click="downloadCurrent">↓</button>
      <button class="mini" title="播放队列" @click="queueOpen = !queueOpen">☷</button>
    </div>

    <div v-if="queueOpen" class="queue-popover">
      <div class="queue-heading">
        <strong>播放队列</strong>
        <span>{{ playerState.queue.length }} 首</span>
      </div>
      <button
        v-for="(track, index) in playerState.queue"
        :key="track.id"
        class="queue-track"
        :class="{ selected: index === playerState.currentIndex }"
        @click="selectQueueTrack(track)"
      >
        <span>{{ track.title }}</span>
        <small>{{ track.artist }}</small>
      </button>
      <p v-if="!playerState.queue.length" class="queue-empty">队列为空</p>
    </div>

    <div class="progress-wrap">
      <span>{{ formatTime(progress) }}</span>
      <input
        type="range"
        min="0"
        :max="duration || 0"
        :value="progress"
        @input="handleSeek"
      />
      <span>{{ formatTime(duration) }}</span>
    </div>

    <div class="settings-wrap">
      <label>
        速度
        <select :value="playbackRate" @change="changeRate(Number($event.target.value))">
          <option v-for="rate in rates" :key="rate" :value="rate">{{ rate }}x</option>
        </select>
      </label>

      <label>
        音量
        <input type="range" min="0" max="1" step="0.05" :value="volume" @input="changeVolume" />
      </label>
    </div>
  </div>
</template>

<style scoped>
.player-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 240px 200px minmax(220px, 1fr) 220px;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.2rem;
  background: rgba(15, 23, 42, 0.94);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
}

.queue-popover {
  position: absolute;
  right: 1rem;
  bottom: calc(100% + 0.5rem);
  width: min(360px, calc(100vw - 2rem));
  max-height: min(420px, 60vh);
  overflow: auto;
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  background: #17212b;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
}

.queue-heading {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0.5rem 0.7rem;
  color: #dce6e7;
}

.queue-heading span,
.queue-empty {
  color: #9babb0;
}

.queue-track {
  display: grid;
  width: 100%;
  gap: 0.2rem;
  padding: 0.55rem 0.5rem;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #f3f4f6;
  text-align: left;
  cursor: pointer;
}

.queue-track.selected {
  background: rgba(193, 240, 107, 0.12);
  color: #c1f06b;
}

.queue-track small {
  color: #9babb0;
}

.queue-empty {
  margin: 0;
  padding: 0.5rem;
}

.track-panel {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.cover {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  overflow: hidden;
  background: #1f2937;
  display: grid;
  place-items: center;
  color: #f9a8d4;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.meta strong,
.meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
}

.mini,
.play-toggle {
  border: none;
  border-radius: 50%;
  width: 34px;
  height: 34px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  cursor: pointer;
}

.play-toggle {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
}

.progress-wrap {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.progress-wrap input,
.settings-wrap input {
  width: 100%;
}

.settings-wrap {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  justify-content: flex-end;
}

.settings-wrap label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.85rem;
  color: #d1d5db;
}

select {
  background: rgba(255, 255, 255, 0.08);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 0.25rem 0.45rem;
}

@media (max-width: 900px) {
  .player-bar {
    grid-template-columns: 1fr;
    padding: 0.75rem 1rem 1rem;
  }

  .track-panel,
  .controls,
  .settings-wrap {
    justify-content: center;
  }
}
</style>
