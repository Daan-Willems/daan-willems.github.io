// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-04-01',
  devtools: { enabled: true },
  ssr: true,

  modules: [
    '@nuxt/content',
    '@nuxtjs/i18n',
  ],

  css: [
    '~/assets/css/tokens.css',
    '~/assets/css/base.css',
  ],

  app: {
    head: {
      htmlAttrs: { lang: 'nl' },
      title: 'Daan Willems',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Eerlijk in beeld, breed in bereik. Samenwerkingen met Daan Willems.' },
      ],
    },
  },

  i18n: {
    defaultLocale: 'nl',
    strategy: 'no_prefix',
    locales: [
      { code: 'nl', name: 'Nederlands', language: 'nl-NL' },
      { code: 'en', name: 'English', language: 'en-US' },
    ],
    detectBrowserLanguage: false,
  },

  content: {
    build: {
      markdown: {
        toc: { depth: 0 },
      },
    },
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/'],
    },
  },

  routeRules: {
    '/**': { prerender: true },
  },
})
