<script setup lang="ts">
import type { AdmCalisma, AdmSyncDurumu } from '~/types/closure'

definePageMeta({ layout: 'yolkapama' })

const calismalar = ref<AdmCalisma[]>([])
const sync = ref<AdmSyncDurumu | null>(null)
const loading = ref(true)
const loadError = ref('')

async function fetchAdm() {
  loading.value = true
  loadError.value = ''

  const supabase = useSupabase()
  const { data, error } = await supabase
    .from('adm_calismalari')
    .select(ADM_SUTUNLAR)
    .order('planlanan_baslangic', { ascending: true })
    .limit(2000)

  if (error) {
    loadError.value = admTabloYokMu(error)
      ? 'ADM tablosu bulunamadı. supabase/adm_calismalari.sql dosyasını Supabase SQL Editor\'de çalıştırın.'
      : `Veriler yüklenemedi: ${error.message}`
  } else {
    calismalar.value = (data ?? []) as unknown as AdmCalisma[]
  }
  loading.value = false
}

async function fetchSync() {
  const { data } = await useSupabase().from('adm_sync_durumu').select('*').eq('id', 1).maybeSingle()
  sync.value = (data ?? null) as AdmSyncDurumu | null
}

function refresh() {
  fetchAdm()
  fetchSync()
}

// ---------------------------------------------------------------
// Arama, filtre, sıralama (tarayıcıda)
// ---------------------------------------------------------------
type SortKey = 'tarih' | 'ilce' | 'mahalle' | 'neden' | 'kavsak' | 'durum'
type DurumFiltre = 'yaklasan' | 'tamamlandi' | 'iptal' | 'hepsi'

const searchText = ref('')
const ilceFilter = ref('')
const durumFilter = ref<DurumFiltre>('yaklasan')
const sadeceKavsak = ref(false)
const sortKey = ref<SortKey>('tarih')
const sortDir = ref<'asc' | 'desc'>('asc')

function normalizeText(value: string | number | null | undefined): string {
  return String(value ?? '')
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

const searchIndex = computed(() => {
  const index = new Map<string, string>()
  for (const c of calismalar.value) {
    index.set(
      c.kesinti_id,
      normalizeText(
        [
          c.kesinti_id,
          ADM_DURUM[c.durum_kodu].label,
          c.ilce,
          c.mahalleler.join(' '),
          c.sokaklar.join(' '),
          c.neden,
          c.etkilenen_kavsaklar.map((k) => `${k.kod} ${k.ad}`).join(' '),
          admTarih(c),
          admSaat(c)
        ].join(' ')
      )
    )
  }
  return index
})

const simdi = ref(Date.now())

const yaklasanlar = computed(() => calismalar.value.filter((c) => admGuncelMi(c, simdi.value)))
const kavsakEtkileyenler = computed(() => yaklasanlar.value.filter((c) => c.kavsak_sayisi > 0))
const tamamlananSayisi = computed(() => calismalar.value.filter((c) => c.durum_kodu === 'tamamlandi').length)
const iptalSayisi = computed(() => calismalar.value.filter((c) => c.durum_kodu === 'iptal').length)

const ilceOptions = computed(() => {
  const set = new Set<string>()
  for (const c of calismalar.value) if (c.ilce) set.add(c.ilce)
  return [...set].sort((a, b) => a.localeCompare(b, 'tr'))
})

function durumUyar(c: AdmCalisma): boolean {
  switch (durumFilter.value) {
    case 'yaklasan':
      return admGuncelMi(c, simdi.value)
    case 'tamamlandi':
      return c.durum_kodu === 'tamamlandi'
    case 'iptal':
      return c.durum_kodu === 'iptal'
    default:
      return true
  }
}

function sortValue(c: AdmCalisma, key: SortKey): string | number | null {
  switch (key) {
    case 'tarih':
      return c.planlanan_baslangic ? new Date(c.planlanan_baslangic).getTime() : null
    case 'mahalle':
      return c.mahalleler[0] ?? null
    case 'kavsak':
      return c.kavsak_sayisi
    case 'durum':
      return c.durum_kodu
    default:
      return c[key] ?? null
  }
}

function setSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = key === 'kavsak' ? 'desc' : 'asc'
  }
}

const gorunen = computed(() => {
  const tokens = normalizeText(searchText.value).split(/\s+/).filter(Boolean)

  const list = calismalar.value.filter((c) => {
    if (tokens.length) {
      const hay = searchIndex.value.get(c.kesinti_id) ?? ''
      if (!tokens.every((t) => hay.includes(t))) return false
    }
    if (ilceFilter.value && c.ilce !== ilceFilter.value) return false
    if (!durumUyar(c)) return false
    if (sadeceKavsak.value && c.kavsak_sayisi === 0) return false
    return true
  })

  const dir = sortDir.value === 'asc' ? 1 : -1
  const key = sortKey.value
  return [...list].sort((a, b) => {
    const va = sortValue(a, key)
    const vb = sortValue(b, key)
    if (va === null && vb === null) return 0
    if (va === null) return 1
    if (vb === null) return -1
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
    return String(va).localeCompare(String(vb), 'tr') * dir
  })
})

const filtersActive = computed(
  () =>
    searchText.value.trim() !== '' ||
    ilceFilter.value !== '' ||
    durumFilter.value !== 'yaklasan' ||
    sadeceKavsak.value
)

function clearFilters() {
  searchText.value = ''
  ilceFilter.value = ''
  durumFilter.value = 'yaklasan'
  sadeceKavsak.value = false
}

// KPI kartları düğme gibi çalışır (tıklayınca ilgili filtre açılır, tekrar tıklayınca varsayılana döner)
function kartDurum(d: DurumFiltre) {
  durumFilter.value = durumFilter.value === d ? 'yaklasan' : d
}
function kartKavsak() {
  durumFilter.value = 'yaklasan'
  sadeceKavsak.value = !sadeceKavsak.value
}

function sortIcon(key: SortKey): string {
  if (sortKey.value !== key) return 'unfold_more'
  return sortDir.value === 'asc' ? 'arrow_upward' : 'arrow_downward'
}
function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
  if (sortKey.value !== key) return 'none'
  return sortDir.value === 'asc' ? 'ascending' : 'descending'
}

// "Göster": ana sayfada çalışma alanına gider. Alanı yoksa ya da Denizli şehir dışındaysa pasif.
function haritadaGosterilebilir(c: AdmCalisma): boolean {
  return !!c.geometry && c.sehir_ici
}
function gosterOnMap(c: AdmCalisma) {
  if (!haritadaGosterilebilir(c)) return
  navigateTo({ path: '/yolkapama', query: { adm: c.kesinti_id } })
}
function gosterNedeni(c: AdmCalisma): string {
  if (haritadaGosterilebilir(c)) return 'Ana sayfada bu çalışma alanına git'
  if (!c.geometry) return 'ADM bu çalışma için alan çizmemiş'
  return 'Alan Denizli şehir içi dışında: haritada gösterilmez'
}

const sonGuncelleme = computed(() => {
  const iso = sync.value?.son_basarili
  if (!iso) return null
  const t = admGunSaat(iso)
  return `${t.gun} ${t.saat}`
})

onMounted(() => {
  simdi.value = Date.now()
  refresh()
})
</script>

<template>
  <main class="flex-1 flex flex-col min-w-0 bg-background relative z-0">
    <AppHeader
      v-model="searchText"
      title="Operasyon Merkezi"
      show-search
      search-placeholder="Çalışma ara..."
    />

    <div class="flex-1 overflow-auto p-gutter sm:p-margin-canvas">
      <div class="max-w-max-content-width mx-auto flex flex-col gap-6">
        <!-- Sayfa Başlığı -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="font-display text-display text-on-background">ADM Çalışmaları</h2>
            <p class="font-body-md text-body-md text-on-surface-variant mt-1">
              ADM Elektrik'in Merkezefendi ve Pamukkale'deki planlı bakım ve iyileştirme çalışmaları.
              Sinyalize kavşağı etkileyebilecekler (alanın içinde ya da 150 m yakınında) vurgulanır.
            </p>
          </div>
          <button
            class="flex items-center gap-2 bg-transparent border border-outline-technical hover:bg-surface-variant text-on-surface font-label-sm text-label-sm py-2 px-4 rounded transition-colors duration-200"
            @click="refresh"
          >
            <span class="material-symbols-outlined" style="font-size: 16px">refresh</span>
            Yenile
          </button>
        </div>

        <!-- ADM verisi alınamadıysa açıklayıcı uyarı -->
        <div
          v-if="sync && (sync.durum === 'hata' || sync.durum === 'kismen') && sync.hata_mesaji"
          class="rounded border px-4 py-3 flex gap-3 items-start"
          :class="sync.durum === 'hata' ? 'bg-error-container text-on-error-container border-error/40' : 'bg-[#f59e0b]/15 text-on-background border-[#f59e0b]/50'"
          role="alert"
        >
          <span class="material-symbols-outlined shrink-0">{{ sync.durum === 'hata' ? 'error' : 'warning' }}</span>
          <div class="flex flex-col gap-1 min-w-0">
            <strong class="font-body-md text-body-md">
              {{ sync.durum === 'hata' ? 'ADM çalışma verisi alınamadı' : 'ADM verisi kısmen alınamadı' }}
            </strong>
            <span class="font-label-sm text-label-sm break-words">{{ sync.hata_mesaji }}</span>
            <span class="font-label-sm text-label-sm opacity-80">
              {{ sonGuncelleme ? `Gösterilen veri son başarılı güncellemeye aittir: ${sonGuncelleme}.` : 'Henüz başarılı bir güncelleme yok.' }}
              ADM sitesinde değişiklik olmuş olabilir; sorun sürerse geliştiriciye iletin.
            </span>
          </div>
        </div>

        <!-- KPI kartları (düğme gibi çalışır) -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            type="button"
            class="text-left bg-surface-container border rounded p-4 flex flex-col gap-2 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            :class="durumFilter === 'yaklasan' && !sadeceKavsak ? 'border-primary ring-1 ring-primary' : 'border-outline-technical hover:border-primary/60'"
            :aria-pressed="durumFilter === 'yaklasan' && !sadeceKavsak"
            @click="durumFilter = 'yaklasan'; sadeceKavsak = false"
          >
            <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Yaklaşan / devam eden</span>
            <span class="font-display text-display text-primary tabular-nums">{{ yaklasanlar.length }}</span>
          </button>
          <button
            type="button"
            class="text-left bg-surface-container border rounded p-4 flex flex-col gap-2 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#a855f7]"
            :class="sadeceKavsak ? 'border-[#a855f7] ring-1 ring-[#a855f7]' : 'border-outline-technical hover:border-[#a855f7]/60'"
            :aria-pressed="sadeceKavsak"
            title="Yalnız sinyalize kavşağı etkileyebilecek çalışmaları göster"
            @click="kartKavsak"
          >
            <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
              Kavşağı etkileyen
              <span v-if="sadeceKavsak" class="material-symbols-outlined text-[#a855f7]" style="font-size: 14px">filter_alt</span>
            </span>
            <span class="font-display text-display tabular-nums" :class="kavsakEtkileyenler.length ? 'text-[#a855f7]' : 'text-on-background'">{{ kavsakEtkileyenler.length }}</span>
          </button>
          <button
            type="button"
            class="text-left bg-surface-container border rounded p-4 flex flex-col gap-2 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            :class="durumFilter === 'tamamlandi' ? 'border-primary ring-1 ring-primary' : 'border-outline-technical hover:border-primary/60'"
            :aria-pressed="durumFilter === 'tamamlandi'"
            @click="kartDurum('tamamlandi')"
          >
            <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Tamamlanan</span>
            <span class="font-display text-display text-on-background tabular-nums">{{ tamamlananSayisi }}</span>
          </button>
          <button
            type="button"
            class="text-left bg-surface-container border rounded p-4 flex flex-col gap-2 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            :class="durumFilter === 'iptal' ? 'border-primary ring-1 ring-primary' : 'border-outline-technical hover:border-primary/60'"
            :aria-pressed="durumFilter === 'iptal'"
            @click="kartDurum('iptal')"
          >
            <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">İptal edilen</span>
            <span class="font-display text-display text-on-background tabular-nums">{{ iptalSayisi }}</span>
          </button>
        </div>

        <div v-if="loading" class="text-center py-16 text-on-surface-variant font-body-md text-body-md">Yükleniyor...</div>
        <div v-else-if="loadError" class="text-center py-16 text-error font-body-md text-body-md">{{ loadError }}</div>
        <div v-else-if="calismalar.length === 0" class="text-center py-16 text-on-surface-variant font-body-md text-body-md">
          Henüz ADM çalışması yok. Ana sayfadaki "Verileri Çek" butonuyla ilk çalıştırmayı başlatabilirsin.
        </div>

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
                  v-for="opt in ([['yaklasan', 'Yaklaşan / devam eden'], ['tamamlandi', 'Tamamlanan'], ['iptal', 'İptal'], ['hepsi', 'Tümü']] as const)"
                  :key="opt[0]"
                  type="button"
                  class="py-1.5 px-3 transition-colors"
                  :class="durumFilter === opt[0] ? 'bg-primary/15 text-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-variant'"
                  :aria-pressed="durumFilter === opt[0]"
                  @click="durumFilter = opt[0]"
                >{{ opt[1] }}</button>
              </div>
            </div>

            <label class="flex items-center gap-2 cursor-pointer font-label-sm text-label-sm text-on-surface">
              <input v-model="sadeceKavsak" type="checkbox" class="accent-[#a855f7]">
              Yalnız sinyalize kavşağı etkileyenler
            </label>

            <button v-if="filtersActive" type="button" class="font-label-sm text-label-sm text-primary hover:underline" @click="clearFilters">
              Filtreleri temizle
            </button>
            <span class="font-label-sm text-label-sm text-on-surface-variant sm:ml-auto">Sıralamak için sütun başlığına tıklayın</span>
          </div>

          <div v-if="gorunen.length === 0" class="text-center py-12 text-on-surface-variant font-body-md text-body-md">
            Bu filtrelerle eşleşen çalışma yok.
            <button type="button" class="text-primary hover:underline ml-1" @click="clearFilters">Filtreleri temizle</button>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-surface-container-highest border-b border-outline-technical font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  <th class="py-3 px-4 font-medium whitespace-nowrap" :aria-sort="ariaSort('durum')">
                    <button type="button" class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-on-background" @click="setSort('durum')">
                      Durum <span class="material-symbols-outlined" style="font-size: 14px" :class="sortKey === 'durum' ? 'text-primary' : 'opacity-40'">{{ sortIcon('durum') }}</span>
                    </button>
                  </th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap" :aria-sort="ariaSort('tarih')">
                    <button type="button" class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-on-background" @click="setSort('tarih')">
                      Tarih <span class="material-symbols-outlined" style="font-size: 14px" :class="sortKey === 'tarih' ? 'text-primary' : 'opacity-40'">{{ sortIcon('tarih') }}</span>
                    </button>
                  </th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap">Saat</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap" :aria-sort="ariaSort('ilce')">
                    <button type="button" class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-on-background" @click="setSort('ilce')">
                      İlçe <span class="material-symbols-outlined" style="font-size: 14px" :class="sortKey === 'ilce' ? 'text-primary' : 'opacity-40'">{{ sortIcon('ilce') }}</span>
                    </button>
                  </th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap min-w-[160px]" :aria-sort="ariaSort('mahalle')">
                    <button type="button" class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-on-background" @click="setSort('mahalle')">
                      Mahalle <span class="material-symbols-outlined" style="font-size: 14px" :class="sortKey === 'mahalle' ? 'text-primary' : 'opacity-40'">{{ sortIcon('mahalle') }}</span>
                    </button>
                  </th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap min-w-[220px]" :aria-sort="ariaSort('kavsak')">
                    <button type="button" class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-on-background" @click="setSort('kavsak')">
                      Etkilenebilecek kavşaklar <span class="material-symbols-outlined" style="font-size: 14px" :class="sortKey === 'kavsak' ? 'text-primary' : 'opacity-40'">{{ sortIcon('kavsak') }}</span>
                    </button>
                  </th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap min-w-[200px]" :aria-sort="ariaSort('neden')">
                    <button type="button" class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-on-background" @click="setSort('neden')">
                      Çalışma nedeni <span class="material-symbols-outlined" style="font-size: 14px" :class="sortKey === 'neden' ? 'text-primary' : 'opacity-40'">{{ sortIcon('neden') }}</span>
                    </button>
                  </th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap">Sokaklar</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap text-center">Konum</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap">Not</th>
                </tr>
              </thead>
              <tbody class="font-data-tabular text-data-tabular text-on-background divide-y divide-outline-technical/50">
                <tr
                  v-for="c in gorunen"
                  :key="c.kesinti_id"
                  class="hover:bg-surface-bright/50 transition-colors align-top border-l-4"
                  :class="[
                    c.kavsak_sayisi && admGuncelMi(c, simdi) ? 'border-l-[#a855f7]' : 'border-l-transparent',
                    c.durum_kodu === 'iptal' || c.durum_kodu === 'tamamlandi' ? 'opacity-60' : ''
                  ]"
                >
                  <td class="py-3 px-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] uppercase font-bold tracking-wider border" :class="ADM_DURUM[c.durum_kodu].class">
                      {{ ADM_DURUM[c.durum_kodu].label }}
                    </span>
                  </td>
                  <td class="py-3 px-4 whitespace-nowrap" :class="c.durum_kodu === 'iptal' ? 'line-through' : ''">{{ admTarih(c) }}</td>
                  <td class="py-3 px-4 whitespace-nowrap tabular-nums" :class="c.durum_kodu === 'iptal' ? 'line-through' : ''">
                    {{ admSaat(c) }}
                    <div v-if="c.gerceklesen_baslangic" class="text-[11px] text-on-surface-variant">
                      Başladı {{ admSaatTek(c.gerceklesen_baslangic) }}<template v-if="c.gerceklesen_bitis"> · bitti {{ admSaatTek(c.gerceklesen_bitis) }}</template>
                    </div>
                  </td>
                  <td class="py-3 px-4">{{ c.ilce }}</td>
                  <td class="py-3 px-4">{{ c.mahalleler.join(', ') || '—' }}</td>
                  <td class="py-3 px-4">
                    <div v-if="c.etkilenen_kavsaklar.length" class="flex flex-wrap gap-1">
                      <span
                        v-for="k in c.etkilenen_kavsaklar"
                        :key="k.kod"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] border-[#a855f7]/50 bg-[#a855f7]/10"
                        :title="k.iliski === 'icinde' ? 'Çalışma alanının içinde' : `Alana ${k.mesafe_m} m yakın`"
                      >
                        <span aria-hidden="true">🚦</span>{{ k.ad }}
                        <span class="text-on-surface-variant">{{ k.iliski === 'icinde' ? 'içinde' : `${k.mesafe_m} m` }}</span>
                      </span>
                    </div>
                    <span v-else class="text-on-surface-variant">—</span>
                  </td>
                  <td class="py-3 px-4 max-w-[280px]">{{ c.neden ?? '—' }}</td>
                  <td class="py-3 px-4 min-w-[110px]">
                    <details v-if="c.sokaklar.length">
                      <summary class="cursor-pointer text-primary hover:underline whitespace-nowrap">{{ c.sokaklar.length }} sokak</summary>
                      <ul class="m-0 mt-1 pl-4 max-h-40 overflow-auto text-[12px] text-on-surface-variant list-disc">
                        <li v-for="s in c.sokaklar" :key="s">{{ s }}</li>
                      </ul>
                    </details>
                    <span v-else class="text-on-surface-variant">—</span>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded border font-label-sm text-label-sm transition-colors"
                      :class="haritadaGosterilebilir(c)
                        ? 'border-[#a855f7] text-[#a855f7] hover:bg-[#a855f7]/10'
                        : 'border-outline-variant text-on-surface-variant opacity-40 cursor-not-allowed'"
                      :disabled="!haritadaGosterilebilir(c)"
                      :title="gosterNedeni(c)"
                      @click="gosterOnMap(c)"
                    >
                      <span class="material-symbols-outlined" style="font-size: 14px">{{ haritadaGosterilebilir(c) ? 'my_location' : 'wrong_location' }}</span>
                      Göster
                    </button>
                  </td>
                  <td class="py-3 px-4 text-[11px] text-on-surface-variant min-w-[140px]">
                    <div v-if="admYeniMi(c, simdi)" class="text-electric-blue font-bold">YENİ</div>
                    <div v-if="c.onceki_plan" class="text-[#f59e0b]">
                      Saati değişti<br>(önceki: {{ admGunSaat(c.onceki_plan.baslangic).gun }} {{ admGunSaat(c.onceki_plan.baslangic).saat }})
                    </div>
                    <div v-if="c.kaynaktan_kalkti">ADM listesinden kalktı</div>
                    <div class="opacity-70">#{{ c.kesinti_id }}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="px-4 py-3 border-t border-outline-technical bg-surface-container-highest flex flex-wrap items-center justify-between gap-2">
            <span class="font-label-sm text-label-sm text-on-surface-variant">{{ gorunen.length }} / {{ calismalar.length }} çalışma gösteriliyor</span>
            <span class="font-label-sm text-label-sm text-on-surface-variant">
              Kaynak: ADM Elektrik
              <template v-if="sonGuncelleme"> · Son güncelleme: {{ sonGuncelleme }}</template>
              · Bilgiler bilgilendirme amaçlıdır, resmi duyuru yerine geçmez.
            </span>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
