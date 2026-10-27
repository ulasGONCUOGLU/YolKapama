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

// Duyurudaki tek bir yol/sokak parçasının konum sonucu (Python: konum.ParcaSonucu).
// kesin      = istenen parça (kesişimden kesişime / tam yol / adres) bulundu
// yaklasik   = yalnızca yolun tamamı ya da şüpheli eşleşme bulundu
// bulunamadi = hiçbir sonuç yok (geometry null)
export interface GeocodeParca {
  etiket: string
  location_type: string
  kesinlik: 'kesin' | 'yaklasik' | 'bulunamadi'
  uyari: string | null
  baglanan_sokaklar: boolean
  geometry: ClosureGeometry | null
}

// "Bağlanan sokaklar" için yaklaşık etkilenen bölge (daire)
export interface EtkilenenAlan {
  lat: number
  lon: number
  radius_m: number
}

export interface GeocodeResult {
  latitude: number
  longitude: number
  display_name: string
  tam_eslesme: boolean
  uyari: string | null
  kaynak: string
  // Çok parçalı duyurular (eski kayıtlarda yok)
  parcalar?: GeocodeParca[]
  bulunan?: number
  toplam?: number
  etkilenen_alanlar?: EtkilenenAlan[]
}

// GeoJSON: Point, LineString, MultiLineString, Polygon... ya da GeometryCollection
export interface ClosureGeometry {
  type: string
  coordinates?: unknown
  geometries?: ClosureGeometry[]
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

  geometry_type: string | null
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

// Tam konumu bulunamayan ama mahalle merkezi bilinen aktif kapamalar.
// Aynı mahalledeki kapamalar tek bir "yaklaşık bölge" olarak gruplanır.
export interface ApproxArea {
  key: string
  label: string
  lat: number
  lng: number
  items: Closure[]
}

// Sinyalize kavşak (tablo: public.kavsaklar, kaynak: supabase/kavsaklar.sql)
export interface Kavsak {
  kod: string
  ad: string
  bolge: string
  tkm_bagli: boolean
  butonlu: boolean
  adaptif: boolean
  durum: string
  mod: string | null
  model: string | null
  iletisim: string | null
  yapim_tarihi: string | null
  elektrik_abone_no: string | null
  aciklama: string | null
  latitude: number
  longitude: number
}

export type HaritaAltlik = 'harita' | 'uydu' | 'karma'
