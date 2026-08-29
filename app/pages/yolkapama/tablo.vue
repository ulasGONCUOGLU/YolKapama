<script setup lang="ts">
import type { Closure, SyncRun } from '~/types/closure'

definePageMeta({ layout: 'yolkapama' })

const closures = ref<Closure[]>([])
const loading = ref(true)
const loadError = ref('')
const lastSync = ref<SyncRun | null>(null)

async function fetchClosures() {
  loading.value = true
  loadError.value = ''

  const supabase = useSupabase()

  const { data, error } = await supabase
    .from('closures')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    loadError.value = `Veriler yüklenemedi: ${error.message}`
  } else {
    closures.value = (data ?? []) as Closure[]
  }

  loading.value = false
}

async function fetchLastSync() {
  const supabase = useSupabase()

  const { data } = await supabase
    .from('sync_runs')
    .select('*')
    .order('olusturulma', { ascending: false })
    .limit(1)
    .maybeSingle()

  lastSync.value = (data ?? null) as SyncRun | null
}

function refresh() {
  fetchClosures()
  fetchLastSync()
}

const activeCount = computed(() => closures.value.filter((c) => c.active).length)

const averageConfidence = computed(() => {
  const withConfidence = closures.value.filter(
    (c) => c.active && typeof c.ai_result?.confidence === 'number'
  )

  if (withConfidence.length === 0) return null

  const total = withConfidence.reduce((sum, c) => sum + (c.ai_result?.confidence ?? 0), 0)
  return Math.round((total / withConfidence.length) * 100)
})

const dateFormatter = new Intl.DateTimeFormat('tr-TR')
const timeFormatter = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' })

function formatTarih(c: Closure): string {
  if (c.start_date && c.end_date) {
    const start = dateFormatter.format(new Date(c.start_date))
    const end = dateFormatter.format(new Date(c.end_date))
    return start === end ? start : `${start} – ${end}`
  }
  return c.tarih_raw
}

function formatSaat(iso: string | null): string {
  if (!iso) return '—'
  return timeFormatter.format(new Date(iso))
}

function jsonSummary(value: unknown): string {
  if (value === null || value === undefined) return '—'
  const text = JSON.stringify(value)
  return text.length > 40 ? `${text.slice(0, 40)}...` : text
}

const aiStatusMeta: Record<Closure['ai_status'], { label: string; icon: string; class: string }> = {
  success: { label: 'Başarılı', icon: 'check', class: 'bg-electric-blue/20 text-electric-blue' },
  pending: { label: 'Bekliyor', icon: 'hourglass_empty', class: 'bg-surface-variant text-on-surface-variant' },
  error: { label: 'Hata', icon: 'error', class: 'bg-error/20 text-error' }
}

onMounted(refresh)
</script>

<template>
  <main class="flex-1 flex flex-col min-w-0 bg-background relative z-0">
    <AppHeader title="Operasyon Merkezi" show-search search-placeholder="İşlem ara..." />

    <div class="flex-1 overflow-auto p-gutter sm:p-margin-canvas">
      <div class="max-w-max-content-width mx-auto flex flex-col gap-6">
        <!-- Sayfa Başlığı -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="font-display text-display text-on-background">Yol Kapamalar</h2>
            <p class="font-body-md text-body-md text-on-surface-variant mt-1">
              Bölgesel sektör analizi için aktif ve planlanan yol kapama bilgileri.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <button
              class="flex items-center gap-2 bg-transparent border border-outline-technical hover:bg-surface-variant text-on-surface font-label-sm text-label-sm py-2 px-4 rounded transition-colors duration-200"
              @click="refresh"
            >
              <span class="material-symbols-outlined" style="font-size: 16px">refresh</span>
              Yenile
            </button>
          </div>
        </div>

        <!-- KPI Kartları -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-surface-container border border-outline-technical rounded p-4 flex flex-col gap-2 relative overflow-hidden group hover:border-outline-variant transition-colors">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors" />
            <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Aktif Kapamalar</span>
            <div class="flex items-baseline gap-2">
              <span class="font-display text-display text-primary">{{ activeCount }}</span>
              <span class="font-label-sm text-label-sm text-electric-blue flex items-center">
                <span class="material-symbols-outlined" style="font-size: 14px">arrow_upward</span> Denizli Bölgesi
              </span>
            </div>
          </div>
          <div class="bg-surface-container border border-outline-technical rounded p-4 flex flex-col gap-2 relative overflow-hidden group hover:border-outline-variant transition-colors">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-error/5 rounded-full blur-xl group-hover:bg-error/10 transition-colors" />
            <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">AI Güven Skoru</span>
            <div class="flex items-baseline gap-2">
              <span class="font-display text-display text-on-background">
                {{ averageConfidence !== null ? `${averageConfidence}%` : '—' }}
              </span>
              <span class="font-label-sm text-label-sm text-on-surface-variant">Aktifler Ortalaması</span>
            </div>
          </div>
          <div class="bg-surface-container border border-outline-technical rounded p-4 flex flex-col gap-2 relative overflow-hidden group hover:border-outline-variant transition-colors">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-tertiary/5 rounded-full blur-xl group-hover:bg-tertiary/10 transition-colors" />
            <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Son Senkronizasyon</span>
            <div class="flex items-baseline gap-2">
              <span class="font-display text-display text-on-background tabular-nums">
                {{ formatSaat(lastSync?.bitis ?? lastSync?.baslangic ?? null) }}
              </span>
              <span
                v-if="lastSync"
                class="font-label-sm text-label-sm"
                :class="{
                  'text-electric-blue': lastSync.durum === 'basarili',
                  'text-error': lastSync.durum === 'hata',
                  'text-on-surface-variant': lastSync.durum === 'calisiyor' || lastSync.durum === 'beklemede'
                }"
              >{{ lastSync.durum }}</span>
              <span v-else class="font-label-sm text-label-sm text-on-surface-variant">Henüz çalışmadı</span>
            </div>
          </div>
        </div>

        <!-- Yükleniyor / Hata / Boş durumlar -->
        <div v-if="loading" class="text-center py-16 text-on-surface-variant font-body-md text-body-md">
          Yükleniyor...
        </div>
        <div v-else-if="loadError" class="text-center py-16 text-error font-body-md text-body-md">
          {{ loadError }}
        </div>
        <div v-else-if="closures.length === 0" class="text-center py-16 text-on-surface-variant font-body-md text-body-md">
          Henüz kayıt yok. Ana sayfadaki "Verileri Çek" butonuyla ilk çalıştırmayı başlatabilirsin.
        </div>

        <!-- Veri Tablosu -->
        <div v-else class="bg-surface-container border border-outline-technical rounded overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex flex-col">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-surface-container-highest border-b border-outline-technical font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  <th class="py-3 px-4 font-medium whitespace-nowrap sticky left-0 z-10 bg-surface-container-highest border-r border-outline-technical w-16 text-center">ID</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap min-w-[200px]">Güzergah</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap">Tarih</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap min-w-[200px]">Kapanma Nedeni</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap">İlçe</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap">Mahalle</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap text-center">Aktif</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap text-center">AI Durumu</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap">AI Lok. Tipi</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap">AI Sorgusu</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap">Geocode Result (JSON)</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap">Geometri (GeoJSON)</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap">Oluşturulma</th>
                </tr>
              </thead>
              <tbody class="font-data-tabular text-data-tabular text-on-background divide-y divide-outline-technical/50">
                <tr v-for="c in closures" :key="c.id" class="hover:bg-surface-bright/50 transition-colors group">
                  <td class="py-3 px-4 sticky left-0 z-10 bg-surface-container group-hover:bg-surface-bright/50 border-r border-outline-technical text-center text-on-surface-variant">{{ c.id }}</td>
                  <td class="py-3 px-4 truncate max-w-[250px]" :title="c.guzergah_raw">{{ c.guzergah_raw }}</td>
                  <td class="py-3 px-4 whitespace-nowrap text-on-surface-variant">{{ formatTarih(c) }}</td>
                  <td class="py-3 px-4 truncate max-w-[250px]" :title="c.kapanma_nedeni_raw">{{ c.kapanma_nedeni_raw }}</td>
                  <td class="py-3 px-4">{{ c.ilce ?? '—' }}</td>
                  <td class="py-3 px-4">{{ c.mahalle ?? '—' }}</td>
                  <td class="py-3 px-4 text-center">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] uppercase font-bold tracking-wider border"
                      :class="c.active
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-surface-variant text-on-surface-variant border-outline-variant'"
                    >{{ c.active ? 'Evet' : 'Hayır' }}</span>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <span
                      class="inline-flex items-center justify-center w-5 h-5 rounded-sm"
                      :class="aiStatusMeta[c.ai_status].class"
                      :title="aiStatusMeta[c.ai_status].label"
                    >
                      <span class="material-symbols-outlined" style="font-size: 14px">{{ aiStatusMeta[c.ai_status].icon }}</span>
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <span v-if="c.ai_location_type" class="px-2 py-1 bg-surface-variant rounded text-[11px] border border-outline-variant">
                      {{ c.ai_location_type }}
                    </span>
                    <span v-else class="text-on-surface-variant">—</span>
                  </td>
                  <td class="py-3 px-4">{{ c.ai_query ?? '—' }}</td>
                  <td class="py-3 px-4">
                    <div class="json-viewer text-outline font-mono text-[11px]" :title="JSON.stringify(c.geocode_result)">
                      {{ jsonSummary(c.geocode_result) }}
                    </div>
                  </td>
                  <td class="py-3 px-4">
                    <div class="json-viewer text-outline font-mono text-[11px]" :title="JSON.stringify(c.geometry)">
                      {{ jsonSummary(c.geometry) }}
                    </div>
                  </td>
                  <td class="py-3 px-4 text-on-surface-variant whitespace-nowrap">{{ new Date(c.created_at).toLocaleString('tr-TR') }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Alt bilgi -->
          <div class="px-4 py-3 border-t border-outline-technical bg-surface-container-highest flex items-center justify-between">
            <span class="font-label-sm text-label-sm text-on-surface-variant">{{ closures.length }} kayıt gösteriliyor</span>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
