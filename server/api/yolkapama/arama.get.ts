// GET /api/yolkapama/arama?q=...
//
// Haritadaki arama kutusu için Nominatim proxy'si. Tarayıcıdan doğrudan
// Nominatim'e gitmek yerine buradan geçmesinin nedenleri (OSM kullanım
// politikası: https://operations.osmfoundation.org/policies/nominatim/):
//
//  - Tüm kullanıcıların istekleri toplamda saniyede en fazla 1 olmalı
//    (limit uygulama başınadır, kullanıcı başına değil) -> sıraya alıp
//    istekler arasında en az 1.1 sn bırakıyoruz.
//  - Aynı sorgu tekrar tekrar gönderilmemeli -> bellek içi önbellek.
//  - Uygulamayı tanıtan bir User-Agent gerekir; tarayıcılar User-Agent
//    başlığını JS'ten ayarlayamaz -> sunucudan gönderiyoruz.
//
// Not: Önbellek ve sıra tek sunucu işlemi içindir. Birden fazla örnek
// (serverless / çoklu instance) çalıştırırsanız ortak bir önbelleğe
// (ör. Nitro storage + Redis) taşıyın veya kendi Nominatim/Photon
// sunucunuzu kullanın.

interface NominatimItem {
  lat: string
  lon: string
  display_name: string
}

const MIN_INTERVAL_MS = 1100
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 saat
const NEGATIVE_CACHE_TTL_MS = 60 * 60 * 1000 // sonuçsuz sorgular 1 saat
const MAX_CACHE_ENTRIES = 500
const MAX_QUERY_LENGTH = 200

const cache = new Map<string, { expires: number; data: NominatimItem[] }>()
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

function cacheSet(key: string, data: NominatimItem[]) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    // Map ekleme sırasını korur: en eski kaydı at.
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, {
    expires: Date.now() + (data.length ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS),
    data
  })
}

export default defineEventHandler(async (event) => {
  const query = String(getQuery(event).q ?? '').trim()

  if (query.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Arama metni en az 2 karakter olmalı.' })
  }
  if (query.length > MAX_QUERY_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: 'Arama metni çok uzun.' })
  }

  // İsteğe bağlı: öneri listesi için birden fazla sonuç (1-8, varsayılan 1)
  const limitParam = Number.parseInt(String(getQuery(event).limit ?? '1'), 10)
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 8) : 1

  const key = `${limit}|${query.toLocaleLowerCase('tr-TR')}`
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) {
    return hit.data
  }

  const config = useRuntimeConfig()
  const userAgent = config.nominatimUserAgent || 'YolKapama-OpsConsole/1.0'

  // Varsayılan genel OSM sunucusu; kendi Nominatim sunucunuza geçmek için
  // NUXT_NOMINATIM_URL tanımlayın (ör. http://localhost:8080).
  const base = (config.nominatimUrl || 'https://nominatim.openstreetmap.org').replace(/\/+$/, '')
  const url = new URL(`${base}/search`)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('countrycodes', 'tr')
  // Denizli bölgesine yumuşak öncelik (sınırlayıcı değil, sadece sıralamayı etkiler)
  url.searchParams.set('viewbox', '28.6,38.1,29.6,37.3')
  url.searchParams.set('bounded', '0')

  try {
    const results = await throttled(() =>
      $fetch<NominatimItem[]>(url.toString(), {
        headers: { 'User-Agent': userAgent, 'Accept-Language': 'tr' },
        timeout: 10_000
      })
    )

    const data = (results ?? []).map(({ lat, lon, display_name }) => ({ lat, lon, display_name }))
    cacheSet(key, data)
    return data
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'Arama servisine ulaşılamadı. Biraz sonra tekrar deneyin.'
    })
  }
})
