<template>
  <div class="login-container">
    <div class="login-box">
      <h1>Giriş Yapılıyor...</h1>
      <div class="loader"></div>
      <p class="status-text">{{ statusText }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const statusText = ref('Oturum açılıyor...')

// Doğru import şekli - useSupabaseClient'dan client alıyoruz
const supabase = useSupabaseClient()

onMounted(async () => {
  try {
    statusText.value = 'E-posta doğrulanıyor...'
    
    // Supabase client ile giriş yap
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'ulas@gmail.com',
      password: '123456'
    })

    if (error) {
      console.error('Giriş hatası:', error)
      statusText.value = 'Giriş başarısız!'
      setTimeout(() => {
        navigateTo('/login-manual')
      }, 2000)
    } else {
      statusText.value = 'Giriş başarılı! Yönlendiriliyorsunuz...'
      console.log('Giriş başarılı:', data)
      
      setTimeout(() => {
        navigateTo('/')
      }, 1000)
    }
  } catch (err) {
    console.error('Beklenmeyen hata:', err)
    statusText.value = 'Bir hata oluştu!'
  }
})

useHead({
  title: 'Otomatik Giriş'
})
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  margin: 0;
  padding: 0;
}

.login-box {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  text-align: center;
  max-width: 400px;
  width: 90%;
}

.login-box h1 {
  margin-bottom: 20px;
  color: #333;
  font-size: 24px;
}

.loader {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 20px auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.status-text {
  color: #666;
  font-size: 14px;
  margin-top: 10px;
}
</style>