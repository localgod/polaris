import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    fileParallelism: false,
    testTimeout: 60000, // 60 seconds for e2e tests
    hookTimeout: 60000, // 60 seconds for beforeAll/afterAll
    globalSetup: ['./test/setup/global-setup.ts'],
    globalTeardown: ['./test/setup/global-teardown.ts'],
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
        'server/api/**', // API endpoints are thin HTTP handlers - test via integration
        'server/database/queries/**', // Cypher files tested via repository tests
        'schema/scripts/**',
        'server/scripts/**',
      ],
      include: [
        'server/services/**/*.ts',
        'server/repositories/**/*.ts',
        'server/utils/**/*.ts',
        'server/plugins/**/*.ts',
      ],
    },
    env: {
      // Test database configuration
      // Note: Neo4j Community Edition in this project doesn't support multiple databases
      // Tests use namespace-based isolation (TEST_ prefix) instead
      // If you have Neo4j Enterprise, you can create a separate 'test' database
      NEO4J_URI: process.env.NEO4J_TEST_URI || process.env.NEO4J_URI || 'bolt://localhost:7687',
      NEO4J_USERNAME: process.env.NEO4J_TEST_USERNAME || process.env.NEO4J_USERNAME || 'neo4j',
      NEO4J_PASSWORD: process.env.NEO4J_TEST_PASSWORD || process.env.NEO4J_PASSWORD || 'devpassword',
      NEO4J_DATABASE: process.env.NEO4J_TEST_DATABASE || 'neo4j', // Use 'neo4j' (same as dev) due to Community Edition limitations
      AUTH_SECRET: process.env.AUTH_SECRET || 'test-secret-for-vitest',
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || 'test-client-id',
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || 'test-client-secret',
    },
  },
})
