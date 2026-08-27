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

- Harita zemini: OpenStreetMap tile sunucusu (`tile.openstreetmap.org`) — ücretsiz, API anahtarı gerekmez.
- Varsayılan merkez: Denizli (37.7765, 29.0864), zoom 13.
- Sol alt: harita hareket ettikçe güncellenen Enlem/Boylam okuması (`center-changed` event'i ile).
- Sağ alt: `+` / `−` butonları `map.zoomIn()` / `map.zoomOut()` çağırır.
- Üst arama kutusu: Enter'a basınca **Nominatim** (OpenStreetMap'in ücretsiz geocoding servisi) üzerinden gerçek arama yapar, bulunan konuma `flyTo` ile uçar ve bir marker bırakır. `countrycodes=tr` ile Türkiye'ye, `viewbox` ile Denizli çevresine yumuşak öncelik verilmiştir.

> Not: Nominatim'in kullanım politikası gereği yoğun/otomatik sorgularda kendi backend'inizden proxy'lemeniz ve bir `User-Agent` eklemeniz önerilir. Düşük hacimli/geliştirme kullanımı için doğrudan tarayıcıdan istek atmak sorun yaratmaz.

## Tasarım kaynağı

Renkler, tipografi ve spacing değerleri `DESIGN.md` (Technical Precision) sisteminden birebir alındı. Değişiklik gerekirse tek kaynak `tailwind.config.ts`.

## Yapılacaklar (TODO)

- `Görüntü İşleme` modülü henüz boş — geliştirme başladığında yukarıdaki "Yeni bir modül eklerken" adımlarını izleyin.
- `pages/yolkapama/tablo.vue`: `closures` dizisi şu an mockup verisiyle dolu — backend API'den (`/api/closures` gibi) çekilecek.
- `pages/yolkapama/ayarlar.vue`: "Kaydet" butonu şu an sadece console.log yapıyor — backend'e (`/api/settings`) bağlanacak.
- Mobil sidebar toggle (küçük ekranlarda menü açma/kapama) henüz eklenmedi.
- Yoğun kullanımda Nominatim isteklerini kendi backend'inizden proxy'lemeyi düşünün.
