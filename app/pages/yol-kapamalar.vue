<script setup lang="ts">
interface Closure {
  id: number
  guzergah: string
  tarih: string
  neden: string
  ilce: string
  mahalle: string
  aktif: boolean
  aiInceleme: boolean
  aiLokasyonTipi: string
  aiSorgusu: string
  geocodeResult: Record<string, unknown>
  geocodeSummary: string
  koordinat: Record<string, unknown>
  koordinatSummary: string
  olusturulma: string
}

// TODO: Bu veriler backend'den (ör. /api/closures) çekilecek.
const closures = ref<Closure[]>([
  {
    id: 1,
    guzergah: 'KZ-6 Sokak ile 443 Sokak kesişimi adresinde',
    tarih: '23.07.2026 – 20.08.2026',
    neden: 'Yol ve Kavşak Yapım çalışması işi kapsamında',
    ilce: 'Merkezefendi',
    mahalle: 'Merkezefendi',
    aktif: true,
    aiInceleme: true,
    aiLokasyonTipi: 'kavşak',
    aiSorgusu: 'KZ-6 Sokak',
    geocodeResult: {
      latitude: 37.7807583,
      longitude: 29.0369662,
      display_name: '6. Sokak, Mehmet Akif Ersoy Mahallesi, Merkezefendi, Denizli, Ege Bölgesi, 20040, Türkiye',
      tam_eslesme: true,
      uyari: null,
      kaynak: 'nominatim'
    },
    geocodeSummary: '{"lat": 37.7807583, "lon": 29.0369662, "match": true...}',
    koordinat: {
      type: 'LineString',
      coordinates: [[29.0364357, 37.7807443], [29.0369961, 37.7807591], [29.037093, 37.7807886], [29.0371351, 37.7808878], [29.0371394, 37.7811795]]
    },
    koordinatSummary: '{"type": "LineString", "coords": [...]}',
    olusturulma: '2026-08-18T15:05:05'
  },
  {
    id: 2,
    guzergah: 'Acıpayam Bulvarı ile 143. Cadde Kavşağı',
    tarih: '01.08.2026 – 15.08.2026',
    neden: 'Altyapı Yenileme (ASKİ)',
    ilce: 'Pamukkale',
    mahalle: 'İncilipınar',
    aktif: true,
    aiInceleme: true,
    aiLokasyonTipi: 'bulvar_kesişim',
    aiSorgusu: 'Acıpayam Bulvarı',
    geocodeResult: {
      latitude: 37.765432,
      longitude: 29.098765,
      display_name: 'Acıpayam Bulvarı, İncilipınar Mahallesi, Pamukkale, Denizli, Türkiye',
      tam_eslesme: true,
      uyari: null,
      kaynak: 'nominatim'
    },
    geocodeSummary: '{"lat": 37.765432, "lon": 29.098765, "match": true...}',
    koordinat: { type: 'Point', coordinates: [29.098765, 37.765432] },
    koordinatSummary: '{"type": "Point", "coords": [...]}',
    olusturulma: '2026-08-17T09:30:00'
  },
  {
    id: 3,
    guzergah: 'Lise Caddesi No:45 Önü Kısmi Şerit Daraltma',
    tarih: '10.08.2026 – 12.08.2026',
    neden: 'Telekom Fiber Hat Çekimi',
    ilce: 'Merkezefendi',
    mahalle: 'Sırakapılar',
    aktif: false,
    aiInceleme: true,
    aiLokasyonTipi: 'cadde_üzeri',
    aiSorgusu: 'Lise Caddesi No:45',
    geocodeResult: {
      latitude: 37.778111,
      longitude: 29.085222,
      display_name: 'Lise Caddesi, Sırakapılar Mahallesi, Merkezefendi, Denizli, Türkiye',
      tam_eslesme: false,
      uyari: 'Bina no tam eslesmedi',
      kaynak: 'nominatim'
    },
    geocodeSummary: '{"lat": 37.778111, "lon": 29.085222, "match": false...}',
    koordinat: { type: 'LineString', coordinates: [[29.085111, 37.778], [29.085333, 37.778222]] },
    koordinatSummary: '{"type": "LineString", "coords": [...]}',
    olusturulma: '2026-08-15T14:20:10'
  }
])

const activeCount = computed(() => closures.value.filter(c => c.aktif).length)
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
            >
              <span class="material-symbols-outlined" style="font-size: 16px">filter_list</span>
              Filtrele
            </button>
            <button
              class="flex items-center gap-2 bg-electric-blue hover:bg-primary text-background font-label-sm text-label-sm py-2 px-4 rounded transition-colors duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
            >
              <span class="material-symbols-outlined" style="font-size: 16px">add</span>
              Yeni Kapama
            </button>
          </div>
        </div>

        <!-- KPI Kartları -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            class="bg-surface-container border border-outline-technical rounded p-4 flex flex-col gap-2 relative overflow-hidden group hover:border-outline-variant transition-colors"
          >
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors" />
            <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Aktif Kapamalar</span>
            <div class="flex items-baseline gap-2">
              <span class="font-display text-display text-primary">{{ activeCount }}</span>
              <span class="font-label-sm text-label-sm text-electric-blue flex items-center">
                <span class="material-symbols-outlined" style="font-size: 14px">arrow_upward</span> Denizli Bölgesi
              </span>
            </div>
          </div>
          <div
            class="bg-surface-container border border-outline-technical rounded p-4 flex flex-col gap-2 relative overflow-hidden group hover:border-outline-variant transition-colors"
          >
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-error/5 rounded-full blur-xl group-hover:bg-error/10 transition-colors" />
            <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">AI Güven Skoru</span>
            <div class="flex items-baseline gap-2">
              <span class="font-display text-display text-on-background">94%</span>
              <span class="font-label-sm text-label-sm text-on-surface-variant">Aktifler Ortalaması</span>
            </div>
          </div>
          <div
            class="bg-surface-container border border-outline-technical rounded p-4 flex flex-col gap-2 relative overflow-hidden group hover:border-outline-variant transition-colors"
          >
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-tertiary/5 rounded-full blur-xl group-hover:bg-tertiary/10 transition-colors" />
            <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Son Senkronizasyon</span>
            <div class="flex items-baseline gap-2">
              <span class="font-display text-display text-on-background tabular-nums">15:05</span>
              <span class="font-label-sm text-label-sm text-on-surface-variant">UTC+3</span>
            </div>
          </div>
        </div>

        <!-- Veri Tablosu -->
        <div class="bg-surface-container border border-outline-technical rounded overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex flex-col">
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
                  <th class="py-3 px-4 font-medium whitespace-nowrap text-center">AI İnc.</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap">AI Lok. Tipi</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap">AI Sorgusu</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap">Geocode Result (JSON)</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap">Koordinat (GeoJSON)</th>
                  <th class="py-3 px-4 font-medium whitespace-nowrap">Oluşturulma</th>
                </tr>
              </thead>
              <tbody class="font-data-tabular text-data-tabular text-on-background divide-y divide-outline-technical/50">
                <tr v-for="c in closures" :key="c.id" class="hover:bg-surface-bright/50 transition-colors group">
                  <td class="py-3 px-4 sticky left-0 z-10 bg-surface-container group-hover:bg-surface-bright/50 border-r border-outline-technical text-center text-on-surface-variant">{{ c.id }}</td>
                  <td class="py-3 px-4 truncate max-w-[250px]" :title="c.guzergah">{{ c.guzergah }}</td>
                  <td class="py-3 px-4 whitespace-nowrap text-on-surface-variant">{{ c.tarih }}</td>
                  <td class="py-3 px-4 truncate max-w-[250px]" :title="c.neden">{{ c.neden }}</td>
                  <td class="py-3 px-4">{{ c.ilce }}</td>
                  <td class="py-3 px-4">{{ c.mahalle }}</td>
                  <td class="py-3 px-4 text-center">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] uppercase font-bold tracking-wider border"
                      :class="c.aktif
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-surface-variant text-on-surface-variant border-outline-variant'"
                    >{{ c.aktif ? 'Evet' : 'Hayır' }}</span>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <span
                      v-if="c.aiInceleme"
                      class="inline-flex items-center justify-center w-5 h-5 rounded-sm bg-electric-blue/20 text-electric-blue"
                    >
                      <span class="material-symbols-outlined" style="font-size: 14px">check</span>
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <span class="px-2 py-1 bg-surface-variant rounded text-[11px] border border-outline-variant">{{ c.aiLokasyonTipi }}</span>
                  </td>
                  <td class="py-3 px-4">{{ c.aiSorgusu }}</td>
                  <td class="py-3 px-4">
                    <div class="json-viewer text-outline font-mono text-[11px]" :title="JSON.stringify(c.geocodeResult)">
                      {{ c.geocodeSummary }}
                    </div>
                  </td>
                  <td class="py-3 px-4">
                    <div class="json-viewer text-outline font-mono text-[11px]" :title="JSON.stringify(c.koordinat)">
                      {{ c.koordinatSummary }}
                    </div>
                  </td>
                  <td class="py-3 px-4 text-on-surface-variant whitespace-nowrap">{{ c.olusturulma }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Sayfalama -->
          <div class="px-4 py-3 border-t border-outline-technical bg-surface-container-highest flex items-center justify-between">
            <span class="font-label-sm text-label-sm text-on-surface-variant">{{ closures.length }} sonuçtan 1-{{ closures.length }} gösteriliyor</span>
            <div class="flex items-center gap-2">
              <button
                class="w-8 h-8 flex items-center justify-center rounded border border-outline-technical text-on-surface-variant hover:bg-surface-variant hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled
              >
                <span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span>
              </button>
              <button class="w-8 h-8 flex items-center justify-center rounded border border-outline-technical bg-surface-variant text-primary font-label-sm text-label-sm">1</button>
              <button
                class="w-8 h-8 flex items-center justify-center rounded border border-outline-technical text-on-surface-variant hover:bg-surface-variant hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled
              >
                <span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
