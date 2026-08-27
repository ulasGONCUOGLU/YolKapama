<script setup lang="ts">
// Yol Kapama modülüne özel stiller sadece bu layout kullanıldığında yüklenir.
import '~/assets/css/yolkapama.css'
</script>

<template>
  <div class="bg-background text-on-background flex h-screen overflow-hidden font-body-md">
    <AppSidebar />
    <slot />
  </div>
</template>
