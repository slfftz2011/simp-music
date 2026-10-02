<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getLoginStatus, getUserPlaylists } from '@/lib/musicClient.js'
import { playerState } from '@/lib/playerState.js'

const router = useRouter()
const user = ref(null)
const playlists = ref([])
const loading = ref(false)
const errorMessage = ref('')

const localPlaylists = computed(() => playerState.localPlaylists)

const readCookie = () => {
  const value = localStorage.getItem('simp-music-cookie') || ''
  try {
    return JSON.parse(value) || ''
  } catch {
    return value || ''
  }
}

const loadMyMusic = async () => {
  const cookie = readCookie()
  if (!cookie) {
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const status = await getLoginStatus(cookie)
    const profile = status?.profile || status?.data?.profile || status?.account || status?.data?.account || null

    if (!profile) {
      errorMessage.value = '暂无登录信息，请重新扫码登录。'
      return
    }

    user.value = profile
    const result = await getUserPlaylists(profile.userId || profile.id, cookie)
    playlists.value = result.playlist || []
  } catch (err) {
    errorMessage.value = err?.message || '无法加载歌单。'
  } finally {
    loading.value = false
  }
}

const openPlaylist = (playlist) => {
  router.push({ name: 'playlist-detail', params: { id: playlist.id } })
}

onMounted(() => {
  loadMyMusic()
})
</script>

<template>
  <section class="music-panel">
    <h2>我的音乐</h2>

    <div v-if="errorMessage" class="error">{{ errorMessage }}</div>

    <div v-if="user" class="profile-box">
      <div class="avatar">
        <img :src="user.avatarUrl || user.backgroundUrl || ''" alt="avatar" v-if="user.avatarUrl" />
        <span v-else>U</span>
      </div>
      <div>
        <strong>{{ user.nickname || '网易云用户' }}</strong>
        <p>{{ user.city ? `城市：${user.city}` : '已登录' }}</p>
      </div>
    </div>

    <div class="playlist-section">
      <h3>本地歌单</h3>
      <div class="playlist-grid">
        <button v-for="item in localPlaylists" :key="item.id" class="playlist-item clickable" @click="openPlaylist(item)">
          <div class="cover">♫</div>
          <div class="info">
            <strong>{{ item.name }}</strong>
            <small>{{ item.tracks?.length || 0 }} 首</small>
          </div>
        </button>
      </div>
    </div>

    <div class="playlist-section">
      <h3>我的歌单</h3>
      <div v-if="loading" class="empty">加载中...</div>
      <div v-else-if="playlists.length" class="playlist-grid">
        <button v-for="item in playlists" :key="item.id" class="playlist-item clickable" @click="openPlaylist(item)">
          <div class="cover">
            <img v-if="item.coverImgUrl" :src="item.coverImgUrl" :alt="item.name" />
            <span v-else>♪</span>
          </div>
          <div class="info">
            <strong>{{ item.name }}</strong>
            <small>{{ item.trackCount || 0 }} 首</small>
          </div>
        </button>
      </div>
      <div v-else class="empty">未登录或暂无歌单</div>
    </div>
  </section>
</template>

<style scoped>
.music-panel {
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 1.25rem;
  color: #f3f4f6;
}

h2, h3 {
  margin-bottom: 1rem;
}

.profile-box {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1.2rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  padding: 0.8rem;
}

.avatar {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  overflow: hidden;
  background: #1f2937;
  display: grid;
  place-items: center;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.playlist-section {
  margin-top: 1.2rem;
}

.playlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.playlist-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  color: inherit;
  text-align: left;
  font: inherit;
  border: 0;
}

.playlist-item.clickable {
  cursor: pointer;
}

.cover {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: #1f2937;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.info strong,
.info small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty,
.error {
  color: #fca5a5;
}
</style>
