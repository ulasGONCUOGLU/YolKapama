<script setup lang="ts">
import type { ApproxArea, Closure, HaritaAltlik, Kavsak } from '~/types/closure'

definePageMeta({ layout: 'yolkapama' })

const coords = reactive({ lat: 37.7765, lng: 29.0864 })

const searchQuery = ref('')
const searching = ref(false)
const searchError = ref('')

// Aktif kapamalar bir kez çekilir; konumu olanlar haritaya, olmayanlar listeye gider.
const allClosures = ref<Closure[]>([])
// Yol Kapamalar tablosundaki "Göster" ile gelinen kapama pasif olsa bile haritada çizilir.
const focusClosure = ref<Closure | null>(null)
const mapClosures = computed(() => {
  const list = allClosures.value.filter((c) => c.geometry)
  const focus = focusClosure.value
  return focus?.geometry && !list.some((c) => c.id === focus.id) ? [...list, focus] : list
})
// Çok parçalı duyuruda bazı parçalar bulunmuş, bazıları bulunamamış olabilir.
function parcaDurumu(c: Closure) {
  const parcalar = c.geocode_result?.parcalar ?? []
  const eksikler = parcalar.filter((p) => !p.geometry).map((p) => p.etiket)
  return {
    kismen: !!c.geometry && eksikler.length > 0,
    bulunan: parcalar.length - eksikler.length,
    toplam: parcalar.length,
    eksikler
  }
}

// Haritada hiç çizilemeyen (geometrisi olmayan) ya da yalnızca bir kısmı çizilebilen aktif kapamalar
const unlocatedClosures = computed(() =>
  allClosures.value.filter((c) => !c.geometry || parcaDurumu(c).kismen)
)

// Konumu belirsiz kapamaların kırmızı "yaklaşık bölge" dairelerini aç/kapat
const showApprox = ref<'goster' | 'gizle'>('goster')
const approxVisible = computed(() => (showApprox.value === 'goster' ? approxAreas.value : []))
const approxAreas = ref<ApproxArea[]>([])
const unlocatedOpen = ref(false)

// Kısmen bulunan kapamalarda bulunan parçaları tek tek gezmek için
const tur = ref<{ id: number; index: number } | null>(null)
function bulunanParcalar(c: Closure) {
  return (c.geocode_result?.parcalar ?? []).filter((p) => p.geometry)
}
function parcayaGit(c: Closure, index: number) {
  const liste = bulunanParcalar(c)
  if (!liste.length) return
  const n = ((index % liste.length) + liste.length) % liste.length
  tur.value = { id: c.id, index: n }
  const geometry = liste[n]?.geometry
  if (geometry) mapRef.value?.flyToGeometry(geometry)
}
function siradakiParca(c: Closure) {
  parcayaGit(c, tur.value?.id === c.id ? tur.value.index + 1 : 0)
}

// ============================================================
// HARİTA KATMANLARI: altlık (harita/uydu/karma) + sinyalize kavşaklar
// ============================================================
const LAYER_PREF_KEY = 'yk-harita-katmanlari-v1'
const altliklar: { value: HaritaAltlik; label: string; icon: string }[] = [
  { value: 'harita', label: 'Harita', icon: 'map' },
  { value: 'uydu', label: 'Uydu', icon: 'satellite_alt' },
  { value: 'karma', label: 'Karma', icon: 'layers' }
]
const baseLayer = ref<HaritaAltlik>('harita')
const showKavsak = ref(false)
const kavsaklar = ref<Kavsak[]>([])
const kavsakLoading = ref(false)
const kavsakError = ref('')
const layersOpen = ref(true)
const kavsakVisible = computed(() => (showKavsak.value ? kavsaklar.value : []))

function loadLayerPrefs() {
  try {
    const raw = localStorage.getItem(LAYER_PREF_KEY)
    if (!raw) return
    const p = JSON.parse(raw) as { baseLayer?: string; showKavsak?: boolean }
    if (p.baseLayer === 'harita' || p.baseLayer === 'uydu' || p.baseLayer === 'karma') baseLayer.value = p.baseLayer
    if (typeof p.showKavsak === 'boolean') showKavsak.value = p.showKavsak
  } catch {
    // localStorage kapalı/bozuk olabilir: varsayılanlarla devam
  }
}

function saveLayerPrefs() {
  try {
    localStorage.setItem(LAYER_PREF_KEY, JSON.stringify({ baseLayer: baseLayer.value, showKavsak: showKavsak.value }))
  } catch {
    // yoksay
  }
}

// Kavşaklar ilk açıldığında bir kez çekilir
async function fetchKavsaklar() {
  if (kavsaklar.value.length || kavsakLoading.value) return
  kavsakLoading.value = true
  kavsakError.value = ''
  const { data, error } = await useSupabase()
    .from('kavsaklar')
    .select('*')
    .order('kod', { ascending: true })
  kavsakLoading.value = false

  if (error) {
    // Tablo henüz oluşturulmamışsa anlaşılır bir mesaj göster
    kavsakError.value = /relation|does not exist|schema cache|42P01|PGRST205/i.test(`${error.code} ${error.message}`)
      ? 'Kavşak tablosu bulunamadı. supabase/kavsaklar.sql dosyasını Supabase SQL Editor\'de çalıştırın.'
      : 'Kavşaklar yüklenemedi.'
    return
  }
  kavsaklar.value = (data ?? []) as Kavsak[]
}

watch([baseLayer, showKavsak], saveLayerPrefs)
watch(showKavsak, (v) => {
  if (v) fetchKavsaklar()
  else kavsakError.value = ''
})

const mapRef = ref<{
  zoomIn: () => void
  zoomOut: () => void
  flyToLocation: (lat: number, lng: number, label?: string) => void
  flyToArea: (lat: number, lng: number, zoom?: number) => void
  flyToGeometry: (geometry: Closure['geometry'] & object) => void
} | null>(null)

function onCenterChanged(payload: { lat: number; lng: number }) {
  coords.lat = payload.lat
  coords.lng = payload.lng
}

// Haritanın baktığı yere en yakın belirsiz kapamalar listede öne çıksın
const sortedUnlocated = computed(() => {
  const areaByClosure = new Map<number, ApproxArea>()
  for (const area of approxAreas.value) {
    for (const c of area.items) areaByClosure.set(c.id, area)
  }

  const distance = (c: Closure) => {
    const area = areaByClosure.get(c.id)
    if (!area) return Number.POSITIVE_INFINITY // bölgesi bilinmeyenler sona
    return (area.lat - coords.lat) ** 2 + (area.lng - coords.lng) ** 2
  }

  return [...unlocatedClosures.value]
    .map((c) => ({ closure: c, area: areaByClosure.get(c.id) ?? null, d: distance(c) }))
    .sort((a, b) => a.d - b.d)
})

const dateFormatter = new Intl.DateTimeFormat('tr-TR')

function formatTarih(c: Closure): string {
  if (c.start_date && c.end_date) {
    const start = dateFormatter.format(new Date(c.start_date))
    const end = dateFormatter.format(new Date(c.end_date))
    return start === end ? start : `${start} – ${end}`
  }
  return c.tarih_raw
}

function showArea(area: ApproxArea | null) {
  if (area) mapRef.value?.flyToArea(area.lat, area.lng)
}

// Arama önerileri üç kaynaktan gelir:
//  - sinyalize kavşaklar ve aktif kapamalar: tarayıcıdaki veriden, anında;
//  - yerler: yazdıkça sunucu proxy'si (Photon) üzerinden (bekletmeli, önbellekli);
//  - Enter / büyüteç: Nominatim ile tam arama (arama.get.ts).
interface Oneri {
  key: string
  tur: 'kavsak' | 'kapama' | 'yer'
  baslik: string
  detay: string
  lat?: number
  lon?: number
  closure?: Closure
}

const suggestions = ref<Oneri[]>([])
const suggestionsOpen = ref(false)
const suggestLoading = ref(false)
const activeSuggestion = ref(-1)
const searchBox = ref<HTMLDivElement | null>(null)

const TUR_IKON: Record<Oneri['tur'], string> = {
  kavsak: 'traffic',
  kapama: 'block',
  yer: 'location_on'
}
const TUR_ETIKET: Record<Oneri['tur'], string> = {
  kavsak: 'Sinyalize kavşak',
  kapama: 'Yol kapama',
  yer: 'Yer'
}

// Türkçe harf/büyük-küçük duyarsız karşılaştırma
function normalizeText(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function tokensOf(query: string): string[] {
  return normalizeText(query).split(/\s+/).filter(Boolean)
}

function yerelOneriler(query: string): Oneri[] {
  const tokens = tokensOf(query)
  if (!tokens.length) return []
  const eslesir = (metin: string) => {
    const n = normalizeText(metin)
    return tokens.every((t) => n.includes(t))
  }

  const sonuc: Oneri[] = []

  for (const k of kavsaklar.value) {
    if (!eslesir(`${k.ad} ${k.kod}`)) continue
    sonuc.push({
      key: `k-${k.kod}`,
      tur: 'kavsak',
      baslik: k.ad,
      detay: `${k.kod} · ${k.bolge}${k.durum !== 'Aktif' ? ' · ' + k.durum : ''}`,
      lat: k.latitude,
      lon: k.longitude
    })
    if (sonuc.length >= 3) break
  }

  let kapamaSayisi = 0
  for (const c of allClosures.value) {
    if (!c.geometry) continue
    if (!eslesir(`${c.guzergah_raw} ${c.mahalle ?? ''} ${c.ilce ?? ''}`)) continue
    sonuc.push({
      key: `c-${c.id}`,
      tur: 'kapama',
      baslik: c.guzergah_raw,
      detay: [c.ilce, c.mahalle].filter(Boolean).join(' / ') || 'Aktif yol kapama',
      closure: c
    })
    if (++kapamaSayisi >= 3) break
  }

  return sonuc
}

let oneriZamanlayici: ReturnType<typeof setTimeout> | null = null
let oneriSayac = 0 // eski yanıtların yenisini ezmesini önler

function oneriIptal() {
  oneriSayac++
  suggestLoading.value = false
  if (oneriZamanlayici) {
    clearTimeout(oneriZamanlayici)
    oneriZamanlayici = null
  }
}

async function canliOneriler(query: string, sayac: number) {
  const yerel = yerelOneriler(query)
  suggestions.value = yerel
  activeSuggestion.value = -1
  suggestionsOpen.value = yerel.length > 0

  if (query.trim().length < 3) return

  suggestLoading.value = true
  try {
    const yerler = await $fetch<{ lat: number; lon: number; ad: string; ayrinti: string }[]>(
      '/api/yolkapama/oneri',
      { query: { q: query.trim() } }
    )
    if (sayac !== oneriSayac) return // daha yeni bir yazım var

    const gorulen = new Set(yerel.map((o) => normalizeText(o.baslik)))
    const uzak: Oneri[] = yerler
      .filter((y) => !gorulen.has(normalizeText(y.ad)))
      .map((y) => ({ key: `y-${y.lat}-${y.lon}-${y.ad}`, tur: 'yer', baslik: y.ad, detay: y.ayrinti, lat: y.lat, lon: y.lon }))

    suggestions.value = [...yerel, ...uzak]
    suggestionsOpen.value = suggestions.value.length > 0
  } catch {
    // Öneri isteğe bağlı: hata olursa yerel öneriler kalır, Enter ile arama çalışır
  } finally {
    if (sayac === oneriSayac) suggestLoading.value = false
  }
}

// Yazdıkça: kısa bir bekleme sonrası öneri getir (her tuşta istek atılmaz)
watch(searchQuery, (q) => {
  searchError.value = ''
  oneriIptal()
  const sayac = oneriSayac

  if (q.trim().length < 2) {
    suggestionsOpen.value = false
    suggestions.value = []
    return
  }

  // Kavşak adları da aranabilsin: tablo bir kez ve hafifçe (142 satır) çekilir
  if (!kavsaklar.value.length && !kavsakError.value) fetchKavsaklar()

  // Yerel eşleşmeler anında, uzak yer önerileri 350 ms bekletmeyle
  const yerel = yerelOneriler(q)
  suggestions.value = yerel
  activeSuggestion.value = -1
  suggestionsOpen.value = yerel.length > 0
  oneriZamanlayici = setTimeout(() => canliOneriler(q, sayac), 350)
})

// Enter ya da büyüteç: Nominatim ile tam arama; en uygun yerler listelenir.
async function handleSearch() {
  const query = searchQuery.value.trim()
  if (!query) return

  oneriIptal()
  searching.value = true
  searchError.value = ''
  suggestionsOpen.value = false

  try {
    // Nominatim'e doğrudan tarayıcıdan değil, önbellekli/hız sınırlı sunucu
    // proxy'si üzerinden gidiyoruz (bkz. server/api/yolkapama/arama.get.ts).
    const results = await $fetch<{ lat: string; lon: string; display_name: string }[]>('/api/yolkapama/arama', {
      query: { q: query, limit: 5 }
    })

    const seen = new Set<string>()
    const yerler: Oneri[] = []
    for (const r of results) {
      if (seen.has(r.display_name)) continue
      seen.add(r.display_name)
      const parcalar = r.display_name.split(',').map((x) => x.trim())
      yerler.push({
        key: `n-${r.display_name}`,
        tur: 'yer',
        baslik: parcalar[0] ?? r.display_name,
        detay: parcalar.slice(1).filter((x) => x && x !== 'Türkiye').join(', '),
        lat: Number.parseFloat(r.lat),
        lon: Number.parseFloat(r.lon)
      })
    }

    const liste = [...yerelOneriler(query), ...yerler]
    suggestions.value = liste

    if (!liste.length) {
      searchError.value = 'Sonuç bulunamadı.'
      return
    }
    if (liste.length === 1) {
      selectSuggestion(liste[0])
      return
    }

    activeSuggestion.value = -1
    suggestionsOpen.value = true
  } catch {
    searchError.value = 'Arama sırasında bir hata oluştu.'
  } finally {
    searching.value = false
  }
}

function selectSuggestion(item: Oneri) {
  suggestionsOpen.value = false
  oneriIptal()

  if (item.tur === 'kapama' && item.closure?.geometry) {
    mapRef.value?.flyToGeometry(item.closure.geometry)
  } else if (item.tur === 'kavsak' && item.lat !== undefined && item.lon !== undefined) {
    showKavsak.value = true // seçilen kavşak görünsün
    mapRef.value?.flyToArea(item.lat, item.lon, 17)
  } else if (item.lat !== undefined && item.lon !== undefined) {
    mapRef.value?.flyToLocation(item.lat, item.lon, item.baslik)
  }
}

function onSearchEnter() {
  const chosen = suggestions.value[activeSuggestion.value]
  if (suggestionsOpen.value && chosen) {
    selectSuggestion(chosen)
  } else {
    handleSearch()
  }
}

function moveSuggestion(step: 1 | -1) {
  if (!suggestionsOpen.value || !suggestions.value.length) return
  const count = suggestions.value.length
  activeSuggestion.value = (activeSuggestion.value + step + count) % count
}

function onDocumentClick(event: MouseEvent) {
  if (searchBox.value && !searchBox.value.contains(event.target as Node)) {
    suggestionsOpen.value = false
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

  // Aktif olanların hepsini al; konumu olanlar haritaya, olmayanlar
  // "konumu belirlenemeyen" listesine gider.
  const { data, error } = await supabase
    .from('closures')
    .select('*')
    .eq('active', true)

  if (!error) {
    allClosures.value = (data ?? []) as Closure[]
  }
}

// ============================================================
// YAKLAŞIK BÖLGE: konumu bulunamayan kapamalar için mahalle merkezi
// ============================================================
// İLÇE-MAHALLE bilgisi kaynak siteden geldiği için AI tahminine bağlı
// değildir. "Mahalle, İlçe, Denizli" sunucu proxy'si üzerinden aranır
// (önbellekli ve hız sınırlı). Sonuçlar tarayıcıda 7 gün saklanır.

const CENTER_CACHE_KEY = 'yk-mahalle-merkez-v1'
const CENTER_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
// Denizli ili yaklaşık sınırları; dışına düşen sonuçlar yanlış eşleşmedir.
const DENIZLI_BOUNDS = { minLat: 37.0, maxLat: 38.6, minLng: 28.3, maxLng: 30.0 }

type CenterCache = Record<string, { lat: number; lng: number; at: number }>

function readCenterCache(): CenterCache {
  try {
    return JSON.parse(localStorage.getItem(CENTER_CACHE_KEY) ?? '{}') as CenterCache
  } catch {
    return {}
  }
}

function writeCenterCache(cache: CenterCache) {
  try {
    localStorage.setItem(CENTER_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // depolama kapalıysa sessizce geç
  }
}

function mahalleQuery(mahalle: string, ilce: string): string {
  const m = mahalle.trim()
  const withSuffix = /\bmah(alle(si)?)?\.?$/i.test(m) ? m : `${m} Mahallesi`
  return `${withSuffix}, ${ilce.trim()}, Denizli`
}

let resolveRun = 0 // mod değişince eski çalıştırmayı bırakmak için
const failedKeys = new Set<string>() // bu oturumda bulunamayanları tekrar sorma

async function resolveApproxAreas() {
  const run = ++resolveRun
  approxAreas.value = []
  if (showApprox.value === 'gizle') return // kapalıyken Nominatim'e istek atma

  try {
    // Aynı mahalledeki kapamaları grupla
    const groups = new Map<string, { label: string; query: string; items: Closure[] }>()
    for (const c of unlocatedClosures.value) {
      if (c.geometry) continue // kısmen bulunanlar için mahalle dairesi çizilmez
      if (!c.mahalle || !c.ilce) continue
      const key = `${c.ilce.toLocaleLowerCase('tr')}|${c.mahalle.toLocaleLowerCase('tr')}`
      const g = groups.get(key) ?? {
        label: `${c.mahalle}, ${c.ilce}`,
        query: mahalleQuery(c.mahalle, c.ilce),
        items: []
      }
      g.items.push(c)
      groups.set(key, g)
    }

    const cache = readCenterCache()
    const now = Date.now()
    const result: ApproxArea[] = []

    for (const [key, g] of groups) {
      if (run !== resolveRun) return // başka bir çalıştırma devraldı
      let hit: CenterCache[string] | undefined = cache[key]
      if (hit && now - hit.at > CENTER_CACHE_TTL_MS) hit = undefined
      if (!hit) {
        if (!failedKeys.has(key)) {
          try {
            const rows = await $fetch<{ lat: string; lon: string }[]>('/api/yolkapama/arama', {
              query: { q: g.query }
            })
            const lat = Number.parseFloat(rows[0]?.lat ?? '')
            const lng = Number.parseFloat(rows[0]?.lon ?? '')
            const inBounds =
              Number.isFinite(lat) &&
              Number.isFinite(lng) &&
              lat >= DENIZLI_BOUNDS.minLat && lat <= DENIZLI_BOUNDS.maxLat &&
              lng >= DENIZLI_BOUNDS.minLng && lng <= DENIZLI_BOUNDS.maxLng
            if (inBounds) {
              hit = { lat, lng, at: now }
              cache[key] = hit
            } else {
              failedKeys.add(key)
            }
          } catch {
            failedKeys.add(key)
          }
        }
      }

      if (run !== resolveRun) return
      if (hit) {
        result.push({ key, label: g.label, lat: hit.lat, lng: hit.lng, items: g.items })
        approxAreas.value = [...result] // her çözülen mahalle haritada hemen görünsün
      }
    }

    writeCenterCache(cache)
    if (run === resolveRun) approxAreas.value = result
  } catch {
    // mahalle merkezi bulunamazsa liste yine de çalışır
  }
}

// Veri geldiğinde ya da bölgeler yeniden açıldığında yaklaşık bölgeleri yenile
watch([allClosures, showApprox], resolveApproxAreas)

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

// Yol Kapamalar tablosundaki "Göster" butonu /yolkapama?kapama=ID ile gelir:
// o kapamanın konumuna uçulur (pasif bir kapamaysa haritaya ayrıca çizilir).
const route = useRoute()

async function focusFromQuery() {
  const id = Number.parseInt(String(route.query.kapama ?? ''), 10)
  if (!Number.isFinite(id)) return

  let closure = allClosures.value.find((c) => c.id === id) ?? null

  if (!closure) {
    const { data } = await useSupabase().from('closures').select('*').eq('id', id).maybeSingle()
    closure = (data ?? null) as Closure | null
    if (closure) focusClosure.value = closure
  }

  if (closure?.geometry) {
    await nextTick() // harita prop'ları güncellensin
    mapRef.value?.flyToGeometry(closure.geometry)
  } else {
    searchError.value = 'Bu kapamanın konumu bulunamadı.'
  }
}

onMounted(async () => {
  document.addEventListener('click', onDocumentClick)
  loadLayerPrefs() // kavşak açık kaydedildiyse watch(showKavsak) verileri çeker
  if (window.innerWidth < 640) layersOpen.value = false // dar ekranda kapalı başla
  await fetchMapClosures()
  await focusFromQuery()
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  stopPolling()
})
</script>

<template>
  <main class="flex-1 flex flex-col h-screen relative bg-surface-dim overflow-hidden">
    <header class="bg-surface-dim h-16 w-full border-b border-outline-variant flex items-center justify-between px-6 sticky top-0 z-50 shrink-0">
      <!-- Arama -->
      <div ref="searchBox" class="flex items-center w-96 relative">
        <button
          type="button"
          class="absolute left-3 text-on-surface-variant hover:text-primary"
          title="Ara"
          @click="handleSearch"
        >
          <span class="material-symbols-outlined text-[18px]">search</span>
        </button>
        <input
          v-model="searchQuery"
          class="w-full bg-surface-container border border-outline-technical rounded py-1.5 pl-9 pr-3 font-data-tabular text-data-tabular text-on-surface focus:outline-none focus:border-electric-blue focus:ring-1 focus:ring-electric-blue transition-all"
          placeholder="Koordinat, sektör ara..."
          type="text"
          autocomplete="off"
          role="combobox"
          :aria-expanded="suggestionsOpen"
          aria-controls="yer-onerileri"
          @keydown.enter.prevent="onSearchEnter"
          @keydown.down.prevent="moveSuggestion(1)"
          @keydown.up.prevent="moveSuggestion(-1)"
          @keydown.esc="suggestionsOpen = false"
        >

        <!-- Öneriler (yazdıkça gelir; Enter tam aramayı çalıştırır) -->
        <ul
          v-if="suggestionsOpen"
          id="yer-onerileri"
          role="listbox"
          class="absolute left-0 right-0 top-full mt-1 z-[600] m-0 p-0 list-none bg-surface-container-highest border border-outline-technical rounded shadow-[0_4px_12px_rgba(0,0,0,0.5)] max-h-96 overflow-auto"
        >
          <li class="px-3 py-1.5 font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
            <span class="flex-1">Öneriler</span>
            <span v-if="suggestLoading" class="normal-case tracking-normal">Yerler aranıyor…</span>
          </li>
          <li
            v-for="(item, i) in suggestions"
            :key="item.key"
            role="option"
            :aria-selected="i === activeSuggestion"
          >
            <button
              type="button"
              class="w-full text-left px-3 py-2 flex items-center gap-3 transition-colors"
              :class="i === activeSuggestion ? 'bg-surface-variant' : 'hover:bg-surface-variant'"
              @click="selectSuggestion(item)"
            >
              <span class="material-symbols-outlined text-[18px] shrink-0" :class="item.tur === 'kapama' ? 'text-[#ff4d4f]' : 'text-on-surface-variant'" :title="TUR_ETIKET[item.tur]">{{ TUR_IKON[item.tur] }}</span>
              <span class="flex flex-col gap-0.5 min-w-0">
                <span class="font-data-tabular text-data-tabular text-on-background truncate">{{ item.baslik }}</span>
                <span class="font-label-sm text-label-sm text-on-surface-variant truncate">{{ item.detay }}</span>
              </span>
            </button>
          </li>
          <li class="px-3 py-1.5 font-label-sm text-[10px] text-on-surface-variant border-t border-outline-technical">
            Daha fazla sonuç için Enter'a basın
          </li>
        </ul>
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
      <OpsMap
        ref="mapRef"
        :closures="mapClosures"
        :approximate="approxVisible"
        :base-layer="baseLayer"
        :kavsaklar="kavsakVisible"
        @center-changed="onCenterChanged"
      />

      <!-- Konumu belirlenemeyen aktif kapamalar -->
      <div
        v-if="unlocatedClosures.length"
        class="absolute top-4 left-4 z-[450] w-[min(24rem,calc(100%-2rem))] flex flex-col gap-2"
      >
        <button
          type="button"
          class="w-full text-left flex items-center gap-2 bg-surface-container-highest border border-[#ff4d4f]/60 text-on-surface font-label-sm text-label-sm px-3 py-2 rounded shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:bg-surface-variant transition-colors"
          :aria-expanded="unlocatedOpen"
          @click="unlocatedOpen = !unlocatedOpen"
        >
          <span class="material-symbols-outlined text-[18px] text-[#ff4d4f]">wrong_location</span>
          <span class="flex-1">
            Haritada konumu tam belirlenemeyen
            <strong>{{ unlocatedClosures.length }}</strong> aktif yol kapama var
          </span>
          <span class="material-symbols-outlined text-[18px]">{{ unlocatedOpen ? 'expand_less' : 'expand_more' }}</span>
        </button>

        <div
          v-if="unlocatedOpen"
          class="bg-surface-container-low border border-outline-technical rounded shadow-[0_4px_12px_rgba(0,0,0,0.5)] max-h-[50vh] overflow-auto"
        >
          <p class="px-3 py-2 font-label-sm text-label-sm text-on-surface-variant">
            Bu kapamaların tam yeri (ya da bir kısmı) tespit edilemedi. Bölgede olabilirler; gitmeden önce yerinde kontrol edin.
            Kırmızı kesikli daire, mahalleyi yaklaşık olarak gösterir.
          </p>
          <div
            v-for="(item, i) in sortedUnlocated"
            :key="item.closure.id"
            class="px-3 py-2 flex flex-col gap-1 border-l-4 border-[#ff4d4f]"
            :class="i % 2 === 0 ? 'bg-zebra' : 'bg-surface-container-low'"
          >
            <span class="font-data-tabular text-data-tabular text-on-background">{{ item.closure.guzergah_raw }}</span>
            <span class="font-label-sm text-label-sm text-on-surface-variant">
              {{ [item.closure.ilce, item.closure.mahalle].filter(Boolean).join(' / ') || 'İlçe/mahalle bilinmiyor' }}
              · {{ formatTarih(item.closure) }}
            </span>
            <span class="font-label-sm text-label-sm text-on-surface-variant">{{ item.closure.kapanma_nedeni_raw }}</span>
            <template v-if="parcaDurumu(item.closure).kismen">
              <span class="font-label-sm text-label-sm text-danger-soft">
                Kısmen bulundu: {{ parcaDurumu(item.closure).bulunan }}/{{ parcaDurumu(item.closure).toplam }} parça haritada
              </span>
              <ul class="font-label-sm text-label-sm text-on-surface-variant list-disc pl-5">
                <li v-for="e in parcaDurumu(item.closure).eksikler" :key="e">Bulunamayan: {{ e }}</li>
              </ul>
              <div v-if="bulunanParcalar(item.closure).length" class="flex flex-col gap-1">
                <span class="font-label-sm text-label-sm text-on-surface-variant">Haritada bulunan parçalar:</span>
                <div class="flex flex-wrap gap-1">
                  <button
                    v-for="(parca, pi) in bulunanParcalar(item.closure)"
                    :key="parca.etiket + pi"
                    type="button"
                    class="font-label-sm text-label-sm px-2 py-1 rounded border transition-colors"
                    :class="tur?.id === item.closure.id && tur.index === pi
                      ? 'border-electric-blue bg-electric-blue/15 text-primary'
                      : 'border-outline-technical text-on-surface hover:bg-surface-variant'"
                    :aria-pressed="tur?.id === item.closure.id && tur.index === pi"
                    @click="parcayaGit(item.closure, pi)"
                  >{{ pi + 1 }}. {{ parca.etiket }}</button>
                </div>
                <button
                  v-if="bulunanParcalar(item.closure).length > 1"
                  type="button"
                  class="self-start flex items-center gap-1 font-label-sm text-label-sm text-primary hover:underline"
                  @click="siradakiParca(item.closure)"
                >
                  <span class="material-symbols-outlined text-[16px]">skip_next</span>
                  {{ tur?.id === item.closure.id ? 'Sıradaki parçaya git' : 'Parçaları sırayla gez' }}
                </button>
              </div>
            </template>
            <button
              v-if="item.area"
              type="button"
              class="self-start font-label-sm text-label-sm text-primary hover:underline"
              @click="showArea(item.area)"
            >Bölgeyi haritada göster</button>
          </div>
        </div>
      </div>

      <!-- Konumu belirsiz bölgeleri göster / gizle -->
      <fieldset
        class="absolute bottom-24 left-4 z-[450] m-0 bg-surface-container-highest border border-outline-technical rounded px-3 py-2 flex items-center gap-4 shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
      >
        <legend class="sr-only">Konumu belirsiz bölgeler</legend>
        <span class="font-label-sm text-label-sm text-on-surface-variant">Belirsiz bölgeler</span>
        <label class="flex items-center gap-2 cursor-pointer font-label-sm text-label-sm text-on-surface">
          <input v-model="showApprox" type="radio" name="showApprox" value="goster" class="accent-[#ff4d4f]">
          Göster
        </label>
        <label class="flex items-center gap-2 cursor-pointer font-label-sm text-label-sm text-on-surface">
          <input v-model="showApprox" type="radio" name="showApprox" value="gizle" class="accent-[#ff4d4f]">
          Gizle
        </label>
      </fieldset>

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

          <!-- Katmanlar -->
          <section
            class="pointer-events-auto w-56 bg-surface-container-highest border border-outline-technical rounded shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
            aria-label="Harita katmanları"
          >
            <button
              type="button"
              class="w-full flex items-center gap-2 px-3 py-2 text-left text-on-surface hover:bg-surface-variant transition-colors"
              :aria-expanded="layersOpen"
              @click="layersOpen = !layersOpen"
            >
              <span class="material-symbols-outlined text-[18px] text-primary">layers</span>
              <span class="flex-1 font-label-sm text-label-sm uppercase tracking-widest">Katmanlar</span>
              <span class="material-symbols-outlined text-[18px]">{{ layersOpen ? 'expand_less' : 'expand_more' }}</span>
            </button>

            <div v-if="layersOpen" class="px-3 pb-3 flex flex-col gap-3 border-t border-outline-technical pt-2">
              <fieldset class="m-0 p-0 border-0">
                <legend class="font-label-sm text-[10px] text-on-surface-variant uppercase mb-1">Harita türü</legend>
                <div class="grid grid-cols-3 gap-1">
                  <label
                    v-for="a in altliklar"
                    :key="a.value"
                    class="flex flex-col items-center gap-0.5 py-1.5 rounded border cursor-pointer font-label-sm text-label-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary"
                    :class="baseLayer === a.value
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-outline-technical text-on-surface-variant hover:bg-surface-variant'"
                  >
                    <input v-model="baseLayer" type="radio" name="baseLayer" :value="a.value" class="sr-only">
                    <span class="material-symbols-outlined text-[18px]">{{ a.icon }}</span>
                    {{ a.label }}
                  </label>
                </div>
              </fieldset>

              <div>
                <label class="flex items-center gap-2 cursor-pointer font-label-sm text-label-sm text-on-surface">
                  <input v-model="showKavsak" type="checkbox" class="accent-electric-blue">
                  <span aria-hidden="true">🚦</span>
                  <span class="flex-1">Sinyalize kavşaklar</span>
                  <span v-if="kavsakLoading" class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  <span v-else-if="kavsaklar.length" class="text-on-surface-variant">{{ kavsaklar.length }}</span>
                </label>
                <p v-if="showKavsak && kavsakError" class="mt-1 mb-0 font-label-sm text-[11px] text-danger-soft">{{ kavsakError }}</p>
              </div>
            </div>
          </section>
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
