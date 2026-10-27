<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title?: string
    showSearch?: boolean
    searchPlaceholder?: string
    centered?: boolean
    // Arama metni (v-model). Verilmezse kutu yalnızca görseldir.
    modelValue?: string
  }>(),
  {
    title: 'Operasyon Merkezi',
    showSearch: false,
    searchPlaceholder: 'Ara...',
    centered: false,
    modelValue: ''
  }
)

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <header
    class="bg-surface-dim h-16 w-full border-b border-outline-variant flex items-center justify-between px-6 sticky top-0 z-50 shrink-0"
  >
    <!-- Sol: opsiyonel arama -->
    <div v-if="showSearch" class="flex items-center w-96 relative">
      <span class="material-symbols-outlined absolute left-3 text-on-surface-variant text-[18px]">search</span>
      <input
        class="w-full bg-surface-container border border-outline-technical rounded py-1.5 pl-9 pr-8 font-data-tabular text-data-tabular text-on-surface focus:outline-none focus:border-electric-blue focus:ring-1 focus:ring-electric-blue transition-all"
        :placeholder="searchPlaceholder"
        :value="props.modelValue"
        type="text"
        @input="onInput"
        @keydown.esc="emit('update:modelValue', '')"
      >
      <button
        v-if="props.modelValue"
        type="button"
        class="absolute right-2 text-on-surface-variant hover:text-on-surface"
        title="Aramayı temizle"
        @click="emit('update:modelValue', '')"
      >
        <span class="material-symbols-outlined text-[16px]">close</span>
      </button>
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
      <button class="hover:text-primary transition-colors active:scale-95 p-1.5 rounded" title="Bildirimler">
        <span class="material-symbols-outlined">notifications</span>
      </button>
      <button class="hover:text-primary transition-colors active:scale-95 p-1.5 rounded" title="Yardım">
        <span class="material-symbols-outlined">help_outline</span>
      </button>
      <button class="hover:text-primary transition-colors active:scale-95 p-1.5 rounded" title="Hesap">
        <span class="material-symbols-outlined">account_circle</span>
      </button>
    </div>
  </header>
</template>
