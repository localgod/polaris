import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { TeamRepository } from '../../../server/repositories/team.repository'
import { getTestContext, cleanupTestData, seed, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_team_repo_'
let ctx: TestContext
let repo: TeamRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

beforeEach(async () => {
  if (!ctx.neo4jAvailable) return
  await cleanupTestData(ctx.driver, { prefix: PREFIX })
  repo = new TeamRepository(ctx.driver)
  session = ctx.driver.session()
})

afterEach(async () => { if (session) await session.close() })

describe('TeamRepository', () => {
  describe('[pin] findAll()', () => {
    it('should return teams', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Team { name: $t1, responsibilityArea: 'Backend' })
        CREATE (:Team { name: $t2, responsibilityArea: 'Frontend' })
      `, { t1: `${PREFIX}backend`, t2: `${PREFIX}frontend` })

      const { data } = await repo.findAll()
      const test = data.filter(t => t.name.startsWith(PREFIX))

      expect(test.length).toBeGreaterThanOrEqual(2)
    })

    it('should return correct memberCount', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Team { name: $team })
        CREATE (u1:User { id: $u1, email: $e1, name: 'Member 1', role: 'user', provider: 'github', createdAt: datetime() })
        CREATE (u2:User { id: $u2, email: $e2, name: 'Member 2', role: 'user', provider: 'github', createdAt: datetime() })
        CREATE (u1)-[:MEMBER_OF]->(t)
        CREATE (u2)-[:MEMBER_OF]->(t)
      `, {
        team: `${PREFIX}counted`,
        u1: `${PREFIX}member1`, e1: `${PREFIX}m1@test.com`,
        u2: `${PREFIX}member2`, e2: `${PREFIX}m2@test.com`
      })

      const { data } = await repo.findAll()
      const team = data.find(t => t.name === `${PREFIX}counted`)

      expect(team).toBeDefined()
      expect(team!.memberCount).toBe(2)
    })

    it('should return 0 memberCount for team with no members', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Team { name: $team })
      `, { team: `${PREFIX}empty` })

      const { data } = await repo.findAll()
      const team = data.find(t => t.name === `${PREFIX}empty`)

      expect(team).toBeDefined()
      expect(team!.memberCount).toBe(0)
    })
  })

  describe('[pin] findByName()', () => {
    it('should return null for non-existent team', async () => {
      if (!ctx.neo4jAvailable) return
      expect(await repo.findByName(`${PREFIX}nonexistent`)).toBeNull()
    })

    it('should return team when it exists', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `CREATE (:Team { name: $n, responsibilityArea: 'Platform' })`, { n: `${PREFIX}platform` })

      const team = await repo.findByName(`${PREFIX}platform`)

      expect(team).not.toBeNull()
      expect(team!.name).toBe(`${PREFIX}platform`)
    })

    it('should return empty members/systems/technologies for a team with none', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `CREATE (:Team { name: $n })`, { n: `${PREFIX}bare` })

      const team = await repo.findByName(`${PREFIX}bare`)

      expect(team!.members).toEqual([])
      expect(team!.systems).toEqual([])
      expect(team!.technologies).toEqual([])
    })

    it('should list members with role derived from CAN_MANAGE', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Team { name: $team })
        CREATE (u1:User { id: $u1, email: $e1, name: 'Regular Member', role: 'user', provider: 'github', createdAt: datetime() })
        CREATE (u2:User { id: $u2, email: $e2, name: 'Team Lead', role: 'user', provider: 'github', createdAt: datetime() })
        CREATE (u1)-[:MEMBER_OF]->(t)
        CREATE (u2)-[:MEMBER_OF]->(t)
        CREATE (u2)-[:CAN_MANAGE]->(t)
      `, {
        team: `${PREFIX}staffed`,
        u1: `${PREFIX}u1`, e1: `${PREFIX}u1@test.com`,
        u2: `${PREFIX}u2`, e2: `${PREFIX}u2@test.com`
      })

      const team = await repo.findByName(`${PREFIX}staffed`)

      expect(team!.members).toEqual(expect.arrayContaining([
        { name: 'Regular Member', email: `${PREFIX}u1@test.com`, role: 'Member' },
        { name: 'Team Lead', email: `${PREFIX}u2@test.com`, role: 'Manager' }
      ]))
      expect(team!.members).toHaveLength(2)
    })

    it('should list owned systems and stewarded technologies', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Team { name: $team })
        CREATE (s:System { name: $sys, businessCriticality: 'high', environment: 'prod' })
        CREATE (tech:Technology { name: $tech, type: 'framework' })
        CREATE (t)-[:OWNS]->(s)
        CREATE (t)-[:STEWARDED_BY]->(tech)
        CREATE (t)-[:APPROVES { time: 'invest' }]->(tech)
      `, {
        team: `${PREFIX}owner2`, sys: `${PREFIX}sys1`, tech: `${PREFIX}tech1`
      })

      const team = await repo.findByName(`${PREFIX}owner2`)

      expect(team!.systems).toEqual([
        { name: `${PREFIX}sys1`, businessCriticality: 'high', environment: 'prod' }
      ])
      expect(team!.technologies).toEqual([
        { name: `${PREFIX}tech1`, type: 'framework', timeCategory: 'invest', relationship: 'Steward' }
      ])
    })
  })

  describe('[pin] exists()', () => {
    it('should return false for non-existent team', async () => {
      if (!ctx.neo4jAvailable) return
      expect(await repo.exists(`${PREFIX}nonexistent`)).toBe(false)
    })

    it('should return true for existing team', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `CREATE (:Team { name: $n })`, { n: `${PREFIX}exists` })

      expect(await repo.exists(`${PREFIX}exists`)).toBe(true)
    })
  })

  describe('[pin] countOwnedSystems()', () => {
    it('should return 0 when team owns no systems', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `CREATE (:Team { name: $n })`, { n: `${PREFIX}no-systems` })

      expect(await repo.countOwnedSystems(`${PREFIX}no-systems`)).toBe(0)
    })

    it('should count owned systems', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Team { name: $team })
        CREATE (s1:System { name: $s1 })
        CREATE (s2:System { name: $s2 })
        CREATE (t)-[:OWNS]->(s1)
        CREATE (t)-[:OWNS]->(s2)
      `, { team: `${PREFIX}owner`, s1: `${PREFIX}sys1`, s2: `${PREFIX}sys2` })

      expect(await repo.countOwnedSystems(`${PREFIX}owner`)).toBe(2)
    })
  })

  describe('[pin] delete()', () => {
    it('should delete a team', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `CREATE (:Team { name: $n })`, { n: `${PREFIX}to-delete` })

      expect(await repo.exists(`${PREFIX}to-delete`)).toBe(true)
      await repo.delete(`${PREFIX}to-delete`, 'test-user', {})
      expect(await repo.exists(`${PREFIX}to-delete`)).toBe(false)
    })
  })

  describe('[pin] create() and update()', () => {
    it('should create team and write audit entry', async () => {
      if (!ctx.neo4jAvailable) return

      const name = await repo.create({
        name: `${PREFIX}created`,
        email: 'created@example.com',
        responsibilityArea: 'Platform',
        userId: 'user-1',
      })

      expect(name).toBe(`${PREFIX}created`)
      const audit = await session.run(
        `MATCH (a:AuditLog {entityType: 'Team', entityId: $name, operation: 'CREATE'}) RETURN count(a) AS c`,
        { name }
      )
      expect(audit.records[0]!.get('c').toNumber()).toBe(1)
    })

    it('should update existing team and return updated name', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `CREATE (:Team { name: $name, email: null, responsibilityArea: null })`, { name: `${PREFIX}updatable` })

      const updatedName = await repo.update({
        name: `${PREFIX}updatable`,
        newName: `${PREFIX}renamed`,
        email: 'renamed@example.com',
        responsibilityArea: 'Security',
        changedFields: ['name', 'email', 'responsibilityArea'],
        changes: {
          name: { before: `${PREFIX}updatable`, after: `${PREFIX}renamed` },
          email: { before: null, after: 'renamed@example.com' },
          responsibilityArea: { before: null, after: 'Security' },
        },
        userId: 'user-1',
      })

      expect(updatedName).toBe(`${PREFIX}renamed`)
      expect(await repo.exists(`${PREFIX}renamed`)).toBe(true)
      expect(await repo.exists(`${PREFIX}updatable`)).toBe(false)
    })
  })

  describe('[pin] findAllNames()', () => {
    it('should return all team names', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Team { name: $t1 })
        CREATE (:Team { name: $t2 })
      `, { t1: `${PREFIX}names-a`, t2: `${PREFIX}names-b` })

      const names = await repo.findAllNames()
      expect(names).toContain(`${PREFIX}names-a`)
      expect(names).toContain(`${PREFIX}names-b`)
    })
  })

  describe('[pin] findApprovals()', () => {
    it('should return technology and version approvals', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (team:Team { name: $team })
        CREATE (tech:Technology { name: $tech, type: 'library', vendor: 'ACME' })
        CREATE (ver:Version { version: '1.0.0' })
        CREATE (tech)-[:HAS_VERSION]->(ver)
        CREATE (team)-[:APPROVES { time: 'tolerate', notes: 'ok' }]->(tech)
        CREATE (team)-[:APPROVES { time: 'invest' }]->(ver)
      `, { team: `${PREFIX}approver`, tech: `${PREFIX}tech` })

      const result = await repo.findApprovals(`${PREFIX}approver`)

      expect(result.team).toBe(`${PREFIX}approver`)
      expect(result.technologyApprovals.some(a => a.technology === `${PREFIX}tech`)).toBe(true)
      expect(result.versionApprovals.some(a => a.version === '1.0.0')).toBe(true)
    })

    it('should throw when team does not exist', async () => {
      if (!ctx.neo4jAvailable) return
      await expect(repo.findApprovals(`${PREFIX}missing`)).rejects.toThrow()
    })
  })

  describe('[pin] findConstraints()', () => {
    it('should return both enforced and subject constraints', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (team:Team { name: $team })
        CREATE (enforcer:Team { name: $enforcer })
        CREATE (p1:VersionConstraint { name: $p1, ruleType: 'version_range', severity: 'warning', scope: 'team', status: 'active' })
        CREATE (p2:VersionConstraint { name: $p2, ruleType: 'version_range', severity: 'error', scope: 'team', status: 'active' })
        CREATE (team)-[:ENFORCES]->(p1)
        CREATE (team)-[:SUBJECT_TO]->(p2)
        CREATE (enforcer)-[:ENFORCES]->(p2)
      `, { team: `${PREFIX}policy-team`, enforcer: `${PREFIX}enforcer`, p1: `${PREFIX}policy-1`, p2: `${PREFIX}policy-2` })

      const result = await repo.findConstraints(`${PREFIX}policy-team`)

      expect(result.enforcedCount).toBe(1)
      expect(result.subjectToCount).toBe(1)
      expect(result.subjectTo[0]?.enforcedBy).toBe(`${PREFIX}enforcer`)
    })
  })

  describe('[pin] findUsage()', () => {
    it('should derive compliance summary from usage and approvals', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (team:Team { name: $team })
        CREATE (t1:Technology { name: $t1, type: 'library', domain: 'app' })
        CREATE (t2:Technology { name: $t2, type: 'library', domain: 'app' })
        CREATE (team)-[:USES { systemCount: 3 }]->(t1)
        CREATE (team)-[:USES { systemCount: 1 }]->(t2)
        CREATE (team)-[:APPROVES { time: 'tolerate' }]->(t1)
      `, { team: `${PREFIX}usage-team`, t1: `${PREFIX}tech-approved`, t2: `${PREFIX}tech-unapproved` })

      const result = await repo.findUsage(`${PREFIX}usage-team`)

      expect(result.summary.totalTechnologies).toBe(2)
      expect(result.summary.compliant).toBe(1)
      expect(result.summary.unapproved).toBe(1)
    })
  })

  describe('[contract] checkApproval()', () => {
    it('should return default eliminate when no explicit approval exists', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Team { name: $team })
        CREATE (:Technology { name: $tech, type: 'library' })
      `, { team: `${PREFIX}default-team`, tech: `${PREFIX}default-tech` })

      const result = await repo.checkApproval(`${PREFIX}default-team`, `${PREFIX}default-tech`)

      expect(result).not.toBeNull()
      expect(result!.approval.level).toBe('default')
      expect(result!.approval.time).toBe('eliminate')
    })

    it('should prioritize version-level approval over technology-level', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (team:Team { name: $team })
        CREATE (tech:Technology { name: $tech, type: 'library' })
        CREATE (v:Version { version: '1.2.3' })
        CREATE (tech)-[:HAS_VERSION]->(v)
        CREATE (team)-[:APPROVES { time: 'migrate' }]->(tech)
        CREATE (team)-[:APPROVES { time: 'tolerate' }]->(v)
      `, { team: `${PREFIX}priority-team`, tech: `${PREFIX}priority-tech` })

      const result = await repo.checkApproval(`${PREFIX}priority-team`, `${PREFIX}priority-tech`, '1.2.3')

      expect(result).not.toBeNull()
      expect(result!.approval.level).toBe('version')
      expect(result!.approval.time).toBe('tolerate')
    })
  })

  describe('[pin] ownsSystem()', () => {
    it('should return true when one of the teams owns the system', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Team { name: $team })
        CREATE (s:System { name: $sys })
        CREATE (t)-[:OWNS]->(s)
      `, { team: `${PREFIX}own-team`, sys: `${PREFIX}own-sys` })

      const result = await repo.ownsSystem([`${PREFIX}own-team`], `${PREFIX}own-sys`)
      expect(result).toBe(true)
    })

    it('should return false when none of the teams own the system', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Team { name: $team })
        CREATE (s:System { name: $sys })
      `, { team: `${PREFIX}no-own-team`, sys: `${PREFIX}no-own-sys` })

      const result = await repo.ownsSystem([`${PREFIX}no-own-team`], `${PREFIX}no-own-sys`)
      expect(result).toBe(false)
    })
  })

  describe('[pin] stewardsTechnology()', () => {
    it('should return true when one of the teams stewards the technology', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Team { name: $team })
        CREATE (tech:Technology { name: $tech })
        CREATE (t)-[:STEWARDED_BY]->(tech)
      `, { team: `${PREFIX}stew-team`, tech: `${PREFIX}stew-tech` })

      const result = await repo.stewardsTechnology([`${PREFIX}stew-team`], `${PREFIX}stew-tech`)
      expect(result).toBe(true)
    })

    it('should return false when none of the teams steward the technology', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Team { name: $team })
        CREATE (tech:Technology { name: $tech })
      `, { team: `${PREFIX}no-stew-team`, tech: `${PREFIX}no-stew-tech` })

      const result = await repo.stewardsTechnology([`${PREFIX}no-stew-team`], `${PREFIX}no-stew-tech`)
      expect(result).toBe(false)
    })
  })
})
