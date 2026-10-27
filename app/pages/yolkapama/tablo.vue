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

// ---------------------------------------------------------------
// Filtreleme ve sıralama (tarayıcıda yapılır; veri zaten tamamen yüklü)
// ---------------------------------------------------------------
type SortKey =
  | 'id'
  | 'guzergah_raw'
  | 'tarih'
  | 'kapanma_nedeni_raw'
  | 'ilce'
  | 'mahalle'
  | 'active'
  | 'created_at'

// Başlıktaki "İşlem ara" kutusu: güzergah, neden, ilçe, mahalle ve tarih içinde arar.
const searchText = ref('')

// Türkçe harf ve büyük/küçük harf duyarsız karşılaştırma: "ŞEMİKLER" == "semikler"
function normalizeText(value: string | number | null | undefined): string {
  return String(value ?? '')
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

const searchIndex = computed(() => {
  const index = new Map<number, string>()
  for (const c of closures.value) {
    index.set(
      c.id,
      normalizeText(
        [c.id, c.guzergah_raw, c.kapanma_nedeni_raw, c.ilce, c.mahalle, c.tarih_raw, formatTarih(c)].join(' ')
      )
    )
  }
  return index
})

const ilceFilter = ref('') // '' = tümü
const durumFilter = ref<'hepsi' | 'aktif' | 'pasif'>('hepsi')
const sortKey = ref<SortKey>('created_at')
const sortDir = ref<'asc' | 'desc'>('desc')

// Filtre listesi, veride gerçekten bulunan ilçelerden üretilir (A-Z, Türkçe sıralı).
const ilceOptions = computed(() => {
  const set = new Set<string>()
  for (const c of closures.value) if (c.ilce) set.add(c.ilce)
  return [...set].sort((a, b) => a.localeCompare(b, 'tr'))
})

function setSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    // Metin sütunları A-Z, tarih/sayı sütunları ilk tıklamada yeniden eskiye
    sortDir.value = ['guzergah_raw', 'kapanma_nedeni_raw', 'ilce', 'mahalle'].includes(key)
      ? 'asc'
      : 'desc'
  }
}

function sortValue(c: Closure, key: SortKey): string | number | null {
  switch (key) {
    case 'tarih':
      return c.start_date ? new Date(c.start_date).getTime() : null
    case 'created_at':
      return new Date(c.created_at).getTime()
    case 'active':
      return c.active ? 1 : 0
    case 'id':
      return c.id
    default:
      return c[key] ?? null
  }
}

const visibleClosures = computed(() => {
  // Her arama kelimesi kayıtta geçmeli (kelime sırası önemsiz)
  const tokens = normalizeText(searchText.value).split(/\s+/).filter(Boolean)

  const list = closures.value.filter((c) => {
    if (tokens.length) {
      const haystack = searchIndex.value.get(c.id) ?? ''
      if (!tokens.every((t) => haystack.includes(t))) return false
    }
    if (ilceFilter.value && c.ilce !== ilceFilter.value) return false
    if (durumFilter.value === 'aktif' && !c.active) return false
    if (durumFilter.value === 'pasif' && c.active) return false
    return true
  })

  const dir = sortDir.value === 'asc' ? 1 : -1
  const key = sortKey.value

  return [...list].sort((a, b) => {
    const va = sortValue(a, key)
    const vb = sortValue(b, key)
    // Boş değerler yönden bağımsız olarak hep sona
    if (va === null && vb === null) return 0
    if (va === null) return 1
    if (vb === null) return -1
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
    return String(va).localeCompare(String(vb), 'tr') * dir
  })
})

const filtersActive = computed(
  () => ilceFilter.value !== '' || durumFilter.value !== 'hepsi' || searchText.value.trim() !== ''
)

function clearFilters() {
  ilceFilter.value = ''
  durumFilter.value = 'hepsi'
  searchText.value = ''
}

// "Aktif Kapamalar" kartı bir düğme gibi davranır: basınca yalnız aktifler görünür,
// tekrar basınca tümü geri gelir (aşağıdaki Durum filtresiyle aynı değeri kullanır).
function toggleAktifFilter() {
  durumFilter.value = durumFilter.value === 'aktif' ? 'hepsi' : 'aktif'
}

// "Göster": ana sayfaya gidip o kapamanın konumuna odaklanır.
function gosterOnMap(c: Closure) {
  if (!c.geometry) return
  navigateTo({ path: '/yolkapama', query: { kapama: String(c.id) } })
}

function sortIcon(key: SortKey): string {
  if (sortKey.value !== key) return 'unfold_more'
  return sortDir.value === 'asc' ? 'arrow_upward' : 'arrow_downward'
}

function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
  if (sortKey.value !== key) return 'none'
  return sortDir.value === 'asc' ? 'ascending' : 'descending'
}

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
    <AppHeader
      v-model="searchText"
      title="Operasyon Merkezi"
      show-search
      search-placeholder="İşlem ara..."
    />

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
          <!-- Düğme gibi davranır: basınca yalnız aktif kapamalar listelenir, tekrar basınca tümü -->
          <button
            type="button"
            class="text-left w-full cursor-pointer bg-surface-container border rounded p-4 flex flex-col gap-2 relative overflow-hidden group transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            :class="durumFilter === 'aktif'
              ? 'border-primary ring-1 ring-primary'
              : 'border-outline-technical hover:border-primary/60'"
            :aria-pressed="durumFilter === 'aktif'"
            :title="durumFilter === 'aktif' ? 'Tüm kapamaları göster' : 'Yalnız aktif kapamaları göster'"
            @click="toggleAktifFilter"
          >
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors" />
            <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
              Aktif Kapamalar
              <span v-if="durumFilter === 'aktif'" class="material-symbols-outlined text-primary" style="font-size: 14px">filter_alt</span>
            </span>
            <div class="flex items-baseline gap-2">
              <span class="font-display text-display text-primary">{{ activeCount }}</span>
              <span class="font-label-sm text-label-sm text-electric-blue flex items-center">
                <span class="material-symbols-outlined" style="font-size: 14px">arrow_upward</span> Denizli Bölgesi
              </span>
            </div>
            <span class="font-label-sm text-label-sm text-on-surface-variant">
              {{ durumFilter === 'aktif' ? 'Yalnız aktifler listeleniyor · kaldırmak için tıklayın' : 'Yalnız aktifleri listelemek için tıklayın' }}
            </span>
          </button>
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
          <!-- Filtreler -->
          <div class="px-4 py-3 border-b border-outline-technical bg-surface-container-highest flex flex-wrap items-center gap-x-6 gap-y-3">
            <label class="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
              İlçe
              <select
                v-model="ilceFilter"
                class="bg-surface-container border border-outline-technical rounded py-1.5 px-2 text-on-background font-label-sm text-label-sm focus:outline-none focus:border-primary"
              >
                <option value="">Tümü</option>
                <option v-for="i in ilceOptions" :key="i" :value="i">{{ i }}</option>
              </select>
            </label>

            <div class="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant" role="group" aria-label="Durum filtresi">
              Durum
              <div class="flex border border-outline-technical rounded overflow-hidden">
                <button
                  v-for="opt in ([['hepsi', 'Tümü'], ['aktif', 'Aktif'], ['pasif', 'Aktif değil']] as const)"
                  :key="opt[0]"
                  type="button"
                  class="py-1.5 px-3 transition-colors"
                  :class="durumFilter === opt[0]
                    ? 'bg-primary/15 text-primary'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-variant'"
                  :aria-pressed="durumFilter === opt[0]"
                  @click="durumFilter = opt[0]"
                >{{ opt[1] }}</button>
              </div>
            </div>

            <button
              v-if="filtersActive"
              type="button"
              class="font-label-sm text-label-sm text-primary hover:underline"
              @click="clearFilters"
            >Filtreleri temizle</button>

            <span class="font-label-sm text-label-sm text-on-surface-variant sm:ml-auto">
              Sıralamak için sütun başlığına tıklayın
            </span>
          </div>

          <div v-if="visibleClosures.length === 0" class="text-center py-12 text-on-surface-variant font-body-md text-body-md">
            Bu filtrelerle eşleşen kayıt yok.
            <button type="button" class="text-primary hover:underline ml-1" @click="clearFilters">Filtreleri temizle</button>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-surface-container-highest border-b border-outline-technical font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  <th class="py-3 px-4 font-medium whitespace-nowrap sticky left-0 z-10 bg-surface-container-highest border-r border-outline-technical w-16 text-center" :aria-sort="ariaSort('id')">
                    <button type="button" class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-on-background transition-colors" @click="setSort('id')">
                      ID
                      <span class="material-symbols-outlined" style="font-size: 14px" :class="sortKey === 'id' ? 'text-primary' : 'opacity-40'">{{ sortIcon('id') }}</span>
                    </button>
                  </th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap text-center">Konum</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap min-w-[200px]" :aria-sort="ariaSort('guzergah_raw')">
                    <button type="button" class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-on-background transition-colors" @click="setSort('guzergah_raw')">
                      Güzergah
                      <span class="material-symbols-outlined" style="font-size: 14px" :class="sortKey === 'guzergah_raw' ? 'text-primary' : 'opacity-40'">{{ sortIcon('guzergah_raw') }}</span>
                    </button>
                  </th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap" :aria-sort="ariaSort('tarih')">
                    <button type="button" class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-on-background transition-colors" @click="setSort('tarih')">
                      Tarih
                      <span class="material-symbols-outlined" style="font-size: 14px" :class="sortKey === 'tarih' ? 'text-primary' : 'opacity-40'">{{ sortIcon('tarih') }}</span>
                    </button>
                  </th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap min-w-[200px]" :aria-sort="ariaSort('kapanma_nedeni_raw')">
                    <button type="button" class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-on-background transition-colors" @click="setSort('kapanma_nedeni_raw')">
                      Kapanma Nedeni
                      <span class="material-symbols-outlined" style="font-size: 14px" :class="sortKey === 'kapanma_nedeni_raw' ? 'text-primary' : 'opacity-40'">{{ sortIcon('kapanma_nedeni_raw') }}</span>
                    </button>
                  </th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap" :aria-sort="ariaSort('ilce')">
                    <button type="button" class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-on-background transition-colors" @click="setSort('ilce')">
                      İlçe
                      <span class="material-symbols-outlined" style="font-size: 14px" :class="sortKey === 'ilce' ? 'text-primary' : 'opacity-40'">{{ sortIcon('ilce') }}</span>
                    </button>
                  </th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap" :aria-sort="ariaSort('mahalle')">
                    <button type="button" class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-on-background transition-colors" @click="setSort('mahalle')">
                      Mahalle
                      <span class="material-symbols-outlined" style="font-size: 14px" :class="sortKey === 'mahalle' ? 'text-primary' : 'opacity-40'">{{ sortIcon('mahalle') }}</span>
                    </button>
                  </th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap text-center" :aria-sort="ariaSort('active')">
                    <button type="button" class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-on-background transition-colors" @click="setSort('active')">
                      Aktif
                      <span class="material-symbols-outlined" style="font-size: 14px" :class="sortKey === 'active' ? 'text-primary' : 'opacity-40'">{{ sortIcon('active') }}</span>
                    </button>
                  </th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap text-center">AI Durumu</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap">AI Lok. Tipi</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap">AI Sorgusu</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap">Geocode Result (JSON)</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap">Geometri (GeoJSON)</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap" :aria-sort="ariaSort('created_at')">
                    <button type="button" class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-on-background transition-colors" @click="setSort('created_at')">
                      Oluşturulma
                      <span class="material-symbols-outlined" style="font-size: 14px" :class="sortKey === 'created_at' ? 'text-primary' : 'opacity-40'">{{ sortIcon('created_at') }}</span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody class="font-data-tabular text-data-tabular text-on-background divide-y divide-outline-technical/50">
                <tr v-for="c in visibleClosures" :key="c.id" class="hover:bg-surface-bright/50 transition-colors group">
                  <td class="py-3 px-4 sticky left-0 z-10 bg-surface-container group-hover:bg-surface-bright/50 border-r border-outline-technical text-center text-on-surface-variant">{{ c.id }}</td>
                  <td class="py-3 px-4 text-center">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded border font-label-sm text-label-sm transition-colors"
                      :class="c.geometry
                        ? 'border-primary text-primary hover:bg-primary/10'
                        : 'border-outline-variant text-on-surface-variant opacity-40 cursor-not-allowed'"
                      :disabled="!c.geometry"
                      :title="c.geometry ? 'Ana sayfada bu konuma git' : 'Konumu bulunamadı'"
                      @click="gosterOnMap(c)"
                    >
                      <span class="material-symbols-outlined" style="font-size: 14px">{{ c.geometry ? 'my_location' : 'wrong_location' }}</span>
                      Göster
                    </button>
                  </td>
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
            <span class="font-label-sm text-label-sm text-on-surface-variant">{{ visibleClosures.length }} / {{ closures.length }} kayıt gösteriliyor</span>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
