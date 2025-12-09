import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { LicenseRepository } from '../../../server/repositories/license.repository'
import neo4j, { type Driver, type Session } from 'neo4j-driver'
import { cleanupTestData } from '../../fixtures/db-cleanup'

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687'
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j'
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword'
const TEST_PREFIX = 'test_license_repo_'

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

describe('LicenseRepository', () => {
  let licenseRepo: LicenseRepository
  let session: Session | null = null

  beforeEach(async () => {
    if (!neo4jAvailable || !driver) return
    
    licenseRepo = new LicenseRepository(driver)
    session = driver.session()
    
    await cleanupTestData(driver, { prefix: TEST_PREFIX })
  })

  describe('Class Definition', () => {
    it('should be defined as a class', () => {
      expect(LicenseRepository).toBeDefined()
      expect(typeof LicenseRepository).toBe('function')
    })

    it('should have findAll method', () => {
      expect(LicenseRepository.prototype.findAll).toBeDefined()
    })

    it('should have findById method', () => {
      expect(LicenseRepository.prototype.findById).toBeDefined()
    })

    it('should have exists method', () => {
      expect(LicenseRepository.prototype.exists).toBeDefined()
    })

    it('should have getStatistics method', () => {
      expect(LicenseRepository.prototype.getStatistics).toBeDefined()
    })
  })

  describe('findAll()', () => {
    it('should return empty array when no licenses exist', async () => {
      if (!neo4jAvailable) return

      const result = await licenseRepo.findAll()

      expect(Array.isArray(result)).toBe(true)
    })

    it('should return all licenses with component counts', async () => {
      if (!neo4jAvailable || !session) return

      // Create test licenses
      await session.run(`
        CREATE (l1:License {
          id: $id1,
          name: 'MIT License',
          spdxId: 'MIT',
          osiApproved: true,
          category: 'permissive',
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l2:License {
          id: $id2,
          name: 'Apache License 2.0',
          spdxId: 'Apache-2.0',
          osiApproved: true,
          category: 'permissive',
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id1: `${TEST_PREFIX}MIT`,
        id2: `${TEST_PREFIX}Apache-2.0`
      })

      const result = await licenseRepo.findAll()
      const testLicenses = result.filter(l => l.id.startsWith(TEST_PREFIX))

      expect(testLicenses.length).toBeGreaterThanOrEqual(2)
      testLicenses.forEach(license => {
        expect(license).toHaveProperty('id')
        expect(license).toHaveProperty('name')
        expect(license).toHaveProperty('spdxId')
        expect(license).toHaveProperty('componentCount')
      })
    })

    it('should filter by category', async () => {
      if (!neo4jAvailable || !session) return

      await session.run(`
        CREATE (l1:License {
          id: $id1,
          name: 'MIT License',
          spdxId: 'MIT',
          category: 'permissive',
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l2:License {
          id: $id2,
          name: 'GPL 3.0',
          spdxId: 'GPL-3.0',
          category: 'copyleft',
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id1: `${TEST_PREFIX}MIT`,
        id2: `${TEST_PREFIX}GPL-3.0`
      })

      const result = await licenseRepo.findAll({ category: 'permissive' })
      const testLicenses = result.filter(l => l.id.startsWith(TEST_PREFIX))

      // Should find the MIT license we created
      const mitLicense = testLicenses.find(l => l.id === `${TEST_PREFIX}MIT`)
      expect(mitLicense).toBeDefined()
      expect(mitLicense?.category).toBe('permissive')
      
      // Should not find the GPL license
      expect(testLicenses.find(l => l.id === `${TEST_PREFIX}GPL-3.0`)).toBeUndefined()
    })
  })

  describe('findById()', () => {
    it('should return null when license does not exist', async () => {
      if (!neo4jAvailable) return

      const result = await licenseRepo.findById(`${TEST_PREFIX}nonexistent`)

      expect(result).toBeNull()
    })

    it('should return license when it exists', async () => {
      if (!neo4jAvailable || !session) return

      await session.run(`
        CREATE (l:License {
          id: $id,
          name: 'MIT License',
          spdxId: 'MIT',
          osiApproved: true,
          category: 'permissive',
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id: `${TEST_PREFIX}MIT`
      })

      const result = await licenseRepo.findById(`${TEST_PREFIX}MIT`)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(`${TEST_PREFIX}MIT`)
      expect(result?.name).toBe('MIT License')
      expect(result?.osiApproved).toBe(true)
    })
  })

  describe('exists()', () => {
    it('should return false when license does not exist', async () => {
      if (!neo4jAvailable) return

      const result = await licenseRepo.exists(`${TEST_PREFIX}nonexistent`)

      expect(result).toBe(false)
    })

    it('should return true when license exists', async () => {
      if (!neo4jAvailable || !session) return

      await session.run(`
        CREATE (l:License {
          id: $id,
          name: 'MIT License',
          spdxId: 'MIT',
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id: `${TEST_PREFIX}MIT`
      })

      const result = await licenseRepo.exists(`${TEST_PREFIX}MIT`)

      expect(result).toBe(true)
    })
  })

  describe('getStatistics()', () => {
    it('should return statistics for licenses', async () => {
      if (!neo4jAvailable || !session) return

      await session.run(`
        CREATE (l1:License {
          id: $id1,
          name: 'MIT License',
          spdxId: 'MIT',
          osiApproved: true,
          category: 'permissive',
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l2:License {
          id: $id2,
          name: 'GPL 3.0',
          spdxId: 'GPL-3.0',
          osiApproved: true,
          category: 'copyleft',
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id1: `${TEST_PREFIX}MIT`,
        id2: `${TEST_PREFIX}GPL-3.0`
      })

      const result = await licenseRepo.getStatistics()

      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('byCategory')
      expect(result).toHaveProperty('osiApproved')
      expect(result).toHaveProperty('deprecated')
      expect(result.total).toBeGreaterThanOrEqual(2)
    })
  })

  describe('bulkUpdateWhitelistStatus()', () => {
    it('should update multiple licenses atomically when all exist', async () => {
      if (!neo4jAvailable || !session) return

      // Create test licenses
      await session.run(`
        CREATE (l1:License {
          id: $id1,
          name: 'MIT License',
          spdxId: 'MIT',
          whitelisted: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l2:License {
          id: $id2,
          name: 'Apache License 2.0',
          spdxId: 'Apache-2.0',
          whitelisted: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id1: `${TEST_PREFIX}MIT`,
        id2: `${TEST_PREFIX}Apache-2.0`
      })

      // Update whitelist status for both licenses
      const updated = await licenseRepo.bulkUpdateWhitelistStatus(
        [`${TEST_PREFIX}MIT`, `${TEST_PREFIX}Apache-2.0`],
        true
      )

      expect(updated).toBe(2)

      // Verify both licenses were updated
      const mit = await licenseRepo.findById(`${TEST_PREFIX}MIT`)
      const apache = await licenseRepo.findById(`${TEST_PREFIX}Apache-2.0`)
      expect(mit?.whitelisted).toBe(true)
      expect(apache?.whitelisted).toBe(true)
    })

    it('should rollback entire transaction if any license does not exist', async () => {
      if (!neo4jAvailable || !session) return

      // Create only one license
      await session.run(`
        CREATE (l:License {
          id: $id,
          name: 'MIT License',
          spdxId: 'MIT',
          whitelisted: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id: `${TEST_PREFIX}MIT`
      })

      // Try to update with one existing and one non-existing license
      await expect(
        licenseRepo.bulkUpdateWhitelistStatus(
          [`${TEST_PREFIX}MIT`, `${TEST_PREFIX}nonexistent`],
          true
        )
      ).rejects.toThrow('One or more licenses not found')

      // Verify the existing license was NOT updated (rollback)
      const mit = await licenseRepo.findById(`${TEST_PREFIX}MIT`)
      expect(mit?.whitelisted).toBe(false)
    })

    it('should return 0 for empty license array', async () => {
      if (!neo4jAvailable) return

      const updated = await licenseRepo.bulkUpdateWhitelistStatus([], true)
      expect(updated).toBe(0)
    })
  })
})
