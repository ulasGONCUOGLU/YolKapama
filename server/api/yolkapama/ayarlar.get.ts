// GET /api/yolkapama/ayarlar
//
// settings tablosunun RLS'inde HİÇ policy yok (bkz. supabase_schema
// SQL'i) - yani anon/authenticated ile ne okunabilir ne yazılabilir.
// Bu route service_role ile okuyup tarayıcıya sadece ihtiyaç duyulan
// alanı döner.
//
// useSupabaseAdmin() server/utils/ altında olduğu için Nitro tarafından
// otomatik import edilir, elle import etmeye gerek yok.

export default defineEventHandler(async () => {
  const supabase = useSupabaseAdmin()

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'system_prompt')
      .maybeSingle()

    if (error) {
      throw createError({ statusCode: 500, statusMessage: error.message })
    }

    return {
      systemPrompt: data?.value ?? ''
    }
  } catch (error: any) {
    if (error?.statusCode) throw error // zaten createError ile üretilmiş
    throw createError({
      statusCode: 502,
      statusMessage: 'Supabase\'e ulaşılamadı. NUXT_PUBLIC_SUPABASE_URL doğru mu?'
    })
  }
})
