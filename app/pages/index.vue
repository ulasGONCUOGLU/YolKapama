<script setup lang="ts">
interface ModuleCard {
  title: string
  description: string
  icon: string
  to: string
  available: boolean
}

const modules: ModuleCard[] = [
  {
    title: 'Yol Kapama',
    description: 'Belediye yol kapatma duyurularını izleyin, haritada görüntüleyin ve AI analiziyle yönetin.',
    icon: 'traffic',
    to: '/yolkapama',
    available: true
  },
  {
    title: 'Görüntü İşleme',
    description: 'Görüntü tabanlı analiz modülü yakında burada olacak.',
    icon: 'image_search',
    to: '/goruntuisleme',
    available: false
  }
]
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-margin-canvas">
    <div class="flex flex-col items-center gap-2 mb-12">
      <div
        class="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-technical mb-2"
      >
        <span class="material-symbols-outlined text-primary text-[28px]">shield_person</span>
      </div>
      <h1 class="font-display text-display text-on-surface">Ops Console</h1>
      <p class="font-body-md text-body-md text-on-surface-variant">Çalışmak istediğiniz modülü seçin.</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-gutter w-full max-w-2xl">
      <NuxtLink
        v-for="m in modules"
        :key="m.to"
        :to="m.to"
        class="group relative bg-surface-container border border-outline-technical rounded-lg p-gutter flex flex-col gap-4 shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:border-electric-blue transition-colors"
      >
        <div
          class="w-12 h-12 rounded flex items-center justify-center border transition-colors"
          :class="m.available
            ? 'bg-electric-blue/10 border-electric-blue/30 text-electric-blue'
            : 'bg-surface-variant border-outline-variant text-on-surface-variant'"
        >
          <span class="material-symbols-outlined">{{ m.icon }}</span>
        </div>

        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <h2 class="font-headline-md text-headline-md text-on-surface">{{ m.title }}</h2>
            <span
              v-if="!m.available"
              class="font-label-sm text-label-sm px-2 py-0.5 rounded-sm bg-surface-variant text-on-surface-variant border border-outline-variant uppercase tracking-wider"
            >Yakında</span>
          </div>
          <p class="font-body-md text-body-md text-on-surface-variant">{{ m.description }}</p>
        </div>

        <span
          class="material-symbols-outlined absolute top-gutter right-gutter text-on-surface-variant group-hover:text-electric-blue group-hover:translate-x-0.5 transition-all"
        >arrow_forward</span>
      </NuxtLink>
    </div>
  </div>
</template>
