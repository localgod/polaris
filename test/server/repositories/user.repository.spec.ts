import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { UserRepository } from '../../../server/repositories/user.repository'
import { getTestContext, cleanupTestData, seed, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_user_repo_'
let ctx: TestContext
let repo: UserRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

beforeEach(async () => {
  if (!ctx.neo4jAvailable) return
  await cleanupTestData(ctx.driver, { prefix: PREFIX })
  repo = new UserRepository(ctx.driver)
  session = ctx.driver.session()
})

afterEach(async () => { if (session) await session.close() })

describe('UserRepository', () => {
  describe('createOrUpdateUser()', () => {
    it('should create a new user', async () => {
      if (!ctx.neo4jAvailable) return
      await repo.createOrUpdateUser({
        id: `${PREFIX}new-user`, email: `${PREFIX}new@test.com`,
        name: 'New User', provider: 'github', isSuperuser: false,
        role: 'user', avatarUrl: null
      })

      const result = await session.run(
        `MATCH (u:User {id: $id}) RETURN u.email as email, u.role as role`,
        { id: `${PREFIX}new-user` }
      )

      expect(result.records.length).toBe(1)
      expect(result.records[0].get('email')).toBe(`${PREFIX}new@test.com`)
    })

    it('should update existing user on re-login', async () => {
      if (!ctx.neo4jAvailable) return
      await repo.createOrUpdateUser({
        id: `${PREFIX}update-user`, email: `${PREFIX}old@test.com`,
        name: 'Old Name', provider: 'github', isSuperuser: false,
        role: 'user', avatarUrl: null
      })
      await repo.createOrUpdateUser({
        id: `${PREFIX}update-user`, email: `${PREFIX}new@test.com`,
        name: 'New Name', provider: 'github', isSuperuser: false,
        role: 'user', avatarUrl: null
      })

      const result = await session.run(
        `MATCH (u:User {id: $id}) RETURN u.email as email, u.name as name`,
        { id: `${PREFIX}update-user` }
      )

      expect(result.records[0].get('email')).toBe(`${PREFIX}new@test.com`)
      expect(result.records[0].get('name')).toBe('New Name')
    })

    it('should set superuser role when isSuperuser is true', async () => {
      if (!ctx.neo4jAvailable) return
      await repo.createOrUpdateUser({
        id: `${PREFIX}super`, email: `${PREFIX}super@test.com`,
        name: 'Super User', provider: 'github', isSuperuser: true,
        role: 'user', avatarUrl: null
      })

      const result = await session.run(
        `MATCH (u:User {id: $id}) RETURN u.role as role`,
        { id: `${PREFIX}super` }
      )

      expect(result.records[0].get('role')).toBe('superuser')
    })
  })

  describe('getAuthData()', () => {
    it('should return auth data with role and teams', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (u:User { id: $id, email: $email, name: 'Auth User', role: 'user', provider: 'github' })
        CREATE (t:Team { name: $team })
        CREATE (u)-[:MEMBER_OF]->(t)
      `, { id: `${PREFIX}auth-user`, email: `${PREFIX}auth@test.com`, team: `${PREFIX}DevTeam` })

      const auth = await repo.getAuthData(`${PREFIX}auth-user`)

      expect(auth).not.toBeNull()
      expect(auth!.role).toBe('user')
      expect(auth!.email).toBe(`${PREFIX}auth@test.com`)
      expect(auth!.teams.length).toBeGreaterThanOrEqual(1)
    })

    it('should return null for non-existent user', async () => {
      if (!ctx.neo4jAvailable) return
      const auth = await repo.getAuthData(`${PREFIX}nonexistent`)

      expect(auth).toBeNull()
    })
  })
})
