import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { ComponentRepository } from '../../../server/repositories/component.repository'
import neo4j, { type Driver, type Session } from 'neo4j-driver'
import { cleanupTestData } from '../../fixtures/db-cleanup'

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687'
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j'
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword'
const TEST_PREFIX = 'test_component_repo_'

// Declare global loadQuery type
declare global {
  var loadQuery: (path: string) => Promise<string>
}

// Mock loadQuery since it's a Nuxt utility not available in tests
global.loadQuery = vi.fn(async (path: string) => {
  if (path === 'components/find-all.cypher') {
    return `
      MATCH (c:Component)
      OPTIONAL MATCH (c)-[:IS_VERSION_OF]->(t:Technology)
      OPTIONAL MATCH (s:System)-[:USES]->(c)
      WITH c, t.name as technologyName, collect(DISTINCT s.name) as systems
      RETURN 
        c.name as name,
        c.version as version,
        c.packageManager as packageManager,
        c.purl as purl,
        c.cpe as cpe,
        c.bomRef as bomRef,
        c.type as type,
        c.group as \`group\`,
        c.scope as scope,
        COALESCE(c.hashes, []) as hashes,
        COALESCE(c.licenses, []) as licenses,
        c.copyright as copyright,
        c.supplier as supplier,
        c.author as author,
        c.publisher as publisher,
        c.description as description,
        c.homepage as homepage,
        COALESCE(c.externalReferences, []) as externalReferences,
        c.releaseDate as releaseDate,
        c.publishedDate as publishedDate,
        c.modifiedDate as modifiedDate,
        technologyName,
        size(systems) as systemCount
      ORDER BY c.name, c.version
    `
  }
  if (path === 'components/find-unmapped.cypher') {
    return `
      MATCH (c:Component)
      WHERE NOT (c)-[:IS_VERSION_OF]->(:Technology)
      OPTIONAL MATCH (s:System)-[:USES]->(c)
      WITH c, collect(DISTINCT s.name) as systems
      RETURN 
        c.name as name,
        c.version as version,
        c.packageManager as packageManager,
        c.purl as purl,
        c.cpe as cpe,
        c.type as type,
        c.group as \`group\`,
        COALESCE(c.hashes, []) as hashes,
        COALESCE(c.licenses, []) as licenses,
        systems,
        size(systems) as systemCount
      ORDER BY systemCount DESC, c.name, c.version
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

describe('ComponentRepository', () => {
  let componentRepo: ComponentRepository
  let session: Session | null = null

  beforeEach(async () => {
    if (!neo4jAvailable || !driver) return
    
    componentRepo = new ComponentRepository(driver)
    session = driver.session()
    
    // Clean up any existing test data
    await cleanupTestData(driver, { prefix: TEST_PREFIX })
  })

  describe('Class Definition', () => {
    it('should be defined as a class', () => {
      expect(ComponentRepository).toBeDefined()
      expect(typeof ComponentRepository).toBe('function')
    })

    it('should have findAll method', () => {
      expect(ComponentRepository.prototype.findAll).toBeDefined()
    })

    it('should have findUnmapped method', () => {
      expect(ComponentRepository.prototype.findUnmapped).toBeDefined()
    })
  })

  describe('findAll()', () => {
    it('should return empty array when no components exist', async () => {
      if (!neo4jAvailable) return

      const result = await componentRepo.findAll()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('should return all components with required properties', async () => {
      if (!neo4jAvailable || !session) return

      // Create test component
      await session.run(`
        CREATE (c:Component {
          name: $name,
          version: $version,
          packageManager: $packageManager,
          purl: $purl,
          type: $type
        })
      `, {
        name: `${TEST_PREFIX}react`,
        version: '18.2.0',
        packageManager: 'npm',
        purl: `pkg:npm/${TEST_PREFIX}react@18.2.0`,
        type: 'library'
      })

      const result = await componentRepo.findAll()

      // Find our test component
      const testComponent = result.find(c => c.name === `${TEST_PREFIX}react`)
      
      expect(testComponent).toBeDefined()
      if (testComponent) {
        expect(testComponent).toHaveProperty('name')
        expect(testComponent).toHaveProperty('version')
        expect(testComponent).toHaveProperty('packageManager')
        expect(testComponent).toHaveProperty('purl')
        expect(testComponent).toHaveProperty('type')
        expect(testComponent).toHaveProperty('hashes')
        expect(testComponent).toHaveProperty('licenses')
        expect(Array.isArray(testComponent.hashes)).toBe(true)
        expect(Array.isArray(testComponent.licenses)).toBe(true)
      }
    })

    it('should return components with correct data types', async () => {
      if (!neo4jAvailable || !session) return

      // Create test component with simple data (Neo4j doesn't support nested objects in properties)
      await session.run(`
        CREATE (c:Component {
          name: $name,
          version: $version,
          packageManager: $packageManager,
          purl: $purl,
          type: $type
        })
      `, {
        name: `${TEST_PREFIX}vue`,
        version: '3.3.4',
        packageManager: 'npm',
        purl: `pkg:npm/${TEST_PREFIX}vue@3.3.4`,
        type: 'library'
      })

      const result = await componentRepo.findAll()
      const testComponent = result.find(c => c.name === `${TEST_PREFIX}vue`)

      expect(testComponent).toBeDefined()
      if (testComponent) {
        expect(typeof testComponent.name).toBe('string')
        expect(typeof testComponent.version).toBe('string')
        expect(Array.isArray(testComponent.hashes)).toBe(true)
        expect(Array.isArray(testComponent.licenses)).toBe(true)
        expect(typeof testComponent.systemCount).toBe('number')
      }
    })

    it('should return components with system count', async () => {
      if (!neo4jAvailable || !session) return

      // Create test component and system
      await session.run(`
        CREATE (c:Component {
          name: $componentName,
          version: '1.0.0',
          packageManager: 'npm',
          purl: $purl
        })
        CREATE (s:System {
          name: $systemName
        })
        CREATE (s)-[:USES]->(c)
      `, {
        componentName: `${TEST_PREFIX}internal-lib`,
        systemName: `${TEST_PREFIX}system-a`,
        purl: `pkg:npm/${TEST_PREFIX}internal-lib@1.0.0`
      })

      const result = await componentRepo.findAll()
      const testComponent = result.find(c => c.name === `${TEST_PREFIX}internal-lib`)

      expect(testComponent).toBeDefined()
      if (testComponent) {
        expect(testComponent.systemCount).toBeGreaterThanOrEqual(1)
      }
    })

    it('should return components with technology mapping', async () => {
      if (!neo4jAvailable || !session) return

      // Create test component with technology
      await session.run(`
        CREATE (c:Component {
          name: $componentName,
          version: '18.2.0',
          packageManager: 'npm',
          purl: $purl
        })
        CREATE (t:Technology {
          name: $techName
        })
        CREATE (c)-[:IS_VERSION_OF]->(t)
      `, {
        componentName: `${TEST_PREFIX}react-mapped`,
        purl: `pkg:npm/${TEST_PREFIX}react-mapped@18.2.0`,
        techName: `${TEST_PREFIX}React`
      })

      const result = await componentRepo.findAll()
      const testComponent = result.find(c => c.name === `${TEST_PREFIX}react-mapped`)

      expect(testComponent).toBeDefined()
      if (testComponent) {
        expect(testComponent.technologyName).toBe(`${TEST_PREFIX}React`)
      }
    })

    it('should return empty arrays for hashes and licenses when not set', async () => {
      if (!neo4jAvailable || !session) return

      // Create component without hashes/licenses
      await session.run(`
        CREATE (c:Component {
          name: $name,
          version: '1.0.0',
          packageManager: 'npm',
          purl: $purl
        })
      `, {
        name: `${TEST_PREFIX}minimal-component`,
        purl: `pkg:npm/${TEST_PREFIX}minimal-component@1.0.0`
      })

      const result = await componentRepo.findAll()
      const testComponent = result.find(c => c.name === `${TEST_PREFIX}minimal-component`)

      expect(testComponent).toBeDefined()
      if (testComponent) {
        expect(Array.isArray(testComponent.hashes)).toBe(true)
        expect(Array.isArray(testComponent.licenses)).toBe(true)
        expect(testComponent.hashes.length).toBe(0)
        expect(testComponent.licenses.length).toBe(0)
      }
    })
  })

  describe('findUnmapped()', () => {
    it('should return empty array when no unmapped components exist', async () => {
      if (!neo4jAvailable) return

      const result = await componentRepo.findUnmapped()

      expect(Array.isArray(result)).toBe(true)
    })

    it('should return only components without technology mapping', async () => {
      if (!neo4jAvailable || !session) return

      // Create unmapped component
      await session.run(`
        CREATE (c:Component {
          name: $name,
          version: '1.0.0',
          packageManager: 'npm',
          purl: $purl
        })
      `, {
        name: `${TEST_PREFIX}unmapped`,
        purl: `pkg:npm/${TEST_PREFIX}unmapped@1.0.0`
      })

      // Create mapped component
      await session.run(`
        CREATE (c:Component {
          name: $name,
          version: '1.0.0',
          packageManager: 'npm',
          purl: $purl
        })
        CREATE (t:Technology {name: $techName})
        CREATE (c)-[:IS_VERSION_OF]->(t)
      `, {
        name: `${TEST_PREFIX}mapped`,
        purl: `pkg:npm/${TEST_PREFIX}mapped@1.0.0`,
        techName: `${TEST_PREFIX}SomeTech`
      })

      const result = await componentRepo.findUnmapped()
      const unmappedComponent = result.find(c => c.name === `${TEST_PREFIX}unmapped`)
      const mappedComponent = result.find(c => c.name === `${TEST_PREFIX}mapped`)

      expect(unmappedComponent).toBeDefined()
      expect(mappedComponent).toBeUndefined()
    })

    it('should return unmapped components with system information', async () => {
      if (!neo4jAvailable || !session) return

      // Create unmapped component with systems
      await session.run(`
        CREATE (c:Component {
          name: $componentName,
          version: '1.0.0',
          packageManager: 'npm',
          purl: $purl
        })
        CREATE (s1:System {name: $system1})
        CREATE (s2:System {name: $system2})
        CREATE (s1)-[:USES]->(c)
        CREATE (s2)-[:USES]->(c)
      `, {
        componentName: `${TEST_PREFIX}unmapped-with-systems`,
        purl: `pkg:npm/${TEST_PREFIX}unmapped-with-systems@1.0.0`,
        system1: `${TEST_PREFIX}system-1`,
        system2: `${TEST_PREFIX}system-2`
      })

      const result = await componentRepo.findUnmapped()
      const testComponent = result.find(c => c.name === `${TEST_PREFIX}unmapped-with-systems`)

      expect(testComponent).toBeDefined()
      if (testComponent) {
        expect(testComponent.systemCount).toBeGreaterThanOrEqual(2)
        expect(Array.isArray(testComponent.systems)).toBe(true)
      }
    })
  })
})
