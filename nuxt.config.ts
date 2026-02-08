// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // SPA-like behavior with client-side navigation
  ssr: true,
  
  app: {
    // Smooth page transitions
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' }
  },

  css: ['~/assets/css/main.css'],

  modules: [
    '@nuxt/ui',
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/test-utils',
    'nuxt-neo4j',
    '@sidebase/nuxt-auth',
    '@nuxt/ui'
  ],



  auth: {
    // baseURL will be auto-detected from request origin if not set
    // For tests, provide a default baseURL
    baseURL: process.env.NODE_ENV === 'test' ? 'http://localhost:3000/api/auth' : undefined,
    provider: {
      type: 'authjs'
    },
    globalAppMiddleware: false // We'll protect specific routes/actions, not the whole app
  },

  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://172.19.0.2:7687',
    auth: {
      type: 'basic',
      username: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'devpassword'
    }
  },

  vite: {
    server: {
      allowedHosts: ['.gitpod.dev', '.gitpod.io', 'localhost', '127.0.0.1'],
      host: true  // Listen on all available network interfaces
    }
  },

})