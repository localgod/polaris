import { defineConfig } from 'vitest/config'
import { config } from 'dotenv'

// Load environment variables from .env file
config()

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['test/integration/**'],
    fileParallelism: false,
    testTimeout: 60000, // 60 seconds for e2e tests
    hookTimeout: 60000, // 60 seconds for beforeAll/afterAll
    globalSetup: ['./test/setup/global-setup.ts'],
    setupFiles: ['./test/setup/h3-globals.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json', 'html', 'lcov'],
      reportOnFailure: true,
      reportsDirectory: './coverage',
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
        'server/database/queries/**',
        'schema/scripts/**',
        'server/scripts/**',
        // server/api/** excluded until route handlers have HTTP-level test
        // coverage via the integration suite (tracked in #430)
        'server/api/**',
      ],
      // Thresholds set at ~3-5 points below the current measured baseline
      // (post-#457 test refactor). These are floors, not targets — raise them
      // as coverage improves. Branch coverage is the more meaningful metric
      // for this codebase; the low branch numbers deserve attention first.
      //
      // Measured baseline (2026-05-04, post-#457):
      //   repositories: lines 62%, branches 52%, functions 68%
      //   services:     lines 66%, branches 62%, functions 68%
      //   utils:        lines 63%, branches 56%, functions 68%
      thresholds: {
        'server/repositories/**': { lines: 58, branches: 48, functions: 63 },
        'server/services/**':     { lines: 61, branches: 57, functions: 63 },
        'server/utils/**':        { lines: 58, branches: 51, functions: 63 },
      },
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
