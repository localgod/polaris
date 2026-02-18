import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { SystemRepository } from '../../../server/repositories/system.repository'
import { getTestContext, cleanupTestData, seed, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_system_repo_'
let ctx: TestContext
let repo: SystemRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

beforeEach(async () => {
  if (!ctx.neo4jAvailable) return
  await cleanupTestData(ctx.driver, { prefix: PREFIX })
  repo = new SystemRepository(ctx.driver)
  session = ctx.driver.session()
})

afterEach(async () => { if (session) await session.close() })

describe('SystemRepository', () => {
  describe('findAll()', () => {
    it('should return systems with required properties', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:System {
          name: $name, domain: 'Platform', ownerTeam: 'Platform Team',
          businessCriticality: 'high', environment: 'prod'
        })
      `, { name: `${PREFIX}polaris-api` })

      const result = await repo.findAll()
      const sys = result.find(s => s.name === `${PREFIX}polaris-api`)

      expect(sys).toBeDefined()
      expect(sys!).toHaveProperty('name')
      expect(sys!).toHaveProperty('domain')
      expect(sys!).toHaveProperty('businessCriticality')
      expect(sys!).toHaveProperty('componentCount')
      expect(sys!).toHaveProperty('repositoryCount')
    })

    it('should return multiple systems', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:System { name: $n1, domain: 'Test', businessCriticality: 'low' })
        CREATE (:System { name: $n2, domain: 'Test', businessCriticality: 'critical' })
        CREATE (:System { name: $n3, domain: 'Test', businessCriticality: 'high' })
      `, { n1: `${PREFIX}low`, n2: `${PREFIX}critical`, n3: `${PREFIX}high` })

      const result = await repo.findAll()
      const test = result.filter(s => s.name.startsWith(PREFIX))

      expect(test.length).toBe(3)
    })
  })

  describe('findByName()', () => {
    it('should return null for non-existent system', async () => {
      if (!ctx.neo4jAvailable) return
      expect(await repo.findByName(`${PREFIX}nonexistent`)).toBeNull()
    })

    it('should return system with team and counts', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        MERGE (team:Team { name: $team })
        CREATE (s:System { name: $name, domain: 'Platform', businessCriticality: 'medium', environment: 'dev' })
        CREATE (team)-[:OWNS]->(s)
        CREATE (c1:Component { name: $c1, version: '1.0.0' })
        CREATE (c2:Component { name: $c2, version: '2.0.0' })
        MERGE (r:Repository { url: $url }) ON CREATE SET r.name = 'repo'
        CREATE (s)-[:USES]->(c1)
        CREATE (s)-[:USES]->(c2)
        CREATE (s)-[:HAS_SOURCE_IN]->(r)
      `, {
        name: `${PREFIX}test-system`, team: `${PREFIX}Platform Team`,
        c1: `${PREFIX}comp1`, c2: `${PREFIX}comp2`,
        url: `https://github.com/test/${PREFIX}repo`
      })

      const sys = await repo.findByName(`${PREFIX}test-system`)

      expect(sys).not.toBeNull()
      expect(sys!.name).toBe(`${PREFIX}test-system`)
      expect(sys!.ownerTeam).toBe(`${PREFIX}Platform Team`)
      expect(sys!.componentCount).toBe(2)
      expect(sys!.repositoryCount).toBe(1)
    })
  })

  describe('exists()', () => {
    it('should return false for non-existent system', async () => {
      if (!ctx.neo4jAvailable) return
      expect(await repo.exists(`${PREFIX}nonexistent`)).toBe(false)
    })

    it('should return true for existing system', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `CREATE (:System { name: $name, domain: 'Test' })`, { name: `${PREFIX}exists` })

      expect(await repo.exists(`${PREFIX}exists`)).toBe(true)
    })
  })

  describe('create()', () => {
    it('should create a system and return its name', async () => {
      if (!ctx.neo4jAvailable) return
      const name = await repo.create({
        name: `${PREFIX}new-system`, domain: 'Platform',
        ownerTeam: 'Platform Team', businessCriticality: 'high',
        environment: 'prod', repositories: [], userId: 'test-user'
      })

      expect(name).toBe(`${PREFIX}new-system`)
      expect(await repo.exists(`${PREFIX}new-system`)).toBe(true)
    })

    it('should create system with all properties', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `MERGE (:Team { name: $t })`, { t: `${PREFIX}Customer Team` })

      await repo.create({
        name: `${PREFIX}full`, domain: 'Customer',
        ownerTeam: `${PREFIX}Customer Team`, businessCriticality: 'critical',
        environment: 'staging', repositories: [], userId: 'test-user'
      })

      const sys = await repo.findByName(`${PREFIX}full`)

      expect(sys).not.toBeNull()
      expect(sys!.domain).toBe('Customer')
      expect(sys!.ownerTeam).toBe(`${PREFIX}Customer Team`)
      expect(sys!.businessCriticality).toBe('critical')
    })
  })

  describe('delete()', () => {
    it('should delete an existing system', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `CREATE (:System { name: $name, domain: 'Test' })`, { name: `${PREFIX}to-delete` })

      expect(await repo.exists(`${PREFIX}to-delete`)).toBe(true)
      await repo.delete(`${PREFIX}to-delete`, 'test-user')
      expect(await repo.exists(`${PREFIX}to-delete`)).toBe(false)
    })

    it('should remove relationships but keep related nodes', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (s:System { name: $sys, domain: 'Test' })
        CREATE (c:Component { name: $comp, version: '1.0.0' })
        CREATE (s)-[:USES]->(c)
      `, { sys: `${PREFIX}sys-rels`, comp: `${PREFIX}comp` })

      await repo.delete(`${PREFIX}sys-rels`, 'test-user')

      const result = await session.run(`
        MATCH (c:Component { name: $comp })
        OPTIONAL MATCH (c)<-[r:USES]-()
        RETURN c, r
      `, { comp: `${PREFIX}comp` })

      expect(result.records.length).toBe(1)
      expect(result.records[0].get('c')).not.toBeNull()
      expect(result.records[0].get('r')).toBeNull()
    })
  })

  describe('findUnmappedComponents()', () => {
    it('should return only unmapped components for a system', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (s:System { name: $sys, domain: 'Test' })
        MERGE (t:Technology { name: $tech })
        CREATE (c1:Component { name: $mapped, version: '18.0.0', packageManager: 'npm', purl: 'pkg:npm/react@18.0.0' })
        CREATE (c2:Component { name: $unmapped, version: '1.0.0', packageManager: 'npm', purl: 'pkg:npm/unknown@1.0.0' })
        CREATE (s)-[:USES]->(c1)
        CREATE (s)-[:USES]->(c2)
        CREATE (c1)-[:IS_VERSION_OF]->(t)
      `, {
        sys: `${PREFIX}sys-unmapped`, tech: `${PREFIX}React`,
        mapped: `${PREFIX}react`, unmapped: `${PREFIX}unknown`
      })

      const result = await repo.findUnmappedComponents(`${PREFIX}sys-unmapped`)

      expect(result.system).toBe(`${PREFIX}sys-unmapped`)
      expect(result.count).toBe(result.components.length)
      const names = result.components.map(c => c.name)
      expect(names).toContain(`${PREFIX}unknown`)
      expect(names).not.toContain(`${PREFIX}react`)
    })
  })
})
