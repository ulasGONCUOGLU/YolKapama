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
    index.vue            → Ana sayfa: harita görünümü ("/")
    yol-kapamalar.vue    → Yol kapamalar tablosu ("/yol-kapamalar")
    ayarlar.vue          → AI sistem talimatı + tema ayarları ("/ayarlar")
tailwind.config.ts       → DESIGN.md'deki tüm renk/tipografi/spacing token'ları
```

## Tasarım kaynağı

Renkler, tipografi ve spacing değerleri `DESIGN.md` (Technical Precision) sisteminden birebir alındı. Değişiklik gerekirse tek kaynak `tailwind.config.ts`.

## Yapılacaklar (TODO)

- `pages/index.vue`: Statik harita görseli yerine gerçek harita kütüphanesi (MapLibre GL / Leaflet) entegre edilecek.
- `pages/yol-kapamalar.vue`: `closures` dizisi şu an mockup verisiyle dolu — backend API'den (`/api/closures` gibi) çekilecek.
- `pages/ayarlar.vue`: "Kaydet" butonu şu an sadece console.log yapıyor — backend'e (`/api/settings`) bağlanacak.
- Mobil sidebar toggle (küçük ekranlarda menü açma/kapama) henüz eklenmedi.
