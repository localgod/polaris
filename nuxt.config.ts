// https://nuxt.com/docs/api/configuration/nuxt-config

const isEnabled = (value: string | undefined) => value === 'true' || value === '1'
const shouldTrustAuthHost = process.env.NODE_ENV !== 'production' || isEnabled(process.env.AUTH_TRUST_HOST)
const apiCacheDriver = process.env.API_CACHE_DRIVER || 'memory'
const apiCacheBase = process.env.API_CACHE_BASE || './.cache/api'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    eolApproachingDays: Number(process.env.EOL_APPROACHING_DAYS || 90),
    public: {
      // Baked in at build time from APP_VERSION build arg; falls back to 'dev'
      appVersion: process.env.APP_VERSION ?? 'dev'
    }
  },

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
  ],

  fonts: {
    providers: {
      bunny: false
    }
  },

  auth: {
    // AUTH_ORIGIN overrides auto-detection. Required when the app is behind a proxy
    // or running in an environment where the request origin is not the public URL
    // (e.g. Gitpod, Cloudflare, reverse proxies).
    // Format: https://your-domain.com/api/auth
    baseURL: process.env.AUTH_ORIGIN
      || (process.env.NODE_ENV === 'test' ? 'http://localhost:3000/api/auth' : undefined),
    provider: {
      type: 'authjs',
      trustHost: shouldTrustAuthHost
    },
    globalAppMiddleware: false // We'll protect specific routes/actions, not the whole app
  },

  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    auth: {
      type: 'basic',
      username: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'devpassword'
    }
  },

  devServer: {
    host: '0.0.0.0'  // Listen on all available network interfaces
  },

  vite: {
    optimizeDeps: {
      include: ['@vue/devtools-core', '@vue/devtools-kit', '@vueuse/core']
    },
    server: {
      allowedHosts: ['.gitpod.dev', '.gitpod.io', 'localhost', '127.0.0.1']
    }
  },

  nitro: {
    experimental: {
      tasks: true
    },
    // Keep @cyclonedx/cdxgen as an external module so Nitro does not bundle it.
    // cdxgen reads data files (JSON mappings) relative to its own location at
    // runtime — bundling strips those files and causes ENOENT errors in production.
    externals: {
      external: ['@cyclonedx/cdxgen']
    },
    storage: {
      'cache:api': {
        driver: apiCacheDriver,
        ...(apiCacheDriver === 'fs' && { base: apiCacheBase })
      }
    },
    scheduledTasks: {
      '*/5 * * * *': ['health-refresh:process'],
      '0 */12 * * *': ['health-refresh:enqueue-scheduled']
    },
    tasks: {
      'health-refresh:process': {
        handler: './server/tasks/health-refresh/process.ts',
        description: 'Process the next queued component health refresh job'
      },
      'health-refresh:enqueue-scheduled': {
        handler: './server/tasks/health-refresh/enqueue-scheduled.ts',
        description: 'Enqueue a scheduled full-landscape component health refresh'
      }
    }
  }

})
