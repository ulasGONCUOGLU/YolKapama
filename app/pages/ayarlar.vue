<script setup lang="ts">
const systemPrompt = ref(
  `Sen Denizli'deki belediyelerin yol kapatma duyurularını analiz eden bir konum analiz sistemisin. Gelen metinleri inceleyip kapatılan caddeleri, sokakları, başlangıç ve bitiş tarihlerini çıkar.
Güzergah metni:`
)

const theme = ref<'light' | 'dark' | 'system'>('dark')

function kaydet() {
  // TODO: Backend'e (ör. /api/settings) kaydet
  console.log('Kaydedildi:', { systemPrompt: systemPrompt.value, theme: theme.value })
}
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
              <textarea
                id="ai-instruction"
                v-model="systemPrompt"
                rows="12"
                class="w-full bg-background border border-outline-technical rounded text-on-surface font-data-tabular text-data-tabular p-3 focus:outline-none focus:border-electric-blue focus:ring-1 focus:ring-electric-blue transition-colors resize-y"
              />
              <div class="flex justify-end mt-2">
                <button
                  class="bg-electric-blue text-on-primary font-label-sm text-label-sm px-4 py-2 rounded shadow-sm hover:brightness-110 active:scale-95 transition-all"
                  @click="kaydet"
                >
                  Kaydet
                </button>
              </div>
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
