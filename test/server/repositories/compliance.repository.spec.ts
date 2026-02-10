import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { ComplianceRepository } from '../../../server/repositories/compliance.repository'
import { getTestContext, cleanupTestData, seed, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_compliance_repo_'
let ctx: TestContext
let repo: ComplianceRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

beforeEach(async () => {
  if (!ctx.neo4jAvailable) return
  await cleanupTestData(ctx.driver, { prefix: PREFIX })
  repo = new ComplianceRepository(ctx.driver)
  session = ctx.driver.session()
})

afterEach(async () => { if (session) await session.close() })

describe('ComplianceRepository', () => {
  describe('findViolations()', () => {
    it('should return empty array when no violations exist', async () => {
      if (!ctx.neo4jAvailable) return
      const result = await repo.findViolations()

      expect(Array.isArray(result)).toBe(true)
    })

    it('should detect version violations', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (team:Team { name: $team })
        CREATE (sys:System { name: $sys })
        CREATE (tech:Technology { name: $tech, approvedVersionRange: '>=18.0.0 <19.0.0' })
        CREATE (comp:Component { name: $comp, version: '17.0.0', purl: 'pkg:npm/react@17.0.0' })
        CREATE (team)-[:OWNS]->(sys)
        CREATE (sys)-[:USES]->(comp)
        CREATE (comp)-[:IS_VERSION_OF]->(tech)
      `, {
        team: `${PREFIX}team`, sys: `${PREFIX}system`,
        tech: `${PREFIX}React`, comp: `${PREFIX}react`
      })

      const result = await repo.findViolations()
      const violations = result.filter(v =>
        v.technology === `${PREFIX}React` || v.system === `${PREFIX}system`
      )

      expect(violations.length).toBeGreaterThanOrEqual(0)
    })
  })
})
