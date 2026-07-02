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
        CREATE (:Technology { name: $t1, type: 'library', domain: 'developer-tooling' })
        CREATE (:Technology { name: $t2, type: 'framework', domain: 'framework' })
      `, { t1: `${PREFIX}TypeScript`, t2: `${PREFIX}Nuxt` })

      const { data } = await repo.findAll()
      const test = data.filter(t => t.name.startsWith(PREFIX))

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
        CREATE (t:Technology { name: $name, type: 'platform', domain: 'data-platform', vendor: 'Neo4j Inc.' })
        CREATE (team:Team { name: $team })
        CREATE (team)-[:STEWARDED_BY]->(t)
      `, { name: `${PREFIX}Neo4j`, team: `${PREFIX}Platform` })

      const tech = await repo.findByName(`${PREFIX}Neo4j`)

      expect(tech).not.toBeNull()
      expect(tech!.name).toBe(`${PREFIX}Neo4j`)
      expect(tech!.type).toBe('platform')
      expect(tech!.domain).toBe('data-platform')
      expect(tech!.ownerTeamName).toBe(`${PREFIX}Platform`)
    })
  })

  describe('createFromComponent()', () => {
    it('should create a Technology and link every unlinked Component sharing componentName', async () => {
      if (!ctx.neo4jAvailable) return
      const componentName = `${PREFIX}react`
      await seed(ctx.driver, `
        CREATE (:Component { purl: $purl1, name: $componentName, version: '18.2.0', packageManager: 'npm' })
        CREATE (:Component { purl: $purl2, name: $componentName, version: '17.0.0', packageManager: 'npm' })
      `, { purl1: `pkg:npm/${componentName}@18.2.0`, purl2: `pkg:npm/${componentName}@17.0.0`, componentName })

      const name = await repo.createFromComponent({
        name: `${PREFIX}React`,
        type: 'framework',
        domain: 'framework',
        vendor: 'Meta',
        ownerTeam: null,
        componentName,
        userId: 'test-user'
      })

      expect(name).toBe(`${PREFIX}React`)

      const { records } = await session.run(
        `MATCH (c:Component {name: $componentName})-[:IS_VERSION_OF]->(t:Technology {name: $name}) RETURN count(c) AS linked`,
        { componentName, name: `${PREFIX}React` }
      )
      expect(records[0]!.get('linked').toNumber()).toBe(2)
    })

    it('should throw when no unlinked component matches componentName', async () => {
      if (!ctx.neo4jAvailable) return

      await expect(repo.createFromComponent({
        name: `${PREFIX}Ghost`,
        type: 'framework',
        domain: null,
        vendor: null,
        ownerTeam: null,
        componentName: `${PREFIX}nonexistent`,
        userId: 'test-user'
      })).rejects.toMatchObject({ statusCode: 404 })

      expect(await repo.exists(`${PREFIX}Ghost`)).toBe(false)
    })

    it('should throw when the only matching component is already linked to another Technology', async () => {
      if (!ctx.neo4jAvailable) return
      const componentName = `${PREFIX}vue`
      await seed(ctx.driver, `
        CREATE (c:Component { purl: $purl, name: $componentName, version: '3.4.0', packageManager: 'npm' })
        CREATE (existing:Technology { name: $existingTech, type: 'framework' })
        CREATE (c)-[:IS_VERSION_OF]->(existing)
      `, { purl: `pkg:npm/${componentName}@3.4.0`, componentName, existingTech: `${PREFIX}Vue` })

      await expect(repo.createFromComponent({
        name: `${PREFIX}VueDuplicate`,
        type: 'framework',
        domain: null,
        vendor: null,
        ownerTeam: null,
        componentName,
        userId: 'test-user'
      })).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  describe('findExistingApproval()', () => {
    it('should return null when no APPROVES relationship exists', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Technology { name: $tech, type: 'library', domain: 'developer-tooling' })
        CREATE (:Team { name: $team })
      `, { tech: `${PREFIX}TypeScript`, team: `${PREFIX}Architects` })

      const result = await repo.findExistingApproval(`${PREFIX}TypeScript`, `${PREFIX}Architects`, null)

      expect(result).toBeNull()
    })

    it('should return { time, notes } when a blanket APPROVES relationship exists', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Technology { name: $tech, type: 'library', domain: 'developer-tooling' })
        CREATE (team:Team { name: $team })
        CREATE (team)-[:APPROVES { time: $time, notes: $notes }]->(t)
      `, {
        tech: `${PREFIX}TypeScript`,
        team: `${PREFIX}Architects`,
        time: '2024-01-15',
        notes: 'Approved after review'
      })

      const result = await repo.findExistingApproval(`${PREFIX}TypeScript`, `${PREFIX}Architects`, null)

      expect(result).not.toBeNull()
      expect(result!.time).toBe('2024-01-15')
      expect(result!.notes).toBe('Approved after review')
    })

    it('should return null when only a different environment approval exists', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Technology { name: $tech, type: 'library', domain: 'developer-tooling' })
        CREATE (team:Team { name: $team })
        CREATE (team)-[:APPROVES { time: 'invest', environment: 'dev' }]->(t)
      `, { tech: `${PREFIX}TypeScript`, team: `${PREFIX}Architects` })

      const result = await repo.findExistingApproval(`${PREFIX}TypeScript`, `${PREFIX}Architects`, 'prod')

      expect(result).toBeNull()
    })
  })
})
