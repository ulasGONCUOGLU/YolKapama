<script setup lang="ts">
import type { LayerGroup, Map as LeafletMap, Marker, TileLayer } from 'leaflet'
import type { AdmCalisma, ApproxArea, Closure, ClosureGeometry, GeocodeParca, HaritaAltlik, Kavsak, KavsakUyari } from '~/types/closure'

const props = withDefaults(
  defineProps<{
    center?: [number, number]
    zoom?: number
    closures?: Closure[]
    approximate?: ApproxArea[]
    baseLayer?: HaritaAltlik
    kavsaklar?: Kavsak[]
    admCalismalar?: AdmCalisma[]
    kavsakUyarilari?: Record<string, KavsakUyari[]>
  }>(),
  {
    center: () => [37.7765, 29.0864], // Denizli merkez
    zoom: 13,
    closures: () => [],
    approximate: () => [],
    baseLayer: 'harita',
    kavsaklar: () => [],
    admCalismalar: () => [],
    kavsakUyarilari: () => ({})
  }
)

const emit = defineEmits<{
  (e: 'center-changed', payload: { lat: number; lng: number }): void
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
let map: LeafletMap | null = null
let searchMarker: Marker | null = null
let closuresLayer: LayerGroup | null = null
let approxLayer: LayerGroup | null = null
let kavsakLayer: LayerGroup | null = null
let admLayer: LayerGroup | null = null
let kavsakMarkers: { marker: Marker; aktif: boolean; uyari: boolean }[] = []
let baseLayers: Record<string, TileLayer[]> = {}
let leaflet: typeof import('leaflet') | null = null

onMounted(async () => {
  const leafletModule = await import('leaflet')
  leaflet = leafletModule.default
  await import('leaflet/dist/leaflet.css')

  // Vite ile paketlenirken bozulan varsayılan marker ikonlarını düzeltiyoruz
  const markerIcon2x = (await import('leaflet/dist/images/marker-icon-2x.png')).default
  const markerIcon = (await import('leaflet/dist/images/marker-icon.png')).default
  const markerShadow = (await import('leaflet/dist/images/marker-shadow.png')).default

  delete (leaflet.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
  leaflet.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow
  })

  if (!mapContainer.value) return

  map = leaflet.map(mapContainer.value, { zoomControl: false }).setView(props.center, props.zoom)

  // Altlık haritalar. Aynı anda yalnızca seçili olanın katmanları haritada durur.
  // OSM kullanım politikası: alt alan adı ({s}) yerine tek HTTPS adresi kullanılmalı.
  // Not: tile.openstreetmap.org "best-effort"tır, SLA yoktur; yoğun/ticari
  // kullanımda barındırılan bir tile sağlayıcısına veya kendi sunucunuza geçin.
  // Uydu: Esri World Imagery (ücretsiz, atıf zorunlu; yoğun/ticari kullanımda
  // Esri koşullarını ya da başka bir sağlayıcıyı kontrol edin).
  const esri = (yol: string, opts: Record<string, unknown> = {}) =>
    leaflet!.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/${yol}/MapServer/tile/{z}/{y}/{x}`, {
      attribution: 'Görüntü: Esri, Maxar, Earthstar Geographics',
      maxNativeZoom: 18,
      maxZoom: 19,
      ...opts
    })
  const osm = leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar',
    maxZoom: 19
  })
  const uydu = esri('World_Imagery')
  baseLayers = {
    harita: [osm],
    uydu: [uydu],
    // Karma: uydu görüntüsü + yol ve yer adı etiketleri
    karma: [
      uydu,
      esri('Reference/World_Transportation', { attribution: '', zIndex: 5 }),
      esri('Reference/World_Boundaries_and_Places', { attribution: '', zIndex: 6 })
    ]
  }
  applyBaseLayer()

  // Kavşaklar kapamaların altında kalsın
  // ADM çalışma alanları en altta (yarı saydam mor), kavşaklar onların üstünde
  map.createPane('admPane').style.zIndex = '380'
  map.createPane('kavsakPane').style.zIndex = '390'

  emitCenter()
  map.on('moveend', emitCenter)
  map.on('zoomend', resizeKavsaklar)

  renderClosures()
  renderApprox()
  renderAdm()
  renderKavsaklar()

  if (pendingFocus) {
    const geometry = pendingFocus
    pendingFocus = null
    flyToGeometry(geometry)
  }
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})

function applyBaseLayer() {
  if (!map) return
  const secili = new Set(baseLayers[props.baseLayer] ?? baseLayers.harita)
  for (const layers of Object.values(baseLayers)) {
    for (const layer of layers) {
      if (!secili.has(layer) && map.hasLayer(layer)) map.removeLayer(layer)
    }
  }
  for (const layer of secili) {
    if (!map.hasLayer(layer)) layer.addTo(map)
  }
}

function emitCenter() {
  if (!map) return
  const c = map.getCenter()
  emit('center-changed', { lat: c.lat, lng: c.lng })
}

function zoomIn() {
  map?.zoomIn()
}

function zoomOut() {
  map?.zoomOut()
}

// Bir kapamanın geometrisine (nokta, çizgi, çok parçalı) sığacak şekilde uç.
// Harita henüz hazır değilse (Leaflet asenkron yüklenir) hazır olunca uygulanır.
let pendingFocus: ClosureGeometry | null = null

function flyToGeometry(geometry: ClosureGeometry) {
  if (!map || !leaflet) {
    pendingFocus = geometry
    return
  }
  const bounds = leaflet.geoJSON(geometry as unknown as GeoJSON.GeoJsonObject).getBounds()
  if (!bounds.isValid()) return
  map.flyToBounds(bounds, { padding: [80, 80], maxZoom: 17, duration: 1.0 })
}

// İşaretçi koymadan bir bölgeye uç (konumu belirsiz kapamalar listesi için)
function flyToArea(lat: number, lng: number, zoom = 15) {
  map?.flyTo([lat, lng], zoom, { duration: 1.0 })
}

function flyToLocation(lat: number, lng: number, label?: string) {
  if (!map || !leaflet) return
  map.flyTo([lat, lng], 16, { duration: 1.2 })

  if (searchMarker) searchMarker.remove()
  searchMarker = leaflet.marker([lat, lng]).addTo(map)
  if (label) searchMarker.bindPopup(label).openPopup()
}

// ============================================================
// AKTİF KAPAMALARI HARİTADA GÖSTER
// ============================================================
// geometry alanı Point (tek nokta) veya LineString (yol boyunca çizgi)
// olabilir; her ikisini de destekliyoruz. Prop her değiştiğinde
// (Supabase'ten yeni veri geldiğinde) katman tamamen yeniden çizilir.

function popupHtml(c: Closure, parca?: GeocodeParca, kesinlik?: string): string {
  const guzergah = escapeHtml(c.guzergah_raw)
  const neden = escapeHtml(c.kapanma_nedeni_raw)

  const parcaSatiri = parca
    ? `<div style="margin-top:6px;"><em>${escapeHtml(parca.etiket)}</em></div>`
    : ''
  const kesinlikSatiri =
    kesinlik === 'yaklasik'
      ? '<div style="color:#d32f2f; margin-top:4px;">Yaklaşık konum: tam yer doğrulanamadı</div>'
      : ''

  return `<div style="font-family: Inter, sans-serif; font-size: 13px; max-width: 240px;">
    <strong>${guzergah}</strong><br/>
    <span style="color:#8e909a;">${neden}</span>
    ${parcaSatiri}${kesinlikSatiri}
  </div>`
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Bir geometriyi (Point, LineString, MultiLineString, GeometryCollection...) çizer.
// Kesin konum düz çizgi / işaretçi, yaklaşık konum kesikli çizgi / kesikli halka olur.
function drawGeometry(geometry: ClosureGeometry, kesinlik: string, popup: string) {
  const L = leaflet!
  const kesin = kesinlik !== 'yaklasik'

  const layer = L.geoJSON(geometry as unknown as GeoJSON.GeoJsonObject, {
    style: () => ({
      color: '#568dff',
      weight: 4,
      opacity: kesin ? 0.85 : 0.7,
      dashArray: kesin ? undefined : '8 8'
    }),
    pointToLayer: (_feature, latlng) =>
      kesin
        ? L.marker(latlng)
        : L.circleMarker(latlng, {
            radius: 9,
            color: '#568dff',
            weight: 2,
            dashArray: '4 4',
            fillOpacity: 0.15
          })
  })
  layer.bindPopup(popup)
  return layer
}

function renderClosures() {
  if (!map || !leaflet) return

  if (closuresLayer) {
    closuresLayer.remove()
  }

  closuresLayer = leaflet.layerGroup()
  const alanlar: Array<{ c: Closure; lat: number; lon: number; radius_m: number }> = []

  for (const c of props.closures) {
    const parcalar = c.geocode_result?.parcalar

    if (parcalar?.length) {
      // Çok parçalı duyuru: her parça kendi kesinliğiyle çizilir.
      for (const p of parcalar) {
        if (!p.geometry) continue
        closuresLayer.addLayer(drawGeometry(p.geometry, p.kesinlik, popupHtml(c, p, p.kesinlik)))
      }
      for (const a of c.geocode_result?.etkilenen_alanlar ?? []) {
        alanlar.push({ c, ...a })
      }
    } else if (c.geometry) {
      // Eski kayıt: tek geometri. Şüpheli eşleşme ise yaklaşık çizilir.
      const kesinlik = c.geocode_result?.tam_eslesme === false ? 'yaklasik' : 'kesin'
      closuresLayer.addLayer(drawGeometry(c.geometry, kesinlik, popupHtml(c, undefined, kesinlik)))
    }
  }

  // Etkilenen bölgeler: çizgilerin altında kalsın diye önce eklenir.
  const alanLayer = leaflet.layerGroup()
  for (const { c, lat, lon, radius_m } of alanlar) {
    const daire = leaflet.circle([lat, lon], {
      radius: radius_m,
      color: '#ff4d4f',
      weight: 2,
      dashArray: '2 7',
      fillColor: '#ff4d4f',
      fillOpacity: 0.08
    })
    daire.bindPopup(
      `<div style="font-family: Inter, sans-serif; font-size: 13px; max-width: 240px;">
        <div style="color:#d32f2f; font-weight:700;">Etkilenen bölge</div>
        <div>Bu çevredeki bağlanan sokaklar da kapalı olabilir; kesin sınırı bilinmiyor.</div>
        <div style="margin-top:4px;"><strong>${escapeHtml(c.guzergah_raw)}</strong></div>
      </div>`
    )
    alanLayer.addLayer(daire)
  }
  closuresLayer.addLayer(alanLayer)

  closuresLayer.addTo(map)

  // Daireler haritada olduktan sonra çizgilerin arkasına alınır.
  alanLayer.eachLayer((l) => (l as unknown as { bringToBack?: () => void }).bringToBack?.())
}

// ============================================================
// YAKLAŞIK BÖLGELER (tam konumu bulunamayan aktif kapamalar)
// ============================================================
// Kesik çizgili kırmızı daire = "bu mahallede kapama var, tam yeri
// belirlenemedi". Kesin konumlu (mavi) kapamalardan bilerek farklı çizilir.

const APPROX_RADIUS_M = 450

function approxPopupHtml(area: ApproxArea): string {
  const items = area.items
    .map(
      (c) =>
        `<li style="margin-top:4px;"><strong>${escapeHtml(c.guzergah_raw)}</strong><br/>` +
        `<span style="color:#8e909a;">${escapeHtml(c.kapanma_nedeni_raw)}</span></li>`
    )
    .join('')

  return `<div style="font-family: Inter, sans-serif; font-size: 13px; max-width: 260px;">
    <div style="color:#d32f2f; font-weight:700;">Tam yeri belirlenemedi</div>
    <div style="margin-bottom:2px;">${escapeHtml(area.label)} bölgesinde ${area.items.length} aktif kapama var.</div>
    <ul style="margin:0; padding-left:16px; max-height:160px; overflow:auto;">${items}</ul>
  </div>`
}

function kavsakPopupHtml(k: Kavsak, uyarilar: KavsakUyari[] = []): string {
  const evetHayir = (v: boolean) => (v ? 'Evet' : 'Hayır')
  const satirlar: [string, string | null][] = [
    ['Bölge', k.bolge],
    ['Durum', k.durum],
    ['Mod', k.mod],
    ['Adaptif', evetHayir(k.adaptif)],
    ['Butonlu', evetHayir(k.butonlu)],
    ['TKM bağlı', evetHayir(k.tkm_bagli)],
    ['İletişim', k.iletisim],
    ['Model', k.model],
    ['Yapım tarihi', k.yapim_tarihi],
    ['Açıklama', k.aciklama]
  ]
  const html = satirlar
    .filter(([, v]) => v)
    .map(([a, v]) => `<tr><td style="color:#6b7a85; padding-right:8px;">${a}</td><td>${escapeHtml(String(v))}</td></tr>`)
    .join('')
  const uyariHtml = uyarilar.length
    ? `<div style="margin-bottom:6px; padding:6px 8px; border-left:3px solid #a855f7; background:#f3e8ff;">
        <div style="color:#7e22ce; font-weight:700;">⚡ Elektrik çalışması uyarısı</div>
        ${uyarilar
          .map(
            (u) => `<div style="margin-top:3px;">${escapeHtml(u.tarih)} · ${escapeHtml(u.saat)}${u.devam_ediyor ? ' <b>(devam ediyor)</b>' : ''}<br>
            <span style="color:#6b7a85;">${escapeHtml(u.mahalleler)}${u.mahalleler && u.neden ? ' · ' : ''}${escapeHtml(u.neden)}<br>
            ${u.iliski === 'icinde' ? 'Çalışma alanının içinde' : `Alana ${u.mesafe_m} m yakın`}</span></div>`
          )
          .join('')}
      </div>`
    : ''
  return `<div style="font-family: Inter, sans-serif; font-size: 13px; max-width: 280px;">
    <div style="font-weight:700;">${escapeHtml(k.ad)}</div>
    <div style="color:#6b7a85; margin-bottom:4px;">Sinyalize kavşak · ${escapeHtml(k.kod)}</div>
    ${uyariHtml}
    <table style="border-collapse:collapse;">${html}</table>
  </div>`
}

// Trafik ışığı simgesi (SVG). Pasif kavşakta üç lamba da gri.
// Yakınlaştırdıkça büyür, uzaklaştırınca 142 simge birbirine girmesin diye küçülür.
function kavsakBoyutu(zoom: number): [number, number] {
  if (zoom <= 12) return [10, 18]
  if (zoom <= 14) return [14, 25]
  if (zoom <= 16) return [18, 32]
  return [22, 40]
}

function kavsakIcon(aktif: boolean, zoom: number, uyari = false) {
  const [w, h] = kavsakBoyutu(zoom)
  const kirmizi = aktif ? '#ef4444' : '#8a949e'
  const sari = aktif ? '#facc15' : '#8a949e'
  const yesil = aktif ? '#22c55e' : '#8a949e'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 36" width="${w}" height="${h}" style="display:block; filter: drop-shadow(0 1px 2px rgba(0,0,0,.6));">
    <rect x="1.5" y="1.5" width="17" height="33" rx="5" fill="#1f2933" stroke="#ffffff" stroke-width="1.6"/>
    <circle cx="10" cy="9" r="4.2" fill="${kirmizi}"/>
    <circle cx="10" cy="18" r="4.2" fill="${sari}"/>
    <circle cx="10" cy="27" r="4.2" fill="${yesil}"/>
  </svg>`
  const html = uyari
    ? `<div class="kv-wrap" style="width:${w}px;height:${h}px;"><span class="kv-ring"></span>${svg}</div>`
    : svg
  return leaflet!.divIcon({
    html,
    className: 'kavsak-ikon',
    iconSize: [w, h],
    iconAnchor: [w / 2, h / 2],
    tooltipAnchor: [0, -h / 2],
    popupAnchor: [0, -h / 2]
  })
}

function renderKavsaklar() {
  if (!map || !leaflet) return

  if (kavsakLayer) {
    kavsakLayer.remove()
    kavsakLayer = null
  }
  kavsakMarkers = []
  if (!props.kavsaklar.length) return

  const zoom = map.getZoom()
  kavsakLayer = leaflet.layerGroup()
  for (const k of props.kavsaklar) {
    if (!Number.isFinite(k.latitude) || !Number.isFinite(k.longitude)) continue
    const aktif = k.durum === 'Aktif'
    const uyari = !!props.kavsakUyarilari[k.kod]?.length
    const marker = leaflet.marker([k.latitude, k.longitude], {
      pane: 'kavsakPane',
      icon: kavsakIcon(aktif, zoom, uyari),
      zIndexOffset: uyari ? 1000 : 0,
      title: k.ad,
      keyboard: true
    })
    marker.bindTooltip(escapeHtml(k.ad), { direction: 'top' })
    marker.bindPopup(kavsakPopupHtml(k, props.kavsakUyarilari[k.kod] ?? []))
    kavsakMarkers.push({ marker, aktif, uyari: !!props.kavsakUyarilari[k.kod]?.length })
    kavsakLayer.addLayer(marker)
  }
  kavsakLayer.addTo(map)
}

function resizeKavsaklar() {
  if (!map || !kavsakMarkers.length) return
  const zoom = map.getZoom()
  for (const { marker, aktif, uyari } of kavsakMarkers) marker.setIcon(kavsakIcon(aktif, zoom, uyari))
}

// ADM (Aydem) planlı elektrik çalışmaları: mor alanlar.
// Devam edenler dolgulu ve kalın, yaklaşanlar kesikli ve daha saydam çizilir.
function admPopupHtml(c: AdmCalisma): string {
  const durum = c.durum_kodu === 'devam_ediyor' ? 'Devam ediyor' : c.durum_kodu === 'iptal' ? 'İptal edildi' : 'Planlandı'
  const kavsaklar = c.etkilenen_kavsaklar.length
    ? `<div style="margin-top:6px; padding:6px 8px; border-left:3px solid #a855f7; background:#f3e8ff;">
        <div style="color:#7e22ce; font-weight:700;">🚦 Etkilenebilecek sinyalize kavşaklar</div>
        <ul style="margin:2px 0 0; padding-left:16px;">${c.etkilenen_kavsaklar
          .map((k) => `<li>${escapeHtml(k.ad)} <span style="color:#6b7a85;">(${k.iliski === 'icinde' ? 'alanın içinde' : `${k.mesafe_m} m yakın`})</span></li>`)
          .join('')}</ul>
      </div>`
    : ''
  return `<div style="font-family: Inter, sans-serif; font-size: 13px; max-width: 280px;">
    <div style="color:#7e22ce; font-weight:700;">⚡ ADM planlı elektrik çalışması</div>
    <div style="color:#6b7a85; margin-bottom:4px;">${escapeHtml(durum)} · #${escapeHtml(c.kesinti_id)}</div>
    <div><b>${escapeHtml(admTarih(c))}</b> · ${escapeHtml(admSaat(c))}</div>
    <div>${escapeHtml(c.ilce)}${c.mahalleler.length ? ' / ' + escapeHtml(c.mahalleler.join(', ')) : ''}</div>
    <div style="color:#6b7a85;">${escapeHtml(c.neden ?? '')}</div>
    ${kavsaklar}
    <div style="color:#8e909a; font-size:11px; margin-top:6px;">Kaynak: ADM Elektrik. Alan yaklaşıktır.</div>
  </div>`
}

function renderAdm() {
  if (!map || !leaflet) return
  const L = leaflet

  if (admLayer) {
    admLayer.remove()
    admLayer = null
  }
  if (!props.admCalismalar.length) return

  admLayer = L.layerGroup()
  for (const c of props.admCalismalar) {
    if (!c.geometry) continue
    const devam = c.durum_kodu === 'devam_ediyor'
    const stil = {
      pane: 'admPane',
      color: '#a855f7',
      weight: devam ? 3 : 2,
      dashArray: devam ? undefined : '6 6',
      fillColor: '#a855f7',
      fillOpacity: devam ? 0.35 : 0.18
    }
    const katman = L.geoJSON(c.geometry as unknown as GeoJSON.GeoJsonObject, {
      style: () => stil,
      // Tek noktalı çalışmada alan bilinmiyor: kavşak eşleşmesindeki 150 m'lik daireyi çiz
      pointToLayer: (_f, latlng) => L.circle(latlng, { ...stil, radius: 150 })
    })
    katman.bindPopup(admPopupHtml(c))
    admLayer.addLayer(katman)
  }
  admLayer.addTo(map)
}

function renderApprox() {
  if (!map || !leaflet) return

  if (approxLayer) {
    approxLayer.remove()
  }

  approxLayer = leaflet.layerGroup()

  for (const area of props.approximate) {
    const circle = leaflet.circle([area.lat, area.lng], {
      radius: APPROX_RADIUS_M,
      color: '#ff4d4f',
      weight: 2,
      dashArray: '6 6',
      fillColor: '#ff4d4f',
      fillOpacity: 0.18
    })
    circle.bindPopup(approxPopupHtml(area))
    approxLayer.addLayer(circle)
  }

  approxLayer.addTo(map)
}

watch(
  () => props.closures,
  () => {
    if (map) renderClosures()
  }
)

watch(() => props.baseLayer, applyBaseLayer)

watch(
  () => props.admCalismalar,
  () => {
    if (map) renderAdm()
  }
)

watch(
  () => props.kavsakUyarilari,
  () => {
    if (map) renderKavsaklar()
  }
)

watch(
  () => props.kavsaklar,
  () => {
    if (map) renderKavsaklar()
  }
)

watch(
  () => props.approximate,
  () => {
    if (map) renderApprox()
  }
)

defineExpose({ zoomIn, zoomOut, flyToLocation, flyToArea, flyToGeometry })
</script>

<template>
  <div ref="mapContainer" class="w-full h-full" />
</template>

<style>
.kavsak-ikon {
  background: transparent;
  border: 0;
}
/* ADM çalışması etkileyebilecek kavşakta nabız gibi atan mor halka */
.kv-wrap {
  position: relative;
}
.kv-ring {
  position: absolute;
  inset: -7px;
  border: 2px solid #a855f7;
  border-radius: 12px;
  background: rgba(168, 85, 247, 0.18);
  animation: kv-nabiz 1.6s ease-out infinite;
  pointer-events: none;
}
@keyframes kv-nabiz {
  0% { transform: scale(0.85); opacity: 1; }
  70% { transform: scale(1.25); opacity: 0.25; }
  100% { transform: scale(1.25); opacity: 0.25; }
}
@media (prefers-reduced-motion: reduce) {
  .kv-ring { animation: none; }
}
.leaflet-control-attribution {
  font-size: 10px;
}
/* Ops Console koyu temasıyla uyumlu harita zemin rengi */
.leaflet-container {
  background: rgb(var(--c-surface-container-low));
}
</style>
