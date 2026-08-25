# Ops Console (Operations Command)

Denizli yol kapatma duyurularını izleyen operasyon paneli. Stitch (withgoogle) mockup'larından Nuxt 4'e taşındı.

## Kurulum

```bash
npm install
npm run dev
```

`http://localhost:3000` adresinde açılır.

## Yapı

```
app/
  assets/css/main.css   → Tailwind + global stiller (scrollbar, ikonlar)
  layouts/default.vue   → Sidebar + sayfa içeriği sarmalayıcı
  components/
    AppSidebar.vue       → Sol nav (Home / Road Closures / Settings), aktif route otomatik vurgulanır
    AppHeader.vue         → Üst app bar, opsiyonel arama kutusu
  pages/
    index.vue            → Ana sayfa: gerçek Leaflet haritası + konum arama ("/")
    yol-kapamalar.vue    → Yol kapamalar tablosu ("/yol-kapamalar")
    ayarlar.vue          → AI sistem talimatı + tema ayarları ("/ayarlar")
tailwind.config.ts       → DESIGN.md'deki tüm renk/tipografi/spacing token'ları
```

## Harita (Leaflet)

`app/components/OpsMap.client.vue`, `.client.vue` uzantısı sayesinde yalnızca tarayıcıda çalışır (Nuxt sunucu tarafında hiç bundle etmez, bu yüzden SSR'da `window` hatası oluşmaz).

- Harita zemini: OpenStreetMap tile sunucusu (`tile.openstreetmap.org`) — ücretsiz, API anahtarı gerekmez.
- Varsayılan merkez: Denizli (37.7765, 29.0864), zoom 13.
- Sol alt: harita hareket ettikçe güncellenen Enlem/Boylam okuması (`center-changed` event'i ile).
- Sağ alt: `+` / `−` butonları `map.zoomIn()` / `map.zoomOut()` çağırır.
- Üst arama kutusu: Enter'a basınca **Nominatim** (OpenStreetMap'in ücretsiz geocoding servisi) üzerinden gerçek arama yapar, bulunan konuma `flyTo` ile uçar ve bir marker bırakır. `countrycodes=tr` ile Türkiye'ye, `viewbox` ile Denizli çevresine yumuşak öncelik verilmiştir (sonuçları bu bölgeyle sınırlamaz, sadece öne çıkarır).

> Not: Nominatim'in kullanım politikası gereği yoğun/otomatik sorgularda kendi backend'inizden proxy'lemeniz ve bir `User-Agent` eklemeniz önerilir. Düşük hacimli/geliştirme kullanımı için doğrudan tarayıcıdan istek atmak sorun yaratmaz.

## Tasarım kaynağı

Renkler, tipografi ve spacing değerleri `DESIGN.md` (Technical Precision) sisteminden birebir alındı. Değişiklik gerekirse tek kaynak `tailwind.config.ts`.

## Yapılacaklar (TODO)

- `pages/yol-kapamalar.vue`: `closures` dizisi şu an mockup verisiyle dolu — backend API'den (`/api/closures` gibi) çekilecek.
- `pages/ayarlar.vue`: "Kaydet" butonu şu an sadece console.log yapıyor — backend'e (`/api/settings`) bağlanacak.
- Mobil sidebar toggle (küçük ekranlarda menü açma/kapama) henüz eklenmedi.
- Yoğun kullanımda Nominatim isteklerini kendi backend'inizden proxy'lemeyi düşünün.
