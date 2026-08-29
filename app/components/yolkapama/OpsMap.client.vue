<script setup lang="ts">
import type { LayerGroup, Map as LeafletMap, Marker } from 'leaflet'
import type { Closure } from '~/types/closure'

const props = withDefaults(
  defineProps<{
    center?: [number, number]
    zoom?: number
    closures?: Closure[]
  }>(),
  {
    center: () => [37.7765, 29.0864], // Denizli merkez
    zoom: 13,
    closures: () => []
  }
)

const emit = defineEmits<{
  (e: 'center-changed', payload: { lat: number; lng: number }): void
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
let map: LeafletMap | null = null
let searchMarker: Marker | null = null
let closuresLayer: LayerGroup | null = null
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

  leaflet
    .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar',
      maxZoom: 19
    })
    .addTo(map)

  emitCenter()
  map.on('moveend', emitCenter)

  renderClosures()
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})

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

function popupHtml(c: Closure): string {
  const guzergah = escapeHtml(c.guzergah_raw)
  const neden = escapeHtml(c.kapanma_nedeni_raw)

  return `<div style="font-family: Inter, sans-serif; font-size: 13px; max-width: 220px;">
    <strong>${guzergah}</strong><br/>
    <span style="color:#8e909a;">${neden}</span>
  </div>`
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function renderClosures() {
  if (!map || !leaflet) return

  if (closuresLayer) {
    closuresLayer.remove()
  }

  closuresLayer = leaflet.layerGroup()

  for (const c of props.closures) {
    if (!c.geometry) continue

    if (c.geometry.type === 'Point') {
      const [lon, lat] = c.geometry.coordinates as number[]
      const marker = leaflet.marker([lat, lon])
      marker.bindPopup(popupHtml(c))
      closuresLayer.addLayer(marker)
    } else if (c.geometry.type === 'LineString') {
      const coords = (c.geometry.coordinates as number[][]).map(
        ([lon, lat]) => [lat, lon] as [number, number]
      )
      const line = leaflet.polyline(coords, {
        color: '#568dff',
        weight: 4,
        opacity: 0.85
      })
      line.bindPopup(popupHtml(c))
      closuresLayer.addLayer(line)
    }
  }

  closuresLayer.addTo(map)
}

watch(
  () => props.closures,
  () => {
    if (map) renderClosures()
  }
)

defineExpose({ zoomIn, zoomOut, flyToLocation })
</script>

<template>
  <div ref="mapContainer" class="w-full h-full" />
</template>

<style>
.leaflet-control-attribution {
  font-size: 10px;
}
/* Ops Console koyu temasıyla uyumlu harita zemin rengi */
.leaflet-container {
  background: #0c1d28;
}
</style>
