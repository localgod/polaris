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
  describe('persistSBOM()', () => {
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
  })
})
