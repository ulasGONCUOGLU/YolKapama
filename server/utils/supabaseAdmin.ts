import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// DİKKAT: Bu dosya server/ altında olduğu için Nuxt tarafından asla
// tarayıcı bundle'ına dahil edilmez. service_role anahtarı RLS'i atlar,
// bu yüzden sadece burada (server/api/*.ts içinden) kullanılmalı.
let adminClient: SupabaseClient | null = null

export function useSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient

  const config = useRuntimeConfig()

  if (!config.public.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error(
      'Supabase servis yapılandırması eksik: NUXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env dosyasını kontrol et)'
    )
  }

  adminClient = createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false }
  })

  return adminClient
}
