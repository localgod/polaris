import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { ComponentRepository } from '../../../server/repositories/component.repository'
import { getTestContext, cleanupTestData, seed, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_component_repo_'
let ctx: TestContext
let repo: ComponentRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

beforeEach(async () => {
  if (!ctx.neo4jAvailable) return
  await cleanupTestData(ctx.driver, { prefix: PREFIX })
  repo = new ComponentRepository(ctx.driver)
  session = ctx.driver.session()
})

afterEach(async () => { if (session) await session.close() })

describe('ComponentRepository', () => {
  describe('findAll()', () => {
    it('should return components with required properties', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Component {
          name: $name, version: '18.2.0', packageManager: 'npm',
          purl: $purl, type: 'library'
        })
      `, { name: `${PREFIX}react`, purl: `pkg:npm/${PREFIX}react@18.2.0` })

      const result = await repo.findAll()
      const comp = result.find(c => c.name === `${PREFIX}react`)

      expect(comp).toBeDefined()
      expect(comp!.name).toBe(`${PREFIX}react`)
      expect(comp!.version).toBe('18.2.0')
      expect(comp!.packageManager).toBe('npm')
      expect(comp!).toHaveProperty('hashes')
      expect(comp!).toHaveProperty('licenses')
    })

    it('should return correct data types', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Component {
          name: $name, version: '3.3.4', packageManager: 'npm',
          purl: $purl, type: 'library'
        })
      `, { name: `${PREFIX}vue`, purl: `pkg:npm/${PREFIX}vue@3.3.4` })

      const result = await repo.findAll()
      const comp = result.find(c => c.name === `${PREFIX}vue`)

      expect(comp).toBeDefined()
      expect(comp!.name).toBeTypeOf('string')
      expect(comp!.version).toBeTypeOf('string')
      expect(comp!.systemCount).toBeTypeOf('number')
      expect(Array.isArray(comp!.hashes)).toBe(true)
      expect(Array.isArray(comp!.licenses)).toBe(true)
    })

    it('should include system count', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (c:Component { name: $comp, version: '1.0.0', purl: $purl })
        CREATE (s:System { name: $sys })
        CREATE (s)-[:USES]->(c)
      `, {
        comp: `${PREFIX}lib`, sys: `${PREFIX}system-a`,
        purl: `pkg:npm/${PREFIX}lib@1.0.0`
      })

      const result = await repo.findAll()
      const comp = result.find(c => c.name === `${PREFIX}lib`)

      expect(comp).toBeDefined()
      expect(comp!.systemCount).toBeGreaterThanOrEqual(1)
    })

    it('should include technology mapping', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (c:Component { name: $comp, version: '18.2.0', purl: $purl })
        CREATE (t:Technology { name: $tech })
        CREATE (c)-[:IS_VERSION_OF]->(t)
      `, {
        comp: `${PREFIX}react-mapped`, tech: `${PREFIX}React`,
        purl: `pkg:npm/${PREFIX}react-mapped@18.2.0`
      })

      const result = await repo.findAll()
      const comp = result.find(c => c.name === `${PREFIX}react-mapped`)

      expect(comp).toBeDefined()
      expect(comp!.technologyName).toBe(`${PREFIX}React`)
    })

    it('should default hashes and licenses to empty arrays', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Component { name: $name, version: '1.0.0', purl: $purl })
      `, { name: `${PREFIX}minimal`, purl: `pkg:npm/${PREFIX}minimal@1.0.0` })

      const result = await repo.findAll()
      const comp = result.find(c => c.name === `${PREFIX}minimal`)

      expect(comp).toBeDefined()
      expect(comp!.hashes).toEqual([])
      expect(comp!.licenses).toEqual([])
    })
  })

  describe('findUnmapped()', () => {
    it('should return only components without technology mapping', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (u:Component { name: $unmapped, version: '1.0.0', purl: $purl1 })
        CREATE (m:Component { name: $mapped, version: '1.0.0', purl: $purl2 })
        CREATE (t:Technology { name: $tech })
        CREATE (m)-[:IS_VERSION_OF]->(t)
      `, {
        unmapped: `${PREFIX}unmapped`, mapped: `${PREFIX}mapped`, tech: `${PREFIX}SomeTech`,
        purl1: `pkg:npm/${PREFIX}unmapped@1.0.0`, purl2: `pkg:npm/${PREFIX}mapped@1.0.0`
      })

      const result = await repo.findUnmapped()

      expect(result.find(c => c.name === `${PREFIX}unmapped`)).toBeDefined()
      expect(result.find(c => c.name === `${PREFIX}mapped`)).toBeUndefined()
    })

    it('should include system information for unmapped components', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (c:Component { name: $comp, version: '1.0.0', purl: $purl })
        CREATE (s1:System { name: $sys1 })
        CREATE (s2:System { name: $sys2 })
        CREATE (s1)-[:USES]->(c)
        CREATE (s2)-[:USES]->(c)
      `, {
        comp: `${PREFIX}unmapped-sys`, purl: `pkg:npm/${PREFIX}unmapped-sys@1.0.0`,
        sys1: `${PREFIX}sys-1`, sys2: `${PREFIX}sys-2`
      })

      const result = await repo.findUnmapped()
      const comp = result.find(c => c.name === `${PREFIX}unmapped-sys`)

      expect(comp).toBeDefined()
      expect(comp!.systemCount).toBeGreaterThanOrEqual(2)
      expect(Array.isArray(comp!.systems)).toBe(true)
    })
  })

  describe('count()', () => {
    it('should return total component count', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Component { name: $n1, version: '1.0.0', purl: $p1 })
        CREATE (:Component { name: $n2, version: '2.0.0', purl: $p2 })
      `, {
        n1: `${PREFIX}count-a`, n2: `${PREFIX}count-b`,
        p1: `pkg:npm/${PREFIX}count-a@1.0.0`, p2: `pkg:npm/${PREFIX}count-b@2.0.0`
      })

      const count = await repo.count()

      expect(count).toBeGreaterThanOrEqual(2)
    })
  })
})
