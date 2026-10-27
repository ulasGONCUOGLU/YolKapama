// GET /api/yolkapama/oneri?q=...
//
// Arama kutusunda YAZDIKÇA çıkan yer önerileri için proxy. Nominatim harf
// harf (autocomplete) aramayı yasakladığı için burada, "yazdıkça arama"
// için tasarlanmış Photon (OSM verisiyle çalışan açık kaynak geocoder) kullanılır.
// Enter ile yapılan tam arama ise hâlâ arama.get.ts (Nominatim) üzerinden gider.
//
// Kötüye kullanımı önlemek için:
//  - en az 3 karakter; tarayıcıda ayrıca bekletme (debounce) uygulanır,
//  - bellek içi önbellek (aynı sorgu tekrar dış servise gitmez),
//  - dış servise istekler arasında en az 250 ms (saniyede en fazla ~4),
//  - tanıtıcı User-Agent.
//
// Halka açık photon.komoot.io "adil kullanım" esaslıdır, SLA yoktur. Yoğun
// kullanımda kendi Photon sunucunuzu kurun ve NUXT_PHOTON_URL ile adresini verin.
// Önbellek/hız sınırı tek sunucu işlemi içindir (çoklu instance için ortak önbellek gerekir).

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    name?: string
    street?: string
    housenumber?: string
    district?: string
    locality?: string
    city?: string
    county?: string
    state?: string
    countrycode?: string
    osm_key?: string
    osm_value?: string
  }
}

export interface OneriItem {
  lat: number
  lon: number
  ad: string
  ayrinti: string
  tur: string
}

const MIN_INTERVAL_MS = 250
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 saat
const NEGATIVE_CACHE_TTL_MS = 30 * 60 * 1000
const MAX_CACHE_ENTRIES = 1000
const MAX_QUERY_LENGTH = 100
const LIMIT = 6

const cache = new Map<string, { expires: number; data: OneriItem[] }>()
let lastRequestAt = 0
let queue: Promise<unknown> = Promise.resolve()

function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now()
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
    lastRequestAt = Date.now()
    return task()
  })
  queue = run.catch(() => undefined)
  return run
}

function cacheSet(key: string, data: OneriItem[]) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, { expires: Date.now() + (data.length ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS), data })
}

function toItem(f: PhotonFeature): OneriItem | null {
  const p = f.properties ?? {}
  const c = f.geometry?.coordinates
  if (!c || c.length < 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) return null
  if (p.countrycode && p.countrycode.toUpperCase() !== 'TR') return null

  const ad = p.name || [p.street, p.housenumber].filter(Boolean).join(' ')
  if (!ad) return null

  const ayrinti = [p.street && p.name ? p.street : '', p.district || p.locality, p.city || p.county, p.state]
    .filter((v, i, arr) => v && arr.indexOf(v) === i && v !== ad)
    .join(', ')

  return { lat: c[1], lon: c[0], ad, ayrinti, tur: p.osm_value || p.osm_key || '' }
}

export default defineEventHandler(async (event) => {
  const query = String(getQuery(event).q ?? '').trim()

  if (query.length < 3) return []
  if (query.length > MAX_QUERY_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: 'Arama metni çok uzun.' })
  }

  const key = query.toLocaleLowerCase('tr-TR')
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.data

  const config = useRuntimeConfig()
  const base = (config.photonUrl || 'https://photon.komoot.io').replace(/\/+$/, '')
  const url = new URL(`${base}/api/`)
  url.searchParams.set('q', query)
  url.searchParams.set('limit', String(LIMIT * 2)) // Türkiye dışı sonuçlar elenince yeterli kalsın
  // Denizli merkezine yumuşak öncelik (sınırlamaz, yalnızca sıralamayı etkiler)
  url.searchParams.set('lat', '37.7765')
  url.searchParams.set('lon', '29.0864')

  try {
    const result = await throttled(() =>
      $fetch<{ features?: PhotonFeature[] }>(url.toString(), {
        headers: { 'User-Agent': config.nominatimUserAgent || 'YolKapama-OpsConsole/1.0' },
        timeout: 6_000
      })
    )

    const seen = new Set<string>()
    const data: OneriItem[] = []
    for (const f of result.features ?? []) {
      const item = toItem(f)
      if (!item) continue
      const k = `${item.ad}|${item.ayrinti}`
      if (seen.has(k)) continue
      seen.add(k)
      data.push(item)
      if (data.length >= LIMIT) break
    }
    cacheSet(key, data)
    return data
  } catch {
    // Öneri isteğe bağlıdır: servis yanıt vermezse sessizce boş liste dön
    // (kullanıcı Enter ile Nominatim aramasını kullanmaya devam edebilir).
    return []
  }
})
