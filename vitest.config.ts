import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    fileParallelism: false,
    testTimeout: 60000, // 60 seconds for e2e tests
    hookTimeout: 60000, // 60 seconds for beforeAll/afterAll
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json', 'html', 'lcov'],
      reportOnFailure: true,
      reportsDirectory: './coverage',
      all: true,
      thresholds: {
        lines: 5,
        branches: 5,
        functions: 5,
        statements: 5,
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        '.nuxt/**',
        '.output/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        'test/**',
        'app/pages/**',
        'app/components/**',
        'app/plugins/**',
        'server/api/**',
        'schema/scripts/**',
        'server/scripts/**',
      ],
    },
    env: {
      NEO4J_URI: process.env.NEO4J_URI || 'bolt://localhost:7687',
      NEO4J_USERNAME: process.env.NEO4J_USERNAME || 'neo4j',
      NEO4J_PASSWORD: process.env.NEO4J_PASSWORD || 'devpassword',
      AUTH_SECRET: process.env.AUTH_SECRET || 'test-secret-for-vitest',
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || 'test-client-id',
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || 'test-client-secret',
    },
  },
})
