import { defineConfig } from 'vitest/config'
import { config } from 'dotenv'

config()

/**
 * Vitest config for HTTP integration tests.
 *
 * These tests start a real Nitro server via @nuxt/test-utils and make
 * actual HTTP requests. They verify routing, middleware, auth guards,
 * query-parameter parsing, and response codes — things the handler-level
 * unit tests (vitest.config.ts) cannot exercise.
 *
 * Run with: npm run test:integration
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/integration/**/*.spec.ts'],
    fileParallelism: false,
    // Server startup can take up to 60 s on a cold run
    testTimeout: 120_000,
    hookTimeout: 120_000,
    env: {
      NEO4J_URI: process.env.NEO4J_TEST_URI || process.env.NEO4J_URI || 'bolt://localhost:7687',
      NEO4J_USERNAME: process.env.NEO4J_TEST_USERNAME || process.env.NEO4J_USERNAME || 'neo4j',
      NEO4J_PASSWORD: process.env.NEO4J_TEST_PASSWORD || process.env.NEO4J_PASSWORD || 'devpassword',
      NEO4J_DATABASE: process.env.NEO4J_TEST_DATABASE || 'neo4j',
      AUTH_SECRET: process.env.AUTH_SECRET || 'test-secret-for-vitest',
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || 'test-client-id',
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || 'test-client-secret',
    },
  },
})
