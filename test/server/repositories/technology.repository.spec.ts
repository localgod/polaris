import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { TechnologyRepository } from '../../../server/repositories/technology.repository'
import { getTestContext, cleanupTestData, seed, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_tech_repo_'
let ctx: TestContext
let repo: TechnologyRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

beforeEach(async () => {
  if (!ctx.neo4jAvailable) return
  await cleanupTestData(ctx.driver, { prefix: PREFIX })
  repo = new TechnologyRepository(ctx.driver)
  session = ctx.driver.session()
})

afterEach(async () => { if (session) await session.close() })

describe('TechnologyRepository', () => {
  describe('[pin] findAll()', () => {
    it('should return technologies', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Technology { name: $t1, type: 'library', domain: 'developer-tooling' })
        CREATE (:Technology { name: $t2, type: 'framework', domain: 'framework' })
      `, { t1: `${PREFIX}TypeScript`, t2: `${PREFIX}Nuxt` })

      const { data } = await repo.findAll()
      const test = data.filter(t => t.name.startsWith(PREFIX))

      expect(test.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('[pin] findByName()', () => {
    it('should return null for non-existent technology', async () => {
      if (!ctx.neo4jAvailable) return
      expect(await repo.findByName(`${PREFIX}nonexistent`)).toBeNull()
    })

    it('should return technology with details', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Technology { name: $name, type: 'platform', domain: 'data-platform', vendor: 'Neo4j Inc.' })
        CREATE (team:Team { name: $team })
        CREATE (team)-[:STEWARDED_BY]->(t)
      `, { name: `${PREFIX}Neo4j`, team: `${PREFIX}Platform` })

      const tech = await repo.findByName(`${PREFIX}Neo4j`)

      expect(tech).not.toBeNull()
      expect(tech!.name).toBe(`${PREFIX}Neo4j`)
      expect(tech!.type).toBe('platform')
      expect(tech!.domain).toBe('data-platform')
      expect(tech!.ownerTeamName).toBe(`${PREFIX}Platform`)
    })
  })

  describe('[contract] createFromComponent()', () => {
    it('should create a Technology and link every unlinked Component sharing componentName', async () => {
      if (!ctx.neo4jAvailable) return
      const componentName = `${PREFIX}react`
      await seed(ctx.driver, `
        CREATE (:Component { purl: $purl1, name: $componentName, version: '18.2.0', packageManager: 'npm' })
        CREATE (:Component { purl: $purl2, name: $componentName, version: '17.0.0', packageManager: 'npm' })
      `, { purl1: `pkg:npm/${componentName}@18.2.0`, purl2: `pkg:npm/${componentName}@17.0.0`, componentName })

      const name = await repo.createFromComponent({
        name: `${PREFIX}React`,
        type: 'framework',
        domain: 'framework',
        vendor: 'Meta',
        ownerTeam: null,
        componentName,
        userId: 'test-user'
      })

      expect(name).toBe(`${PREFIX}React`)

      const { records } = await session.run(
        `MATCH (c:Component {name: $componentName})-[:IS_VERSION_OF]->(t:Technology {name: $name}) RETURN count(c) AS linked`,
        { componentName, name: `${PREFIX}React` }
      )
      expect(records[0]!.get('linked').toNumber()).toBe(2)
    })

    it('should throw when no unlinked component matches componentName', async () => {
      if (!ctx.neo4jAvailable) return

      await expect(repo.createFromComponent({
        name: `${PREFIX}Ghost`,
        type: 'framework',
        domain: null,
        vendor: null,
        ownerTeam: null,
        componentName: `${PREFIX}nonexistent`,
        userId: 'test-user'
      })).rejects.toMatchObject({ statusCode: 404 })

      expect(await repo.exists(`${PREFIX}Ghost`)).toBe(false)
    })

    it('should throw when the only matching component is already linked to another Technology', async () => {
      if (!ctx.neo4jAvailable) return
      const componentName = `${PREFIX}vue`
      await seed(ctx.driver, `
        CREATE (c:Component { purl: $purl, name: $componentName, version: '3.4.0', packageManager: 'npm' })
        CREATE (existing:Technology { name: $existingTech, type: 'framework' })
        CREATE (c)-[:IS_VERSION_OF]->(existing)
      `, { purl: `pkg:npm/${componentName}@3.4.0`, componentName, existingTech: `${PREFIX}Vue` })

      await expect(repo.createFromComponent({
        name: `${PREFIX}VueDuplicate`,
        type: 'framework',
        domain: null,
        vendor: null,
        ownerTeam: null,
        componentName,
        userId: 'test-user'
      })).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  describe('[pin] findExistingApproval()', () => {
    it('should return null when no APPROVES relationship exists', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Technology { name: $tech, type: 'library', domain: 'developer-tooling' })
        CREATE (:Team { name: $team })
      `, { tech: `${PREFIX}TypeScript`, team: `${PREFIX}Architects` })

      const result = await repo.findExistingApproval(`${PREFIX}TypeScript`, `${PREFIX}Architects`, null)

      expect(result).toBeNull()
    })

    it('should return { time, notes } when a blanket APPROVES relationship exists', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Technology { name: $tech, type: 'library', domain: 'developer-tooling' })
        CREATE (team:Team { name: $team })
        CREATE (team)-[:APPROVES { time: $time, notes: $notes }]->(t)
      `, {
        tech: `${PREFIX}TypeScript`,
        team: `${PREFIX}Architects`,
        time: '2024-01-15',
        notes: 'Approved after review'
      })

      const result = await repo.findExistingApproval(`${PREFIX}TypeScript`, `${PREFIX}Architects`, null)

      expect(result).not.toBeNull()
      expect(result!.time).toBe('2024-01-15')
      expect(result!.notes).toBe('Approved after review')
    })

    it('should return null when only a different environment approval exists', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Technology { name: $tech, type: 'library', domain: 'developer-tooling' })
        CREATE (team:Team { name: $team })
        CREATE (team)-[:APPROVES { time: 'invest', environment: 'dev' }]->(t)
      `, { tech: `${PREFIX}TypeScript`, team: `${PREFIX}Architects` })

      const result = await repo.findExistingApproval(`${PREFIX}TypeScript`, `${PREFIX}Architects`, 'prod')

      expect(result).toBeNull()
    })
  })

  describe('[pin] findOwnerTeam()', () => {
    it('should return null for unknown technology', async () => {
      if (!ctx.neo4jAvailable) return
      await expect(repo.findOwnerTeam(`${PREFIX}missing`)).resolves.toBeNull()
    })

    it('should return deterministic owner team when stewarded', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Technology { name: $tech, type: 'library' })
        CREATE (a:Team { name: $a })
        CREATE (b:Team { name: $b })
        CREATE (b)-[:STEWARDED_BY]->(t)
        CREATE (a)-[:STEWARDED_BY]->(t)
      `, { tech: `${PREFIX}owner-tech`, a: `${PREFIX}A-Team`, b: `${PREFIX}B-Team` })

      const result = await repo.findOwnerTeam(`${PREFIX}owner-tech`)
      expect(result).toEqual({ name: `${PREFIX}owner-tech`, ownerTeam: `${PREFIX}A-Team` })
    })
  })

  describe('[pin] findForRadar()', () => {
    it('should include only approvals with both team and time', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Technology { name: $tech, type: 'library', domain: 'app' })
        CREATE (good:Team { name: $goodTeam })
        CREATE (bad:Team { name: $badTeam })
        CREATE (good)-[:APPROVES { time: 'tolerate' }]->(t)
        CREATE (bad)-[:APPROVES { notes: 'missing-time' }]->(t)
      `, { tech: `${PREFIX}radar-tech`, goodTeam: `${PREFIX}good`, badTeam: `${PREFIX}bad` })

      const rows = await repo.findForRadar()
      const row = rows.find(r => r.name === `${PREFIX}radar-tech`)

      expect(row).toBeDefined()
      expect(row!.approvals).toEqual([{ team: `${PREFIX}good`, time: 'tolerate' }])
    })
  })

  describe('[pin] update() and delete()', () => {
    it('should update an existing technology', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Technology { name: $name, type: 'library', domain: null, vendor: null })
      `, { name: `${PREFIX}update-tech` })

      const updated = await repo.update({
        name: `${PREFIX}update-tech`,
        type: 'framework',
        domain: 'frontend',
        vendor: 'Vue',
        ownerTeam: null,
        lastReviewed: null,
        userId: 'user-1',
        realUserId: null,
        changes: {
          type: { before: 'library', after: 'framework' },
        },
      })

      expect(updated).toBe(`${PREFIX}update-tech`)
      const tech = await repo.findByName(`${PREFIX}update-tech`)
      expect(tech!.type).toBe('framework')
    })

    it('should throw 404 when updating missing technology', async () => {
      if (!ctx.neo4jAvailable) return
      await expect(repo.update({
        name: `${PREFIX}missing-tech`,
        type: 'library',
        domain: null,
        vendor: null,
        ownerTeam: null,
        lastReviewed: null,
        userId: 'user-1',
        realUserId: null,
        changes: {},
      })).rejects.toMatchObject({ statusCode: 404 })
    })

    it('should delete technology', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `CREATE (:Technology { name: $name, type: 'library' })`, { name: `${PREFIX}delete-tech` })

      await repo.delete(`${PREFIX}delete-tech`, 'user-1', {})
      await expect(repo.exists(`${PREFIX}delete-tech`)).resolves.toBe(false)
    })
  })

  describe('[contract] link operations', () => {
    it('linkComponent should connect named component version', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Technology { name: $tech, type: 'library' })
        CREATE (:Component { name: $comp, version: '1.2.3' })
      `, { tech: `${PREFIX}link-tech`, comp: `${PREFIX}link-comp` })

      const result = await repo.linkComponent({
        technologyName: `${PREFIX}link-tech`,
        componentName: `${PREFIX}link-comp`,
        componentVersion: '1.2.3',
        userId: 'user-1',
      })

      expect(result.componentVersion).toBe('1.2.3')
    })

    it('linkComponentByPurl should return affected systems', async () => {
      if (!ctx.neo4jAvailable) return
      const purl = `pkg:npm/${PREFIX}purl-comp@2.0.0`
      await seed(ctx.driver, `
        CREATE (t:Technology { name: $tech, type: 'library' })
        CREATE (c:Component { name: $comp, version: '2.0.0', purl: $purl })
        CREATE (s:System { name: $sys })
        CREATE (s)-[:USES]->(c)
      `, { tech: `${PREFIX}purl-tech`, comp: `${PREFIX}purl-comp`, purl, sys: `${PREFIX}sys` })

      const result = await repo.linkComponentByPurl({
        technologyName: `${PREFIX}purl-tech`,
        purl,
        userId: 'user-1',
      })

      expect(result.purl).toBe(purl)
      expect(result.affectedSystems).toContain(`${PREFIX}sys`)
    })

    it('linkComponentsByName should link all matching components', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Technology { name: $tech, type: 'library' })
        CREATE (c1:Component { name: $comp, version: '1.0.0' })
        CREATE (c2:Component { name: $comp, version: '2.0.0' })
        CREATE (s:System { name: $sys1 })-[:USES]->(c1)
        CREATE (s2:System { name: $sys2 })-[:USES]->(c2)
      `, {
        tech: `${PREFIX}bulk-tech`,
        comp: `${PREFIX}bulk-comp`,
        sys1: `${PREFIX}sys-1`,
        sys2: `${PREFIX}sys-2`,
      })

      const result = await repo.linkComponentsByName({
        technologyName: `${PREFIX}bulk-tech`,
        componentName: `${PREFIX}bulk-comp`,
        userId: 'user-1',
      })

      expect(result.count).toBeGreaterThanOrEqual(1)
      expect(result.affectedSystems.length).toBeGreaterThanOrEqual(1)
    })

    it('linkComponentsByName should create a LINK AuditLog entry', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Technology { name: $tech, type: 'library' })
        CREATE (c:Component { name: $comp, version: '1.0.0' })
        CREATE (s:System { name: $sys })-[:USES]->(c)
      `, { tech: `${PREFIX}audit-link-tech`, comp: `${PREFIX}audit-link-comp`, sys: `${PREFIX}audit-link-sys` })

      await repo.linkComponentsByName({
        technologyName: `${PREFIX}audit-link-tech`,
        componentName: `${PREFIX}audit-link-comp`,
        userId: `${PREFIX}user1`,
      })

      const check = await session.run(`
        MATCH (a:AuditLog { operation: 'LINK', entityType: 'TechnologyComponent' })-[:AUDITS]->(t:Technology { name: $tech })
        WHERE a.userId = $userId
        RETURN a
      `, { tech: `${PREFIX}audit-link-tech`, userId: `${PREFIX}user1` })

      expect(check.records).toHaveLength(1)
    })
  })

  describe('[pin] getGraph()', () => {
    it('should return null for non-existent technology', async () => {
      if (!ctx.neo4jAvailable) return
      expect(await repo.getGraph(`${PREFIX}nonexistent`)).toBeNull()
    })

    it('should return an empty array when the technology exists but no system uses it', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `CREATE (:Technology { name: $tech, type: 'library' })`, { tech: `${PREFIX}unused-tech` })

      expect(await repo.getGraph(`${PREFIX}unused-tech`)).toEqual([])
    })

    it('should deduplicate versions in use by a system', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Technology { name: $tech, type: 'library' })
        CREATE (c1:Component { name: $comp, version: '1.0.0' })-[:IS_VERSION_OF]->(t)
        CREATE (c2:Component { name: $comp, version: '2.0.0' })-[:IS_VERSION_OF]->(t)
        CREATE (s:System { name: $sys })-[:USES]->(c1)
        CREATE (s)-[:USES]->(c2)
      `, { tech: `${PREFIX}versions-tech`, comp: `${PREFIX}versions-comp`, sys: `${PREFIX}versions-sys` })

      const rows = await repo.getGraph(`${PREFIX}versions-tech`)

      expect(rows).toHaveLength(1)
      expect(rows![0]!.versions.sort()).toEqual(['1.0.0', '2.0.0'])
    })

    it('should deterministically pin one owning team when a system somehow has more than one OWNS edge', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Technology { name: $tech, type: 'library' })
        CREATE (c:Component { name: $comp, version: '1.0.0' })-[:IS_VERSION_OF]->(t)
        CREATE (a:Team { name: $a })
        CREATE (b:Team { name: $b })
        CREATE (s:System { name: $sys })-[:USES]->(c)
        CREATE (b)-[:OWNS]->(s)
        CREATE (a)-[:OWNS]->(s)
      `, {
        tech: `${PREFIX}multi-owns-tech`,
        comp: `${PREFIX}multi-owns-comp`,
        a: `${PREFIX}A-Team`,
        b: `${PREFIX}B-Team`,
        sys: `${PREFIX}multi-owns-sys`,
      })

      const rows1 = await repo.getGraph(`${PREFIX}multi-owns-tech`)
      const rows2 = await repo.getGraph(`${PREFIX}multi-owns-tech`)

      expect(rows1![0]!.ownerTeamName).toBe(`${PREFIX}A-Team`)
      expect(rows2![0]!.ownerTeamName).toBe(`${PREFIX}A-Team`)
    })
  })

  describe('[contract] getGraph() approval resolution', () => {
    it('should resolve the TIME from the system\'s OWNING team, not an unrelated approving team', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Technology { name: $tech, type: 'library' })
        CREATE (c:Component { name: $comp, version: '1.0.0' })-[:IS_VERSION_OF]->(t)
        CREATE (owningTeam:Team { name: $owningTeam })
        CREATE (otherTeam:Team { name: $otherTeam })
        CREATE (s:System { name: $sys, environment: 'prod' })-[:USES]->(c)
        CREATE (owningTeam)-[:OWNS]->(s)
        CREATE (owningTeam)-[:APPROVES { time: 'tolerate' }]->(t)
        CREATE (otherTeam)-[:APPROVES { time: 'eliminate' }]->(t)
      `, {
        tech: `${PREFIX}owning-team-tech`,
        comp: `${PREFIX}owning-team-comp`,
        owningTeam: `${PREFIX}owning-team`,
        otherTeam: `${PREFIX}other-team`,
        sys: `${PREFIX}owning-team-sys`,
      })

      const rows = await repo.getGraph(`${PREFIX}owning-team-tech`)
      const row = rows!.find(r => r.systemName === `${PREFIX}owning-team-sys`)

      expect(row).toBeDefined()
      expect(row!.ownerTeamName).toBe(`${PREFIX}owning-team`)
      expect(row!.approved).toBe(true)
      expect(row!.time).toBe('tolerate')
    })

    it('should return approved=false and time=null when the owning team has no APPROVES edge at all', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Technology { name: $tech, type: 'library' })
        CREATE (c:Component { name: $comp, version: '1.0.0' })-[:IS_VERSION_OF]->(t)
        CREATE (owningTeam:Team { name: $owningTeam })
        CREATE (s:System { name: $sys })-[:USES]->(c)
        CREATE (owningTeam)-[:OWNS]->(s)
      `, {
        tech: `${PREFIX}gap-tech`,
        comp: `${PREFIX}gap-comp`,
        owningTeam: `${PREFIX}gap-team`,
        sys: `${PREFIX}gap-sys`,
      })

      const rows = await repo.getGraph(`${PREFIX}gap-tech`)
      const row = rows!.find(r => r.systemName === `${PREFIX}gap-sys`)

      expect(row).toBeDefined()
      expect(row!.approved).toBe(false)
      expect(row!.time).toBeNull()
    })

    it('should prefer an environment-specific approval over a blanket one, and fall back to blanket when no environment-specific approval exists', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (t:Technology { name: $tech, type: 'library' })
        CREATE (c:Component { name: $comp, version: '1.0.0' })-[:IS_VERSION_OF]->(t)
        CREATE (team:Team { name: $team })
        CREATE (prodSys:System { name: $prodSys, environment: 'prod' })-[:USES]->(c)
        CREATE (devSys:System { name: $devSys, environment: 'dev' })-[:USES]->(c)
        CREATE (team)-[:OWNS]->(prodSys)
        CREATE (team)-[:OWNS]->(devSys)
        CREATE (team)-[:APPROVES { time: 'eliminate', environment: 'prod' }]->(t)
        CREATE (team)-[:APPROVES { time: 'invest' }]->(t)
      `, {
        tech: `${PREFIX}env-tech`,
        comp: `${PREFIX}env-comp`,
        team: `${PREFIX}env-team`,
        prodSys: `${PREFIX}env-prod-sys`,
        devSys: `${PREFIX}env-dev-sys`,
      })

      const rows = await repo.getGraph(`${PREFIX}env-tech`)
      const prodRow = rows!.find(r => r.systemName === `${PREFIX}env-prod-sys`)
      const devRow = rows!.find(r => r.systemName === `${PREFIX}env-dev-sys`)

      expect(prodRow!.time).toBe('eliminate')
      expect(devRow!.time).toBe('invest')
    })
  })

  describe('[pin] upsertApproval()', () => {
    it('should create and then update approval for same environment', async () => {
      if (!ctx.neo4jAvailable) return
      await seed(ctx.driver, `
        CREATE (:Technology { name: $tech, type: 'library' })
        CREATE (:Team { name: $team })
      `, { tech: `${PREFIX}approve-tech`, team: `${PREFIX}approve-team` })

      const created = await repo.upsertApproval({
        technologyName: `${PREFIX}approve-tech`,
        teamName: `${PREFIX}approve-team`,
        time: 'invest',
        notes: 'initial',
        environment: 'prod',
        userId: 'user-1',
        realUserId: null,
        changes: { time: { before: null, after: 'invest' } },
      })

      const updated = await repo.upsertApproval({
        technologyName: `${PREFIX}approve-tech`,
        teamName: `${PREFIX}approve-team`,
        time: 'tolerate',
        notes: 'updated',
        environment: 'prod',
        userId: 'user-1',
        realUserId: null,
        changes: { time: { before: 'invest', after: 'tolerate' } },
      })

      expect(created.time).toBe('invest')
      expect(updated.time).toBe('tolerate')
    })
  })
})
