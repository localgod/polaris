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
    'nuxt-neo4j'
  ],

  content: {
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
      allowedHosts: ['.gitpod.dev', '.gitpod.io']
    }
  }
})