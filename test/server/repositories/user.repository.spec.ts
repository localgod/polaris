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

  describe('findById()', () => {
    it('should return user with teams and canManage arrays', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (u:User { id: $id, email: $email, name: 'Find User', role: 'user', provider: 'github', createdAt: datetime() })
        CREATE (t1:Team { name: $t1 })
        CREATE (t2:Team { name: $t2 })
        CREATE (u)-[:MEMBER_OF]->(t1)
        CREATE (u)-[:MEMBER_OF]->(t2)
        CREATE (u)-[:CAN_MANAGE]->(t1)
      `, {
        id: `${PREFIX}find-user`, email: `${PREFIX}find@test.com`,
        t1: `${PREFIX}TeamA`, t2: `${PREFIX}TeamB`
      })

      const user = await repo.findById(`${PREFIX}find-user`)

      expect(user).not.toBeNull()
      expect(user!.name).toBe('Find User')
      expect(user!.email).toBe(`${PREFIX}find@test.com`)
      expect(user!.teams.map(t => t.name).sort()).toEqual([`${PREFIX}TeamA`, `${PREFIX}TeamB`])
      expect(user!.canManage).toContain(`${PREFIX}TeamA`)
    })

    it('should return null for non-existent user', async () => {
      if (!ctx.neo4jAvailable) return
      const user = await repo.findById(`${PREFIX}nonexistent`)

      expect(user).toBeNull()
    })
  })

  describe('findAll()', () => {
    it('should return users ordered by createdAt descending', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:User { id: $id1, email: $e1, name: 'First', role: 'user', provider: 'github', createdAt: datetime() - duration('PT2H') })
        CREATE (:User { id: $id2, email: $e2, name: 'Second', role: 'user', provider: 'github', createdAt: datetime() })
      `, {
        id1: `${PREFIX}all-1`, e1: `${PREFIX}all1@test.com`,
        id2: `${PREFIX}all-2`, e2: `${PREFIX}all2@test.com`
      })

      const users = await repo.findAll()
      const testUsers = users.filter(u => u.id.startsWith(PREFIX))

      expect(testUsers.length).toBeGreaterThanOrEqual(2)
      // Second user (newer) should appear before First user (older)
      const idx1 = testUsers.findIndex(u => u.id === `${PREFIX}all-1`)
      const idx2 = testUsers.findIndex(u => u.id === `${PREFIX}all-2`)
      expect(idx2).toBeLessThan(idx1)
    })

    it('should include teams for each user', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (u:User { id: $id, email: $email, name: 'Team User', role: 'user', provider: 'github', createdAt: datetime() })
        CREATE (t:Team { name: $team })
        CREATE (u)-[:MEMBER_OF]->(t)
      `, { id: `${PREFIX}all-team`, email: `${PREFIX}allteam@test.com`, team: `${PREFIX}AllTeam` })

      const users = await repo.findAll()
      const user = users.find(u => u.id === `${PREFIX}all-team`)

      expect(user).toBeDefined()
      expect(user!.teams.map(t => t.name)).toContain(`${PREFIX}AllTeam`)
    })
  })

  describe('assignTeams()', () => {
    it('should assign user to teams and return updated user', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:User { id: $id, email: $email, name: 'Assign User', role: 'user', provider: 'github', createdAt: datetime() })
        CREATE (:Team { name: $t1 })
        CREATE (:Team { name: $t2 })
      `, {
        id: `${PREFIX}assign-user`, email: `${PREFIX}assign@test.com`,
        t1: `${PREFIX}AssignA`, t2: `${PREFIX}AssignB`
      })

      const user = await repo.assignTeams({
        userId: `${PREFIX}assign-user`,
        teams: [`${PREFIX}AssignA`, `${PREFIX}AssignB`]
      })

      expect(user.teams.map(t => t.name).sort()).toEqual([`${PREFIX}AssignA`, `${PREFIX}AssignB`])
    })

    it('should replace existing memberships', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (u:User { id: $id, email: $email, name: 'Replace User', role: 'user', provider: 'github', createdAt: datetime() })
        CREATE (t1:Team { name: $t1 })
        CREATE (t2:Team { name: $t2 })
        CREATE (u)-[:MEMBER_OF]->(t1)
      `, {
        id: `${PREFIX}replace-user`, email: `${PREFIX}replace@test.com`,
        t1: `${PREFIX}OldTeam`, t2: `${PREFIX}NewTeam`
      })

      const user = await repo.assignTeams({
        userId: `${PREFIX}replace-user`,
        teams: [`${PREFIX}NewTeam`]
      })

      const teamNames = user.teams.map(t => t.name)
      expect(teamNames).toContain(`${PREFIX}NewTeam`)
      expect(teamNames).not.toContain(`${PREFIX}OldTeam`)
    })

    it('should create ADD_TEAM_MEMBER audit entries for added teams', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (p:User { id: $performer, email: $pEmail, name: 'Admin', role: 'superuser', provider: 'github', createdAt: datetime() })
        CREATE (u:User { id: $id, email: $email, name: 'Audit Add User', role: 'user', provider: 'github', createdAt: datetime() })
        CREATE (:Team { name: $t1 })
      `, {
        performer: `${PREFIX}admin`, pEmail: `${PREFIX}admin@test.com`,
        id: `${PREFIX}audit-add`, email: `${PREFIX}auditadd@test.com`,
        t1: `${PREFIX}AuditTeamA`
      })

      await repo.assignTeams({
        userId: `${PREFIX}audit-add`,
        teams: [`${PREFIX}AuditTeamA`],
        performedBy: `${PREFIX}admin`
      })

      const result = await session.run(`
        MATCH (a:AuditLog {entityId: $userId, operation: 'ADD_TEAM_MEMBER'})
        RETURN a.newStatus AS team, a.reason AS reason
      `, { userId: `${PREFIX}audit-add` })

      expect(result.records.length).toBe(1)
      expect(result.records[0].get('team')).toBe(`${PREFIX}AuditTeamA`)
      expect(result.records[0].get('reason')).toContain(`${PREFIX}AuditTeamA`)
    })

    it('should create REMOVE_TEAM_MEMBER audit entries for removed teams', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (p:User { id: $performer, email: $pEmail, name: 'Admin', role: 'superuser', provider: 'github', createdAt: datetime() })
        CREATE (u:User { id: $id, email: $email, name: 'Audit Rm User', role: 'user', provider: 'github', createdAt: datetime() })
        CREATE (t:Team { name: $t1 })
        CREATE (u)-[:MEMBER_OF]->(t)
      `, {
        performer: `${PREFIX}admin-rm`, pEmail: `${PREFIX}adminrm@test.com`,
        id: `${PREFIX}audit-rm`, email: `${PREFIX}auditrm@test.com`,
        t1: `${PREFIX}AuditTeamRm`
      })

      await repo.assignTeams({
        userId: `${PREFIX}audit-rm`,
        teams: [],
        performedBy: `${PREFIX}admin-rm`
      })

      const result = await session.run(`
        MATCH (a:AuditLog {entityId: $userId, operation: 'REMOVE_TEAM_MEMBER'})
        RETURN a.newStatus AS team, a.reason AS reason
      `, { userId: `${PREFIX}audit-rm` })

      expect(result.records.length).toBe(1)
      expect(result.records[0].get('team')).toBe(`${PREFIX}AuditTeamRm`)
      expect(result.records[0].get('reason')).toContain(`${PREFIX}AuditTeamRm`)
    })

    it('should not create audit entries when memberships are unchanged', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (u:User { id: $id, email: $email, name: 'No Change User', role: 'user', provider: 'github', createdAt: datetime() })
        CREATE (t:Team { name: $t1 })
        CREATE (u)-[:MEMBER_OF]->(t)
      `, {
        id: `${PREFIX}no-change`, email: `${PREFIX}nochange@test.com`,
        t1: `${PREFIX}SameTeam`
      })

      await repo.assignTeams({
        userId: `${PREFIX}no-change`,
        teams: [`${PREFIX}SameTeam`],
        performedBy: `${PREFIX}no-change`
      })

      const result = await session.run(`
        MATCH (a:AuditLog {entityId: $userId})
        WHERE a.operation IN ['ADD_TEAM_MEMBER', 'REMOVE_TEAM_MEMBER']
        RETURN count(a) AS count
      `, { userId: `${PREFIX}no-change` })

      expect(result.records[0].get('count').toNumber()).toBe(0)
    })

    it('should link audit entries to both User and Team via AUDITS', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (p:User { id: $performer, email: $pEmail, name: 'Admin Link', role: 'superuser', provider: 'github', createdAt: datetime() })
        CREATE (u:User { id: $id, email: $email, name: 'Link User', role: 'user', provider: 'github', createdAt: datetime() })
        CREATE (:Team { name: $t1 })
      `, {
        performer: `${PREFIX}admin-link`, pEmail: `${PREFIX}adminlink@test.com`,
        id: `${PREFIX}link-user`, email: `${PREFIX}link@test.com`,
        t1: `${PREFIX}LinkTeam`
      })

      await repo.assignTeams({
        userId: `${PREFIX}link-user`,
        teams: [`${PREFIX}LinkTeam`],
        performedBy: `${PREFIX}admin-link`
      })

      const result = await session.run(`
        MATCH (a:AuditLog {entityId: $userId, operation: 'ADD_TEAM_MEMBER'})-[:AUDITS]->(u:User {id: $userId})
        MATCH (a)-[:AUDITS]->(t:Team {name: $team})
        MATCH (a)-[:PERFORMED_BY]->(p:User {id: $performer})
        RETURN a.id AS id
      `, {
        userId: `${PREFIX}link-user`,
        team: `${PREFIX}LinkTeam`,
        performer: `${PREFIX}admin-link`
      })

      expect(result.records.length).toBe(1)
    })
  })
})
