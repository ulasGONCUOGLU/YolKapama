# Ops Console (Operations Command)

Denizli yol kapatma duyurularını izleyen operasyon paneli. Stitch (withgoogle) mockup'larından Nuxt 4'e taşındı, modüler yapıya geçirildi.

## Kurulum

```bash
npm install
npm run dev
```

`http://localhost:3000` adresinde açılır.

## Modüler yapı

Uygulama bir **modül seçim ekranı** (`/`) üzerinden modüllere ayrılıyor. Her modül kendi `pages/`, `components/`, gerekirse `layouts/` ve `assets/css/` dosyalarına sahip.

```
app/
  pages/
    index.vue                 → "/" — Modül seçim ekranı (Yol Kapama / Görüntü İşleme)

    yolkapama/                → Yol Kapama modülü
      index.vue                 "/yolkapama"         — harita (Leaflet + konum arama)
      tablo.vue                 "/yolkapama/tablo"   — yol kapamalar veri tablosu
      ayarlar.vue                "/yolkapama/ayarlar" — AI sistem talimatı + tema ayarları

    goruntuisleme/             → Görüntü İşleme modülü (henüz boş, yer tutucu)
      index.vue                 "/goruntuisleme"

  components/
    yolkapama/                 → Sadece Yol Kapama modülünün kullandığı bileşenler
      AppSidebar.vue             Sol nav — modül içi rotalara göre aktif vurgulama + "Modüllere dön" ikonu
      AppHeader.vue              Üst app bar
      OpsMap.client.vue          Gerçek Leaflet haritası (client-only)

  layouts/
    default.vue                 → Sidebar'sız minimal layout (seçim ekranı + boş modüller için)
    yolkapama.vue                → Sidebar + içerik layout'u (sadece Yol Kapama sayfaları kullanır)

  assets/css/
    main.css                    → Global stiller: Tailwind, fontlar/ikonlar, scrollbar
    yolkapama.css                → Sadece Yol Kapama modülüne özel stiller (`.json-viewer` vb.),
                                    yalnızca `layouts/yolkapama.vue` tarafından import edilir
```

### Yeni bir modül eklerken

`goruntuisleme` modülü geliştirilmeye başlanınca aynı düzeni izleyin:

1. `app/pages/goruntuisleme/` altına gerekli sayfaları ekleyin.
2. Modüle özel bileşenler için `app/components/goruntuisleme/` klasörü açın ve `nuxt.config.ts` içindeki `components` dizisine `{ path: '~/components/goruntuisleme', pathPrefix: false }` satırını ekleyin.
3. Sidebar/header gibi ortak bir kabuk gerekiyorsa `app/layouts/goruntuisleme.vue` oluşturun ve o modülün sayfalarında `definePageMeta({ layout: 'goruntuisleme' })` kullanın.
4. Modüle özel CSS gerekiyorsa `app/assets/css/goruntuisleme.css` açın ve ilgili layout'un `<script setup>` kısmında `import '~/assets/css/goruntuisleme.css'` ile bağlayın.

### Bileşen isimlendirme notu

`nuxt.config.ts` içinde `components: [{ path: '~/components/yolkapama', pathPrefix: false }]` tanımlandığı için `AppSidebar`, `AppHeader`, `OpsMap` bileşenleri klasör öneki almadan (`<AppSidebar />` gibi) kullanılabiliyor. Yeni bir modül klasörü eklerken aynı `pathPrefix: false` ayarını unutmayın, aksi halde Nuxt bileşenleri örn. `<GoruntuislemeAppSidebar>` gibi otomatik önekli isimlendirir.

## Harita (Leaflet) — Yol Kapama modülü

`app/components/yolkapama/OpsMap.client.vue`, `.client.vue` uzantısı sayesinde yalnızca tarayıcıda çalışır (Nuxt sunucu tarafında hiç bundle etmez, bu yüzden SSR'da `window` hatası oluşmaz).

- Harita zemini (sağ üstteki **Katmanlar** panelinden seçilir, seçim tarayıcıda hatırlanır):
  - **Harita:** OpenStreetMap (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) — ücretsiz, API anahtarı gerekmez.
  - **Uydu:** Esri World Imagery (ücretsiz, atıf gerekir; ticari/yoğun kullanımda Esri koşullarını kontrol edin).
  - **Karma:** uydu görüntüsü + yol ve yer adı etiketleri (Esri Reference katmanları).
- **Sinyalize kavşaklar** (Katmanlar panelinde aç/kapa): `public.kavsaklar` tablosundan okunur, haritada trafik ışığı simgeleriyle gösterilir (pasif kavşakta lambalar gri; simge zoom'a göre büyür/küçülür); noktaya tıklayınca mod, adaptif/butonlu, iletişim gibi bilgiler açılır. Tablo `supabase/kavsaklar.sql` ile kurulur ve doldurulur (ayrıntı aşağıda).
- Varsayılan merkez: Denizli (37.7765, 29.0864), zoom 13.
- Sol alt: harita hareket ettikçe güncellenen Enlem/Boylam okuması (`center-changed` event'i ile).
- Sağ alt: `+` / `−` butonları `map.zoomIn()` / `map.zoomOut()` çağırır.
- Üst arama kutusu: **yazdıkça** öneri verir (en az 2 harf, 350 ms bekletmeyle): önce tarayıcıdaki veriden sinyalize kavşaklar ve aktif kapamalar (anında), ardından **Photon** (OSM tabanlı, "yazdıkça arama" için tasarlanmış geocoder) ile yer adları gelir (`server/api/yolkapama/oneri.get.ts`: önbellekli, saniyede en fazla ~4 istek, en az 3 harf). Seçilen kavşağa/kapamaya/yere harita uçar. **Enter** (ya da büyüteç) **Nominatim** ile tam arama yapar (`arama.get.ts`). Halka açık photon.komoot.io "adil kullanım" esaslıdır, SLA yoktur; yoğun kullanımda kendi Photon sunucunuzu kurup `NUXT_PHOTON_URL` ile adresini verin. Nominatim halka açık sunucusu harf harf aramayı yasakladığı için canlı öneri onunla yapılmaz.

> **OSM kullanım politikaları:**
> - [Nominatim politikası](https://operations.osmfoundation.org/policies/nominatim/): saniyede en fazla 1 istek (tüm kullanıcılar toplamı), tanıtıcı `User-Agent`, önbellekleme zorunlu; istemci tarafında otomatik tamamlama yasak. Yoğun kullanımda kendi Nominatim/Photon sunucunuza geçin ve `NUXT_NOMINATIM_URL` ile adresini verin.
> - [Tile politikası](https://operations.osmfoundation.org/policies/tiles/): `tile.openstreetmap.org` "en iyi çaba" esasıyla çalışır, SLA yoktur ve önceden haber vermeden engellenebilir. Yoğun/ticari kullanımda barındırılan bir tile sağlayıcısına veya kendi tile sunucunuza geçin.
> - Arama proxy'sinin önbelleği ve hız sınırı tek sunucu işlemi içindir; birden fazla instance çalıştırırsanız ortak önbelleğe (ör. Redis) taşıyın.

## Backend entegrasyonu (Supabase + Flask)

### 1) Supabase şemasını kurun

`supabase/schema.sql` dosyasını Supabase Dashboard → SQL Editor'e yapıştırıp çalıştırın (`closures`, `sync_runs`, `settings` tabloları, RLS policy'leri ve `refresh_active_status()` fonksiyonu). Dosya tekrar çalıştırılabilir; hiçbir tabloyu silmez.

### 1b) Sinyalize kavşakları yükleyin (isteğe bağlı)

`supabase/kavsaklar.sql` dosyasını SQL Editor'de bir kez çalıştırın: `kavsaklar` tablosunu (tarayıcıya yalnız okuma izniyle) oluşturur ve KMZ'deki 142 kavşağı ekler. Tekrar çalıştırmak güvenlidir (`kod` üzerinden günceller, çift kayıt oluşturmaz). Enlem ve boylam ayrı sütunlardadır. Yeni kavşak eklemek için aynı dosyadaki `values` listesine bir satır ekleyip yeniden çalıştırın.

### 2) Ortam değişkenleri

`.env.example` dosyasını `.env` olarak kopyalayıp doldurun:

```bash
cp .env.example .env
```

> **Önemli:** Nuxt sunucu ayarlarını yalnızca **`NUXT_` önekli** ortam değişkenlerinden okur. Öneksiz isimler (`SUPABASE_SERVICE_ROLE_KEY` gibi) görmezden gelinir.

Doldurman gereken alanlar:
- `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase Dashboard → Project Settings → API (anon/public anahtar, tarayıcıda kullanımı güvenli)
- `NUXT_SUPABASE_SERVICE_ROLE_KEY` — aynı sayfadaki service_role/secret anahtar. **Asla** `NUXT_PUBLIC_` öneki almamalı, asla tarayıcıya sızmamalı.
- `NUXT_PYTHON_API_BASE` — Flask'ın adresi. Yerelde varsayılan `http://127.0.0.1:5000` zaten Python backend'in `app.py`'sindeki `127.0.0.1:5000` ile eşleşir.
- `NUXT_INTERNAL_API_TOKEN` — Python backend'in `.env`'indeki **aynı** değer.
- `NUXT_NOMINATIM_USER_AGENT` — OSM politikası için uygulama kimliği (öneri: iletişim e-postası içersin).
- `NUXT_NOMINATIM_URL` — (isteğe bağlı) kendi Nominatim sunucunuzun adresi.

### Tema (açık / koyu / sistem)

Ayarlar sayfasından seçilir. Oturum açma olmadığı için tercih **her kullanıcının kendi tarayıcısında** (`localStorage`, anahtar `yk-tema`) saklanır; birinin seçimi diğerlerini etkilemez, başka cihazda yeniden seçilmesi gerekir. Renkler `app/assets/css/tema.css` içindeki CSS değişkenlerinden gelir (Tailwind renkleri bu değişkenlere bağlıdır); yeni bir tema eklemek için aynı dosyaya bir `:root[data-tema='...']` bloğu eklemek yeterlidir. İleride kullanıcı hesapları eklenirse tercih kullanıcı profiline taşınabilir. Supabase'deki `settings` tablosu herkes için ortaktır, tema oraya yazılmamalıdır.

### 3) Giriş (kimlik doğrulama) yok — dikkat

Bu örnek sürümde kullanıcı girişi yoktur. "Verileri Çek" butonu ve "Ayarlar" sayfası, uygulamaya erişebilen **herkese** açıktır. "Verileri Çek" Gemini/Nominatim maliyeti doğurur, "Ayarlar" ise AI sistem talimatını değiştirir.

- Uygulamayı yalnızca kendi bilgisayarınızda (`npm run dev`) veya kapalı bir ağda çalıştırın.
- İnternete açacaksanız önüne bir koruma koyun (ör. reverse proxy'de parola, VPN) ya da Supabase Auth ile giriş ekleyin.
- Veritabanı tarafındaki asıl koruma `supabase/schema.sql` ile sağlanır: tarayıcıdaki anon anahtar yalnızca `closures` ve `sync_runs` tablolarını **okuyabilir**; yazma ve `settings` erişimi yalnızca sunucudaki `service_role` anahtarındadır. Eski şema dosyasındaki "herkes yazabilir" politikalarını temizlemek için `schema.sql`'i bir kez çalıştırın.

### Veri akışı

- **Tablo ve Harita sayfaları** → `closures` tablosunu tarayıcıdan doğrudan Supabase'e okuyor (`app/composables/useSupabase.ts`, anon key + RLS ile salt-okunur).
- **Ayarlar sayfası** → `settings` tablosu tarayıcıya kapalı olduğu için okuma/yazma `server/api/yolkapama/ayarlar.get.ts` ve `ayarlar.post.ts` üzerinden, `service_role` anahtarıyla (`server/utils/supabaseAdmin.ts`) yapılıyor. Giriş gerektirmez (bkz. yukarıdaki uyarı).
- **"Verileri Çek" butonu** → `server/api/yolkapama/calistir.post.ts`, Flask'ın `/run`'ına `NUXT_INTERNAL_API_TOKEN` ile proxy yapıyor. Giriş gerektirmez (bkz. yukarıdaki uyarı). Flask hemen `run_id` döner, sayfa `sync_runs` tablosunu 3 saniyede bir polling ile izleyip durumu ("Çalışıyor..." / "Tamamlandı" / hata mesajı) günceller, başarılı olunca haritayı otomatik tazeler.

### Sırasıyla çalıştırma

1. Python backend: `python app.py` (bkz. o projenin README'si)
2. Bu Nuxt projesi: `npm install && npm run dev`
3. `/yolkapama` sayfasında "Verileri Çek" butonuna bas, `sync_runs` durumunun Supabase Dashboard'da da güncellendiğini gözlemleyebilirsin.

## Tasarım kaynağı

Renkler, tipografi ve spacing değerleri `DESIGN.md` (Technical Precision) sisteminden birebir alındı. Değişiklik gerekirse tek kaynak `tailwind.config.ts`.

## Yapılacaklar (TODO)

- `Görüntü İşleme` modülü henüz boş — geliştirme başladığında yukarıdaki "Yeni bir modül eklerken" adımlarını izleyin.
- Mobil sidebar toggle (küçük ekranlarda menü açma/kapama) henüz eklenmedi.
- Polling yerine ileride Supabase Realtime'a geçilebilir (anlık, daha az istek). Bunun için `sync_runs` tablosunu `supabase_realtime` yayınına eklemek gerekir: `alter publication supabase_realtime add table public.sync_runs;`
- Ayarlar sayfasındaki "Renk Paleti" (tema seçimi) henüz işlevsel değil; yalnızca arayüzde duruyor.
- Haritayı vektör tile'lara (ör. MapLibre GL JS) taşımak koyu temayla daha uyumlu bir zemin sağlar; şimdilik Leaflet + OSM raster kullanılıyor.
