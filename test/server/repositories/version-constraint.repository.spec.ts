import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { VersionConstraintRepository } from '../../../server/repositories/version-constraint.repository'
import { getTestContext, cleanupTestData, seed, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_vc_repo_'
let ctx: TestContext
let repo: VersionConstraintRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

beforeEach(async () => {
  if (!ctx.neo4jAvailable) return
  await cleanupTestData(ctx.driver, { prefix: PREFIX })
  repo = new VersionConstraintRepository(ctx.driver)
  session = ctx.driver.session()
})

afterEach(async () => { if (session) await session.close() })

describe('VersionConstraintRepository', () => {
  describe('findAll()', () => {
    it('should return constraints', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:VersionConstraint {
          name: $name, severity: 'warning',
          status: 'active', scope: 'organization', versionRange: '>=18.0.0'
        })
      `, { name: `${PREFIX}test-vc` })

      const { data } = await repo.findAll()
      const test = data.filter(c => c.name.startsWith(PREFIX))

      expect(test.length).toBeGreaterThanOrEqual(1)
      expect(test[0].name).toBe(`${PREFIX}test-vc`)
    })
  })

  describe('findByName()', () => {
    it('should return null for non-existent constraint', async () => {
      if (!ctx.neo4jAvailable) return
      expect(await repo.findByName(`${PREFIX}nonexistent`)).toBeNull()
    })

    it('should return constraint with details', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:VersionConstraint {
          name: $name, description: 'Test description',
          severity: 'error', status: 'active', scope: 'organization',
          versionRange: '>=1.0.0'
        })
      `, { name: `${PREFIX}detail-vc` })

      const vc = await repo.findByName(`${PREFIX}detail-vc`)

      expect(vc).not.toBeNull()
      expect(vc!.name).toBe(`${PREFIX}detail-vc`)
      expect(vc!.description).toBe('Test description')
      expect(vc!.severity).toBe('error')
    })
  })

  describe('exists()', () => {
    it('should return false for non-existent constraint', async () => {
      if (!ctx.neo4jAvailable) return
      expect(await repo.exists(`${PREFIX}nonexistent`)).toBe(false)
    })

    it('should return true for existing constraint', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:VersionConstraint { name: $name, severity: 'info', status: 'draft', versionRange: '>=1.0.0' })
      `, { name: `${PREFIX}exists` })

      expect(await repo.exists(`${PREFIX}exists`)).toBe(true)
    })
  })

  describe('delete()', () => {
    it('should delete a constraint and its relationships', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (vc:VersionConstraint { name: $name, severity: 'info', status: 'draft', versionRange: '>=1.0.0' })
        CREATE (t:Team { name: $team })
        CREATE (t)-[:SUBJECT_TO]->(vc)
      `, { name: `${PREFIX}to-delete`, team: `${PREFIX}team` })

      expect(await repo.exists(`${PREFIX}to-delete`)).toBe(true)
      await repo.delete(`${PREFIX}to-delete`, 'test-user')
      expect(await repo.exists(`${PREFIX}to-delete`)).toBe(false)
    })
  })

  describe('getCreator()', () => {
    it('should return null when creator is missing', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:VersionConstraint { name: $name, severity: 'warning', status: 'active', versionRange: '>=1.0.0' })
      `, { name: `${PREFIX}no-creator` })

      await expect(repo.getCreator(`${PREFIX}no-creator`)).resolves.toBeNull()
    })

    it('should return creator id when present', async () => {
      if (!ctx.neo4jAvailable) return
      await repo.create({
        name: `${PREFIX}creator-vc`,
        severity: 'warning',
        versionRange: '>=1.0.0',
        userId: 'creator-user',
      })

      await expect(repo.getCreator(`${PREFIX}creator-vc`)).resolves.toBe('creator-user')
    })
  })

  describe('findViolations()', () => {
    it('should return violations and support directOnly/depScope filters', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (team:Team { name: $team })
        CREATE (sys:System { name: $sys })
        CREATE (compDirect:Component { name: $comp1, version: '1.0.0' })
        CREATE (compTransitive:Component { name: $comp2, version: '2.0.0' })
        CREATE (tech:Technology { name: $tech, type: 'library' })
        CREATE (vc:VersionConstraint { name: $vc, severity: 'critical', status: 'active', versionRange: '>=3.0.0' })
        CREATE (team)-[:OWNS]->(sys)
        CREATE (sys)-[:USES { isDirect: true, scope: 'runtime' }]->(compDirect)
        CREATE (sys)-[:USES { isDirect: false, scope: 'dev' }]->(compTransitive)
        CREATE (compDirect)-[:IS_VERSION_OF]->(tech)
        CREATE (compTransitive)-[:IS_VERSION_OF]->(tech)
        CREATE (team)-[:SUBJECT_TO]->(vc)
        CREATE (vc)-[:GOVERNS]->(tech)
      `, {
        team: `${PREFIX}team`,
        sys: `${PREFIX}system`,
        comp1: `${PREFIX}comp-direct`,
        comp2: `${PREFIX}comp-transitive`,
        tech: `${PREFIX}tech`,
        vc: `${PREFIX}vc-filter`,
      })

      const all = await repo.findViolations({ team: `${PREFIX}team` })
      const directOnly = await repo.findViolations({ team: `${PREFIX}team`, directOnly: true })
      const runtimeOnly = await repo.findViolations({ team: `${PREFIX}team`, depScope: 'runtime' })

      expect(all.length).toBeGreaterThanOrEqual(2)
      expect(directOnly.some(v => v.component === `${PREFIX}comp-direct`)).toBe(true)
      expect(directOnly.some(v => v.component === `${PREFIX}comp-transitive`)).toBe(false)
      expect(runtimeOnly.every(v => v.component === `${PREFIX}comp-direct`)).toBe(true)
    })
  })

  describe('update()', () => {
    it('should update fields and relink scope/governs relationships', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Team { name: $subjectTeam })
        CREATE (:Team { name: $otherTeam })
        CREATE (:Technology { name: $tech })
      `, {
        subjectTeam: `${PREFIX}subject`,
        otherTeam: `${PREFIX}other`,
        tech: `${PREFIX}tech`,
      })

      await repo.create({
        name: `${PREFIX}to-update`,
        severity: 'warning',
        scope: 'organization',
        versionRange: '>=1.0.0',
        userId: 'test-user',
      })

      const updated = await repo.update(`${PREFIX}to-update`, {
        description: 'updated desc',
        severity: 'error',
        scope: 'team',
        subjectTeam: `${PREFIX}subject`,
        versionRange: '>=2.0.0',
        governsTechnology: `${PREFIX}tech`,
        userId: 'test-user',
      })

      expect(updated.severity).toBe('error')
      expect(updated.scope).toBe('team')
      expect(updated.versionRange).toBe('>=2.0.0')
      expect(updated.governedTechnologies).toContain(`${PREFIX}tech`)

      const subjectCount = await session.run(
        `MATCH (:Team {name: $team})-[:SUBJECT_TO]->(:VersionConstraint {name: $name}) RETURN count(*) AS c`,
        { team: `${PREFIX}subject`, name: `${PREFIX}to-update` }
      )
      expect(subjectCount.records[0]!.get('c').toNumber()).toBe(1)
    })
  })
})
