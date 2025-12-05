import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { SystemRepository } from '../../../server/repositories/system.repository'
import neo4j, { type Driver, type Session } from 'neo4j-driver'
import { cleanupTestData } from '../../fixtures/db-cleanup'

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687'
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j'
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword'
const TEST_PREFIX = 'test_system_repo_'

// Declare global loadQuery type
declare global {
  var loadQuery: (path: string) => Promise<string>
}

// Mock loadQuery since it's a Nuxt utility not available in tests
global.loadQuery = vi.fn(async (path: string) => {
  if (path === 'systems/find-all.cypher') {
    return `
      MATCH (s:System)
      OPTIONAL MATCH (s)-[:USES]->(c:Component)
      OPTIONAL MATCH (s)-[:HAS_SOURCE_IN]->(r:Repository)
      WITH s, count(DISTINCT c) as componentCount, count(DISTINCT r) as repositoryCount
      RETURN 
        s.name as name,
        s.domain as domain,
        s.ownerTeam as ownerTeam,
        s.businessCriticality as businessCriticality,
        s.environment as environment,
        s.sourceCodeType as sourceCodeType,
        s.hasSourceAccess as hasSourceAccess,
        componentCount,
        repositoryCount
      ORDER BY 
        CASE s.businessCriticality
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        s.name
    `
  }
  if (path === 'systems/find-by-name.cypher') {
    return `
      MATCH (s:System {name: $name})
      OPTIONAL MATCH (team:Team)-[:OWNS]->(s)
      OPTIONAL MATCH (s)-[:USES]->(c:Component)
      OPTIONAL MATCH (s)-[:HAS_SOURCE_IN]->(r:Repository)
      WITH s, team.name as ownerTeam, count(DISTINCT c) as componentCount, count(DISTINCT r) as repositoryCount
      RETURN s {
        .*,
        ownerTeam: ownerTeam,
        componentCount: componentCount,
        repositoryCount: repositoryCount
      } as system
    `
  }
  if (path === 'systems/check-exists.cypher') {
    return `
      MATCH (s:System {name: $name})
      RETURN s.name as name
    `
  }
  if (path === 'systems/create.cypher') {
    return `
      MERGE (team:Team {name: $ownerTeam})
      CREATE (s:System {
        name: $name,
        domain: $domain,
        businessCriticality: $businessCriticality,
        environment: $environment,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      CREATE (team)-[:OWNS]->(s)
      
      WITH s, team, $repositories AS repos
      FOREACH (repo IN CASE WHEN size(repos) > 0 THEN repos ELSE [] END |
        MERGE (r:Repository {url: repo.url})
        SET r.name = repo.name,
            r.createdAt = COALESCE(r.createdAt, datetime()),
            r.updatedAt = datetime(),
            r.lastSbomScanAt = null
        MERGE (s)-[rel1:HAS_SOURCE_IN]->(r)
          SET rel1.addedAt = COALESCE(rel1.addedAt, datetime())
        MERGE (team)-[rel2:MAINTAINS]->(r)
          SET rel2.since = COALESCE(rel2.since, datetime())
      )
      
      RETURN s.name as name
    `
  }
  if (path === 'systems/delete.cypher') {
    return `
      MATCH (s:System {name: $name})
      DETACH DELETE s
    `
  }
  if (path === 'systems/find-unmapped-components.cypher') {
    return `
      MATCH (sys:System {name: $systemName})-[:USES]->(c:Component)
      WHERE NOT (c)-[:IS_VERSION_OF]->(:Technology)
      OPTIONAL MATCH (c)-[:HAS_HASH]->(h:Hash)
      OPTIONAL MATCH (c)-[:HAS_LICENSE]->(l:License)
      WITH c,
           collect(DISTINCT {algorithm: h.algorithm, value: h.value}) as hashes,
           collect(DISTINCT {id: l.id, name: l.name, url: l.url, text: l.text}) as licenses
      RETURN c.name as name,
             c.version as version,
             c.packageManager as packageManager,
             c.purl as purl,
             c.cpe as cpe,
             c.type as type,
             c.group as group,
             hashes,
             licenses
      ORDER BY c.name
    `
  }
  return ''
})

let driver: Driver | null = null
let neo4jAvailable = false

beforeAll(async () => {
  try {
    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD))
    await driver.verifyAuthentication()
    neo4jAvailable = true
  } catch {
    neo4jAvailable = false
    console.warn('\n⚠️  Neo4j not available. Repository tests will be skipped.\n')
  }
})

afterAll(async () => {
  if (driver) {
    await cleanupTestData(driver, { prefix: TEST_PREFIX })
    await driver.close()
  }
})

describe('SystemRepository', () => {
  let systemRepo: SystemRepository
  let session: Session | null = null

  beforeEach(async () => {
    if (!neo4jAvailable || !driver) return
    
    systemRepo = new SystemRepository(driver)
    session = driver.session()
    
    // Clean up any existing test data
    await cleanupTestData(driver, { prefix: TEST_PREFIX })
  })

  describe('Class Definition', () => {
    it('should be defined as a class', () => {
      expect(SystemRepository).toBeDefined()
      expect(typeof SystemRepository).toBe('function')
    })

    it('should have findAll method', () => {
      expect(SystemRepository.prototype.findAll).toBeDefined()
    })

    it('should have findByName method', () => {
      expect(SystemRepository.prototype.findByName).toBeDefined()
    })

    it('should have exists method', () => {
      expect(SystemRepository.prototype.exists).toBeDefined()
    })

    it('should have create method', () => {
      expect(SystemRepository.prototype.create).toBeDefined()
    })

    it('should have delete method', () => {
      expect(SystemRepository.prototype.delete).toBeDefined()
    })
  })

  describe('findAll()', () => {
    it('should return empty array when no systems exist', async () => {
      if (!neo4jAvailable) return

      const result = await systemRepo.findAll()

      expect(Array.isArray(result)).toBe(true)
      // May have non-test systems, so just check it's an array
    })

    it('should return all systems with required properties', async () => {
      if (!neo4jAvailable || !session) return

      // Create test system
      await session.run(`
        CREATE (s:System {
          name: $name,
          domain: $domain,
          ownerTeam: $ownerTeam,
          businessCriticality: $businessCriticality,
          environment: $environment,
          sourceCodeType: $sourceCodeType,
          hasSourceAccess: $hasSourceAccess
        })
      `, {
        name: `${TEST_PREFIX}polaris-api`,
        domain: 'Platform',
        ownerTeam: 'Platform Team',
        businessCriticality: 'high',
        environment: 'prod',
        sourceCodeType: 'internal',
        hasSourceAccess: true
      })

      const result = await systemRepo.findAll()
      const testSystem = result.find(s => s.name === `${TEST_PREFIX}polaris-api`)

      expect(testSystem).toBeDefined()
      expect(testSystem).toHaveProperty('name')
      expect(testSystem).toHaveProperty('domain')
      expect(testSystem).toHaveProperty('ownerTeam')
      expect(testSystem).toHaveProperty('businessCriticality')
      expect(testSystem).toHaveProperty('environment')
      expect(testSystem).toHaveProperty('componentCount')
      expect(testSystem).toHaveProperty('repositoryCount')
    })

    it('should return systems ordered by business criticality', async () => {
      if (!neo4jAvailable || !session) return

      // Create systems with different criticalities
      await session.run(`
        CREATE (s1:System {
          name: $name1,
          domain: 'Test',
          businessCriticality: 'low'
        })
        CREATE (s2:System {
          name: $name2,
          domain: 'Test',
          businessCriticality: 'critical'
        })
        CREATE (s3:System {
          name: $name3,
          domain: 'Test',
          businessCriticality: 'high'
        })
      `, {
        name1: `${TEST_PREFIX}low-system`,
        name2: `${TEST_PREFIX}critical-system`,
        name3: `${TEST_PREFIX}high-system`
      })

      const result = await systemRepo.findAll()
      const testSystems = result.filter(s => s.name.startsWith(TEST_PREFIX))

      // Critical should come before high, high before low
      const criticalIndex = testSystems.findIndex(s => s.businessCriticality === 'critical')
      const highIndex = testSystems.findIndex(s => s.businessCriticality === 'high')
      const lowIndex = testSystems.findIndex(s => s.businessCriticality === 'low')

      expect(criticalIndex).toBeLessThan(highIndex)
      expect(highIndex).toBeLessThan(lowIndex)
    })
  })

  describe('findByName()', () => {
    it('should return null when system does not exist', async () => {
      if (!neo4jAvailable) return

      const result = await systemRepo.findByName(`${TEST_PREFIX}nonexistent`)

      expect(result).toBeNull()
    })

    it('should return system when it exists', async () => {
      if (!neo4jAvailable || !session) return

      // Create test system with team relationship
      await session.run(`
        MERGE (team:Team {name: $ownerTeam})
        CREATE (s:System {
          name: $name,
          domain: $domain,
          businessCriticality: $businessCriticality,
          environment: $environment
        })
        CREATE (team)-[:OWNS]->(s)
      `, {
        name: `${TEST_PREFIX}test-system`,
        domain: 'Platform',
        ownerTeam: `${TEST_PREFIX}Platform Team`,
        businessCriticality: 'medium',
        environment: 'dev'
      })

      const result = await systemRepo.findByName(`${TEST_PREFIX}test-system`)

      expect(result).not.toBeNull()
      expect(result?.name).toBe(`${TEST_PREFIX}test-system`)
      expect(result?.domain).toBe('Platform')
      expect(result?.ownerTeam).toBe(`${TEST_PREFIX}Platform Team`)
      expect(result?.businessCriticality).toBe('medium')
      expect(result?.environment).toBe('dev')
    })

    it('should include component and repository counts', async () => {
      if (!neo4jAvailable || !session) return

      // Create system with components and repositories
      await session.run(`
        CREATE (s:System {name: $name, domain: 'Test'})
        CREATE (c1:Component {name: $comp1, version: '1.0.0'})
        CREATE (c2:Component {name: $comp2, version: '2.0.0'})
        CREATE (r:Repository {url: $repoUrl, name: 'test-repo'})
        CREATE (s)-[:USES]->(c1)
        CREATE (s)-[:USES]->(c2)
        CREATE (s)-[:HAS_SOURCE_IN]->(r)
      `, {
        name: `${TEST_PREFIX}system-with-counts`,
        comp1: `${TEST_PREFIX}component1`,
        comp2: `${TEST_PREFIX}component2`,
        repoUrl: `https://github.com/test/${TEST_PREFIX}repo`
      })

      const result = await systemRepo.findByName(`${TEST_PREFIX}system-with-counts`)

      expect(result).not.toBeNull()
      expect(result?.componentCount).toBe(2)
      expect(result?.repositoryCount).toBe(1)
    })
  })

  describe('exists()', () => {
    it('should return false when system does not exist', async () => {
      if (!neo4jAvailable) return

      const result = await systemRepo.exists(`${TEST_PREFIX}nonexistent`)

      expect(result).toBe(false)
    })

    it('should return true when system exists', async () => {
      if (!neo4jAvailable || !session) return

      // Create test system
      await session.run(`
        CREATE (s:System {name: $name, domain: 'Test'})
      `, {
        name: `${TEST_PREFIX}existing-system`
      })

      const result = await systemRepo.exists(`${TEST_PREFIX}existing-system`)

      expect(result).toBe(true)
    })
  })

  describe('create()', () => {
    it('should create a new system', async () => {
      if (!neo4jAvailable) return

      const params = {
        name: `${TEST_PREFIX}new-system`,
        domain: 'Platform',
        ownerTeam: 'Platform Team',
        businessCriticality: 'high',
        environment: 'prod',
        sourceCodeType: 'internal',
        hasSourceAccess: true,
        repositories: []
      }

      const result = await systemRepo.create(params)

      expect(result).toBe(`${TEST_PREFIX}new-system`)

      // Verify system was created
      const exists = await systemRepo.exists(`${TEST_PREFIX}new-system`)
      expect(exists).toBe(true)
    })

    it('should create system with all properties', async () => {
      if (!neo4jAvailable || !session) return

      // Create team first
      await session!.run(`
        MERGE (team:Team {name: $teamName})
      `, {
        teamName: `${TEST_PREFIX}Customer Team`
      })

      const params = {
        name: `${TEST_PREFIX}full-system`,
        domain: 'Customer',
        ownerTeam: `${TEST_PREFIX}Customer Team`,
        businessCriticality: 'critical',
        environment: 'staging',
        sourceCodeType: 'open-source',
        hasSourceAccess: true,
        repositories: []
      }

      await systemRepo.create(params)

      const system = await systemRepo.findByName(`${TEST_PREFIX}full-system`)

      expect(system).not.toBeNull()
      expect(system?.domain).toBe('Customer')
      expect(system?.ownerTeam).toBe(`${TEST_PREFIX}Customer Team`)
      expect(system?.businessCriticality).toBe('critical')
      expect(system?.environment).toBe('staging')
    })
  })

  describe('delete()', () => {
    it('should delete an existing system', async () => {
      if (!neo4jAvailable || !session) return

      // Create test system
      await session.run(`
        CREATE (s:System {name: $name, domain: 'Test'})
      `, {
        name: `${TEST_PREFIX}to-delete`
      })

      // Verify it exists
      let exists = await systemRepo.exists(`${TEST_PREFIX}to-delete`)
      expect(exists).toBe(true)

      // Delete it
      await systemRepo.delete(`${TEST_PREFIX}to-delete`)

      // Verify it's gone
      exists = await systemRepo.exists(`${TEST_PREFIX}to-delete`)
      expect(exists).toBe(false)
    })

    it('should remove all relationships when deleting system', async () => {
      if (!neo4jAvailable || !session) return

      // Create system with relationships
      await session.run(`
        CREATE (s:System {name: $name, domain: 'Test'})
        CREATE (c:Component {name: $comp, version: '1.0.0'})
        CREATE (s)-[:USES]->(c)
      `, {
        name: `${TEST_PREFIX}system-with-rels`,
        comp: `${TEST_PREFIX}component`
      })

      // Delete system
      await systemRepo.delete(`${TEST_PREFIX}system-with-rels`)

      // Verify component still exists but relationship is gone
      const result = await session.run(`
        MATCH (c:Component {name: $comp})
        OPTIONAL MATCH (c)<-[r:USES]-()
        RETURN c, r
      `, {
        comp: `${TEST_PREFIX}component`
      })

      expect(result.records.length).toBe(1)
      expect(result.records[0].get('c')).not.toBeNull()
      expect(result.records[0].get('r')).toBeNull()
    })
  })

  describe('findUnmappedComponents()', () => {
    it('should return unmapped components for a system', async () => {
      if (!neo4jAvailable || !session) return

      // Create system with mapped and unmapped components
      await session.run(`
        CREATE (s:System {name: $systemName, domain: 'Test'})
        MERGE (t:Technology {name: $techName})
        CREATE (c1:Component {name: $comp1, version: '18.0.0', packageManager: 'npm', purl: 'pkg:npm/react@18.0.0'})
        CREATE (c2:Component {name: $comp2, version: '1.0.0', packageManager: 'npm', purl: 'pkg:npm/unknown@1.0.0'})
        CREATE (s)-[:USES]->(c1)
        CREATE (s)-[:USES]->(c2)
        CREATE (c1)-[:IS_VERSION_OF]->(t)
      `, {
        systemName: `${TEST_PREFIX}system-unmapped`,
        techName: `${TEST_PREFIX}React`,
        comp1: `${TEST_PREFIX}react`,
        comp2: `${TEST_PREFIX}unknown`
      })

      const result = await systemRepo.findUnmappedComponents(`${TEST_PREFIX}system-unmapped`)

      expect(result).toBeDefined()
      expect(result.system).toBe(`${TEST_PREFIX}system-unmapped`)
      expect(result.components).toBeDefined()
      expect(result.components.length).toBeGreaterThan(0)
      expect(result.count).toBe(result.components.length)
      
      // Should only include unmapped component
      const unmappedNames = result.components.map(c => c.name)
      expect(unmappedNames).toContain(`${TEST_PREFIX}unknown`)
      expect(unmappedNames).not.toContain(`${TEST_PREFIX}react`)
    })
  })
})
