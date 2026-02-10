import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { TokenRepository } from '../../../server/repositories/token.repository'
import { getTestContext, cleanupTestData, seed, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_token_repo_'
let ctx: TestContext
let repo: TokenRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

beforeEach(async () => {
  if (!ctx.neo4jAvailable) return
  await cleanupTestData(ctx.driver, { prefix: PREFIX })
  repo = new TokenRepository(ctx.driver)
  session = ctx.driver.session()

  await seed(ctx.driver, `
    CREATE (:User { id: $id, email: $email, role: 'user', provider: 'github', name: 'Token Test User' })
  `, { id: `${PREFIX}user`, email: `${PREFIX}user@test.com` })
})

afterEach(async () => { if (session) await session.close() })

describe('TokenRepository', () => {
  describe('create()', () => {
    it('should create a token and return it', async () => {
      if (!ctx.neo4jAvailable) return
      const token = await repo.create({
        id: `${PREFIX}token-1`,
        tokenHash: `${PREFIX}hash123`,
        createdBy: `${PREFIX}user`,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        description: 'Test token'
      })

      expect(token).toBeDefined()
      expect(token.id).toBe(`${PREFIX}token-1`)
      expect(token.tokenHash).toBe(`${PREFIX}hash123`)
    })
  })

  describe('findByHash()', () => {
    it('should return null for non-existent hash', async () => {
      if (!ctx.neo4jAvailable) return
      expect(await repo.findByHash(`${PREFIX}nonexistent`)).toBeNull()
    })

    it('should return token with user data', async () => {
      if (!ctx.neo4jAvailable) return
      await repo.create({
        id: `${PREFIX}token-find`,
        tokenHash: `${PREFIX}findhash`,
        createdBy: `${PREFIX}user`,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        description: null
      })

      const result = await repo.findByHash(`${PREFIX}findhash`)

      expect(result).not.toBeNull()
      expect(result!.token.tokenHash).toBe(`${PREFIX}findhash`)
      expect(result!.user.id).toBe(`${PREFIX}user`)
    })
  })

  describe('revoke()', () => {
    it('should revoke a token', async () => {
      if (!ctx.neo4jAvailable) return
      await repo.create({
        id: `${PREFIX}token-revoke`,
        tokenHash: `${PREFIX}revokehash`,
        createdBy: `${PREFIX}user`,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        description: null
      })

      const revoked = await repo.revoke(`${PREFIX}token-revoke`)

      expect(revoked).toBe(true)
    })
  })

  describe('listByUser()', () => {
    it('should return tokens for a user', async () => {
      if (!ctx.neo4jAvailable) return
      await repo.create({
        id: `${PREFIX}token-a`, tokenHash: `${PREFIX}hash-a`,
        createdBy: `${PREFIX}user`, createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(), description: null
      })
      await repo.create({
        id: `${PREFIX}token-b`, tokenHash: `${PREFIX}hash-b`,
        createdBy: `${PREFIX}user`, createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(), description: null
      })

      const tokens = await repo.listByUser(`${PREFIX}user`)

      expect(tokens.length).toBeGreaterThanOrEqual(2)
    })
  })
})
