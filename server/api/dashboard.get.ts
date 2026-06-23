import { getCurrentUser } from '../utils/auth'
import { versionConstraintService } from '../services/singletons'
import { cachedFetch } from '../utils/cache'
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
    portfolioResult,
    componentResult,
    licenseResult,
    licenseViolationResult,
    lifecycleResult,
    versionViolationResult
  ] = await Promise.all([
    driver.executeQuery(`
      CALL {
        MATCH (t:Technology)
        RETURN count(t) AS technologies
      }
      CALL {
        MATCH (s:System)
        RETURN count(s) AS systems,
               sum(CASE WHEN toLower(coalesce(s.businessCriticality, '')) = 'critical' THEN 1 ELSE 0 END) AS critical,
               sum(CASE WHEN toLower(coalesce(s.businessCriticality, '')) = 'high' THEN 1 ELSE 0 END) AS high,
               sum(CASE WHEN toLower(coalesce(s.businessCriticality, '')) = 'medium' THEN 1 ELSE 0 END) AS medium,
               sum(CASE WHEN toLower(coalesce(s.businessCriticality, '')) = 'low' THEN 1 ELSE 0 END) AS low
      }
      CALL {
        MATCH (vc:VersionConstraint)
        RETURN count(vc) AS versionConstraints
      }
      RETURN technologies,
             systems,
             versionConstraints,
             critical,
             high,
             medium,
             low
    `),
    driver.executeQuery(`
      MATCH (:System)-[u:USES]->(c:Component)
      WHERE u.isDirect = true
      WITH DISTINCT coalesce(c.packageManager, 'unknown') AS packageManagerKey,
                    coalesce(c.group, '') AS groupKey,
                    c.name AS name
      RETURN count(*) AS components
    `),
    driver.executeQuery(`
      MATCH (l:License)
      RETURN count(l) AS total,
             sum(CASE WHEN l.category = 'permissive' THEN 1 ELSE 0 END) AS permissive,
             sum(CASE WHEN l.category = 'copyleft' THEN 1 ELSE 0 END) AS copyleft
    `),
    user
      ? driver.executeQuery(`
          MATCH (team:Team)-[:OWNS]->(sys:System)-[u:USES]->(comp:Component)-[:HAS_LICENSE]->(license:License)
          WHERE license.allowed = false
          RETURN count(DISTINCT team.name + '\u0000' + sys.name + '\u0000' + coalesce(comp.purl, comp.name + '@' + coalesce(comp.version, 'unknown')) + '\u0000' + license.id) AS violations
        `)
      : Promise.resolve({ records: [] }),
    driver.executeQuery(`
      CALL {
        MATCH (c:Component)-[:HAS_HEALTH_SNAPSHOT]->(h:HealthSnapshot)
        WHERE h.eolStatus = 'unsupported'
        RETURN count(DISTINCT coalesce(c.purl, h.componentPurl, elementId(c))) AS unsupported
      }
      CALL {
        MATCH (c:Component)-[:HAS_HEALTH_SNAPSHOT]->(h:HealthSnapshot)
        WHERE h.eolStatus = 'approaching_eol'
        RETURN count(DISTINCT coalesce(c.purl, h.componentPurl, elementId(c))) AS approaching
      }
      CALL {
        MATCH (c:Component)-[:HAS_HEALTH_SNAPSHOT]->(h:HealthSnapshot)
        WHERE h.eolStatus IN ['unsupported', 'approaching_eol']
        OPTIONAL MATCH (sys:System)-[:USES]->(c)
        RETURN count(DISTINCT sys.name) AS systems
      }
      RETURN unsupported,
             approaching,
             systems
    `),
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
