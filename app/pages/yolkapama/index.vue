<script setup lang="ts">
import type { Closure } from '~/types/closure'

definePageMeta({ layout: 'yolkapama' })

const coords = reactive({ lat: 37.7765, lng: 29.0864 })

const searchQuery = ref('')
const searching = ref(false)
const searchError = ref('')

const mapClosures = ref<Closure[]>([])

const mapRef = ref<{
  zoomIn: () => void
  zoomOut: () => void
  flyToLocation: (lat: number, lng: number, label?: string) => void
} | null>(null)

function onCenterChanged(payload: { lat: number; lng: number }) {
  coords.lat = payload.lat
  coords.lng = payload.lng
}

async function handleSearch() {
  const query = searchQuery.value.trim()
  if (!query) return

  searching.value = true
  searchError.value = ''

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('format', 'json')
    url.searchParams.set('q', query)
    url.searchParams.set('limit', '1')
    url.searchParams.set('countrycodes', 'tr')
    // Denizli bölgesine yumuşak öncelik (sınırlayıcı değil, sadece sıralamayı etkiler)
    url.searchParams.set('viewbox', '28.6,38.1,29.6,37.3')
    url.searchParams.set('bounded', '0')

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' }
    })

    if (!res.ok) throw new Error('İstek başarısız')

    const results = await res.json()

    if (!results.length) {
      searchError.value = 'Sonuç bulunamadı.'
      return
    }

    const { lat, lon, display_name } = results[0]
    mapRef.value?.flyToLocation(Number.parseFloat(lat), Number.parseFloat(lon), display_name)
  } catch {
    searchError.value = 'Arama sırasında bir hata oluştu.'
  } finally {
    searching.value = false
  }
}

function zoomIn() {
  mapRef.value?.zoomIn()
}

function zoomOut() {
  mapRef.value?.zoomOut()
}

// ============================================================
// AKTİF KAPAMALARI HARİTA İÇİN ÇEK (koordinatı olan + aktif)
// ============================================================

async function fetchMapClosures() {
  const supabase = useSupabase()

  const { data, error } = await supabase
    .from('closures')
    .select('*')
    .eq('active', true)
    .not('geometry', 'is', null)

  if (!error) {
    mapClosures.value = (data ?? []) as Closure[]
  }
}

// ============================================================
// "VERİLERİ ÇEK" — Flask'ı tetikle + sync_runs'ı poll et
// ============================================================

type SyncState = 'idle' | 'triggering' | 'calisiyor' | 'basarili' | 'hata'

const syncState = ref<SyncState>('idle')
const syncError = ref('')

let pollTimer: ReturnType<typeof setInterval> | null = null

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function pollRun(runId: number) {
  const supabase = useSupabase()

  const { data, error } = await supabase
    .from('sync_runs')
    .select('durum, hata_mesaji')
    .eq('id', runId)
    .single()

  if (error) return // geçici ağ hatası olabilir, bir sonraki tick'te tekrar dener

  if (data.durum === 'basarili') {
    syncState.value = 'basarili'
    stopPolling()
    fetchMapClosures()
    setTimeout(() => {
      if (syncState.value === 'basarili') syncState.value = 'idle'
    }, 4000)
  } else if (data.durum === 'hata') {
    syncState.value = 'hata'
    syncError.value = data.hata_mesaji ?? 'Bilinmeyen hata.'
    stopPolling()
  }
  // 'beklemede' / 'calisiyor' ise sessizce devam et
}

async function verileriCek() {
  if (syncState.value === 'triggering' || syncState.value === 'calisiyor') return

  syncState.value = 'triggering'
  syncError.value = ''

  try {
    const response = await $fetch<{ status: string; run_id: number }>(
      '/api/yolkapama/calistir',
      { method: 'POST' }
    )

    syncState.value = 'calisiyor'

    stopPolling()
    pollTimer = setInterval(() => pollRun(response.run_id), 3000)
  } catch (error: any) {
    syncState.value = 'hata'
    syncError.value = error?.data?.statusMessage ?? 'Tetikleme başarısız oldu.'
  }
}

onMounted(fetchMapClosures)
onBeforeUnmount(stopPolling)
</script>

<template>
  <main class="flex-1 flex flex-col h-screen relative bg-surface-dim overflow-hidden">
    <header class="bg-surface-dim h-16 w-full border-b border-outline-variant flex items-center justify-between px-6 sticky top-0 z-50 shrink-0">
      <!-- Arama -->
      <div class="flex items-center w-96 relative">
        <span class="material-symbols-outlined absolute left-3 text-on-surface-variant text-[18px]">search</span>
        <input
          v-model="searchQuery"
          class="w-full bg-surface-container border border-outline-technical rounded py-1.5 pl-9 pr-3 font-data-tabular text-data-tabular text-on-surface focus:outline-none focus:border-electric-blue focus:ring-1 focus:ring-electric-blue transition-all"
          placeholder="Koordinat, sektör ara..."
          type="text"
          @keyup.enter="handleSearch"
        >
      </div>

      <div class="absolute left-1/2 -translate-x-1/2">
        <span class="font-headline-lg text-headline-lg font-black text-primary tracking-tight">Operasyon Merkezi</span>
      </div>

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

    <!-- Harita Alanı -->
    <div class="flex-1 w-full relative z-0">
      <OpsMap ref="mapRef" :closures="mapClosures" @center-changed="onCenterChanged" />

      <!-- Arama durumu -->
      <div v-if="searching || searchError" class="absolute top-4 left-1/2 -translate-x-1/2 z-[500]">
        <span
          v-if="searching"
          class="bg-surface-container-highest border border-outline-technical text-on-surface-variant font-label-sm text-label-sm px-3 py-1.5 rounded shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
        >Aranıyor...</span>
        <span
          v-else-if="searchError"
          class="bg-error-container text-on-error-container font-label-sm text-label-sm px-3 py-1.5 rounded shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
        >{{ searchError }}</span>
      </div>

      <!-- HUD Katmanı -->
      <div class="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-[400]">
        <!-- Sağ üst: Verileri Çek butonu + hata mesajı -->
        <div class="w-full flex flex-col items-end gap-2">
          <button
            class="pointer-events-auto font-label-sm text-label-sm font-bold px-6 py-2.5 rounded shadow-[0_4px_12px_rgba(0,0,0,0.5)] border transition-colors flex items-center gap-2 uppercase tracking-widest disabled:opacity-70 disabled:cursor-not-allowed"
            :class="syncState === 'hata'
              ? 'bg-error text-on-error border-[#ffffff20] hover:brightness-110'
              : 'bg-electric-blue text-[#000000] border-[#ffffff20] hover:bg-primary-fixed'"
            :disabled="syncState === 'triggering' || syncState === 'calisiyor'"
            @click="verileriCek"
          >
            <span
              class="material-symbols-outlined text-[16px]"
              :class="{ 'animate-spin': syncState === 'triggering' || syncState === 'calisiyor' }"
            >{{ syncState === 'triggering' || syncState === 'calisiyor' ? 'progress_activity' : 'download' }}</span>
            <span v-if="syncState === 'triggering'">Başlatılıyor...</span>
            <span v-else-if="syncState === 'calisiyor'">Çalışıyor...</span>
            <span v-else-if="syncState === 'basarili'">Tamamlandı</span>
            <span v-else-if="syncState === 'hata'">Tekrar Dene</span>
            <span v-else>Verileri Çek</span>
          </button>

          <span
            v-if="syncState === 'hata' && syncError"
            class="pointer-events-auto bg-error-container text-on-error-container font-label-sm text-label-sm px-3 py-1.5 rounded shadow-[0_4px_12px_rgba(0,0,0,0.5)] max-w-sm text-right"
          >
            {{ syncError }}
          </span>
        </div>

        <!-- Alt: sol - enlem/boylam okuması, sağ - yakınlaştırma kontrolleri -->
        <div class="w-full flex justify-between items-end">
          <div
            class="bg-surface-container-highest border border-outline-technical px-3 py-1.5 rounded flex gap-4 pointer-events-auto shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          >
            <div class="flex flex-col">
              <span class="font-label-sm text-[10px] text-on-surface-variant uppercase">Enlem</span>
              <span class="font-data-tabular text-data-tabular text-primary">{{ coords.lat.toFixed(4) }}° K</span>
            </div>
            <div class="w-px bg-outline-technical" />
            <div class="flex flex-col">
              <span class="font-label-sm text-[10px] text-on-surface-variant uppercase">Boylam</span>
              <span class="font-data-tabular text-data-tabular text-primary">{{ coords.lng.toFixed(4) }}° D</span>
            </div>
          </div>

          <div class="flex flex-col gap-2 pointer-events-auto">
            <button
              class="bg-surface-container-highest border border-outline-technical w-10 h-10 flex items-center justify-center rounded hover:bg-surface-variant transition-colors text-on-surface"
              title="Yakınlaştır"
              @click="zoomIn"
            >
              <span class="material-symbols-outlined">add</span>
            </button>
            <button
              class="bg-surface-container-highest border border-outline-technical w-10 h-10 flex items-center justify-center rounded hover:bg-surface-variant transition-colors text-on-surface"
              title="Uzaklaştır"
              @click="zoomOut"
            >
              <span class="material-symbols-outlined">remove</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
