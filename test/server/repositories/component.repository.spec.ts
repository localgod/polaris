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

    it('should filter to direct dependencies across all systems without a system filter', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (direct:Component { name: $directName, version: '1.0.0', purl: $directPurl })
        CREATE (transitive:Component { name: $transitiveName, version: '1.0.0', purl: $transitivePurl })
        CREATE (unused:Component { name: $unusedName, version: '1.0.0', purl: $unusedPurl })
        CREATE (system:System { name: $systemName })
        CREATE (system)-[:USES { scope: 'runtime', isDirect: true }]->(direct)
        CREATE (system)-[:USES { scope: 'runtime', isDirect: false }]->(transitive)
      `, {
        directName: `${PREFIX}global-direct`,
        directPurl: `pkg:npm/${PREFIX}global-direct@1.0.0`,
        transitiveName: `${PREFIX}global-transitive`,
        transitivePurl: `pkg:npm/${PREFIX}global-transitive@1.0.0`,
        unusedName: `${PREFIX}global-unused`,
        unusedPurl: `pkg:npm/${PREFIX}global-unused@1.0.0`,
        systemName: `${PREFIX}global-filter-system`
      })

      const { data } = await repo.findAll({
        search: `${PREFIX}global-`,
        directOnly: true
      })

      expect(data.map(component => component.name)).toContain(`${PREFIX}global-direct`)
      expect(data.map(component => component.name)).not.toContain(`${PREFIX}global-transitive`)
      expect(data.map(component => component.name)).not.toContain(`${PREFIX}global-unused`)
    })

    it('should hide only dev-only direct dependencies across all systems', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (normal:Component { name: $normalName, version: '1.0.0', purl: $normalPurl })
        CREATE (devOnly:Component { name: $devOnlyName, version: '1.0.0', purl: $devOnlyPurl })
        CREATE (mixed:Component { name: $mixedName, version: '1.0.0', purl: $mixedPurl })
        CREATE (devDirectTransitiveNormal:Component { name: $devDirectTransitiveNormalName, version: '1.0.0', purl: $devDirectTransitiveNormalPurl })
        CREATE (runtimeSystem:System { name: $runtimeSystemName })
        CREATE (devSystem:System { name: $devSystemName })
        CREATE (runtimeSystem)-[:USES { scope: 'runtime', isDirect: true }]->(normal)
        CREATE (devSystem)-[:USES { scope: 'dev', isDirect: true }]->(devOnly)
        CREATE (devSystem)-[:USES { scope: 'dev', isDirect: true }]->(mixed)
        CREATE (runtimeSystem)-[:USES { scope: 'runtime', isDirect: true }]->(mixed)
        CREATE (devSystem)-[:USES { scope: 'dev', isDirect: true }]->(devDirectTransitiveNormal)
        CREATE (runtimeSystem)-[:USES { scope: 'runtime', isDirect: false }]->(devDirectTransitiveNormal)
      `, {
        normalName: `${PREFIX}hide-dev-normal`,
        normalPurl: `pkg:npm/${PREFIX}hide-dev-normal@1.0.0`,
        devOnlyName: `${PREFIX}hide-dev-only`,
        devOnlyPurl: `pkg:npm/${PREFIX}hide-dev-only@1.0.0`,
        mixedName: `${PREFIX}hide-dev-mixed`,
        mixedPurl: `pkg:npm/${PREFIX}hide-dev-mixed@1.0.0`,
        devDirectTransitiveNormalName: `${PREFIX}hide-dev-transitive-normal`,
        devDirectTransitiveNormalPurl: `pkg:npm/${PREFIX}hide-dev-transitive-normal@1.0.0`,
        runtimeSystemName: `${PREFIX}hide-dev-runtime-system`,
        devSystemName: `${PREFIX}hide-dev-dev-system`
      })

      const { data } = await repo.findAll({
        search: `${PREFIX}hide-dev-`,
        directOnly: true,
        includeDev: false
      })
      const names = data.map(component => component.name)

      expect(names).toContain(`${PREFIX}hide-dev-normal`)
      expect(names).toContain(`${PREFIX}hide-dev-mixed`)
      expect(names).not.toContain(`${PREFIX}hide-dev-only`)
      expect(names).not.toContain(`${PREFIX}hide-dev-transitive-normal`)
    })
  })

  describe('findAllGrouped()', () => {
    it('should group components by package manager, group, and name', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Component { name: $name, version: '1.0.0', packageManager: 'npm', purl: $p1, type: 'library' })
        CREATE (:Component { name: $name, version: '1.1.0', packageManager: 'npm', purl: $p2, type: 'library' })
      `, {
        name: `${PREFIX}grouped-lib`,
        p1: `pkg:npm/${PREFIX}grouped-lib@1.0.0`,
        p2: `pkg:npm/${PREFIX}grouped-lib@1.1.0`
      })

      const { data } = await repo.findAllGrouped({ search: `${PREFIX}grouped-lib` })
      const group = data.find(component => component.name === `${PREFIX}grouped-lib`)

      expect(group).toBeDefined()
      expect(group!.versions).toEqual(['1.0.0', '1.1.0'])
      expect(group!.versionDetails).toHaveLength(2)
    })

    it('should count distinct systems across all versions', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (v1:Component { name: $name, version: '1.0.0', packageManager: 'npm', purl: $p1 })
        CREATE (v2:Component { name: $name, version: '2.0.0', packageManager: 'npm', purl: $p2 })
        CREATE (s:System { name: $systemName })
        CREATE (s)-[:USES]->(v1)
        CREATE (s)-[:USES]->(v2)
      `, {
        name: `${PREFIX}distinct-systems`,
        p1: `pkg:npm/${PREFIX}distinct-systems@1.0.0`,
        p2: `pkg:npm/${PREFIX}distinct-systems@2.0.0`,
        systemName: `${PREFIX}shared-system`
      })

      const { data } = await repo.findAllGrouped({ search: `${PREFIX}distinct-systems` })
      const group = data.find(component => component.name === `${PREFIX}distinct-systems`)

      expect(group).toBeDefined()
      expect(group!.systemCount).toBe(1)
      expect(group!.versionDetails.map(version => version.systemCount)).toEqual([1, 1])
    })

    it('should sort semantic versions numerically for display', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Component { name: $name, version: '10.0.0', packageManager: 'npm', purl: $p10 })
        CREATE (:Component { name: $name, version: '2.0.0', packageManager: 'npm', purl: $p2 })
        CREATE (:Component { name: $name, version: '1.0.0', packageManager: 'npm', purl: $p1 })
        CREATE (:Component { name: $name, version: '3.0.0', packageManager: 'npm', purl: $p3 })
      `, {
        name: `${PREFIX}semver-order`,
        p10: `pkg:npm/${PREFIX}semver-order@10.0.0`,
        p2: `pkg:npm/${PREFIX}semver-order@2.0.0`,
        p1: `pkg:npm/${PREFIX}semver-order@1.0.0`,
        p3: `pkg:npm/${PREFIX}semver-order@3.0.0`
      })

      const { data } = await repo.findAllGrouped({ search: `${PREFIX}semver-order` })
      const group = data.find(component => component.name === `${PREFIX}semver-order`)

      expect(group).toBeDefined()
      expect(group!.versions).toEqual(['1.0.0', '2.0.0', '3.0.0', '10.0.0'])
      expect(group!.versionRange).toBe('1.0.0 - 10.0.0')
    })

    it('should paginate by unique groups', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Component { name: $nameA, version: '1.0.0', packageManager: 'npm', purl: $pA1 })
        CREATE (:Component { name: $nameA, version: '2.0.0', packageManager: 'npm', purl: $pA2 })
        CREATE (:Component { name: $nameB, version: '1.0.0', packageManager: 'npm', purl: $pB1 })
      `, {
        nameA: `${PREFIX}page-a`,
        nameB: `${PREFIX}page-b`,
        pA1: `pkg:npm/${PREFIX}page-a@1.0.0`,
        pA2: `pkg:npm/${PREFIX}page-a@2.0.0`,
        pB1: `pkg:npm/${PREFIX}page-b@1.0.0`
      })

      const { data, total } = await repo.findAllGrouped({ search: `${PREFIX}page-`, limit: 1, offset: 0 })

      expect(data).toHaveLength(1)
      expect(total).toBe(2)
    })

    it('should filter grouped results to direct dependencies across all systems', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (direct:Component { name: $directName, version: '1.0.0', packageManager: 'npm', purl: $directPurl })
        CREATE (transitive:Component { name: $transitiveName, version: '1.0.0', packageManager: 'npm', purl: $transitivePurl })
        CREATE (system:System { name: $systemName })
        CREATE (system)-[:USES { scope: 'runtime', isDirect: true }]->(direct)
        CREATE (system)-[:USES { scope: 'runtime', isDirect: false }]->(transitive)
      `, {
        directName: `${PREFIX}grouped-global-direct`,
        directPurl: `pkg:npm/${PREFIX}grouped-global-direct@1.0.0`,
        transitiveName: `${PREFIX}grouped-global-transitive`,
        transitivePurl: `pkg:npm/${PREFIX}grouped-global-transitive@1.0.0`,
        systemName: `${PREFIX}grouped-global-filter-system`
      })

      const { data } = await repo.findAllGrouped({
        search: `${PREFIX}grouped-global-`,
        directOnly: true
      })

      expect(data.map(component => component.name)).toContain(`${PREFIX}grouped-global-direct`)
      expect(data.map(component => component.name)).not.toContain(`${PREFIX}grouped-global-transitive`)
    })

    it('should keep grouped components with normal usage when hiding dev dependencies', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (devOnly:Component { name: $devOnlyName, version: '1.0.0', packageManager: 'npm', purl: $devOnlyPurl })
        CREATE (mixed:Component { name: $mixedName, version: '1.0.0', packageManager: 'npm', purl: $mixedPurl })
        CREATE (runtimeSystem:System { name: $runtimeSystemName })
        CREATE (devSystem:System { name: $devSystemName })
        CREATE (devSystem)-[:USES { scope: 'dev', isDirect: true }]->(devOnly)
        CREATE (devSystem)-[:USES { scope: 'dev', isDirect: true }]->(mixed)
        CREATE (runtimeSystem)-[:USES { scope: 'runtime', isDirect: true }]->(mixed)
      `, {
        devOnlyName: `${PREFIX}grouped-hide-dev-only`,
        devOnlyPurl: `pkg:npm/${PREFIX}grouped-hide-dev-only@1.0.0`,
        mixedName: `${PREFIX}grouped-hide-dev-mixed`,
        mixedPurl: `pkg:npm/${PREFIX}grouped-hide-dev-mixed@1.0.0`,
        runtimeSystemName: `${PREFIX}grouped-hide-dev-runtime-system`,
        devSystemName: `${PREFIX}grouped-hide-dev-dev-system`
      })

      const { data } = await repo.findAllGrouped({
        search: `${PREFIX}grouped-hide-dev-`,
        directOnly: true,
        includeDev: false
      })
      const names = data.map(component => component.name)

      expect(names).toContain(`${PREFIX}grouped-hide-dev-mixed`)
      expect(names).not.toContain(`${PREFIX}grouped-hide-dev-only`)
    })

    it('should hide dev-only versions inside a grouped component', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (runtimeVersion:Component { name: $name, version: '1.0.0', packageManager: 'npm', purl: $runtimePurl })
        CREATE (devVersion:Component { name: $name, version: '2.0.0', packageManager: 'npm', purl: $devPurl })
        CREATE (runtimeSystem:System { name: $runtimeSystemName })
        CREATE (devSystem:System { name: $devSystemName })
        CREATE (runtimeSystem)-[:USES { scope: 'runtime', isDirect: true }]->(runtimeVersion)
        CREATE (devSystem)-[:USES { scope: 'dev', isDirect: true }]->(devVersion)
      `, {
        name: `${PREFIX}grouped-hide-dev-version`,
        runtimePurl: `pkg:npm/${PREFIX}grouped-hide-dev-version@1.0.0`,
        devPurl: `pkg:npm/${PREFIX}grouped-hide-dev-version@2.0.0`,
        runtimeSystemName: `${PREFIX}grouped-hide-dev-version-runtime-system`,
        devSystemName: `${PREFIX}grouped-hide-dev-version-dev-system`
      })

      const { data } = await repo.findAllGrouped({
        search: `${PREFIX}grouped-hide-dev-version`,
        directOnly: true,
        includeDev: false
      })
      const group = data.find(component => component.name === `${PREFIX}grouped-hide-dev-version`)

      expect(group).toBeDefined()
      expect(group!.versions).toEqual(['1.0.0'])
      expect(group!.versionDetails.map(version => version.version)).not.toContain('2.0.0')
    })

    it('should hide optional-scoped npm development dependencies when hiding dev dependencies', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (optionalOnly:Component { name: $optionalOnlyName, version: '1.0.0', packageManager: 'npm', purl: $optionalOnlyPurl })
        CREATE (runtimeOnly:Component { name: $runtimeOnlyName, version: '1.0.0', packageManager: 'npm', purl: $runtimeOnlyPurl })
        CREATE (system:System { name: $systemName })
        CREATE (system)-[:USES { scope: 'optional', isDirect: true }]->(optionalOnly)
        CREATE (system)-[:USES { scope: 'runtime', isDirect: true }]->(runtimeOnly)
      `, {
        optionalOnlyName: `${PREFIX}grouped-hide-optional-only`,
        optionalOnlyPurl: `pkg:npm/${PREFIX}grouped-hide-optional-only@1.0.0`,
        runtimeOnlyName: `${PREFIX}grouped-hide-optional-runtime`,
        runtimeOnlyPurl: `pkg:npm/${PREFIX}grouped-hide-optional-runtime@1.0.0`,
        systemName: `${PREFIX}grouped-hide-optional-system`
      })

      const { data } = await repo.findAllGrouped({
        search: `${PREFIX}grouped-hide-optional-`,
        directOnly: true,
        includeDev: false
      })
      const names = data.map(component => component.name)

      expect(names).toContain(`${PREFIX}grouped-hide-optional-runtime`)
      expect(names).not.toContain(`${PREFIX}grouped-hide-optional-only`)
    })

    it('should restrict grouped components to a supplied purl list', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (risky:Component { name: $riskyName, version: '1.0.0', packageManager: 'npm', purl: $riskyPurl })
        CREATE (normal:Component { name: $normalName, version: '1.0.0', packageManager: 'npm', purl: $normalPurl })
        CREATE (system:System { name: $systemName })
        CREATE (system)-[:USES { scope: 'runtime', isDirect: true }]->(risky)
        CREATE (system)-[:USES { scope: 'runtime', isDirect: true }]->(normal)
      `, {
        riskyName: `${PREFIX}grouped-risk-filter-risky`,
        riskyPurl: `pkg:npm/${PREFIX}grouped-risk-filter-risky@1.0.0`,
        normalName: `${PREFIX}grouped-risk-filter-normal`,
        normalPurl: `pkg:npm/${PREFIX}grouped-risk-filter-normal@1.0.0`,
        systemName: `${PREFIX}grouped-risk-filter-system`
      })

      const { data } = await repo.findAllGrouped({
        search: `${PREFIX}grouped-risk-filter-`,
        componentPurls: [`pkg:npm/${PREFIX}grouped-risk-filter-risky@1.0.0`]
      })
      const names = data.map(component => component.name)

      expect(names).toContain(`${PREFIX}grouped-risk-filter-risky`)
      expect(names).not.toContain(`${PREFIX}grouped-risk-filter-normal`)
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
        directDependencies: [],
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

    it('should include direct component dependencies without duplicates', async () => {
      if (!ctx.neo4jAvailable) return
      const purl = `pkg:npm/${PREFIX}detail-root@1.0.0`
      await seed(ctx.driver, `
        CREATE (root:Component {
          name: $name,
          version: '1.0.0',
          packageManager: 'npm',
          purl: $purl
        })
        CREATE (runtimeDep:Component {
          name: $runtimeDep,
          version: '2.0.0',
          packageManager: 'npm',
          purl: $runtimePurl
        })
        CREATE (ambiguousDep:Component {
          name: $ambiguousDep,
          version: '3.0.0',
          packageManager: 'npm',
          purl: $ambiguousPurl
        })
        CREATE (root)-[:DEPENDS_ON]->(runtimeDep)
        CREATE (root)-[:DEPENDS_ON]->(ambiguousDep)
        CREATE (runtimeSystemA:System { name: $runtimeSystemA })
        CREATE (runtimeSystemB:System { name: $runtimeSystemB })
        CREATE (ambiguousSystemA:System { name: $ambiguousSystemA })
        CREATE (ambiguousSystemB:System { name: $ambiguousSystemB })
        CREATE (runtimeSystemA)-[:USES { scope: 'runtime', isDirect: true }]->(runtimeDep)
        CREATE (runtimeSystemB)-[:USES { scope: 'runtime', isDirect: true }]->(runtimeDep)
        CREATE (ambiguousSystemA)-[:USES { scope: 'runtime', isDirect: true }]->(ambiguousDep)
        CREATE (ambiguousSystemB)-[:USES { scope: 'dev', isDirect: true }]->(ambiguousDep)
      `, {
        name: `${PREFIX}detail-root`,
        purl,
        runtimeDep: `${PREFIX}runtime-dep`,
        runtimePurl: `pkg:npm/${PREFIX}runtime-dep@2.0.0`,
        ambiguousDep: `${PREFIX}ambiguous-dep`,
        ambiguousPurl: `pkg:npm/${PREFIX}ambiguous-dep@3.0.0`,
        runtimeSystemA: `${PREFIX}runtime-system-a`,
        runtimeSystemB: `${PREFIX}runtime-system-b`,
        ambiguousSystemA: `${PREFIX}ambiguous-system-a`,
        ambiguousSystemB: `${PREFIX}ambiguous-system-b`
      })

      const component = await repo.findByIdentity({ purl })

      expect(component).toBeDefined()
      expect(component!.directDependencies.toSorted((a, b) => a.name.localeCompare(b.name))).toEqual([
        {
          name: `${PREFIX}ambiguous-dep`,
          group: null,
          version: '3.0.0',
          packageManager: 'npm',
          purl: `pkg:npm/${PREFIX}ambiguous-dep@3.0.0`,
          scope: null,
          isDirect: true
        },
        {
          name: `${PREFIX}runtime-dep`,
          group: null,
          version: '2.0.0',
          packageManager: 'npm',
          purl: `pkg:npm/${PREFIX}runtime-dep@2.0.0`,
          scope: 'runtime',
          isDirect: true
        }
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

  describe('findDependencies()', () => {
    it('should return an empty dependency tree when a component has no dependencies', async () => {
      if (!ctx.neo4jAvailable) return
      const purl = `pkg:npm/${PREFIX}deps-empty@1.0.0`
      await seed(ctx.driver, `
        CREATE (:Component {
          name: $name,
          version: '1.0.0',
          packageManager: 'npm',
          purl: $purl
        })
      `, { name: `${PREFIX}deps-empty`, purl })

      const result = await repo.findDependencies({ purl }, {
        maxDepth: 10,
        limit: 500
      })

      expect(result).toMatchObject({
        dependencies: [],
        totalCount: 0,
        hasCircularDependencies: false,
        truncated: false,
        maxDepth: 10,
        systemExists: true
      })
    })

    it('should return nested transitive dependencies and flag circular branches', async () => {
      if (!ctx.neo4jAvailable) return
      const rootPurl = `pkg:npm/${PREFIX}deps-root@1.0.0`
      await seed(ctx.driver, `
        CREATE (root:Component { name: $root, version: '1.0.0', packageManager: 'npm', purl: $rootPurl })
        CREATE (a:Component { name: $a, version: '1.0.0', packageManager: 'npm', purl: $aPurl })
        CREATE (b:Component { name: $b, version: '1.0.0', packageManager: 'npm', purl: $bPurl })
        CREATE (c:Component { name: $c, version: '1.0.0', packageManager: 'npm', purl: $cPurl })
        CREATE (root)-[:DEPENDS_ON]->(a)
        CREATE (a)-[:DEPENDS_ON]->(b)
        CREATE (b)-[:DEPENDS_ON]->(c)
        CREATE (c)-[:DEPENDS_ON]->(a)
      `, {
        root: `${PREFIX}deps-root`,
        rootPurl,
        a: `${PREFIX}deps-a`,
        aPurl: `pkg:npm/${PREFIX}deps-a@1.0.0`,
        b: `${PREFIX}deps-b`,
        bPurl: `pkg:npm/${PREFIX}deps-b@1.0.0`,
        c: `${PREFIX}deps-c`,
        cPurl: `pkg:npm/${PREFIX}deps-c@1.0.0`
      })

      const result = await repo.findDependencies({ purl: rootPurl }, {
        maxDepth: 5,
        limit: 500
      })

      expect(result).toBeDefined()
      expect(result!.hasCircularDependencies).toBe(true)
      expect(result!.totalCount).toBe(3)
      expect(result!.dependencies).toMatchObject([
        {
          name: `${PREFIX}deps-a`,
          isDirect: true,
          depth: 1,
          children: [
            {
              name: `${PREFIX}deps-b`,
              isDirect: false,
              depth: 2,
              children: [
                {
                  name: `${PREFIX}deps-c`,
                  isDirect: false,
                  depth: 3,
                  children: [
                    {
                      name: `${PREFIX}deps-a`,
                      isCircular: true,
                      depth: 4
                    }
                  ]
                }
              ]
            }
          ]
        }
      ])
    })

    it('should apply system boundaries and scope filtering', async () => {
      if (!ctx.neo4jAvailable) return
      const rootPurl = `pkg:npm/${PREFIX}scoped-root@1.0.0`
      await seed(ctx.driver, `
        CREATE (root:Component { name: $root, version: '1.0.0', packageManager: 'npm', purl: $rootPurl })
        CREATE (runtimeDep:Component { name: $runtimeDep, version: '1.0.0', packageManager: 'npm', purl: $runtimeDepPurl })
        CREATE (runtimeTransitive:Component { name: $runtimeTransitive, version: '1.0.0', packageManager: 'npm', purl: $runtimeTransitivePurl })
        CREATE (devDep:Component { name: $devDep, version: '1.0.0', packageManager: 'npm', purl: $devDepPurl })
        CREATE (outsideDep:Component { name: $outsideDep, version: '1.0.0', packageManager: 'npm', purl: $outsideDepPurl })
        CREATE (system:System { name: $system })
        CREATE (system)-[:USES { scope: 'runtime', isDirect: true }]->(root)
        CREATE (system)-[:USES { scope: 'runtime', isDirect: true }]->(runtimeDep)
        CREATE (system)-[:USES { scope: 'runtime', isDirect: false }]->(runtimeTransitive)
        CREATE (system)-[:USES { scope: 'dev', isDirect: true }]->(devDep)
        CREATE (root)-[:DEPENDS_ON]->(runtimeDep)
        CREATE (runtimeDep)-[:DEPENDS_ON]->(runtimeTransitive)
        CREATE (root)-[:DEPENDS_ON]->(devDep)
        CREATE (root)-[:DEPENDS_ON]->(outsideDep)
      `, {
        root: `${PREFIX}scoped-root`,
        rootPurl,
        runtimeDep: `${PREFIX}runtime-dep`,
        runtimeDepPurl: `pkg:npm/${PREFIX}runtime-dep@1.0.0`,
        runtimeTransitive: `${PREFIX}runtime-transitive`,
        runtimeTransitivePurl: `pkg:npm/${PREFIX}runtime-transitive@1.0.0`,
        devDep: `${PREFIX}dev-dep`,
        devDepPurl: `pkg:npm/${PREFIX}dev-dep@1.0.0`,
        outsideDep: `${PREFIX}outside-dep`,
        outsideDepPurl: `pkg:npm/${PREFIX}outside-dep@1.0.0`,
        system: `${PREFIX}scope-system`
      })

      const result = await repo.findDependencies({ purl: rootPurl }, {
        system: `${PREFIX}scope-system`,
        scopes: ['runtime'],
        maxDepth: 10,
        limit: 500
      })

      expect(result).toBeDefined()
      expect(result!.systemExists).toBe(true)
      expect(result!.dependencies).toMatchObject([
        {
          name: `${PREFIX}runtime-dep`,
          scope: 'runtime',
          isDirect: true,
          depth: 1,
          children: [
            {
              name: `${PREFIX}runtime-transitive`,
              scope: 'runtime',
              isDirect: false,
              depth: 2
            }
          ]
        }
      ])
    })

    it('should report a missing system separately from a missing component', async () => {
      if (!ctx.neo4jAvailable) return
      const purl = `pkg:npm/${PREFIX}deps-system-missing@1.0.0`
      await seed(ctx.driver, `
        CREATE (:Component {
          name: $name,
          version: '1.0.0',
          packageManager: 'npm',
          purl: $purl
        })
      `, { name: `${PREFIX}deps-system-missing`, purl })

      const result = await repo.findDependencies({ purl }, {
        system: `${PREFIX}missing-system`,
        maxDepth: 10,
        limit: 500
      })

      expect(result).toBeDefined()
      expect(result!.systemExists).toBe(false)
      expect(result!.dependencies).toEqual([])
    })
  })

})
