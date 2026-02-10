import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { PolicyRepository } from '../../../server/repositories/policy.repository'
import { getTestContext, cleanupTestData, seed, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_policy_license_'
let ctx: TestContext
let repo: PolicyRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })
afterEach(async () => { if (session) await session.close() })

describe('PolicyRepository - License Compliance', () => {
  beforeEach(async () => {
    if (!ctx.neo4jAvailable) return
    await cleanupTestData(ctx.driver, { prefix: PREFIX })
    repo = new PolicyRepository(ctx.driver)
    session = ctx.driver.session()
  })

  describe('findLicenseViolations()', () => {
    it('should return empty array when no violations exist', async () => {
      if (!ctx.neo4jAvailable) return
      const result = await repo.findLicenseViolations({})

      expect(Array.isArray(result)).toBe(true)
    })

    it('should detect license violations', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (team:Team { name: $team })
        CREATE (sys:System { name: $sys })
        CREATE (comp:Component { name: $comp, version: '1.0.0', purl: 'pkg:npm/test@1.0.0' })
        CREATE (gpl:License { id: $gplId, name: 'GPL-3.0', category: 'copyleft', osiApproved: true })
        CREATE (mit:License { id: $mitId, name: 'MIT', category: 'permissive', osiApproved: true })
        CREATE (policy:Policy {
          name: $policy, description: 'Only permissive', ruleType: 'license-compliance',
          severity: 'error', status: 'active', enforcedBy: 'organization', scope: 'all'
        })
        CREATE (team)-[:OWNS]->(sys)
        CREATE (sys)-[:USES]->(comp)
        CREATE (comp)-[:HAS_LICENSE]->(gpl)
        CREATE (team)-[:SUBJECT_TO]->(policy)
        CREATE (policy)-[:ALLOWS_LICENSE]->(mit)
      `, {
        team: `${PREFIX}team`, sys: `${PREFIX}system`, comp: `${PREFIX}component`,
        gplId: `${PREFIX}GPL-3.0`, mitId: `${PREFIX}MIT`, policy: `${PREFIX}permissive-only`
      })

      const result = await repo.findLicenseViolations({})
      const violations = result.filter(v => v.team.startsWith(PREFIX))

      expect(violations.length).toBeGreaterThanOrEqual(1)
      expect(violations[0].team).toBe(`${PREFIX}team`)
      expect(violations[0].system).toBe(`${PREFIX}system`)
      expect(violations[0].component.name).toBe(`${PREFIX}component`)
      expect(violations[0].license.id).toBe(`${PREFIX}GPL-3.0`)
      expect(violations[0].policy.name).toBe(`${PREFIX}permissive-only`)
    })

    it('should not report violations for allowed licenses', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (team:Team { name: $team })
        CREATE (sys:System { name: $sys })
        CREATE (comp:Component { name: $comp, version: '1.0.0', purl: 'pkg:npm/test@1.0.0' })
        CREATE (mit:License { id: $mitId, name: 'MIT', category: 'permissive', osiApproved: true })
        CREATE (policy:Policy {
          name: $policy, description: 'Only permissive', ruleType: 'license-compliance',
          severity: 'error', status: 'active', enforcedBy: 'organization', scope: 'all'
        })
        CREATE (team)-[:OWNS]->(sys)
        CREATE (sys)-[:USES]->(comp)
        CREATE (comp)-[:HAS_LICENSE]->(mit)
        CREATE (team)-[:SUBJECT_TO]->(policy)
        CREATE (policy)-[:ALLOWS_LICENSE]->(mit)
      `, {
        team: `${PREFIX}team2`, sys: `${PREFIX}system2`, comp: `${PREFIX}component2`,
        mitId: `${PREFIX}MIT`, policy: `${PREFIX}permissive-only2`
      })

      const result = await repo.findLicenseViolations({})
      const violations = result.filter(v => v.team === `${PREFIX}team2`)

      expect(violations.length).toBe(0)
    })

    it('should filter by severity', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (team:Team { name: $team })
        CREATE (sys:System { name: $sys })
        CREATE (comp:Component { name: $comp, version: '1.0.0', purl: 'pkg:npm/test@1.0.0' })
        CREATE (gpl:License { id: $gplId, name: 'GPL-3.0', category: 'copyleft', osiApproved: true })
        CREATE (mit:License { id: $mitId, name: 'MIT', category: 'permissive', osiApproved: true })
        CREATE (cp:Policy {
          name: $cp, ruleType: 'license-compliance', severity: 'critical',
          status: 'active', enforcedBy: 'organization', scope: 'all'
        })
        CREATE (wp:Policy {
          name: $wp, ruleType: 'license-compliance', severity: 'warning',
          status: 'active', enforcedBy: 'organization', scope: 'all'
        })
        CREATE (team)-[:OWNS]->(sys)
        CREATE (sys)-[:USES]->(comp)
        CREATE (comp)-[:HAS_LICENSE]->(gpl)
        CREATE (team)-[:SUBJECT_TO]->(cp)
        CREATE (team)-[:SUBJECT_TO]->(wp)
        CREATE (cp)-[:ALLOWS_LICENSE]->(mit)
        CREATE (wp)-[:ALLOWS_LICENSE]->(mit)
      `, {
        team: `${PREFIX}team3`, sys: `${PREFIX}system3`, comp: `${PREFIX}component3`,
        gplId: `${PREFIX}GPL-3.0-2`, mitId: `${PREFIX}MIT-2`,
        cp: `${PREFIX}critical-policy`, wp: `${PREFIX}warning-policy`
      })

      const result = await repo.findLicenseViolations({ severity: 'critical' })
      const violations = result.filter(v => v.team === `${PREFIX}team3`)

      expect(violations.length).toBeGreaterThanOrEqual(1)
      expect(violations[0].policy.severity).toBe('critical')
    })

    it('should filter by team', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (team:Team { name: $team })
        CREATE (sys:System { name: $sys })
        CREATE (comp:Component { name: $comp, version: '1.0.0', purl: 'pkg:npm/test@1.0.0' })
        CREATE (gpl:License { id: $gplId, name: 'GPL-3.0', category: 'copyleft', osiApproved: true })
        CREATE (mit:License { id: $mitId, name: 'MIT', category: 'permissive', osiApproved: true })
        CREATE (policy:Policy {
          name: $policy, ruleType: 'license-compliance', severity: 'error',
          status: 'active', enforcedBy: 'team', scope: 'specific-teams'
        })
        CREATE (team)-[:OWNS]->(sys)
        CREATE (sys)-[:USES]->(comp)
        CREATE (comp)-[:HAS_LICENSE]->(gpl)
        CREATE (team)-[:SUBJECT_TO]->(policy)
        CREATE (policy)-[:ALLOWS_LICENSE]->(mit)
      `, {
        team: `${PREFIX}specific-team`, sys: `${PREFIX}system4`, comp: `${PREFIX}component4`,
        gplId: `${PREFIX}GPL-3.0-3`, mitId: `${PREFIX}MIT-3`, policy: `${PREFIX}team-policy`
      })

      const result = await repo.findLicenseViolations({ team: `${PREFIX}specific-team` })

      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result.every(v => v.team === `${PREFIX}specific-team`)).toBe(true)
    })
  })
})
