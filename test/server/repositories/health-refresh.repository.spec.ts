import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { QueryResult, Session } from 'neo4j-driver'
import { HealthRefreshRepository } from '../../../server/repositories/health-refresh.repository'
import { cleanupTestData, getTestContext, type TestContext } from '../../fixtures/neo4j-test-helper'

const PREFIX = 'test_health_refresh_repo_'
let ctx: TestContext
let repo: HealthRefreshRepository
let session: Session

function record(values: Record<string, unknown>) {
  return {
    get: (key: string) => values[key]
  }
}

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

beforeEach(async () => {
  if (!ctx.neo4jAvailable) return
  await cleanupTestData(ctx.driver, { prefix: PREFIX })
  repo = new HealthRefreshRepository(ctx.driver)
  session = ctx.driver.session()
})

afterEach(async () => { if (session) await session.close() })

describe('HealthRefreshRepository', () => {
  it('maps cross-system health dashboard summary aggregates', async () => {
    class TestHealthRefreshRepository extends HealthRefreshRepository {
      protected override async executeQuery(query: string): Promise<QueryResult> {
        if (query.includes('vulnerableComponents')) {
          return { records: [record({
            vulnerableComponents: 8,
            criticalComponents: 2,
            highComponents: 3,
            criticalVulnerabilities: 4,
            highVulnerabilities: 6
          })] } as QueryResult
        }
        if (query.includes('affectedSystems') && query.includes('vulnerabilityTotal')) {
          return { records: [record({ affectedSystems: 5 })] } as QueryResult
        }
        if (query.includes('Advisory')) {
          return { records: [record({
            id: 'GHSA-1234',
            aliases: ['CVE-2026-1234'],
            summary: 'Example advisory',
            cvssScore: 9.8,
            affectedComponents: 2,
            affectedSystems: 4
          })] } as QueryResult
        }
        if (query.includes('totalComponents')) {
          return { records: [record({
            totalComponents: 20,
            refreshedComponents: 15,
            staleComponents: 3,
            neverCheckedComponents: 5
          })] } as QueryResult
        }
        if (query.includes('failedItems')) {
          return { records: [record({ failedItems: 2 })] } as QueryResult
        }
        if (query.includes('criticalSystems')) {
          return { records: [record({
            systems: 3,
            criticalSystems: 1,
            highSystems: 2,
            affectedComponents: 4
          })] } as QueryResult
        }
        throw new Error(`Unexpected query: ${query}`)
      }
    }

    const summary = await new TestHealthRefreshRepository().getDashboardSummary()

    expect(summary).toEqual({
      vulnerabilityExposure: {
        vulnerableComponents: 8,
        criticalComponents: 2,
        highComponents: 3,
        affectedSystems: 5,
        criticalVulnerabilities: 4,
        highVulnerabilities: 6
      },
      advisoryHotspots: [{
        id: 'GHSA-1234',
        aliases: ['CVE-2026-1234'],
        summary: 'Example advisory',
        cvssScore: 9.8,
        affectedComponents: 2,
        affectedSystems: 4
      }],
      refreshCoverage: {
        totalComponents: 20,
        refreshedComponents: 15,
        staleComponents: 3,
        neverCheckedComponents: 5,
        failedItems: 2
      },
      criticalSystemsAtRisk: {
        systems: 3,
        criticalSystems: 1,
        highSystems: 2,
        affectedComponents: 4
      }
    })
  })

  it('enqueues one item per component linked to a system', async () => {
    if (!ctx.neo4jAvailable) return

    await session.run(`
      CREATE (s:System {name: $systemName})
      CREATE (a:Component {name: $componentAName, version: '1.0.0', packageManager: 'npm', purl: $componentAPurl})
      CREATE (b:Component {name: $componentBName, version: '2.0.0', packageManager: 'npm', purl: $componentBPurl})
      CREATE (other:Component {name: $otherName, version: '3.0.0', packageManager: 'npm', purl: $otherPurl})
      CREATE (s)-[:USES]->(a)
      CREATE (s)-[:USES]->(b)
    `, {
      systemName: `${PREFIX}system`,
      componentAName: `${PREFIX}a`,
      componentAPurl: `${PREFIX}pkg:a@1.0.0`,
      componentBName: `${PREFIX}b`,
      componentBPurl: `${PREFIX}pkg:b@2.0.0`,
      otherName: `${PREFIX}other`,
      otherPurl: `${PREFIX}pkg:other@3.0.0`
    })

    const jobId = await repo.enqueueForSystem(`${PREFIX}system`)
    const job = await repo.findById(jobId)

    expect(job).toMatchObject({
      id: jobId,
      status: 'queued',
      trigger: 'sbom_import',
      systemName: `${PREFIX}system`,
      totalItems: 2
    })
    expect(job?.items.map(item => item.componentPurl).sort()).toEqual([
      `${PREFIX}pkg:a@1.0.0`,
      `${PREFIX}pkg:b@2.0.0`
    ])
  })

  it('upserts mutable snapshots and replaces stale advisory relationships', async () => {
    if (!ctx.neo4jAvailable) return

    await session.run(`
      CREATE (c:Component {name: $componentName, version: '1.0.0', packageManager: 'npm', purl: $componentPurl})
      CREATE (stale:Advisory {id: $staleAdvisoryId, aliases: [], source: 'OSV.dev'})
      CREATE (c)-[:HAS_ADVISORY {observedAt: datetime()}]->(stale)
    `, {
      componentName: `${PREFIX}component`,
      componentPurl: `${PREFIX}pkg:component@1.0.0`,
      staleAdvisoryId: `${PREFIX}GHSA-stale`
    })

    await repo.upsertHealthSnapshot({
      componentPurl: `${PREFIX}pkg:component@1.0.0`,
      componentName: `${PREFIX}component`,
      values: {
        eolStatus: 'active',
        eolSource: 'endoflife.date',
        vulnerabilityTotal: 1,
        vulnerabilityCritical: 1,
        vulnerabilitySource: 'OSV.dev'
      },
      advisories: [{
        id: `${PREFIX}GHSA-current`,
        aliases: [`${PREFIX}CVE-2026-1234`],
        summary: 'Current advisory',
        cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
        cvssScore: 9.8,
        advisoryUrl: 'https://osv.dev/vulnerability/GHSA-current',
        publishedAt: '2026-05-01T00:00:00Z',
        modifiedAt: '2026-05-02T00:00:00Z',
        source: 'OSV.dev'
      }]
    })

    const result = await session.run(`
      MATCH (c:Component {purl: $componentPurl})-[:HAS_HEALTH_SNAPSHOT]->(h:HealthSnapshot)
      OPTIONAL MATCH (c)-[:HAS_ADVISORY]->(a:Advisory)
      RETURN h, collect(a.id) AS advisoryIds
    `, {
      componentPurl: `${PREFIX}pkg:component@1.0.0`
    })

    const snapshot = result.records[0]?.get('h').properties
    expect(snapshot).toMatchObject({
      componentPurl: `${PREFIX}pkg:component@1.0.0`,
      componentName: `${PREFIX}component`,
      eolStatus: 'active',
      eolSource: 'endoflife.date',
      vulnerabilityTotal: 1,
      vulnerabilityCritical: 1,
      vulnerabilitySource: 'OSV.dev'
    })
    expect(result.records[0]?.get('advisoryIds')).toEqual([`${PREFIX}GHSA-current`])
  })
})
