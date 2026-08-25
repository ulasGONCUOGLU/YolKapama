<script setup lang="ts">
import type { Map as LeafletMap, Marker } from 'leaflet'

const props = withDefaults(
  defineProps<{
    center?: [number, number]
    zoom?: number
  }>(),
  {
    center: () => [37.7765, 29.0864], // Denizli merkez
    zoom: 13
  }
)

const emit = defineEmits<{
  (e: 'center-changed', payload: { lat: number; lng: number }): void
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
let map: LeafletMap | null = null
let searchMarker: Marker | null = null
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
