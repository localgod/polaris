import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { TechnologyRepository } from '../../../server/repositories/technology.repository'
import { getTestContext, cleanupTestData, seed, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_tech_repo_'
let ctx: TestContext
let repo: TechnologyRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

beforeEach(async () => {
  if (!ctx.neo4jAvailable) return
  await cleanupTestData(ctx.driver, { prefix: PREFIX })
  repo = new TechnologyRepository(ctx.driver)
  session = ctx.driver.session()
})

afterEach(async () => { if (session) await session.close() })

describe('TechnologyRepository', () => {
  describe('findAll()', () => {
    it('should return technologies', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Technology { name: $t1, category: 'language' })
        CREATE (:Technology { name: $t2, category: 'framework' })
      `, { t1: `${PREFIX}TypeScript`, t2: `${PREFIX}Nuxt` })

      const result = await repo.findAll()
      const test = result.filter(t => t.name.startsWith(PREFIX))

      expect(test.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('findByName()', () => {
    it('should return null for non-existent technology', async () => {
      if (!ctx.neo4jAvailable) return
      expect(await repo.findByName(`${PREFIX}nonexistent`)).toBeNull()
    })

    it('should return technology with details', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Technology { name: $name, category: 'database', vendor: 'Neo4j Inc.' })
        CREATE (team:Team { name: $team })
        CREATE (team)-[:OWNS]->(t)
      `, { name: `${PREFIX}Neo4j`, team: `${PREFIX}Platform` })

      const tech = await repo.findByName(`${PREFIX}Neo4j`)

      expect(tech).not.toBeNull()
      expect(tech!.name).toBe(`${PREFIX}Neo4j`)
      expect(tech!.category).toBe('database')
    })
  })
})
