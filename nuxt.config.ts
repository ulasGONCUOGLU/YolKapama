// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  future: { compatibilityVersion: 4 },
  compatibilityDate: '2025-08-25',

  modules: ['@nuxtjs/tailwindcss'],

  // Sunucu-özel (gizli) ve public (tarayıcıya açık) ortam değişkenleri.
  // Değerler .env dosyasından okunur (bkz. .env.example).
  //
  // ÖNEMLİ: Nuxt, runtimeConfig anahtarlarını çalışma anında YALNIZCA
  // "NUXT_" önekli ortam değişkenleriyle ezer (anahtar adı büyük harfli
  // snake_case olur: supabaseServiceRoleKey -> NUXT_SUPABASE_SERVICE_ROLE_KEY).
  // Öneksiz değişkenler (SUPABASE_SERVICE_ROLE_KEY vb.) okunmaz. Buraya
  // process.env yazmak da çözüm değildir: değer derleme anında okunur ve
  // gizli anahtar derleme çıktısına gömülür. Varsayılanlar boş kalmalı.
  runtimeConfig: {
    // --- Sadece sunucu tarafında erişilebilir (server/api/*) ---
    supabaseServiceRoleKey: '', // NUXT_SUPABASE_SERVICE_ROLE_KEY
    pythonApiBase: 'http://127.0.0.1:5000', // NUXT_PYTHON_API_BASE
    internalApiToken: '', // NUXT_INTERNAL_API_TOKEN (Flask ile paylaşılan gizli anahtar)
    nominatimUserAgent: '', // NUXT_NOMINATIM_USER_AGENT (OSM politikası için uygulama kimliği)
    nominatimUrl: '', // NUXT_NOMINATIM_URL (boşsa genel OSM Nominatim; kendi sunucunuz için doldurun)
    photonUrl: '', // NUXT_PHOTON_URL (yazdıkça öneri; boşsa genel photon.komoot.io, kendi sunucunuz için doldurun)

    // --- Tarayıcıya açık (anon key zaten public kullanım için tasarlanmıştır) ---
    public: {
      supabaseUrl: '', // NUXT_PUBLIC_SUPABASE_URL
      supabaseAnonKey: '' // NUXT_PUBLIC_SUPABASE_ANON_KEY
    }
  },

  // Modül bazlı bileşen klasörleri. pathPrefix: false sayesinde
  // <AppSidebar>, <AppHeader>, <OpsMap> gibi isimler klasör öneki almadan kullanılır.
  components: [
    { path: '~/components/yolkapama', pathPrefix: false }
  ],

  app: {
    head: {
      title: 'Ops Console - Operasyon Merkezi',
      htmlAttrs: { lang: 'tr', class: 'dark' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }
      ],
      // Kayıtlı temayı sayfa çizilmeden uygular (yanıp sönmeyi önler). Anahtar: useTema.ts
      script: [
        {
          innerHTML: "try{var t=localStorage.getItem('yk-tema');if(t==='acik'||t==='koyu'||t==='sistem'){document.documentElement.dataset.tema=t}}catch(e){}",
          tagPosition: 'head'
        }
      ],
      link: [
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..900&display=swap' }
      ]
    }
  },

  css: ['~/assets/css/tema.css', '~/assets/css/main.css'],

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.ts'
  }
})
