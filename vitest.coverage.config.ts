import { mergeConfig } from 'vitest/config'
import base from './vitest.config'

// Extends the base vitest config with coverage thresholds.
// Only used by the full-suite coverage check in CI (npm run test:coverage:check).
// Per-layer runs use the base config so partial coverage doesn't trip thresholds.
//
// Thresholds set at ~3-5 points below the measured baseline (2026-05-04, post-#457):
//   repositories: lines 62%, branches 52%, functions 68%
//   services:     lines 66%, branches 62%, functions 68%
//   utils:        lines 63%, branches 56%, functions 68%
//
// These are floors, not targets. Raise them as coverage improves.
// Branch coverage is the more meaningful metric here; the low branch
// numbers deserve attention first.
export default mergeConfig(base, {
  test: {
    coverage: {
      thresholds: {
        'server/repositories/**': { lines: 58, branches: 48, functions: 63 },
        'server/services/**':     { lines: 61, branches: 57, functions: 63 },
        'server/utils/**':        { lines: 58, branches: 51, functions: 63 },
      },
    },
  },
})
