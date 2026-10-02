<script setup>
import { ref, onUnmounted } from 'vue'
import { createQrCode, getQrKey, checkQrLogin, getLoginStatus } from '@/lib/musicClient.js'
import { setLoginInfo } from '@/lib/playerState.js'

const qrImage = ref('')
const statusText = ref('等待生成二维码...')
const timer = ref(null)

const stopPolling = () => {
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
}

const generateQr = async () => {
  stopPolling()
  statusText.value = '正在生成二维码...'

  try {
    const key = await getQrKey()
    const image = await createQrCode(key)
    qrImage.value = image
    statusText.value = '请使用网易云音乐 App 扫码登录'

    timer.value = setInterval(async () => {
      try {
        const result = await checkQrLogin(key)
        const code = result?.code

        if (code === 800) {
          stopPolling()
          statusText.value = '二维码已过期，请重新生成。'
          return
        }

        if (code === 803) {
          stopPolling()
          const cookie = String(result?.cookie || '')
          localStorage.setItem('simp-music-cookie', JSON.stringify(cookie))
          setLoginInfo({ nickname: '网易云用户' }, cookie)

          const profile = await getLoginStatus(cookie)
          const account = profile?.profile || profile?.data?.profile || profile?.account || profile?.data?.account
          if (account) {
            setLoginInfo(account, cookie)
          }

          statusText.value = '登录成功，已同步 Cookie 与用户信息。'
          return
        }

        if (code === 801) {
          statusText.value = '等待扫码确认...'
        }
      } catch (err) {
        stopPolling()
        statusText.value = '二维码状态检测失败。'
      }
    }, 2000)
  } catch (err) {
    statusText.value = err?.message || '二维码生成失败。'
    qrImage.value = ''
  }
}

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <section class="login-panel">
    <h2>登录网易云</h2>
    <button class="primary" @click="generateQr">获取二维码</button>

    <div v-if="qrImage" class="qr-box">
      <img :src="qrImage" alt="二维码登录" />
    </div>

    <p class="status">{{ statusText }}</p>
  </section>
</template>

<style scoped>
.login-panel {
  background: #111827;
  border-radius: 18px;
  color: #f3f4f6;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

h2 {
  margin-bottom: 1rem;
}

.primary {
  border: none;
  border-radius: 10px;
  padding: 0.8rem 1rem;
  background: linear-gradient(135deg, #10b981, #3b82f6);
  color: white;
  cursor: pointer;
}

.qr-box {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
  background: #fff;
  border-radius: 12px;
  padding: 0.75rem;
}

.qr-box img {
  width: 180px;
  height: 180px;
  object-fit: contain;
}

.status {
  margin-top: 1rem;
  opacity: 0.85;
}
</style>
