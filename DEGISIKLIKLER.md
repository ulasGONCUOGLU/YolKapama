# YolKapama (web arayüzü) — Neler değişti?

Bu ZIP, deponuzun (`main` dalı, commit `059a4ef`) güncellenmiş hâlidir.
`.git`, `node_modules`, `.nuxt`, `.output` ve `.env` dosyaları ZIP'te yoktur.

## Nasıl kontrol edersiniz?

1. ZIP'i **ayrı bir klasöre** çıkarın (kendi projenizin üzerine değil).
2. VS Code'da iki klasörü karşılaştırın: kendi klasörünüze sağ tık → "Select for Compare",
   ZIP'ten çıkan klasöre sağ tık → "Compare with Selected". Ya da `fc`/WinMerge/Meld gibi bir araç kullanın.
3. Beğendiğiniz dosyaları tek tek kendi projenize kopyalayın. Hepsini almak zorunda değilsiniz.

## Silinen dosyalar (artık ZIP'te yok)

`supabaseYed.txt` ve `requirements-node.txt` bu ZIP'ten tamamen çıkarıldı. Kendi projenizde de silinmiş olmalı.

## Değişen dosyalar (23)

| Dosya | Değişiklik | Neden |
| --- | --- | --- |
| `supabaseYed.txt` | **SİLİNDİ** | Depo herkese açık. İçinde `ulas@gmail.com` hesabını `123456` şifresiyle oluşturan SQL ve `DROP TABLE` vardı. |
| `requirements-node.txt` | **SİLİNDİ** | Gerçek sürümlerle uyuşmuyordu (ör. vue-router 5.2.0 yazıyor, kurulu olan 4.6.4). Sürümleri `package-lock.json` zaten tutuyor. |
| `supabase/schema.sql` | **YENİ** | Tek, tekrar çalıştırılabilir Supabase şeması (veri silmez). Tarayıcının yalnızca **okuyabildiği**, yazamadığı güvenli yetkiler. Python deposundaki `supabase_schema_update.sql` ile birebir aynı dosyadır. `refresh_active_status()` içinde `where true` var (Supabase WHERE'siz UPDATE'i reddeder). |
| `.env.example` | **YENİ** | README'de anılıyordu ama depoda yoktu. |
| `server/api/yolkapama/arama.get.ts` | **YENİ** | Harita arama kutusu için Nominatim proxy'si (isteğe bağlı `limit` parametresiyle birden fazla sonuç döndürür, öneri listesi için): sonuçları önbelleğe alır, saniyede en fazla 1 istek atar, tanıtıcı User-Agent gönderir (OSM kuralı). |
| `app/pages/yolkapama/index.vue` | Değişti | Arama artık tarayıcıdan doğrudan Nominatim'e değil, yukarıdaki proxy'ye gidiyor. |
| `app/components/yolkapama/OpsMap.client.vue` | Değişti | OSM karo adresi tek HTTPS adresine çevrildi (`https://tile.openstreetmap.org/...`). OSM politikası `{s}` alt alan adlarını artık istemiyor. |
| `server/api/yolkapama/ayarlar.post.ts` | Değişti | AI talimatı için en fazla 20.000 karakter sınırı. |
| `nuxt.config.ts` | Değişti | Yorumlar ve iki yeni ayar eklendi (`nominatimUserAgent`, `nominatimUrl`). |
| `package-lock.json` | Değişti | Kullanılmayan `@nuxtjs/supabase` kaydı temizlendi (`package.json`'da yoktu). Kullandığınız hiçbir paketin sürümü değişmedi. |
| `app/components/yolkapama/AppHeader.vue` | Değişti | Üstteki arama kutusu artık `v-model` ile bağlanabiliyor (yazdıkça değer üst bileşene gider, Esc ve ✕ ile temizlenir). |
| `app/pages/yolkapama/tablo.vue` | Değişti | **Arama:** üstteki "İşlem ara" kutusu tabloda güzergah, neden, ilçe, mahalle, tarih ve ID içinde arar (Türkçe harf ve büyük/küçük harf duyarsız, kelime sırası önemsiz). **"Göster" butonu:** her satırda; tıklayınca ana sayfada o kapamanın konumuna götürür, konumu bulunamayan kayıtta pasif. **Aktif Kapamalar kartı** düğme gibi: tıklayınca yalnız aktifler listelenir, tekrar tıklayınca tümü. Ayrıca sütun başlığına tıklayarak sıralama (Güzergah, Tarih, İlçe, Mahalle, Aktif, ID, Oluşturulma; Türkçe A-Z / Z-A), ilçeye göre filtre ve Aktif / Aktif değil filtresi. |
| `app/pages/yolkapama/index.vue` (ek) | Değişti | **Arama önerileri:** "Koordinat, sektör ara..." kutusunda Enter'a (ya da büyüteç simgesine) basınca en fazla 5 yakın yer listelenir; ↑ ↓ ile gezip Enter ya da tıklayarak seçilir, seçilene uçulur. **Tablodan gelen "Göster":** `/yolkapama?kapama=ID` ile gelince haritada o kapamaya (çizgi/çok parçalı geometri sığacak şekilde) odaklanır; pasif kapama da çizilir. **Konumu belirlenemeyen aktif kapamalar:** haritanın sol üstünde "N aktif yol kapamanın konumu belirlenemedi" şeridi; tıklanınca liste (haritanın baktığı yere yakın olanlar üstte). İlçe+mahalle biliniyorsa mahalle merkezi sunucu proxy'siyle aranır ve haritada kırmızı kesikli "yaklaşık bölge" dairesi çizilir. Haritanın sol altındaki **Belirsiz bölgeler: Göster / Gizle** radyo düğmeleriyle bu daireler açılıp kapatılır. Listede satırlar sırayla açık/koyu arka planla ayrılır. Çok parçalı duyuruda yalnız bir kısmı bulunduysa kayıt "Kısmen bulundu: 3/4 parça" ve bulunamayan parçaların adıyla listelenir. |
| `app/components/yolkapama/OpsMap.client.vue` (ek) | Değişti | Yaklaşık bölge katmanı (kırmızı kesikli daire) ve `flyToArea`. |
| `app/types/closure.ts` | Değişti | `Kavsak`, `HaritaAltlik`, `ApproxArea`, `GeocodeParca`, `EtkilenenAlan` tipleri; `geocode_result` içinde `parcalar` / `etkilenen_alanlar`; geometri GeometryCollection olabilir. |
| `supabase/kavsaklar.sql` | **YENİ** | `kavsaklar` tablosu (RLS: tarayıcı yalnız okur) ve KMZ'deki **142 sinyalize kavşağın** `insert` komutları. Tekrar çalıştırılabilir (`on conflict (kod) do update`). Koordinatlar KMZ'den alındığı için enlem/boylam ayrı sütunlarda, birleşik yazım sorunu yok. Denizli dışı (ters yazılmış) koordinatları reddeden `check` kuralları var. |
| `app/components/yolkapama/OpsMap.client.vue` (kavşak/altlık) | Değişti | **Harita türü:** Harita (OSM), Uydu (Esri World Imagery), Karma (uydu + yol/yer adı etiketleri). **Kavşak katmanı:** sarı (pasif: gri) noktalar, üzerine gelince ad, tıklayınca bilgi kutusu. Kavşaklar kapama çizgilerinin altında kalır. |
| `app/pages/yolkapama/index.vue` (katmanlar) | Değişti | Sağ üstte **Katmanlar** paneli: Harita/Uydu/Karma seçimi ve "Sinyalize kavşaklar" aç/kapa kutusu. Kavşaklar ilk açışta bir kez çekilir; seçimler tarayıcıda hatırlanır. Tablo henüz kurulmadıysa "kavsaklar.sql'i çalıştırın" uyarısı çıkar. |
| `server/api/yolkapama/oneri.get.ts` | **YENİ** | Arama kutusunda **yazdıkça** çıkan yer önerileri için Photon proxy'si (en az 3 harf, önbellek, saniyede en fazla ~4 istek, Türkiye dışı sonuçlar elenir, Denizli'ye yumuşak öncelik). Servis yanıt vermezse sessizce boş liste döner. |
| `app/composables/useTema.ts` | **YENİ** | Tema (açık/koyu/sistem) seçimi; tercih her kullanıcının kendi tarayıcısında (`localStorage`) saklanır. |
| `app/assets/css/tema.css` | **YENİ** | Koyu (varsayılan), açık ve sistem temalarının renk değişkenleri. |
| `tailwind.config.ts` | Değişti | Tüm renkler sabit hex yerine `rgb(var(--c-...))` değişkenlerine bağlandı (görünüm koyu temada aynı). İki yeni renk: `zebra`, `danger-soft`. |
| `nuxt.config.ts` (tema/öneri) | Değişti | `tema.css` yüklenir; sayfa çizilmeden kayıtlı temayı uygulayan küçük `<head>` betiği (yanıp sönmeyi önler); `photonUrl` ayarı. |
| `.env.example` (Photon) | Değişti | `NUXT_PHOTON_URL` eklendi. |
| `app/pages/yolkapama/ayarlar.vue` | Değişti | Tema seçimi gerçekten çalışıyor (Açık / Koyu / Sistem); "yalnızca bu tarayıcıda saklanır" notu. |
| `app/components/yolkapama/OpsMap.client.vue` (ışık) | Değişti | Kavşaklar **trafik ışığı** simgesi (SVG: kırmızı/sarı/yeşil; pasifte gri), zoom'a göre boyut. Harita zemini rengi temaya bağlı. |
| `app/pages/yolkapama/index.vue` (öneri/parça) | Değişti | **Yazdıkça öneri:** kavşak ve aktif kapama adları anında, yer adları 350 ms bekletmeyle; simge ve etiketle ayrılır; Enter hâlâ tam arama yapar. **Kısmen bulunan kapamalar:** "Haritada bulunan parçalar" düğmeleri ve **"Parçaları sırayla gez / Sıradaki parçaya git"** ile her parça ayrı ayrı gösterilir. Sabit hex renkler tema renklerine çevrildi. |
| `README.md` | Değişti | Kurulum, ortam değişkenleri ve güvenlik notları güncellendi. |

## Kaldırdığım şey: giriş (auth)

Bir ara kullanıcı girişi eklemiştim, sonra kaldırdım. **Uygulama giriş olmadan çalışıyor, giriş zorunlu değil.**
Sonuç olarak `ulas@gmail.com` hesabı da, `admin@gmail.com` hesabı da kodda yoktur, ihtiyaç kalmadı.

> **Uyarı:** Giriş olmadığı için "Verileri Çek" butonu ve "Ayarlar" sayfası, uygulamaya erişebilen **herkese** açıktır.
> Yalnızca kendi bilgisayarınızda çalıştırın. İnternete açacaksanız önüne parola/VPN koyun.

## ÖNEMLİ: Env değişken adları

Nuxt, sunucu ayarlarını yalnızca **`NUXT_` önekli** değişkenlerden okur. `.env` dosyanızda
`SUPABASE_SERVICE_ROLE_KEY`, `INTERNAL_API_TOKEN`, `PYTHON_API_BASE` yazıyorsa bunları
`NUXT_SUPABASE_SERVICE_ROLE_KEY`, `NUXT_INTERNAL_API_TOKEN`, `NUXT_PYTHON_API_BASE` olarak yeniden adlandırın.
(`.env.example` doğru adları gösterir.)

## Çalıştırma

```bash
npm ci
npm run dev
```

## Yapmadığım şeyler

- `npm audit` üretim bağımlılıklarında açık gösteriyor (çoğu Nuxt'ın alt paketlerinde). Sürüm atlamak riskli olduğu için dokunmadım.
- Leaflet / OSM karo sunucusunu değiştirmedim. OSM'nin karo sunucusunda SLA yoktur; yoğun kullanımda başka sağlayıcıya geçmek gerekir.
- Git geçmişinizdeki eski commit'lerde `supabaseYed.txt` hâlâ görünür. Dosyayı silmek geçmişi silmez. **Supabase'te o hesabı silin / şifresini değiştirin.**
