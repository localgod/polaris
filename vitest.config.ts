import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json', 'html'],
      reportOnFailure: true,
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
      ],
    },
    env: {
      NEO4J_URI: process.env.NEO4J_URI || 'bolt://localhost:7687',
      NEO4J_USERNAME: process.env.NEO4J_USERNAME || 'neo4j',
      NEO4J_PASSWORD: process.env.NEO4J_PASSWORD || 'devpassword',
    },
  },
})
