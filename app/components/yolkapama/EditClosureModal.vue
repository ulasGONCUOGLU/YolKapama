<script setup lang="ts">
import type { Closure } from '~/types/closure'

const props = defineProps<{ closure: Closure }>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', updated: Closure): void
}>()

const form = reactive({
  guzergah_raw: props.closure.guzergah_raw,
  kapanma_nedeni_raw: props.closure.kapanma_nedeni_raw,
  ilce: props.closure.ilce ?? '',
  mahalle: props.closure.mahalle ?? '',
  start_date: props.closure.start_date ?? '',
  end_date: props.closure.end_date ?? '',
  active: props.closure.active
})

const saving = ref(false)
const error = ref('')

async function kaydet() {
  saving.value = true
  error.value = ''

  try {
    const updated = await $fetch<Closure>(`/api/yolkapama/kapama/${props.closure.id}`, {
      method: 'PATCH',
      body: {
        guzergah_raw: form.guzergah_raw,
        kapanma_nedeni_raw: form.kapanma_nedeni_raw,
        ilce: form.ilce || null,
        mahalle: form.mahalle || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        active: form.active
      }
    })

    emit('saved', updated)
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'Kaydedilemedi.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4"
    @click.self="emit('close')"
  >
    <div class="bg-surface-container border border-outline-technical rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.5)] w-full max-w-lg max-h-[90vh] overflow-y-auto p-gutter flex flex-col gap-4">
      <div class="flex items-center justify-between border-b border-outline-technical pb-2">
        <h2 class="font-headline-md text-headline-md text-on-surface">Kapamayı Düzenle</h2>
        <button class="text-on-surface-variant hover:text-primary transition-colors" @click="emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label class="font-label-sm text-label-sm text-on-surface-variant uppercase">Güzergah</label>
          <input
            v-model="form.guzergah_raw"
            type="text"
            class="bg-background border border-outline-technical rounded text-on-surface font-body-md text-body-md px-3 py-2 focus:outline-none focus:border-electric-blue focus:ring-1 focus:ring-electric-blue"
          >
        </div>

        <div class="flex flex-col gap-1">
          <label class="font-label-sm text-label-sm text-on-surface-variant uppercase">Kapanma Nedeni</label>
          <textarea
            v-model="form.kapanma_nedeni_raw"
            rows="2"
            class="bg-background border border-outline-technical rounded text-on-surface font-body-md text-body-md px-3 py-2 focus:outline-none focus:border-electric-blue focus:ring-1 focus:ring-electric-blue resize-y"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="font-label-sm text-label-sm text-on-surface-variant uppercase">İlçe</label>
            <input
              v-model="form.ilce"
              type="text"
              class="bg-background border border-outline-technical rounded text-on-surface font-body-md text-body-md px-3 py-2 focus:outline-none focus:border-electric-blue focus:ring-1 focus:ring-electric-blue"
            >
          </div>
          <div class="flex flex-col gap-1">
            <label class="font-label-sm text-label-sm text-on-surface-variant uppercase">Mahalle</label>
            <input
              v-model="form.mahalle"
              type="text"
              class="bg-background border border-outline-technical rounded text-on-surface font-body-md text-body-md px-3 py-2 focus:outline-none focus:border-electric-blue focus:ring-1 focus:ring-electric-blue"
            >
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="font-label-sm text-label-sm text-on-surface-variant uppercase">Başlangıç</label>
            <input
              v-model="form.start_date"
              type="date"
              class="bg-background border border-outline-technical rounded text-on-surface font-data-tabular text-data-tabular px-3 py-2 focus:outline-none focus:border-electric-blue focus:ring-1 focus:ring-electric-blue"
            >
          </div>
          <div class="flex flex-col gap-1">
            <label class="font-label-sm text-label-sm text-on-surface-variant uppercase">Bitiş</label>
            <input
              v-model="form.end_date"
              type="date"
              class="bg-background border border-outline-technical rounded text-on-surface font-data-tabular text-data-tabular px-3 py-2 focus:outline-none focus:border-electric-blue focus:ring-1 focus:ring-electric-blue"
            >
          </div>
        </div>

        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="form.active" type="checkbox" class="w-4 h-4 rounded-sm accent-electric-blue">
          <span class="font-body-md text-body-md text-on-surface">Aktif</span>
        </label>
      </div>

      <div v-if="error" class="text-error font-body-md text-body-md">{{ error }}</div>

      <div class="flex justify-end gap-2 pt-2 border-t border-outline-technical">
        <button
          class="border border-outline-technical hover:bg-surface-variant text-on-surface font-label-sm text-label-sm px-4 py-2 rounded transition-colors"
          @click="emit('close')"
        >
          İptal
        </button>
        <button
          class="bg-electric-blue text-on-primary font-label-sm text-label-sm px-4 py-2 rounded shadow-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
          :disabled="saving"
          @click="kaydet"
        >
          {{ saving ? 'Kaydediliyor...' : 'Kaydet' }}
        </button>
      </div>
    </div>
  </div>
</template>
