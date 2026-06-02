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

      const { data } = await repo.findAll()
      const comp = data.find(c => c.name === `${PREFIX}react`)

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

      const { data } = await repo.findAll()
      const comp = data.find(c => c.name === `${PREFIX}vue`)

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

      const { data } = await repo.findAll()
      const comp = data.find(c => c.name === `${PREFIX}lib`)

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

      const { data } = await repo.findAll()
      const comp = data.find(c => c.name === `${PREFIX}react-mapped`)

      expect(comp).toBeDefined()
      expect(comp!.technologyName).toBe(`${PREFIX}React`)
    })

    it('should default hashes and licenses to empty arrays', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Component { name: $name, version: '1.0.0', purl: $purl })
      `, { name: `${PREFIX}minimal`, purl: `pkg:npm/${PREFIX}minimal@1.0.0` })

      const { data } = await repo.findAll()
      const comp = data.find(c => c.name === `${PREFIX}minimal`)

      expect(comp).toBeDefined()
      expect(comp!.hashes).toEqual([])
      expect(comp!.licenses).toEqual([])
    })

    it('should return total count alongside data', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Component { name: $n1, version: '1.0.0', purl: $p1 })
        CREATE (:Component { name: $n2, version: '2.0.0', purl: $p2 })
      `, {
        n1: `${PREFIX}total-a`, n2: `${PREFIX}total-b`,
        p1: `pkg:npm/${PREFIX}total-a@1.0.0`, p2: `pkg:npm/${PREFIX}total-b@2.0.0`
      })

      const { total } = await repo.findAll()

      expect(total).toBeGreaterThanOrEqual(2)
    })

    it('should ignore hasLicense when license is specified', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (c:Component { name: $name, version: '1.0.0', purl: $purl })
        MERGE (l:License { id: 'MIT' })
        ON CREATE SET l.name = 'MIT License'
        CREATE (c)-[:HAS_LICENSE]->(l)
      `, {
        name: `${PREFIX}licensed`,
        purl: `pkg:npm/${PREFIX}licensed@1.0.0`
      })

      // license=MIT with hasLicense=false should still return the component
      // because hasLicense is ignored when a specific license is given
      const { data } = await repo.findAll({ license: 'MIT', hasLicense: false })
      const comp = data.find(c => c.name === `${PREFIX}licensed`)

      expect(comp).toBeDefined()
      expect(comp!.licenses.length).toBeGreaterThanOrEqual(1)
    })

    it('should return correct total with license filter and hasLicense ignored', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (c:Component { name: $name, version: '1.0.0', purl: $purl })
        MERGE (l:License { id: 'Apache-2.0' })
        ON CREATE SET l.name = 'Apache License 2.0'
        CREATE (c)-[:HAS_LICENSE]->(l)
      `, {
        name: `${PREFIX}count-lic`,
        purl: `pkg:npm/${PREFIX}count-lic@1.0.0`
      })

      const { total } = await repo.findAll({ license: 'Apache-2.0', hasLicense: false })

      expect(total).toBeGreaterThanOrEqual(1)
    })

    it('should combine direct dependency and scope filters for a system', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (direct:Component { name: $directName, version: '1.0.0', purl: $directPurl })
        CREATE (transitive:Component { name: $transitiveName, version: '1.0.0', purl: $transitivePurl })
        CREATE (devDirect:Component { name: $devDirectName, version: '1.0.0', purl: $devDirectPurl })
        CREATE (system:System { name: $systemName })
        CREATE (system)-[:USES { scope: 'runtime', isDirect: true }]->(direct)
        CREATE (system)-[:USES { scope: 'runtime', isDirect: false }]->(transitive)
        CREATE (system)-[:USES { scope: 'dev', isDirect: true }]->(devDirect)
      `, {
        directName: `${PREFIX}runtime-direct`,
        directPurl: `pkg:npm/${PREFIX}runtime-direct@1.0.0`,
        transitiveName: `${PREFIX}runtime-transitive`,
        transitivePurl: `pkg:npm/${PREFIX}runtime-transitive@1.0.0`,
        devDirectName: `${PREFIX}dev-direct`,
        devDirectPurl: `pkg:npm/${PREFIX}dev-direct@1.0.0`,
        systemName: `${PREFIX}filter-system`
      })

      const { data } = await repo.findAll({
        system: `${PREFIX}filter-system`,
        directOnly: true,
        depScope: 'runtime'
      })

      expect(data.map(component => component.name)).toContain(`${PREFIX}runtime-direct`)
      expect(data.map(component => component.name)).not.toContain(`${PREFIX}runtime-transitive`)
      expect(data.map(component => component.name)).not.toContain(`${PREFIX}dev-direct`)
    })
  })

  describe('findByIdentity()', () => {
    it('should find component details by purl', async () => {
      if (!ctx.neo4jAvailable) return
      const purl = `pkg:npm/${PREFIX}detail-purl@1.2.3`
      await seed(ctx.driver, `
        CREATE (:Component {
          name: $name,
          version: '1.2.3',
          packageManager: 'npm',
          purl: $purl,
          type: 'library',
          description: 'Component fetched by purl'
        })
      `, { name: `${PREFIX}detail-purl`, purl })

      const component = await repo.findByIdentity({ purl })

      expect(component).toMatchObject({
        name: `${PREFIX}detail-purl`,
        version: '1.2.3',
        packageManager: 'npm',
        purl,
        type: 'library',
        description: 'Component fetched by purl',
        systems: [],
        eol: null
      })
    })

    it('should find component details by fallback identity when purl is unavailable', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Component {
          name: $name,
          version: '4.5.6',
          packageManager: 'maven',
          group: 'org.example',
          purl: null,
          type: 'framework'
        })
      `, { name: `${PREFIX}detail-fallback` })

      const component = await repo.findByIdentity({
        name: `${PREFIX}detail-fallback`,
        version: '4.5.6',
        packageManager: 'maven',
        group: 'org.example'
      })

      expect(component).toMatchObject({
        name: `${PREFIX}detail-fallback`,
        version: '4.5.6',
        packageManager: 'maven',
        group: 'org.example',
        purl: null,
        type: 'framework'
      })
    })

    it('should include related systems, technology, licenses, hashes, and references', async () => {
      if (!ctx.neo4jAvailable) return
      const purl = `pkg:npm/${PREFIX}detail-rich@2.0.0`
      await seed(ctx.driver, `
        CREATE (c:Component {
          name: $name,
          version: '2.0.0',
          packageManager: 'npm',
          purl: $purl,
          homepage: 'https://example.com/detail-rich'
        })
        CREATE (sys:System { name: $system })
        CREATE (sys)-[:USES { scope: 'runtime', isDirect: true }]->(c)
        CREATE (tech:Technology { name: $technology })
        CREATE (c)-[:IS_VERSION_OF]->(tech)
        CREATE (hash:Hash { algorithm: 'SHA-256', value: 'abc123' })
        CREATE (c)-[:HAS_HASH]->(hash)
        MERGE (license:License { id: 'MIT' })
        ON CREATE SET license.name = 'MIT License', license.url = 'https://opensource.org/license/mit'
        CREATE (c)-[:HAS_LICENSE]->(license)
        CREATE (reference:ExternalReference { type: 'vcs', url: 'https://example.com/repo.git' })
        CREATE (c)-[:HAS_REFERENCE]->(reference)
      `, {
        name: `${PREFIX}detail-rich`,
        purl,
        system: `${PREFIX}system-rich`,
        technology: `${PREFIX}Technology`
      })

      const component = await repo.findByIdentity({ purl })

      expect(component).toBeDefined()
      expect(component!.technologyName).toBe(`${PREFIX}Technology`)
      expect(component!.systemCount).toBe(1)
      expect(component!.systems).toEqual([
        { name: `${PREFIX}system-rich`, scope: 'runtime', isDirect: true }
      ])
      expect(component!.hashes).toEqual([
        { algorithm: 'SHA-256', value: 'abc123' }
      ])
      expect(component!.licenses).toMatchObject([
        {
          id: 'MIT',
          name: 'MIT License'
        }
      ])
      expect(component!.externalReferences).toEqual([
        { type: 'vcs', url: 'https://example.com/repo.git' }
      ])
    })

    it('should return null when no component matches the identity', async () => {
      if (!ctx.neo4jAvailable) return

      const component = await repo.findByIdentity({
        name: `${PREFIX}missing`,
        version: '0.0.1',
        packageManager: 'npm',
        group: null
      })

      expect(component).toBeNull()
    })
  })

})
