import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Modül seviyesinde tek bir client örneği tutulur (her çağrıda yeniden
// oluşturmamak için). Bu client SADECE anon/public key kullanır —
// RLS politikaları (bkz. supabase_schema_update.sql) hangi tabloların
// tarayıcıdan okunabileceğini belirler (closures, sync_runs: okunabilir;
// settings: okunamaz, o yüzden Ayarlar sayfası server/api üzerinden gider).
let client: SupabaseClient | null = null

export function useSupabase(): SupabaseClient {
  if (client) return client

  const config = useRuntimeConfig()

  if (!config.public.supabaseUrl || !config.public.supabaseAnonKey) {
    throw new Error(
      'Supabase yapılandırması eksik: NUXT_PUBLIC_SUPABASE_URL / NUXT_PUBLIC_SUPABASE_ANON_KEY (.env dosyasını kontrol et)'
    )
  }

  client = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey)

  return client
}
