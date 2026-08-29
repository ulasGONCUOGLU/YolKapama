// Supabase closures/sync_runs tablolarının şekli.
// Şema: supabase_schema_update.sql (Python backend repo'sunda)

export interface AiResult {
  location_type?: string | null
  road_name?: string | null
  neighborhood?: string | null
  district?: string | null
  query?: string | null
  start_query?: string | null
  end_query?: string | null
  confidence?: number
  error?: string
}

export interface GeocodeResult {
  latitude: number
  longitude: number
  display_name: string
  tam_eslesme: boolean
  uyari: string | null
  kaynak: string
}

export interface ClosureGeometry {
  type: 'Point' | 'LineString'
  coordinates: number[] | number[][]
}

export interface Closure {
  id: number
  record_hash: string

  guzergah_raw: string
  tarih_raw: string
  kapanma_nedeni_raw: string

  ilce_mahalle_raw: string | null
  ilce: string | null
  mahalle: string | null

  start_date: string | null
  end_date: string | null
  active: boolean

  ai_status: 'pending' | 'success' | 'error'
  ai_location_type: string | null
  ai_neighborhood: string | null
  ai_district: string | null
  ai_query: string | null
  ai_start_query: string | null
  ai_end_query: string | null
  ai_result: AiResult | null

  geocode_status: 'pending' | 'success' | 'not_found'
  geocode_result: GeocodeResult | null

  geometry_type: 'Point' | 'LineString' | null
  geometry: ClosureGeometry | null

  created_at: string
  updated_at: string
}

export interface SyncRun {
  id: number
  durum: 'beklemede' | 'calisiyor' | 'basarili' | 'hata'
  baslangic: string | null
  bitis: string | null
  hata_mesaji: string | null
  olusturulma: string
}
