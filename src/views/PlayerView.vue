<script setup>
import { computed } from 'vue'
import { playerState, prevTrack, nextTrack, togglePlayStatus } from '@/lib/playerState.js'

const currentTrack = computed(() => playerState.currentTrack || {
  title: '暂无播放',
  artist: '请选择一首歌',
  cover: '',
  url: '',
})

const isPlaying = computed(() => playerState.isPlaying)
</script>

<template>
  <section class="player-panel">
    <div class="cover" :class="{ empty: !currentTrack.cover }">
      <img v-if="currentTrack.cover" :src="currentTrack.cover" :alt="currentTrack.title" />
      <span v-else>♫</span>
    </div>

    <div class="info">
      <h2>{{ currentTrack.title }}</h2>
      <p>{{ currentTrack.artist }}</p>
      <small>{{ currentTrack.url ? '底部播放栏持续播放' : '尚未准备播放内容' }}</small>
    </div>

    <div class="action-row">
      <button @click="prevTrack">上一首</button>
      <button @click="togglePlayStatus">{{ isPlaying ? '暂停' : '播放' }}</button>
      <button @click="nextTrack">下一首</button>
    </div>
  </section>
</template>

<style scoped>
.player-panel {
  background: #111827;
  border-radius: 18px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #f3f4f6;
  display: grid;
  gap: 1rem;
}

.cover {
  width: 220px;
  height: 220px;
  border-radius: 18px;
  overflow: hidden;
  background: #1f2937;
  display: grid;
  place-items: center;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover.empty {
  color: #f9a8d4;
  font-size: 3rem;
}

.info h2 {
  margin-bottom: 0.2rem;
}

.info p,
.info small {
  opacity: 0.8;
}

.action-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.action-row button {
  border: none;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  color: white;
  cursor: pointer;
}
</style>
