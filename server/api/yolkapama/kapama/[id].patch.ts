// PATCH /api/yolkapama/kapama/:id
//
// Tablo sayfasındaki düzenleme modalının "Kaydet" işlemi. closures
// tablosuna sadece service_role yazabildiği için bu işlem sunucu
// tarafından yapılıyor (tarayıcıdan doğrudan yazma yok).
//
// Sadece belirli (whitelist) alanlar güncellenebilir: id, record_hash,
// ai_*, geocode_*, geometry gibi pipeline'ın kendi ürettiği/hesapladığı
// alanlara buradan dokunulmuyor - bunlar sadece Python tarafından yazılır.

interface Body {
  guzergah_raw?: string
  kapanma_nedeni_raw?: string
  ilce?: string | null
  mahalle?: string | null
  start_date?: string | null
  end_date?: string | null
  active?: boolean
}

const EDITABLE_FIELDS: (keyof Body)[] = [
  'guzergah_raw',
  'kapanma_nedeni_raw',
  'ilce',
  'mahalle',
  'start_date',
  'end_date',
  'active'
]

export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!idParam || Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Geçersiz id.' })
  }

  const body = await readBody<Body>(event)

  const payload: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (field in body) payload[field] = body[field]
  }

  if (Object.keys(payload).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Güncellenecek alan yok.' })
  }

  payload.updated_at = new Date().toISOString()

  const supabase = useSupabaseAdmin()

  try {
    const { data, error } = await supabase
      .from('closures')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw createError({ statusCode: 500, statusMessage: error.message })
    }

    return data
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 502,
      statusMessage: 'Supabase\'e ulaşılamadı.'
    })
  }
})
