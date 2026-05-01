import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { TeamRepository } from '../../../server/repositories/team.repository'
import { getTestContext, cleanupTestData, seed, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_team_repo_'
let ctx: TestContext
let repo: TeamRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

beforeEach(async () => {
  if (!ctx.neo4jAvailable) return
  await cleanupTestData(ctx.driver, { prefix: PREFIX })
  repo = new TeamRepository(ctx.driver)
  session = ctx.driver.session()
})

afterEach(async () => { if (session) await session.close() })

describe('TeamRepository', () => {
  describe('findAll()', () => {
    it('should return teams', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Team { name: $t1, responsibilityArea: 'Backend' })
        CREATE (:Team { name: $t2, responsibilityArea: 'Frontend' })
      `, { t1: `${PREFIX}backend`, t2: `${PREFIX}frontend` })

      const { data } = await repo.findAll()
      const test = data.filter(t => t.name.startsWith(PREFIX))

      expect(test.length).toBeGreaterThanOrEqual(2)
    })

    it('should return correct memberCount', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Team { name: $team })
        CREATE (u1:User { id: $u1, email: $e1, name: 'Member 1', role: 'user', provider: 'github', createdAt: datetime() })
        CREATE (u2:User { id: $u2, email: $e2, name: 'Member 2', role: 'user', provider: 'github', createdAt: datetime() })
        CREATE (u1)-[:MEMBER_OF]->(t)
        CREATE (u2)-[:MEMBER_OF]->(t)
      `, {
        team: `${PREFIX}counted`,
        u1: `${PREFIX}member1`, e1: `${PREFIX}m1@test.com`,
        u2: `${PREFIX}member2`, e2: `${PREFIX}m2@test.com`
      })

      const { data } = await repo.findAll()
      const team = data.find(t => t.name === `${PREFIX}counted`)

      expect(team).toBeDefined()
      expect(team!.memberCount).toBe(2)
    })

    it('should return 0 memberCount for team with no members', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Team { name: $team })
      `, { team: `${PREFIX}empty` })

      const { data } = await repo.findAll()
      const team = data.find(t => t.name === `${PREFIX}empty`)

      expect(team).toBeDefined()
      expect(team!.memberCount).toBe(0)
    })
  })

  describe('findByName()', () => {
    it('should return null for non-existent team', async () => {
      if (!ctx.neo4jAvailable) return
      expect(await repo.findByName(`${PREFIX}nonexistent`)).toBeNull()
    })

    it('should return team when it exists', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `CREATE (:Team { name: $n, responsibilityArea: 'Platform' })`, { n: `${PREFIX}platform` })

      const team = await repo.findByName(`${PREFIX}platform`)

      expect(team).not.toBeNull()
      expect(team!.name).toBe(`${PREFIX}platform`)
    })
  })

  describe('exists()', () => {
    it('should return false for non-existent team', async () => {
      if (!ctx.neo4jAvailable) return
      expect(await repo.exists(`${PREFIX}nonexistent`)).toBe(false)
    })

    it('should return true for existing team', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `CREATE (:Team { name: $n })`, { n: `${PREFIX}exists` })

      expect(await repo.exists(`${PREFIX}exists`)).toBe(true)
    })
  })

  describe('countOwnedSystems()', () => {
    it('should return 0 when team owns no systems', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `CREATE (:Team { name: $n })`, { n: `${PREFIX}no-systems` })

      expect(await repo.countOwnedSystems(`${PREFIX}no-systems`)).toBe(0)
    })

    it('should count owned systems', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Team { name: $team })
        CREATE (s1:System { name: $s1 })
        CREATE (s2:System { name: $s2 })
        CREATE (t)-[:OWNS]->(s1)
        CREATE (t)-[:OWNS]->(s2)
      `, { team: `${PREFIX}owner`, s1: `${PREFIX}sys1`, s2: `${PREFIX}sys2` })

      expect(await repo.countOwnedSystems(`${PREFIX}owner`)).toBe(2)
    })
  })

  describe('delete()', () => {
    it('should delete a team', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `CREATE (:Team { name: $n })`, { n: `${PREFIX}to-delete` })

      expect(await repo.exists(`${PREFIX}to-delete`)).toBe(true)
      await repo.delete(`${PREFIX}to-delete`, 'test-user', {})
      expect(await repo.exists(`${PREFIX}to-delete`)).toBe(false)
    })
  })

  describe('findAllNames()', () => {
    it('should return all team names', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Team { name: $t1 })
        CREATE (:Team { name: $t2 })
      `, { t1: `${PREFIX}names-a`, t2: `${PREFIX}names-b` })

      const names = await repo.findAllNames()
      expect(names).toContain(`${PREFIX}names-a`)
      expect(names).toContain(`${PREFIX}names-b`)
    })
  })

  describe('ownsSystem()', () => {
    it('should return true when one of the teams owns the system', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Team { name: $team })
        CREATE (s:System { name: $sys })
        CREATE (t)-[:OWNS]->(s)
      `, { team: `${PREFIX}own-team`, sys: `${PREFIX}own-sys` })

      const result = await repo.ownsSystem([`${PREFIX}own-team`], `${PREFIX}own-sys`)
      expect(result).toBe(true)
    })

    it('should return false when none of the teams own the system', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Team { name: $team })
        CREATE (s:System { name: $sys })
      `, { team: `${PREFIX}no-own-team`, sys: `${PREFIX}no-own-sys` })

      const result = await repo.ownsSystem([`${PREFIX}no-own-team`], `${PREFIX}no-own-sys`)
      expect(result).toBe(false)
    })
  })

  describe('stewardsTechnology()', () => {
    it('should return true when one of the teams stewards the technology', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Team { name: $team })
        CREATE (tech:Technology { name: $tech })
        CREATE (t)-[:STEWARDED_BY]->(tech)
      `, { team: `${PREFIX}stew-team`, tech: `${PREFIX}stew-tech` })

      const result = await repo.stewardsTechnology([`${PREFIX}stew-team`], `${PREFIX}stew-tech`)
      expect(result).toBe(true)
    })

    it('should return false when none of the teams steward the technology', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Team { name: $team })
        CREATE (tech:Technology { name: $tech })
      `, { team: `${PREFIX}no-stew-team`, tech: `${PREFIX}no-stew-tech` })

      const result = await repo.stewardsTechnology([`${PREFIX}no-stew-team`], `${PREFIX}no-stew-tech`)
      expect(result).toBe(false)
    })
  })
})
