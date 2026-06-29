import { getCurrentUser } from '../utils/auth'
import { versionConstraintService } from '../services/singletons'
import { cachedFetch } from '../utils/cache'
import { loadQuery } from '../utils/query-loader'
import type { Driver } from 'neo4j-driver'

function intValue(value: unknown): number {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    return value.toNumber()
  }
  return 0
}

export default defineEventHandler(async (event) => {
  const driver = useDriver()
  const user = await getCurrentUser(event)

  return await cachedFetch(
    `dashboard:v1:${user ? 'authenticated' : 'anonymous'}`,
    () => buildDashboardSummary(driver, user),
    30
  )
})

async function buildDashboardSummary(
  driver: Driver,
  user: Awaited<ReturnType<typeof getCurrentUser>>
) {
  const [
    portfolioQuery,
    componentQuery,
    licenseQuery,
    licenseViolationsQuery,
    lifecycleQuery,
  ] = await Promise.all([
    loadQuery('dashboard/portfolio-summary.cypher'),
    loadQuery('dashboard/component-count.cypher'),
    loadQuery('dashboard/license-summary.cypher'),
    loadQuery('dashboard/license-violations.cypher'),
    loadQuery('dashboard/lifecycle-summary.cypher'),
  ])

  const [
    portfolioResult,
    componentResult,
    licenseResult,
    licenseViolationResult,
    lifecycleResult,
    versionViolationResult
  ] = await Promise.all([
    driver.executeQuery(portfolioQuery),
    driver.executeQuery(componentQuery),
    driver.executeQuery(licenseQuery),
    user
      ? driver.executeQuery(licenseViolationsQuery)
      : Promise.resolve({ records: [] }),
    driver.executeQuery(lifecycleQuery),
    user
      ? versionConstraintService.getViolations({})
      : Promise.resolve({
          count: 0,
          summary: { critical: 0, error: 0, warning: 0, info: 0 }
        })
  ])

  const portfolio = portfolioResult.records[0]
  const component = componentResult.records[0]
  const license = licenseResult.records[0]
  const licenseViolation = licenseViolationResult.records[0]
  const lifecycle = lifecycleResult.records[0]

  return {
    success: true,
    data: {
      counts: {
        technologies: intValue(portfolio?.get('technologies')),
        systems: intValue(portfolio?.get('systems')),
        components: intValue(component?.get('components')),
        versionConstraints: intValue(portfolio?.get('versionConstraints')),
        violations: versionViolationResult.count,
        licenseViolations: intValue(licenseViolation?.get('violations'))
      },
      criticality: {
        critical: intValue(portfolio?.get('critical')),
        high: intValue(portfolio?.get('high')),
        medium: intValue(portfolio?.get('medium')),
        low: intValue(portfolio?.get('low'))
      },
      licenses: {
        total: intValue(license?.get('total')),
        permissive: intValue(license?.get('permissive')),
        copyleft: intValue(license?.get('copyleft')),
        disallowed: intValue(licenseViolation?.get('violations'))
      },
      violations: {
        total: versionViolationResult.count,
        critical: versionViolationResult.summary.critical,
        error: versionViolationResult.summary.error,
        warning: versionViolationResult.summary.warning
      },
      lifecycle: {
        unsupported: intValue(lifecycle?.get('unsupported')),
        approaching: intValue(lifecycle?.get('approaching')),
        systems: intValue(lifecycle?.get('systems'))
      }
    }
  }
}
