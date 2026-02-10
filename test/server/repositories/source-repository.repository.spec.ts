import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { SourceRepositoryRepository } from '../../../server/repositories/source-repository.repository'
import { getTestContext, cleanupTestData, seed, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_srcrepo_'
let ctx: TestContext
let repo: SourceRepositoryRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

beforeEach(async () => {
  if (!ctx.neo4jAvailable) return
  await cleanupTestData(ctx.driver, { prefix: PREFIX })
  repo = new SourceRepositoryRepository(ctx.driver)
  session = ctx.driver.session()
})

afterEach(async () => { if (session) await session.close() })

describe('SourceRepositoryRepository', () => {
  describe('findAll()', () => {
    it('should return repositories', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Repository { url: $url, name: $name })
      `, { url: `https://github.com/${PREFIX}org/repo`, name: `${PREFIX}repo` })

      const result = await repo.findAll()

      expect(result.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('findByUrl()', () => {
    it('should return null for non-existent URL', async () => {
      if (!ctx.neo4jAvailable) return
      expect(await repo.findByUrl(`https://github.com/${PREFIX}nonexistent`)).toBeNull()
    })

    it('should return repository when it exists', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Repository { url: $url, name: $name })
      `, { url: `https://github.com/${PREFIX}org/find-repo`, name: `${PREFIX}find-repo` })

      const result = await repo.findByUrl(`https://github.com/${PREFIX}org/find-repo`)

      expect(result).not.toBeNull()
      expect(result!.name).toBe(`${PREFIX}find-repo`)
    })
  })

  describe('createWithSystem()', () => {
    it('should create repository linked to a system', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:System { name: $sys })
        CREATE (:Team { name: $team })
      `, { sys: `${PREFIX}my-system`, team: `${PREFIX}my-team` })

      await repo.createWithSystem({
        url: `https://github.com/${PREFIX}org/new-repo`,
        name: `${PREFIX}new-repo`,
        systemName: `${PREFIX}my-system`,
        teamName: `${PREFIX}my-team`
      })

      const result = await repo.findByUrl(`https://github.com/${PREFIX}org/new-repo`)

      expect(result).not.toBeNull()
      expect(result!.name).toBe(`${PREFIX}new-repo`)
    })
  })
})
