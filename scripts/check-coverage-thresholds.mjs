/**
 * Reads the merged coverage-summary.json and enforces per-glob thresholds.
 * Mirrors the thresholds in vitest.coverage.config.ts (used instead of
 * re-running the full test suite in CI).
 *
 * CI only runs the test layers a PR touches, and other layers still load (but
 * barely exercise) these folders. So when COVERAGE_LAYERS lists the layers that
 * ran, a folder is only judged if its own layer is among them.
 */
import { readFileSync } from 'node:fs'

const summary = JSON.parse(readFileSync('./coverage/coverage-summary.json', 'utf8'))

const thresholds = {
  'server/repositories': { lines: 58, branches: 48, functions: 63 },
  'server/services':     { lines: 61, branches: 57, functions: 63 },
  'server/utils':        { lines: 58, branches: 51, functions: 63 },
}

// The CI test layer whose specs cover each folder
const owningLayer = {
  'server/repositories': 'server-repositories',
  'server/services':     'server-services',
  'server/utils':        'server-utils',
}

const ranLayers = process.env.COVERAGE_LAYERS?.split(',').filter(Boolean)

// Accumulate coverage totals per threshold group
const groups = {}
for (const [file, data] of Object.entries(summary)) {
  if (file === 'total') continue
  const normalized = file.replaceAll('\\', '/')
  for (const pattern of Object.keys(thresholds)) {
    if (!normalized.includes(pattern)) continue
    const g = groups[pattern] ??= {
      lines:     { total: 0, covered: 0 },
      branches:  { total: 0, covered: 0 },
      functions: { total: 0, covered: 0 },
    }
    for (const metric of ['lines', 'branches', 'functions']) {
      g[metric].total   += data[metric].total
      g[metric].covered += data[metric].covered
    }
  }
}

let failed = false
for (const [pattern, limits] of Object.entries(thresholds)) {
  if (ranLayers && !ranLayers.includes(owningLayer[pattern])) {
    console.log(`  (${owningLayer[pattern]} tests did not run — skipping ${pattern})`)
    continue
  }
  const g = groups[pattern]
  if (!g) {
    console.warn(`  (no coverage data found for ${pattern} — skipping)`)
    continue
  }
  for (const metric of ['lines', 'branches', 'functions']) {
    const { total, covered } = g[metric]
    const pct = total === 0 ? 100 : (covered / total) * 100
    const pass = pct >= limits[metric]
    console.log(`${pass ? '✅' : '❌'} ${pattern} ${metric}: ${pct.toFixed(1)}% (min ${limits[metric]}%)`)
    if (!pass) failed = true
  }
}

if (failed) {
  console.error('\nCoverage thresholds not met — see failures above.')
  process.exit(1)
}

console.log('\nAll coverage thresholds met.')
