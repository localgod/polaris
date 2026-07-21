import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { PlatformRepository } from '../../../server/repositories/platform.repository'
import { getTestContext, cleanupTestData, seed, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_platform_repo_'
let ctx: TestContext
let repo: PlatformRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

beforeEach(async () => {
  if (!ctx.neo4jAvailable) return
  await cleanupTestData(ctx.driver, { prefix: PREFIX })
  repo = new PlatformRepository(ctx.driver)
  session = ctx.driver.session()
})

afterEach(async () => { if (session) await session.close() })

describe('PlatformRepository', () => {
  describe('[contract] create()', () => {
    it('should create a Platform with no Component required', async () => {
      if (!ctx.neo4jAvailable) return

      const name = await repo.create({
        name: `${PREFIX}PostgreSQL`,
        type: 'platform',
        domain: 'data-platform',
        vendor: 'PostgreSQL Global Development Group',
        stewardTeam: null,
        userId: 'test-user'
      })

      expect(name).toBe(`${PREFIX}PostgreSQL`)
      expect(await repo.exists(`${PREFIX}PostgreSQL`)).toBe(true)
    })

    it('should link the steward team via STEWARDED_BY when provided', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `CREATE (:Team { name: $team })`, { team: `${PREFIX}DataTeam` })

      await repo.create({
        name: `${PREFIX}Redis`,
        type: 'platform',
        domain: 'data-platform',
        vendor: null,
        stewardTeam: `${PREFIX}DataTeam`,
        userId: 'test-user'
      })

      const { records } = await session.run(
        `MATCH (team:Team {name: $team})-[:STEWARDED_BY]->(p:Platform {name: $name}) RETURN count(p) AS linked`,
        { team: `${PREFIX}DataTeam`, name: `${PREFIX}Redis` }
      )
      expect(records[0]!.get('linked').toNumber()).toBe(1)
    })
  })

  describe('[pin] findAll()', () => {
    it('should return platforms', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Platform { name: $p1, type: 'platform', domain: 'data-platform' })
        CREATE (:Platform { name: $p2, type: 'container', domain: 'infrastructure' })
      `, { p1: `${PREFIX}MongoDB`, p2: `${PREFIX}Docker` })

      const { data } = await repo.findAll()
      const test = data.filter(p => p.name.startsWith(PREFIX))

      expect(test.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('[pin] findByName()', () => {
    it('should return null for non-existent platform', async () => {
      if (!ctx.neo4jAvailable) return
      expect(await repo.findByName(`${PREFIX}nonexistent`)).toBeNull()
    })

    it('should return platform with steward team details', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (p:Platform { name: $name, type: 'platform', domain: 'data-platform', vendor: 'Neo4j Inc.' })
        CREATE (team:Team { name: $team, email: $email })
        CREATE (team)-[:STEWARDED_BY]->(p)
      `, { name: `${PREFIX}Neo4j`, team: `${PREFIX}Platform`, email: 'platform@test.com' })

      const platform = await repo.findByName(`${PREFIX}Neo4j`)

      expect(platform).not.toBeNull()
      expect(platform!.name).toBe(`${PREFIX}Neo4j`)
      expect(platform!.stewardTeamName).toBe(`${PREFIX}Platform`)
      expect(platform!.stewardTeamEmail).toBe('platform@test.com')
    })
  })

  describe('[pin] findStewardTeam()', () => {
    it('should return null steward when none assigned', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `CREATE (:Platform { name: $name, type: 'platform' })`, { name: `${PREFIX}Solo` })

      const result = await repo.findStewardTeam(`${PREFIX}Solo`)

      expect(result?.stewardTeam).toBeNull()
    })
  })

  describe('[pin] update()', () => {
    it('should update properties and swap the steward team', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (p:Platform { name: $name, type: 'platform', domain: 'data-platform', vendor: 'Old Vendor' })
        CREATE (oldTeam:Team { name: $oldTeam })
        CREATE (newTeam:Team { name: $newTeam })
        CREATE (oldTeam)-[:STEWARDED_BY]->(p)
      `, { name: `${PREFIX}MySQL`, oldTeam: `${PREFIX}OldTeam`, newTeam: `${PREFIX}NewTeam` })

      await repo.update({
        name: `${PREFIX}MySQL`,
        type: 'platform',
        domain: 'data-platform',
        vendor: 'New Vendor',
        stewardTeam: `${PREFIX}NewTeam`,
        userId: 'test-user',
        realUserId: null,
        changes: {}
      })

      const platform = await repo.findByName(`${PREFIX}MySQL`)
      expect(platform!.vendor).toBe('New Vendor')
      expect(platform!.stewardTeamName).toBe(`${PREFIX}NewTeam`)
    })

    it('should throw 404 when updating a non-existent platform', async () => {
      if (!ctx.neo4jAvailable) return

      await expect(repo.update({
        name: `${PREFIX}Ghost`,
        type: 'platform',
        domain: null,
        vendor: null,
        stewardTeam: null,
        userId: 'test-user',
        realUserId: null,
        changes: {}
      })).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  describe('[pin] delete()', () => {
    it('should delete a platform', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `CREATE (:Platform { name: $name, type: 'platform' })`, { name: `${PREFIX}ToDelete` })

      await repo.delete(`${PREFIX}ToDelete`, 'test-user', {})

      expect(await repo.exists(`${PREFIX}ToDelete`)).toBe(false)
    })
  })

  describe('[pin] upsertApproval() / findExistingApproval()', () => {
    it('should create then update a blanket approval', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Platform { name: $platform, type: 'platform' })
        CREATE (:Team { name: $team })
      `, { platform: `${PREFIX}Kafka`, team: `${PREFIX}Backend` })

      await repo.upsertApproval({
        platformName: `${PREFIX}Kafka`,
        teamName: `${PREFIX}Backend`,
        time: 'tolerate',
        notes: 'initial',
        environment: null,
        userId: 'test-user',
        realUserId: null,
        changes: {}
      })

      let existing = await repo.findExistingApproval(`${PREFIX}Kafka`, `${PREFIX}Backend`, null)
      expect(existing?.time).toBe('tolerate')

      await repo.upsertApproval({
        platformName: `${PREFIX}Kafka`,
        teamName: `${PREFIX}Backend`,
        time: 'invest',
        notes: 'upgraded',
        environment: null,
        userId: 'test-user',
        realUserId: null,
        changes: {}
      })

      existing = await repo.findExistingApproval(`${PREFIX}Kafka`, `${PREFIX}Backend`, null)
      expect(existing?.time).toBe('invest')
      expect(existing?.notes).toBe('upgraded')
    })
  })
})
