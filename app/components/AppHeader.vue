<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    showSearch?: boolean
    searchPlaceholder?: string
    centered?: boolean
  }>(),
  {
    title: 'Operations Command',
    showSearch: false,
    searchPlaceholder: 'Search...',
    centered: false
  }
)
</script>

<template>
  <header
    class="bg-surface-dim h-16 w-full border-b border-outline-variant flex items-center justify-between px-6 sticky top-0 z-50 shrink-0"
  >
    <!-- Sol: opsiyonel arama -->
    <div v-if="showSearch" class="flex items-center w-96 relative">
      <span class="material-symbols-outlined absolute left-3 text-on-surface-variant text-[18px]">search</span>
      <input
        class="w-full bg-surface-container border border-outline-technical rounded py-1.5 pl-9 pr-3 font-data-tabular text-data-tabular text-on-surface focus:outline-none focus:border-electric-blue focus:ring-1 focus:ring-electric-blue transition-all"
        :placeholder="searchPlaceholder"
        type="text"
      >
    </div>
    <div v-else class="flex items-center gap-gutter">
      <span class="font-headline-lg text-headline-lg font-black text-primary">{{ title }}</span>
    </div>

    <!-- Ortalanmış başlık (arama gösterildiğinde) -->
    <div v-if="showSearch && centered" class="absolute left-1/2 -translate-x-1/2">
      <span class="font-headline-lg text-headline-lg font-black text-primary tracking-tight">{{ title }}</span>
    </div>

    <!-- Sağ: aksiyon ikonları -->
    <div class="flex items-center gap-4 text-on-surface-variant">
      <button class="hover:text-primary transition-colors active:scale-95 p-1.5 rounded" title="Notifications">
        <span class="material-symbols-outlined">notifications</span>
      </button>
      <button class="hover:text-primary transition-colors active:scale-95 p-1.5 rounded" title="Help">
        <span class="material-symbols-outlined">help_outline</span>
      </button>
      <button class="hover:text-primary transition-colors active:scale-95 p-1.5 rounded" title="Account">
        <span class="material-symbols-outlined">account_circle</span>
      </button>
    </div>
  </header>
</template>
