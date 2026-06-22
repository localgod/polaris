import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import * as launcher from 'chrome-launcher'
import lighthouse, { generateReport, type Result } from 'lighthouse'
import { chromium } from '@playwright/test'

type CategoryId = 'performance' | 'accessibility' | 'best-practices' | 'seo'

interface Threshold {
  minimum: number
  fail: boolean
}

const DEFAULT_ROUTES = ['/', '/components', '/systems', '/technologies', '/docs/concepts']
const thresholds: Record<CategoryId, Threshold> = {
  performance: { minimum: 0.7, fail: false },
  accessibility: { minimum: 0.85, fail: true },
  'best-practices': { minimum: 0.9, fail: true },
  seo: { minimum: 0.9, fail: true },
}

const baseUrl = process.env.LIGHTHOUSE_BASE_URL || 'http://localhost:3000'
const outputDir = process.env.LIGHTHOUSE_OUTPUT_DIR || 'lighthouse-reports'
const routes = (process.env.LIGHTHOUSE_ROUTES?.split(',') || DEFAULT_ROUTES)
  .map(route => route.trim())
  .filter(Boolean)

if (process.env.LIGHTHOUSE_FAIL_PERFORMANCE === 'true') {
  thresholds.performance.fail = true
}

for (const category of Object.keys(thresholds) as CategoryId[]) {
  const envName = `LIGHTHOUSE_${category.replace('-', '_').toUpperCase()}_MIN`
  const rawMinimum = process.env[envName]

  if (rawMinimum) {
    const minimum = Number(rawMinimum)

    if (!Number.isFinite(minimum) || minimum < 0 || minimum > 100) {
      throw new Error(`${envName} must be a number between 0 and 100`)
    }

    thresholds[category].minimum = minimum / 100
  }
}

function buildUrl(route: string): string {
  if (/^https?:\/\//.test(route)) {
    return route
  }

  return new URL(route, baseUrl).toString()
}

function reportName(url: string): string {
  const { pathname } = new URL(url)
  const name = pathname === '/' ? 'home' : pathname.replace(/^\/|\/$/g, '').replaceAll('/', '-')

  return name.replace(/[^a-z0-9._-]/gi, '-').toLowerCase()
}

function formatScore(score: number | null | undefined): string {
  if (typeof score !== 'number') {
    return 'n/a'
  }

  return Math.round(score * 100).toString()
}

async function auditRoute(url: string, port: number): Promise<string[]> {
  const result = await lighthouse(url, {
    port,
    output: 'html',
    onlyCategories: Object.keys(thresholds) as CategoryId[],
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'],
    logLevel: 'silent',
  })

  if (!result) {
    throw new Error(`Lighthouse did not return a result for ${url}`)
  }

  const fileBase = reportName(url)
  const htmlReport = generateReport(result.lhr, 'html')
  const jsonReport = generateReport(result.lhr, 'json')

  await writeFile(join(outputDir, `${fileBase}.html`), htmlReport)
  await writeFile(join(outputDir, `${fileBase}.json`), jsonReport)

  const failures: string[] = []
  const warnings: string[] = []
  const scores = Object.entries(thresholds).map(([category, threshold]) => {
    const score = result.lhr.categories[category as keyof Result['categories']]?.score
    const label = `${category}=${formatScore(score)}`

    if (typeof score === 'number' && score < threshold.minimum) {
      const message = `${url} ${category} score ${formatScore(score)} is below ${Math.round(threshold.minimum * 100)}`

      if (threshold.fail) {
        failures.push(message)
      } else {
        warnings.push(message)
      }
    }

    return label
  })

  console.log(`${url}: ${scores.join(', ')}`)
  for (const warning of warnings) {
    console.warn(`Warning: ${warning}`)
  }

  return failures
}

async function main() {
  await mkdir(outputDir, { recursive: true })

  const { existsSync } = await import('node:fs')
  const preferredChromePath = process.env.CHROME_PATH || chromium.executablePath()
  const chromePath = existsSync(preferredChromePath) ? preferredChromePath : undefined

  const chrome = await launcher.launch({
    ...(chromePath ? { chromePath } : {}),
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const failures: string[] = []

    for (const route of routes) {
      failures.push(...await auditRoute(buildUrl(route), chrome.port))
    }

    console.log(`Lighthouse reports written to ${outputDir}`)

    if (failures.length > 0) {
      console.error('\nLighthouse threshold failures:')
      for (const failure of failures) {
        console.error(`- ${failure}`)
      }
      process.exitCode = 1
    }
  } finally {
    await chrome.kill()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
