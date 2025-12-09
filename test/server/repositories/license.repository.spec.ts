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
  describe('updateWhitelistStatus()', () => {
    it('should update whitelist status to true', async () => {
      if (!neo4jAvailable || !session) return

      // Create a test license
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

      // Update whitelist status
      const result = await licenseRepo.updateWhitelistStatus(`${TEST_PREFIX}MIT`, true)
      expect(result).toBe(true)

      // Verify the update
      const license = await licenseRepo.findById(`${TEST_PREFIX}MIT`)
      expect(license?.whitelisted).toBe(true)
    })

    it('should update whitelist status to false', async () => {
      if (!neo4jAvailable || !session) return

      // Create a test license that is whitelisted
      await session.run(`
        CREATE (l:License {
          id: $id,
          name: 'Apache License 2.0',
          spdxId: 'Apache-2.0',
          whitelisted: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id: `${TEST_PREFIX}Apache-2.0`
      })

      // Update whitelist status
      const result = await licenseRepo.updateWhitelistStatus(`${TEST_PREFIX}Apache-2.0`, false)
      expect(result).toBe(true)

      // Verify the update
      const license = await licenseRepo.findById(`${TEST_PREFIX}Apache-2.0`)
      expect(license?.whitelisted).toBe(false)
    })

    it('should return false when license does not exist', async () => {
      if (!neo4jAvailable) return

      const result = await licenseRepo.updateWhitelistStatus(`${TEST_PREFIX}nonexistent`, true)
      expect(result).toBe(false)
    })

    it('should update timestamp when updating whitelist status', async () => {
      if (!neo4jAvailable || !session) return

      // Create a test license with an old timestamp
      await session.run(`
        CREATE (l:License {
          id: $id,
          name: 'MIT License',
          spdxId: 'MIT',
          whitelisted: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime() - duration('PT1H')
        })
      `, {
        id: `${TEST_PREFIX}MIT`
      })

      const beforeUpdate = await licenseRepo.findById(`${TEST_PREFIX}MIT`)
      const beforeTimestamp = new Date(beforeUpdate!.updatedAt).getTime()
      
      // Update whitelist status
      await licenseRepo.updateWhitelistStatus(`${TEST_PREFIX}MIT`, true)

      const afterUpdate = await licenseRepo.findById(`${TEST_PREFIX}MIT`)
      const afterTimestamp = new Date(afterUpdate!.updatedAt).getTime()
      
      // The updated timestamp should be later than the original
      expect(afterTimestamp).toBeGreaterThan(beforeTimestamp)
    })
  })

  describe('getWhitelistedLicenses()', () => {
    it('should return only whitelisted licenses', async () => {
      if (!neo4jAvailable || !session) return

      // Create test licenses with mixed whitelist status
      await session.run(`
        CREATE (l1:License {
          id: $id1,
          name: 'MIT License',
          spdxId: 'MIT',
          whitelisted: true,
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
        CREATE (l3:License {
          id: $id3,
          name: 'BSD 3-Clause',
          spdxId: 'BSD-3-Clause',
          whitelisted: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id1: `${TEST_PREFIX}MIT`,
        id2: `${TEST_PREFIX}Apache-2.0`,
        id3: `${TEST_PREFIX}BSD-3-Clause`
      })

      const result = await licenseRepo.getWhitelistedLicenses()
      const testLicenses = result.filter(l => l.id.startsWith(TEST_PREFIX))

      expect(testLicenses.length).toBe(2)
      testLicenses.forEach(license => {
        expect(license.whitelisted).toBe(true)
      })
    })

    it('should return empty array when no licenses are whitelisted', async () => {
      if (!neo4jAvailable || !session) return

      // Create test licenses that are not whitelisted
      await session.run(`
        CREATE (l1:License {
          id: $id1,
          name: 'GPL 3.0',
          spdxId: 'GPL-3.0',
          whitelisted: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id1: `${TEST_PREFIX}GPL-3.0`
      })

      const result = await licenseRepo.getWhitelistedLicenses()
      const testLicenses = result.filter(l => l.id.startsWith(TEST_PREFIX))

      expect(testLicenses.length).toBe(0)
    })
  })

  describe('isWhitelisted()', () => {
    it('should return true when license is whitelisted', async () => {
      if (!neo4jAvailable || !session) return

      await session.run(`
        CREATE (l:License {
          id: $id,
          name: 'MIT License',
          spdxId: 'MIT',
          whitelisted: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id: `${TEST_PREFIX}MIT`
      })

      const result = await licenseRepo.isWhitelisted(`${TEST_PREFIX}MIT`)
      expect(result).toBe(true)
    })

    it('should return false when license is not whitelisted', async () => {
      if (!neo4jAvailable || !session) return

      await session.run(`
        CREATE (l:License {
          id: $id,
          name: 'GPL 3.0',
          spdxId: 'GPL-3.0',
          whitelisted: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id: `${TEST_PREFIX}GPL-3.0`
      })

      const result = await licenseRepo.isWhitelisted(`${TEST_PREFIX}GPL-3.0`)
      expect(result).toBe(false)
    })

    it('should return false when license does not exist', async () => {
      if (!neo4jAvailable) return

      const result = await licenseRepo.isWhitelisted(`${TEST_PREFIX}nonexistent`)
      expect(result).toBe(false)
    })

    it('should return false when license has no whitelist property', async () => {
      if (!neo4jAvailable || !session) return

      // Create a license without the whitelisted property
      await session.run(`
        CREATE (l:License {
          id: $id,
          name: 'Old License',
          spdxId: 'Old-License',
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id: `${TEST_PREFIX}Old-License`
      })

      const result = await licenseRepo.isWhitelisted(`${TEST_PREFIX}Old-License`)
      expect(result).toBe(false)
    })
  })

  describe('bulkUpdateWhitelistStatus()', () => {
    it('should update multiple licenses at once', async () => {
      if (!neo4jAvailable || !session) return

      // Create multiple test licenses
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
        CREATE (l3:License {
          id: $id3,
          name: 'BSD 3-Clause',
          spdxId: 'BSD-3-Clause',
          whitelisted: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id1: `${TEST_PREFIX}MIT`,
        id2: `${TEST_PREFIX}Apache-2.0`,
        id3: `${TEST_PREFIX}BSD-3-Clause`
      })

      // Update multiple licenses
      const licenseIds = [
        `${TEST_PREFIX}MIT`,
        `${TEST_PREFIX}Apache-2.0`,
        `${TEST_PREFIX}BSD-3-Clause`
      ]
      const result = await licenseRepo.bulkUpdateWhitelistStatus(licenseIds, true)
      
      expect(result).toBe(3)

      // Verify all licenses are whitelisted
      for (const id of licenseIds) {
        const license = await licenseRepo.findById(id)
        expect(license?.whitelisted).toBe(true)
      }
    })

    it('should handle partial updates when some licenses do not exist', async () => {
      if (!neo4jAvailable || !session) return

      // Create one test license
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

    it('should return 0 when empty array is provided', async () => {
      if (!neo4jAvailable) return

      const result = await licenseRepo.bulkUpdateWhitelistStatus([], true)
      expect(result).toBe(0)
    })

    it('should update whitelist status to false for multiple licenses', async () => {
      if (!neo4jAvailable || !session) return

      // Create test licenses that are whitelisted
      await session.run(`
        CREATE (l1:License {
          id: $id1,
          name: 'MIT License',
          spdxId: 'MIT',
          whitelisted: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l2:License {
          id: $id2,
          name: 'Apache License 2.0',
          spdxId: 'Apache-2.0',
          whitelisted: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id1: `${TEST_PREFIX}MIT`,
        id2: `${TEST_PREFIX}Apache-2.0`
      })

      // Update to not whitelisted
      const licenseIds = [`${TEST_PREFIX}MIT`, `${TEST_PREFIX}Apache-2.0`]
      const result = await licenseRepo.bulkUpdateWhitelistStatus(licenseIds, false)
      
      expect(result).toBe(2)

      // Verify all licenses are not whitelisted
      for (const id of licenseIds) {
        const license = await licenseRepo.findById(id)
        expect(license?.whitelisted).toBe(false)
      }
    })
  })

  describe('findAll() with whitelisted filter', () => {
    it('should filter licenses by whitelisted status', async () => {
      if (!neo4jAvailable || !session) return

      // Create test licenses with different whitelist status
      await session.run(`
        CREATE (l1:License {
          id: $id1,
          name: 'MIT License',
          spdxId: 'MIT',
          whitelisted: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l2:License {
          id: $id2,
          name: 'GPL 3.0',
          spdxId: 'GPL-3.0',
          whitelisted: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l3:License {
          id: $id3,
          name: 'Apache License 2.0',
          spdxId: 'Apache-2.0',
          whitelisted: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id1: `${TEST_PREFIX}MIT`,
        id2: `${TEST_PREFIX}GPL-3.0`,
        id3: `${TEST_PREFIX}Apache-2.0`
      })

      const whitelistedResult = await licenseRepo.findAll({ whitelisted: true })
      const testWhitelisted = whitelistedResult.filter(l => l.id.startsWith(TEST_PREFIX))

      expect(testWhitelisted.length).toBe(2)
      testWhitelisted.forEach(license => {
        expect(license.whitelisted).toBe(true)
      })

      const notWhitelistedResult = await licenseRepo.findAll({ whitelisted: false })
      const testNotWhitelisted = notWhitelistedResult.filter(l => l.id.startsWith(TEST_PREFIX))

      expect(testNotWhitelisted.length).toBe(1)
      expect(testNotWhitelisted[0].id).toBe(`${TEST_PREFIX}GPL-3.0`)
      expect(testNotWhitelisted[0].whitelisted).toBe(false)
    })

    it('should combine whitelisted filter with other filters', async () => {
      if (!neo4jAvailable || !session) return

      // Create test licenses with different properties
      await session.run(`
        CREATE (l1:License {
          id: $id1,
          name: 'MIT License',
          spdxId: 'MIT',
          category: 'permissive',
          whitelisted: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l2:License {
          id: $id2,
          name: 'GPL 3.0',
          spdxId: 'GPL-3.0',
          category: 'copyleft',
          whitelisted: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l3:License {
          id: $id3,
          name: 'Apache License 2.0',
          spdxId: 'Apache-2.0',
          category: 'permissive',
          whitelisted: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id1: `${TEST_PREFIX}MIT`,
        id2: `${TEST_PREFIX}GPL-3.0`,
        id3: `${TEST_PREFIX}Apache-2.0`
      })

      // Filter by both whitelisted and category
      const result = await licenseRepo.findAll({ 
        whitelisted: true, 
        category: 'permissive' 
      })
      const testLicenses = result.filter(l => l.id.startsWith(TEST_PREFIX))

      expect(testLicenses.length).toBe(1)
      expect(testLicenses[0].id).toBe(`${TEST_PREFIX}MIT`)
      expect(testLicenses[0].whitelisted).toBe(true)
      expect(testLicenses[0].category).toBe('permissive')
    })
  })
})
