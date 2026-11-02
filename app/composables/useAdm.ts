// ADM (Aydem) planlı çalışmaları: ekranlar arasında ortak yardımcılar.
//
// Tüm saatler Türkiye saatiyle (Europe/Istanbul) gösterilir; tarayıcının saat
// dilimi ne olursa olsun ADM'nin duyurduğu saat aynı görünür.

import type { AdmCalisma, AdmDurumKodu, KavsakUyari } from '~/types/closure'

const TZ = 'Europe/Istanbul'

const gunFormat = new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' })
const gunKisaFormat = new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, day: 'numeric', month: 'short' })
const gunAdiFormat = new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, weekday: 'short' })
const saatFormat = new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
const anahtarFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }) // YYYY-MM-DD

export const ADM_DURUM: Record<AdmDurumKodu, { label: string; class: string }> = {
  planlandi: { label: 'Planlandı', class: 'bg-primary/10 text-primary border-primary/30' },
  devam_ediyor: { label: 'Devam ediyor', class: 'bg-[#a855f7]/20 text-[#a855f7] border-[#a855f7]/40' },
  tamamlandi: { label: 'Tamamlandı', class: 'bg-surface-variant text-on-surface-variant border-outline-variant' },
  iptal: { label: 'İptal edildi', class: 'bg-error/15 text-error border-error/30' },
  bilinmiyor: { label: 'Bilinmiyor', class: 'bg-surface-variant text-on-surface-variant border-outline-variant' }
}

export function admGunSaat(iso: string | null): { gun: string; saat: string } {
  if (!iso) return { gun: '—', saat: '—' }
  const d = new Date(iso)
  return { gun: gunFormat.format(d), saat: saatFormat.format(d) }
}

// "30 Eki 2026 Cum" ya da çok günlü ise "30 Eki – 1 Kas 2026"
export function admTarih(c: Pick<AdmCalisma, 'planlanan_baslangic' | 'planlanan_bitis'>): string {
  if (!c.planlanan_baslangic) return '—'
  const bas = new Date(c.planlanan_baslangic)
  const bit = c.planlanan_bitis ? new Date(c.planlanan_bitis) : null
  if (!bit || anahtarFormat.format(bas) === anahtarFormat.format(bit)) {
    return `${gunFormat.format(bas)} ${gunAdiFormat.format(bas)}`
  }
  return `${gunKisaFormat.format(bas)} – ${gunFormat.format(bit)}`
}

// "09:00 – 15:00"
export function admSaat(c: Pick<AdmCalisma, 'planlanan_baslangic' | 'planlanan_bitis'>): string {
  const bas = c.planlanan_baslangic ? saatFormat.format(new Date(c.planlanan_baslangic)) : '?'
  const bit = c.planlanan_bitis ? saatFormat.format(new Date(c.planlanan_bitis)) : '?'
  return `${bas} – ${bit}`
}

export function admSaatTek(iso: string | null): string {
  return iso ? saatFormat.format(new Date(iso)) : '—'
}

// Henüz bitmemiş (planlı ya da devam eden), ADM'nin listesinde hâlâ olan çalışma.
// Bitiş saatinden 6 saat sonrasına kadar "güncel" sayılır (ADM kapatmayı geciktirebilir).
export function admGuncelMi(c: AdmCalisma, simdi = Date.now()): boolean {
  if (c.kaynaktan_kalkti) return false
  if (c.durum_kodu !== 'planlandi' && c.durum_kodu !== 'devam_ediyor') return false
  if (!c.planlanan_bitis) return true
  return new Date(c.planlanan_bitis).getTime() + 6 * 3600_000 >= simdi
}

// Haritada çizilsin mi? Güncel + şehir içinde + alanı var; varsayılan olarak yalnızca
// sinyalize kavşağı etkileyenler, "hepsi" açıksa diğerleri de.
export function admHaritadaMi(c: AdmCalisma, hepsi: boolean, simdi = Date.now()): boolean {
  if (!c.geometry || !c.sehir_ici || !admGuncelMi(c, simdi)) return false
  return hepsi || c.kavsak_sayisi > 0
}

export function admYeniMi(c: AdmCalisma, simdi = Date.now()): boolean {
  return simdi - new Date(c.ilk_gorulme).getTime() < 24 * 3600_000
}

// Kavşak kodu -> o kavşağı etkileyebilecek güncel çalışmalar (haritada uyarı için)
export function admKavsakUyarilari(liste: AdmCalisma[], simdi = Date.now()): Record<string, KavsakUyari[]> {
  const sonuc: Record<string, KavsakUyari[]> = {}
  // Erken tarihli çalışma önce gelsin
  const sirali = [...liste].sort((a, b) => (a.planlanan_baslangic ?? '').localeCompare(b.planlanan_baslangic ?? ''))
  for (const c of sirali) {
    if (!admGuncelMi(c, simdi) || !c.kavsak_sayisi) continue
    for (const k of c.etkilenen_kavsaklar) {
      ;(sonuc[k.kod] ??= []).push({
        id: c.kesinti_id,
        tarih: admTarih(c),
        saat: admSaat(c),
        neden: c.neden ?? '',
        mahalleler: c.mahalleler.join(', '),
        iliski: k.iliski,
        mesafe_m: k.mesafe_m,
        devam_ediyor: c.durum_kodu === 'devam_ediyor'
      })
    }
  }
  return sonuc
}

// Supabase'ten çekerken kullanılan sütunlar (ham JSON'u çekmeyiz: büyük)
export const ADM_SUTUNLAR =
  'kesinti_id,durum,durum_kodu,sehir,ilce,mahalleler,sokaklar,mahalle_sokak,neden,planlanan_baslangic,planlanan_bitis,' +
  'gerceklesen_baslangic,gerceklesen_bitis,geometry,geometry_turu,geometry_kaynak,merkez_lat,merkez_lon,sehir_ici,' +
  'etkilenen_kavsaklar,kavsak_sayisi,onceki_plan,kaynaktan_kalkti,ilk_gorulme,son_gorulme,updated_at'

export function admTabloYokMu(error: { code?: string; message?: string } | null): boolean {
  return !!error && /relation|does not exist|schema cache|42P01|PGRST205/i.test(`${error.code} ${error.message}`)
}
