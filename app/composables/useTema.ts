// Tema tercihi (açık / koyu / sistem).
//
// Uygulamada oturum açma (kullanıcı hesabı) yok. Bu yüzden tercih sunucuda
// değil, HER KULLANICININ KENDİ TARAYICISINDA (localStorage) saklanır:
// biri açık temayı seçince diğer kullanıcıların ekranı değişmez.
// Supabase'deki "settings" tablosu ise herkes için ortaktır (AI talimatı);
// tema oraya yazılmamalıdır.
//
// Sayfa çizilmeden önce doğru tema uygulansın (beyaz/siyah yanıp sönme olmasın)
// diye nuxt.config.ts içindeki küçük bir <head> betiği aynı anahtarı okur.

export type Tema = 'acik' | 'koyu' | 'sistem'

export const TEMA_ANAHTARI = 'yk-tema'

export const TEMA_SECENEKLERI: { value: Tema; label: string; icon: string; aciklama: string }[] = [
  { value: 'acik', label: 'Açık Tema', icon: 'light_mode', aciklama: 'Açık renkli arayüz' },
  { value: 'koyu', label: 'Koyu Tema', icon: 'dark_mode', aciklama: 'Koyu renkli arayüz (varsayılan)' },
  { value: 'sistem', label: 'Sistem Ayarı', icon: 'contrast', aciklama: 'Cihazınızın temasını izler' }
]

export function useTema() {
  const tema = useState<Tema>('yk-tema', () => 'koyu')

  function uygula(t: Tema) {
    if (import.meta.client) document.documentElement.dataset.tema = t
  }

  // Tarayıcıda kayıtlı tercihi okur (localStorage kapalı/bozuksa varsayılan koyu kalır)
  function yukle() {
    if (!import.meta.client) return
    try {
      const kayit = localStorage.getItem(TEMA_ANAHTARI)
      if (kayit === 'acik' || kayit === 'koyu' || kayit === 'sistem') tema.value = kayit
    } catch {
      // yoksay
    }
    uygula(tema.value)
  }

  function sec(t: Tema) {
    tema.value = t
    uygula(t)
    try {
      localStorage.setItem(TEMA_ANAHTARI, t)
    } catch {
      // Kaydedilemese bile bu oturumda tema değişmiş olur
    }
  }

  return { tema, yukle, sec }
}
