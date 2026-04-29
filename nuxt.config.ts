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
      title: 'Daan Willems — Eerlijk in beeld, breed in bereik.',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Daan Willems — autohandelaar met een breed publiek. Samenwerken op socials, in placement, of live op het podium.' },
        { name: 'theme-color', content: '#0a0908' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
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
