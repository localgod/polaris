import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { SBOMRepository } from '../../../server/repositories/sbom.repository'
import { getTestContext, cleanupTestData, seed, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_sbom_repo_'
let ctx: TestContext
let repo: SBOMRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

beforeEach(async () => {
  if (!ctx.neo4jAvailable) return
  await cleanupTestData(ctx.driver, { prefix: PREFIX })
  repo = new SBOMRepository(ctx.driver)
  session = ctx.driver.session()
})

afterEach(async () => { if (session) await session.close() })

describe('SBOMRepository', () => {
  describe('[pin] persistSBOM()', () => {
    it('should persist components and link to system', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:System { name: $sys })
        CREATE (:Repository { url: $url, name: $repoName })
      `, { sys: `${PREFIX}my-system`, url: `https://github.com/${PREFIX}org/repo`, repoName: `${PREFIX}repo` })

      const result = await repo.persistSBOM({
        systemName: `${PREFIX}my-system`,
        repositoryUrl: `https://github.com/${PREFIX}org/repo`,
        format: 'cyclonedx',
        timestamp: new Date(),
        dependencies: [],
        componentUsage: new Map(),
        components: [
          {
            name: `${PREFIX}lodash`, version: '4.17.21',
            purl: `pkg:npm/${PREFIX}lodash@4.17.21`, packageManager: 'npm',
            cpe: null, bomRef: null, type: 'library', group: null, scope: null,
            hashes: [], licenses: [], copyright: null, supplier: null,
            author: null, publisher: null, homepage: null, description: null,
            externalReferences: []
          },
          {
            name: `${PREFIX}express`, version: '4.18.2',
            purl: `pkg:npm/${PREFIX}express@4.18.2`, packageManager: 'npm',
            cpe: null, bomRef: null, type: 'library', group: null, scope: null,
            hashes: [], licenses: [], copyright: null, supplier: null,
            author: null, publisher: null, homepage: null, description: null,
            externalReferences: []
          }
        ]
      })

      expect(result.componentsAdded + result.componentsUpdated).toBeGreaterThanOrEqual(2)

      const check = await session.run(`
        MATCH (s:System { name: $sys })-[:USES]->(c:Component)
        WHERE c.name STARTS WITH $prefix
        RETURN count(c) as count
      `, { sys: `${PREFIX}my-system`, prefix: PREFIX })

      expect(check.records[0].get('count').toNumber()).toBeGreaterThanOrEqual(2)
    })

    it('should report newly-added components in addedComponents, and none on a re-scan of the same components', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:System { name: $sys })
        CREATE (:Repository { url: $url, name: $repoName })
      `, { sys: `${PREFIX}added-system`, url: `https://github.com/${PREFIX}org/added-repo`, repoName: `${PREFIX}added-repo` })

      const component = {
        name: `${PREFIX}newlib`, version: '1.0.0',
        purl: `pkg:npm/${PREFIX}newlib@1.0.0`, packageManager: 'npm',
        cpe: null, bomRef: null, type: 'library', group: null, scope: null,
        hashes: [], licenses: [], copyright: null, supplier: null,
        author: null, publisher: null, homepage: null, description: null,
        externalReferences: []
      }

      const firstScan = await repo.persistSBOM({
        systemName: `${PREFIX}added-system`,
        repositoryUrl: `https://github.com/${PREFIX}org/added-repo`,
        format: 'cyclonedx',
        timestamp: new Date(),
        dependencies: [],
        componentUsage: new Map(),
        components: [component]
      })

      expect(firstScan.addedComponents).toEqual([
        { name: component.name, version: component.version, purl: component.purl }
      ])

      const secondScan = await repo.persistSBOM({
        systemName: `${PREFIX}added-system`,
        repositoryUrl: `https://github.com/${PREFIX}org/added-repo`,
        format: 'cyclonedx',
        timestamp: new Date(),
        dependencies: [],
        componentUsage: new Map(),
        components: [component]
      })

      expect(secondScan.addedComponents).toEqual([])
      expect(secondScan.componentsUpdated).toBeGreaterThanOrEqual(1)
    })
  })

  describe('[pin] createComponentAddedAuditLogs()', () => {
    it('should create one AuditLog per added component, linked to both the System and the Component', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:System { name: $sys })
        CREATE (:Component { name: $compName, version: '1.0.0', purl: $purl })
      `, { sys: `${PREFIX}audit-added-system`, compName: `${PREFIX}audited-comp`, purl: `pkg:npm/${PREFIX}audited-comp@1.0.0` })

      await repo.createComponentAddedAuditLogs({
        systemName: `${PREFIX}audit-added-system`,
        userId: `${PREFIX}user1`,
        realUserId: null,
        components: [
          { name: `${PREFIX}audited-comp`, version: '1.0.0', purl: `pkg:npm/${PREFIX}audited-comp@1.0.0` }
        ]
      })

      const check = await session.run(`
        MATCH (a:AuditLog { operation: 'ADD_COMPONENT' })-[:AUDITS]->(x)
        WHERE a.userId = $userId
        RETURN labels(x) AS labels, a.entityId AS entityId
      `, { userId: `${PREFIX}user1` })

      expect(check.records).toHaveLength(2)
      const labelSets = check.records.map(r => r.get('labels'))
      expect(labelSets).toContainEqual(['System'])
      expect(labelSets).toContainEqual(['Component'])
      expect(check.records[0].get('entityId')).toBe(`pkg:npm/${PREFIX}audited-comp@1.0.0`)
    })

    it('should do nothing when components is empty', async () => {
      if (!ctx.neo4jAvailable) return
      await expect(
        repo.createComponentAddedAuditLogs({
          systemName: `${PREFIX}nonexistent-system`,
          userId: `${PREFIX}user1`,
          realUserId: null,
          components: []
        })
      ).resolves.not.toThrow()
    })
  })

  describe('[contract] isDirect on USES edges via persistSBOM()', () => {
    it('should set isDirect=true on USES edges for direct dependencies', async () => {
      if (!ctx.neo4jAvailable) return

      await seed(ctx.driver, `
        CREATE (:System { name: $sys })
        CREATE (:Repository { url: $url, name: $repoName })
      `, {
        sys: `${PREFIX}direct-system`,
        url: `https://github.com/${PREFIX}org/direct-repo`,
        repoName: `${PREFIX}direct-repo`,
      })

      const refA = `pkg:npm/${PREFIX}direct-comp-a@1.0.0`
      const refB = `pkg:npm/${PREFIX}direct-comp-b@1.0.0`

      await repo.persistSBOM({
        systemName: `${PREFIX}direct-system`,
        repositoryUrl: `https://github.com/${PREFIX}org/direct-repo`,
        format: 'cyclonedx',
        timestamp: new Date(),
        dependencies: [
          { ref: refA, dependsOn: [refB] },
          { ref: refB, dependsOn: [] },
        ],
        componentUsage: new Map([
          [refA, { bomRef: refA, scope: 'required', isDirect: true }],
          [refB, { bomRef: refB, scope: 'runtime', isDirect: false }],
        ]),
        components: [
          {
            name: `${PREFIX}direct-comp-a`, version: '1.0.0',
            purl: refA, packageManager: 'npm', bomRef: refA,
            cpe: null, type: 'library', group: null, scope: null,
            hashes: [], licenses: [], copyright: null, supplier: null,
            author: null, publisher: null, homepage: null, description: null,
            externalReferences: [],
          },
          {
            name: `${PREFIX}direct-comp-b`, version: '1.0.0',
            purl: refB, packageManager: 'npm', bomRef: refB,
            cpe: null, type: 'library', group: null, scope: null,
            hashes: [], licenses: [], copyright: null, supplier: null,
            author: null, publisher: null, homepage: null, description: null,
            externalReferences: [],
          },
        ],
      })

      const check = await session.run(`
        MATCH (s:System { name: $sys })-[r:USES]->(c:Component)
        WHERE c.purl STARTS WITH $prefix
        RETURN r.isDirect AS isDirect, r.scope AS scope, c.purl AS purl
        ORDER BY c.purl
      `, { sys: `${PREFIX}direct-system`, prefix: `pkg:npm/${PREFIX}` })

      expect(check.records).toHaveLength(2)
      const byPurl = Object.fromEntries(check.records.map(r => [r.get('purl'), { isDirect: r.get('isDirect'), scope: r.get('scope') }]))
      expect(byPurl[refA]).toEqual({ isDirect: true, scope: 'required' })
      expect(byPurl[refB]).toEqual({ isDirect: false, scope: 'runtime' })
    })
  })

  describe('[contract] DEPENDS_ON edges via persistSBOM()', () => {
    it('should create DEPENDS_ON edges between components', async () => {
      if (!ctx.neo4jAvailable) return

      await seed(ctx.driver, `
        CREATE (:System { name: $sys })
        CREATE (:Repository { url: $url, name: $repoName })
      `, {
        sys: `${PREFIX}dep-system`,
        url: `https://github.com/${PREFIX}org/dep-repo`,
        repoName: `${PREFIX}dep-repo`,
      })

      const purlA = `pkg:npm/${PREFIX}comp-a@1.0.0`
      const purlB = `pkg:npm/${PREFIX}comp-b@1.0.0`

      await repo.persistSBOM({
        systemName: `${PREFIX}dep-system`,
        repositoryUrl: `https://github.com/${PREFIX}org/dep-repo`,
        format: 'cyclonedx',
        timestamp: new Date(),
        dependencies: [{ ref: purlA, dependsOn: [purlB] }],
        componentUsage: new Map(),
        components: [
          {
            name: `${PREFIX}comp-a`, version: '1.0.0',
            purl: purlA, packageManager: 'npm', bomRef: purlA,
            cpe: null, type: 'library', group: null, scope: null,
            hashes: [], licenses: [], copyright: null, supplier: null,
            author: null, publisher: null, homepage: null, description: null,
            externalReferences: [],
          },
          {
            name: `${PREFIX}comp-b`, version: '1.0.0',
            purl: purlB, packageManager: 'npm', bomRef: purlB,
            cpe: null, type: 'library', group: null, scope: null,
            hashes: [], licenses: [], copyright: null, supplier: null,
            author: null, publisher: null, homepage: null, description: null,
            externalReferences: [],
          },
        ],
      })

      const check = await session.run(`
        MATCH (a:Component { purl: $purlA })-[r:DEPENDS_ON]->(b:Component { purl: $purlB })
        RETURN count(r) AS count
      `, { purlA, purlB })

      expect(check.records[0].get('count').toNumber()).toBe(1)
    })

    it('should silently skip unresolvable bomRefs in dependencies', async () => {
      if (!ctx.neo4jAvailable) return

      await seed(ctx.driver, `
        CREATE (:System { name: $sys })
        CREATE (:Repository { url: $url, name: $repoName })
      `, {
        sys: `${PREFIX}skip-system`,
        url: `https://github.com/${PREFIX}org/skip-repo`,
        repoName: `${PREFIX}skip-repo`,
      })

      // dependencies reference bomRefs that don't exist — should not throw
      await expect(
        repo.persistSBOM({
          systemName: `${PREFIX}skip-system`,
          repositoryUrl: `https://github.com/${PREFIX}org/skip-repo`,
          format: 'cyclonedx',
          timestamp: new Date(),
          dependencies: [{ ref: `${PREFIX}nonexistent`, dependsOn: [`${PREFIX}also-nonexistent`] }],
          componentUsage: new Map(),
          components: [],
        })
      ).resolves.not.toThrow()
    })

    it('should do nothing when dependencies array is empty', async () => {
      if (!ctx.neo4jAvailable) return

      await seed(ctx.driver, `
        CREATE (:System { name: $sys })
        CREATE (:Repository { url: $url, name: $repoName })
      `, {
        sys: `${PREFIX}empty-dep-system`,
        url: `https://github.com/${PREFIX}org/empty-dep-repo`,
        repoName: `${PREFIX}empty-dep-repo`,
      })

      await expect(
        repo.persistSBOM({
          systemName: `${PREFIX}empty-dep-system`,
          repositoryUrl: `https://github.com/${PREFIX}org/empty-dep-repo`,
          format: 'cyclonedx',
          timestamp: new Date(),
          dependencies: [],
          componentUsage: new Map(),
          components: [],
        })
      ).resolves.not.toThrow()
    })
  })

  describe('[pin] createAuditLog()', () => {
    it('should create an AuditLog node linked to the System', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:System { name: $sys })
      `, { sys: `${PREFIX}audit-system` })

      await repo.createAuditLog({
        systemName: `${PREFIX}audit-system`,
        userId: `${PREFIX}user1`,
        format: 'cyclonedx',
        componentsAdded: 3,
        componentsUpdated: 1,
        realUserId: null
      })

      const check = await session.run(`
        MATCH (a:AuditLog)-[:AUDITS]->(s:System { name: $sys })
        WHERE a.userId = $userId
        RETURN a
      `, { sys: `${PREFIX}audit-system`, userId: `${PREFIX}user1` })

      expect(check.records.length).toBe(1)
      const node = check.records[0].get('a').properties
      expect(node.operation).toBe('IMPORT_SBOM')
      expect(node.entityType).toBe('System')
    })

    it('should store metadata as parseable JSON', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:System { name: $sys })
      `, { sys: `${PREFIX}audit-json-system` })

      await repo.createAuditLog({
        systemName: `${PREFIX}audit-json-system`,
        userId: `${PREFIX}user2`,
        format: 'spdx',
        componentsAdded: 5,
        componentsUpdated: 2,
        realUserId: null
      })

      const check = await session.run(`
        MATCH (a:AuditLog)-[:AUDITS]->(s:System { name: $sys })
        WHERE a.userId = $userId
        RETURN a.metadata as metadata
      `, { sys: `${PREFIX}audit-json-system`, userId: `${PREFIX}user2` })

      expect(check.records.length).toBe(1)
      const parsed = JSON.parse(check.records[0].get('metadata'))
      expect(parsed.format).toBe('spdx')
      expect(parsed.added).toBe(5)
      expect(parsed.updated).toBe(2)
    })
  })
})
