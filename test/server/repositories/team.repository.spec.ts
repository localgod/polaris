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

      const result = await repo.findAll()
      const test = result.filter(t => t.name.startsWith(PREFIX))

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

      const result = await repo.findAll()
      const team = result.find(t => t.name === `${PREFIX}counted`)

      expect(team).toBeDefined()
      expect(team!.memberCount).toBe(2)
    })

    it('should return 0 memberCount for team with no members', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Team { name: $team })
      `, { team: `${PREFIX}empty` })

      const result = await repo.findAll()
      const team = result.find(t => t.name === `${PREFIX}empty`)

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
      await repo.delete(`${PREFIX}to-delete`)
      expect(await repo.exists(`${PREFIX}to-delete`)).toBe(false)
    })
  })
})
