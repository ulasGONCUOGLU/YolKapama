// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  future: { compatibilityVersion: 4 },
  compatibilityDate: '2025-08-25',

  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase'],

  // Modül bazlı bileşen klasörleri. pathPrefix: false sayesinde
  // <AppSidebar>, <AppHeader>, <OpsMap> gibi isimler klasör öneki almadan kullanılır.
  components: [
    { path: '~/components/yolkapama', pathPrefix: false }
  ],

  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/', '/login', '/register'],
    },
  },
  runtimeConfig: {
    public: {
      supabaseUrl: '', 
      supabaseKey: '',
    },
  },
  
  app: {
    head: {
      title: 'Ops Console - Operasyon Merkezi',
      htmlAttrs: { lang: 'tr', class: 'dark' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }
      ],
      link: [
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..900&display=swap' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.ts'
  }
})
