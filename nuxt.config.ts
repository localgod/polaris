// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/test-utils',
    '@nuxtjs/tailwindcss',
    '@nuxt/content',
    // '@nuxt/ui', // Temporarily disabled - has compatibility issue with Nuxt 4 (@nuxtjs/color-mode@3.5.2)
    'nuxt-neo4j',
    '@sidebase/nuxt-auth',
    '@scalar/nuxt'
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

  content: {
    // @ts-expect-error - Nuxt Content v3.7.1 type definitions don't include highlight property
    // This is a valid configuration option but types are outdated
    // See: https://content.nuxt.com/get-started/configuration#highlight
    highlight: {
      theme: {
        default: 'github-light',
        dark: 'github-dark'
      },
      preload: ['cypher', 'typescript', 'javascript', 'bash', 'json', 'yaml', 'mermaid']
    },
    markdown: {
      toc: {
        depth: 3,
        searchDepth: 3
      }
    }
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

  scalar: {
    url: '/api/openapi.json',
    pathRouting: {
      basePath: '/api-docs'
    },
    darkMode: true,
    metaData: {
      title: 'Polaris API Documentation'
    }
  }
})