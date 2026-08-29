// POST /api/yolkapama/calistir
//
// "Verileri Çek" butonu bu route'u çağırır. Bu route, Flask'ın /run
// endpoint'ine paylaşılan gizli anahtarla (INTERNAL_API_TOKEN) istek
// atar. Anahtar tarayıcıya asla sızmaz çünkü bu kod sadece sunucuda
// çalışır (server/ dizini).
//
// Flask isteği hemen yanıtlar (pipeline arka planda dakikalarca
// sürebilir), bu yüzden burası da beklemeden run_id'yi döner.
// Frontend, sync_runs tablosunu polling ile izleyerek ilerlemeyi takip
// eder (bkz. pages/yolkapama/index.vue).

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  if (!config.internalApiToken) {
    throw createError({
      statusCode: 500,
      statusMessage: 'INTERNAL_API_TOKEN sunucu tarafında tanımlı değil.'
    })
  }

  try {
    const response = await $fetch<{ status: string; run_id: number }>(
      `${config.pythonApiBase}/run`,
      {
        method: 'POST',
        headers: {
          'X-Internal-Token': config.internalApiToken
        }
      }
    )

    return response
  } catch (error: any) {
    // Flask'tan gelen hata (ör. 409 zaten çalışıyor, 401 yetkisiz)
    // veya Flask'a hiç ulaşılamaması (ör. henüz başlatılmamış) durumu.
    const statusCode = error?.response?.status ?? 502
    const message =
      error?.response?._data?.error ??
      'Python servisine ulaşılamadı. Flask çalışıyor mu? (python app.py)'

    throw createError({ statusCode, statusMessage: message })
  }
})
