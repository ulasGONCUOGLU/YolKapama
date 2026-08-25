<script setup lang="ts">
// TODO: Gerçek harita entegrasyonu (ör. MapLibre GL) burada kurulacak.
// Şimdilik Stitch mockup'ındaki statik görsel yer tutucu korunuyor.
const mapImageUrl =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAwy2DtexADOraiXI5fa2MR_aFYy9flewqtXoqfsIl74Ts1bHrVE0IUayw75g-d6R60gBpEYAkb6PELGHOayFKQPDHlgn3nvW5SgJfZ85BEMDz3lFWN1DgfbB8sj_x-GSqhTsr3iEIkzEm5Hzx752_Kr_4k05NnJJFf2RJ3D-V-OlJ7da2KPT-UufLlRsFkRMpNT7nJ1HcpWlsGQ4VAGp7GEBew5_df1jMFMz-xKRkYRiavr4nAp7Q'

const coords = reactive({
  lat: '41.0082° N',
  lng: '28.9784° E'
})

function verileriCek() {
  // TODO: Backend endpoint bağlanacak (yol kapamalarını yeniden çek)
  console.log('Veri çekme tetiklendi')
}
</script>

<template>
  <main class="flex-1 flex flex-col h-screen relative bg-surface-dim overflow-hidden">
    <AppHeader show-search centered search-placeholder="Search coordinates, sectors..." />

    <!-- Harita Alanı -->
    <div class="flex-1 w-full relative z-0">
      <div
        class="w-full h-full bg-surface-container-low"
        :style="{ backgroundImage: `url('${mapImageUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }"
      />

      <!-- Harita HUD Katmanı -->
      <div class="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
        <!-- Sağ üst: Verileri Çek butonu -->
        <div class="w-full flex justify-end">
          <button
            class="pointer-events-auto bg-electric-blue text-[#000000] font-label-sm text-label-sm font-bold px-6 py-2.5 rounded shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-[#ffffff20] hover:bg-primary-fixed transition-colors flex items-center gap-2 uppercase tracking-widest"
            @click="verileriCek"
          >
            <span class="material-symbols-outlined text-[16px]">download</span>
            Verileri Çek
          </button>
        </div>

        <!-- Alt: koordinat okuması + zoom kontrolleri -->
        <div class="w-full flex justify-between items-end">
          <div
            class="bg-surface-container-highest border border-outline-technical px-3 py-1.5 rounded flex gap-4 pointer-events-auto shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          >
            <div class="flex flex-col">
              <span class="font-label-sm text-[10px] text-on-surface-variant uppercase">Lat</span>
              <span class="font-data-tabular text-data-tabular text-primary">{{ coords.lat }}</span>
            </div>
            <div class="w-px bg-outline-technical" />
            <div class="flex flex-col">
              <span class="font-label-sm text-[10px] text-on-surface-variant uppercase">Lng</span>
              <span class="font-data-tabular text-data-tabular text-primary">{{ coords.lng }}</span>
            </div>
          </div>

          <div class="flex flex-col gap-2 pointer-events-auto">
            <button
              class="bg-surface-container-highest border border-outline-technical w-10 h-10 flex items-center justify-center rounded hover:bg-surface-variant transition-colors text-on-surface"
            >
              <span class="material-symbols-outlined">add</span>
            </button>
            <button
              class="bg-surface-container-highest border border-outline-technical w-10 h-10 flex items-center justify-center rounded hover:bg-surface-variant transition-colors text-on-surface"
            >
              <span class="material-symbols-outlined">remove</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
