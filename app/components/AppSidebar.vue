<script setup lang="ts">
const route = useRoute()

const navItems = [
  { label: 'Ana Sayfa', icon: 'home', to: '/' },
  { label: 'Yol Kapamalar', icon: 'traffic', to: '/yol-kapamalar' },
  { label: 'Ayarlar', icon: 'settings', to: '/ayarlar' }
]

function isActive(to: string) {
  return route.path === to
}
</script>

<template>
  <aside
    class="hidden md:flex flex-col h-screen w-[15vw] bg-surface-container border-r border-outline-variant shrink-0 overflow-y-auto z-20"
  >
    <!-- Header -->
    <div class="p-gutter border-b border-outline-technical flex flex-col gap-base-unit">
      <div class="flex items-center gap-gutter">
        <div
          class="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 border border-outline-technical overflow-hidden"
        >
          <span class="material-symbols-outlined text-primary">shield_person</span>
        </div>
        <div class="flex flex-col overflow-hidden">
          <span class="font-headline-md text-headline-md font-bold text-primary truncate">Ops Console</span>
          <span class="font-label-sm text-label-sm text-on-surface-variant truncate">Bölgesel Sektör 7</span>
        </div>
      </div>
    </div>

    <!-- Navigasyon -->
    <nav class="flex-1 py-gutter flex flex-col gap-base-unit">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-4 px-4 py-2 transition-colors duration-200 active:opacity-80"
        :class="isActive(item.to)
          ? 'border-l-2 border-primary bg-secondary-container text-on-primary-container'
          : 'text-on-surface-variant hover:bg-surface-variant'"
      >
        <span
          class="material-symbols-outlined"
          :style="isActive(item.to) ? { fontVariationSettings: '\'FILL\' 1' } : {}"
        >{{ item.icon }}</span>
        <span class="font-label-sm text-label-sm" :class="{ 'font-bold': isActive(item.to) }">{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </aside>
</template>
