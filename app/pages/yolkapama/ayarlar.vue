<script setup lang="ts">
definePageMeta({ layout: 'yolkapama' })

const systemPrompt = ref('')
const theme = ref<'light' | 'dark' | 'system'>('dark')

const loading = ref(true)
const saving = ref(false)
const saveState = ref<'idle' | 'success' | 'error'>('idle')
const loadError = ref('')

async function fetchAyarlar() {
  loading.value = true
  loadError.value = ''

  try {
    const data = await $fetch<{ systemPrompt: string }>('/api/yolkapama/ayarlar')
    systemPrompt.value = data.systemPrompt
  } catch {
    loadError.value = 'Ayarlar yüklenemedi. Sunucu route\'u çalışıyor mu?'
  } finally {
    loading.value = false
  }
}

async function kaydet() {
  saving.value = true
  saveState.value = 'idle'

  try {
    await $fetch('/api/yolkapama/ayarlar', {
      method: 'POST',
      body: { systemPrompt: systemPrompt.value }
    })
    saveState.value = 'success'
  } catch {
    saveState.value = 'error'
  } finally {
    saving.value = false
    setTimeout(() => {
      saveState.value = 'idle'
    }, 3000)
  }
}

onMounted(fetchAyarlar)
</script>

<template>
  <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
    <AppHeader title="Operasyon Merkezi" />

    <main class="flex-1 overflow-y-auto p-margin-canvas">
      <div class="max-w-max-content-width mx-auto flex flex-col gap-margin-canvas">
        <!-- Sayfa Başlığı -->
        <div>
          <h1 class="font-display text-display text-on-surface">Ayarlar</h1>
          <p class="font-body-md text-body-md text-on-surface-variant mt-2">
            Sistem yapılandırması ve kullanıcı tercihleri.
          </p>
        </div>

        <!-- Bento Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          <!-- AI Ayarı -->
          <section
            class="lg:col-span-2 bg-surface-container border border-outline-technical rounded-lg p-gutter shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          >
            <div class="flex items-center gap-2 mb-4 border-b border-outline-technical pb-2">
              <span class="material-symbols-outlined text-electric-blue text-sm">memory</span>
              <h2 class="font-headline-md text-headline-md text-on-surface">AI Ayarı</h2>
            </div>
            <div class="flex flex-col gap-2">
              <label class="font-label-sm text-label-sm text-on-surface-variant uppercase" for="ai-instruction">
                Sistem Talimatı (System Prompt)
              </label>

              <div v-if="loading" class="text-on-surface-variant font-body-md text-body-md py-8 text-center">
                Yükleniyor...
              </div>
              <div v-else-if="loadError" class="text-error font-body-md text-body-md py-4">
                {{ loadError }}
              </div>
              <template v-else>
                <textarea
                  id="ai-instruction"
                  v-model="systemPrompt"
                  rows="12"
                  class="w-full bg-background border border-outline-technical rounded text-on-surface font-data-tabular text-data-tabular p-3 focus:outline-none focus:border-electric-blue focus:ring-1 focus:ring-electric-blue transition-colors resize-y"
                />
                <div class="flex items-center justify-end gap-3 mt-2">
                  <span v-if="saveState === 'success'" class="font-label-sm text-label-sm text-electric-blue">
                    Kaydedildi
                  </span>
                  <span v-else-if="saveState === 'error'" class="font-label-sm text-label-sm text-error">
                    Kaydedilemedi
                  </span>
                  <button
                    class="bg-electric-blue text-on-primary font-label-sm text-label-sm px-4 py-2 rounded shadow-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                    :disabled="saving"
                    @click="kaydet"
                  >
                    {{ saving ? 'Kaydediliyor...' : 'Kaydet' }}
                  </button>
                </div>
              </template>
            </div>
          </section>

          <!-- Renk Paleti -->
          <section
            class="bg-surface-container border border-outline-technical rounded-lg p-gutter shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          >
            <div class="flex items-center gap-2 mb-4 border-b border-outline-technical pb-2">
              <span class="material-symbols-outlined text-on-surface-variant text-sm">palette</span>
              <h2 class="font-headline-md text-headline-md text-on-surface">Renk Paleti</h2>
            </div>
            <div class="flex flex-col gap-4">
              <label class="font-label-sm text-label-sm text-on-surface-variant uppercase">Tema Seçimi</label>

              <label
                v-for="option in [
                  { value: 'light', label: 'Açık Tema' },
                  { value: 'dark', label: 'Koyu Tema' },
                  { value: 'system', label: 'Sistem Ayarı' }
                ]"
                :key="option.value"
                class="flex items-center gap-3 cursor-pointer group"
              >
                <div class="relative flex items-center justify-center">
                  <input
                    v-model="theme"
                    class="peer sr-only"
                    name="theme"
                    type="radio"
                    :value="option.value"
                  >
                  <div
                    class="w-4 h-4 border rounded-full transition-colors"
                    :class="theme === option.value ? 'border-electric-blue' : 'border-outline-variant group-hover:border-electric-blue'"
                  />
                  <div
                    class="w-2 h-2 bg-electric-blue rounded-full absolute transition-opacity"
                    :class="theme === option.value ? 'opacity-100' : 'opacity-0'"
                  />
                </div>
                <span
                  class="font-body-md text-body-md transition-colors"
                  :class="theme === option.value ? 'text-on-surface' : 'text-on-surface-variant group-hover:text-on-surface'"
                >{{ option.label }}</span>
              </label>
            </div>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>
