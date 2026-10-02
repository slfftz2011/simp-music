<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { ref } from 'vue'
import PlayerBar from '@/components/PlayerBar.vue'
import { restorePlayerState } from '@/lib/playerState.js'

restorePlayerState()

const router = useRouter()
const searchKeyword = ref('')

const handleSearch = () => {
  const keyword = searchKeyword.value.trim()
  if (!keyword) return
  router.push({ path: '/search', query: { q: keyword } })
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="logo">易乐</div>

      <nav class="nav">
        <RouterLink to="/">首页</RouterLink>
        <RouterLink to="/my-music">我的音乐</RouterLink>
        <RouterLink to="/search">搜索</RouterLink>
        <RouterLink to="/player">播放器</RouterLink>
        <RouterLink to="/login">登录</RouterLink>
        <RouterLink to="/about">关于</RouterLink>
      </nav>

      <div class="search-box">
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索歌曲、歌手"
          @keyup.enter="handleSearch"
        />
      </div>
    </header>

    <main class="content">
      <RouterView />
    </main>

    <PlayerBar />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: #0b1020;
  color: #f3f4f6;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.logo {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.nav {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.nav a {
  color: #d1d5db;
  text-decoration: none;
  opacity: 0.9;
}

.nav a.router-link-exact-active {
  color: #f9a8d4;
}

.search-box {
  min-width: 220px;
}

.search-box input {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: white;
}

.content {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 1.25rem 6rem;
}
</style>
