// POST /api/yolkapama/ayarlar
//
// Ayarlar sayfasındaki "Kaydet" butonu bu route'u çağırır.
// settings tablosuna sadece service_role yazabildiği için bu işlem
// tarayıcıdan değil, sunucudan yapılmak zorunda.
//
// useSupabaseAdmin() server/utils/ altında olduğu için Nitro tarafından
// otomatik import edilir, elle import etmeye gerek yok.

interface Body {
  systemPrompt?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)

  const systemPrompt = (body?.systemPrompt ?? '').trim()

  if (!systemPrompt) {
    throw createError({ statusCode: 400, statusMessage: 'systemPrompt boş olamaz.' })
  }

  const supabase = useSupabaseAdmin()

  try {
    const { error } = await supabase
      .from('settings')
      .update({ value: systemPrompt, updated_at: new Date().toISOString() })
      .eq('key', 'system_prompt')

    if (error) {
      throw createError({ statusCode: 500, statusMessage: error.message })
    }

    return { ok: true }
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 502,
      statusMessage: 'Supabase\'e ulaşılamadı. NUXT_PUBLIC_SUPABASE_URL doğru mu?'
    })
  }
})
