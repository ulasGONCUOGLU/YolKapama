<script setup lang="ts">
// TODO: Görüntü İşleme modülü henüz geliştirilmedi.
// Bu modül büyüdükçe: pages/goruntuisleme/, components/goruntuisleme/,
// gerekirse layouts/goruntuisleme.vue ve assets/css/goruntuisleme.css
// oluşturularak yolkapama modülüyle aynı düzen izlenmeli.
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-4 p-margin-canvas text-center">
    <div
      class="w-14 h-14 rounded-full bg-surface-variant flex items-center justify-center border border-outline-variant"
    >
      <span class="material-symbols-outlined text-on-surface-variant text-[28px]">image_search</span>
    </div>
    <h1 class="font-headline-lg text-headline-lg text-on-surface">Görüntü İşleme</h1>
    <p class="font-body-md text-body-md text-on-surface-variant max-w-sm">
      Bu modül henüz geliştirilmedi.
    </p>
    <NuxtLink
      to="/"
      class="mt-4 flex items-center gap-2 border border-outline-technical hover:bg-surface-variant text-on-surface font-label-sm text-label-sm py-2 px-4 rounded transition-colors"
    >
      <span class="material-symbols-outlined text-[16px]">arrow_back</span>
      Modüllere dön
    </NuxtLink>
  </div>
</template>
