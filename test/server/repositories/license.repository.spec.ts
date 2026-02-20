import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { LicenseRepository } from '../../../server/repositories/license.repository'
import { getTestContext, cleanupTestData, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_license_repo_'
let ctx: TestContext
let licenseRepo: LicenseRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

afterEach(async () => { if (session) await session.close() })

describe('LicenseRepository', () => {
  beforeEach(async () => {
    if (!ctx.neo4jAvailable) return
    await cleanupTestData(ctx.driver, { prefix: PREFIX })
    licenseRepo = new LicenseRepository(ctx.driver)
    session = ctx.driver.session()
  })


  describe('count()', () => {
    it('should return 0 when no licenses exist', async () => {
      if (!ctx.neo4jAvailable) return

      // Count only test licenses by using search filter with test prefix
      const result = await licenseRepo.count({ search: PREFIX })

      expect(result).toBe(0)
    })

    it('should return total count of licenses', async () => {
      if (!ctx.neo4jAvailable) return

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
        id1: `${PREFIX}MIT`,
        id2: `${PREFIX}Apache-2.0`
      })

      const result = await licenseRepo.count()

      expect(result).toBeGreaterThanOrEqual(2)
    })

    it('should filter count by category', async () => {
      if (!ctx.neo4jAvailable) return

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
        id1: `${PREFIX}MIT`,
        id2: `${PREFIX}GPL-3.0`
      })

      const permissiveCount = await licenseRepo.count({ category: 'permissive' })
      const copyleftCount = await licenseRepo.count({ category: 'copyleft' })

      // We should have at least the test licenses we created
      expect(permissiveCount).toBeGreaterThanOrEqual(1)
      expect(copyleftCount).toBeGreaterThanOrEqual(1)
    })

    it('should filter count by allowed status', async () => {
      if (!ctx.neo4jAvailable) return

      await session.run(`
        CREATE (l1:License {
          id: $id1,
          name: 'MIT License',
          spdxId: 'MIT',
          allowed: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l2:License {
          id: $id2,
          name: 'GPL 3.0',
          spdxId: 'GPL-3.0',
          allowed: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id1: `${PREFIX}MIT`,
        id2: `${PREFIX}GPL-3.0`
      })

      const allowedCount = await licenseRepo.count({ allowed: true })
      const notAllowedCount = await licenseRepo.count({ allowed: false })

      expect(allowedCount).toBeGreaterThanOrEqual(1)
      expect(notAllowedCount).toBeGreaterThanOrEqual(1)
    })

    it('should filter count by osiApproved status', async () => {
      if (!ctx.neo4jAvailable) return

      await session.run(`
        CREATE (l1:License {
          id: $id1,
          name: 'MIT License',
          spdxId: 'MIT',
          osiApproved: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l2:License {
          id: $id2,
          name: 'Custom License',
          spdxId: 'Custom',
          osiApproved: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id1: `${PREFIX}MIT`,
        id2: `${PREFIX}Custom`
      })

      const osiApprovedCount = await licenseRepo.count({ osiApproved: true })
      const notOsiApprovedCount = await licenseRepo.count({ osiApproved: false })

      expect(osiApprovedCount).toBeGreaterThanOrEqual(1)
      expect(notOsiApprovedCount).toBeGreaterThanOrEqual(1)
    })

    it('should filter count by search term', async () => {
      if (!ctx.neo4jAvailable) return

      await session.run(`
        CREATE (l1:License {
          id: $id1,
          name: 'MIT License',
          spdxId: 'MIT',
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l2:License {
          id: $id2,
          name: 'Apache License 2.0',
          spdxId: 'Apache-2.0',
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id1: `${PREFIX}MIT`,
        id2: `${PREFIX}Apache-2.0`
      })

      const mitCount = await licenseRepo.count({ search: 'MIT' })
      const apacheCount = await licenseRepo.count({ search: 'Apache' })

      expect(mitCount).toBeGreaterThanOrEqual(1)
      expect(apacheCount).toBeGreaterThanOrEqual(1)
    })

    it('should combine multiple filters', async () => {
      if (!ctx.neo4jAvailable) return

      await session.run(`
        CREATE (l1:License {
          id: $id1,
          name: 'MIT License',
          spdxId: 'MIT',
          category: 'permissive',
          allowed: true,
          osiApproved: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l2:License {
          id: $id2,
          name: 'GPL 3.0',
          spdxId: 'GPL-3.0',
          category: 'copyleft',
          allowed: false,
          osiApproved: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id1: `${PREFIX}MIT`,
        id2: `${PREFIX}GPL-3.0`
      })

      const filteredCount = await licenseRepo.count({ 
        category: 'permissive',
        allowed: true,
        osiApproved: true
      })

      expect(filteredCount).toBeGreaterThanOrEqual(1)
    })
  })

  describe('findAll()', () => {
    it('should return empty array when no licenses exist', async () => {
      if (!ctx.neo4jAvailable) return

      const result = await licenseRepo.findAll()

      expect(Array.isArray(result)).toBe(true)
    })

    it('should return all licenses with component counts', async () => {
      if (!ctx.neo4jAvailable) return

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
        id1: `${PREFIX}MIT`,
        id2: `${PREFIX}Apache-2.0`
      })

      const result = await licenseRepo.findAll()
      const testLicenses = result.filter(l => l.id.startsWith(PREFIX))

      expect(testLicenses.length).toBeGreaterThanOrEqual(2)
      testLicenses.forEach(license => {
        expect(license).toHaveProperty('id')
        expect(license).toHaveProperty('name')
        expect(license).toHaveProperty('spdxId')
        expect(license).toHaveProperty('componentCount')
      })
    })

    it('should filter by category', async () => {
      if (!ctx.neo4jAvailable) return

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
        id1: `${PREFIX}MIT`,
        id2: `${PREFIX}GPL-3.0`
      })

      const result = await licenseRepo.findAll({ category: 'permissive' })
      const testLicenses = result.filter(l => l.id.startsWith(PREFIX))

      // Should find the MIT license we created
      const mitLicense = testLicenses.find(l => l.id === `${PREFIX}MIT`)
      expect(mitLicense).toBeDefined()
      expect(mitLicense?.category).toBe('permissive')
      
      // Should not find the GPL license
      expect(testLicenses.find(l => l.id === `${PREFIX}GPL-3.0`)).toBeUndefined()
    })
  })

  describe('findById()', () => {
    it('should return null when license does not exist', async () => {
      if (!ctx.neo4jAvailable) return

      const result = await licenseRepo.findById(`${PREFIX}nonexistent`)

      expect(result).toBeNull()
    })

    it('should return license when it exists', async () => {
      if (!ctx.neo4jAvailable) return

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
        id: `${PREFIX}MIT`
      })

      const result = await licenseRepo.findById(`${PREFIX}MIT`)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(`${PREFIX}MIT`)
      expect(result?.name).toBe('MIT License')
      expect(result?.osiApproved).toBe(true)
    })
  })

  describe('exists()', () => {
    it('should return false when license does not exist', async () => {
      if (!ctx.neo4jAvailable) return

      const result = await licenseRepo.exists(`${PREFIX}nonexistent`)

      expect(result).toBe(false)
    })

    it('should return true when license exists', async () => {
      if (!ctx.neo4jAvailable) return

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
        id: `${PREFIX}MIT`
      })

      const result = await licenseRepo.exists(`${PREFIX}MIT`)

      expect(result).toBe(true)
    })
  })

  describe('getStatistics()', () => {
    it('should return statistics for licenses', async () => {
      if (!ctx.neo4jAvailable) return

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
        id1: `${PREFIX}MIT`,
        id2: `${PREFIX}GPL-3.0`
      })

      const result = await licenseRepo.getStatistics()

      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('byCategory')
      expect(result).toHaveProperty('osiApproved')
      expect(result).toHaveProperty('deprecated')
      expect(result.total).toBeGreaterThanOrEqual(2)
    })
  })

  describe('updateAllowedStatus()', () => {
    it('should update allowed status to true', async () => {
      if (!ctx.neo4jAvailable) return

      // Create a test license
      await session.run(`
        CREATE (l:License {
          id: $id,
          name: 'MIT License',
          spdxId: 'MIT',
          allowed: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id: `${PREFIX}MIT`
      })

      // Update allowed status
      const result = await licenseRepo.updateAllowedStatus(`${PREFIX}MIT`, true)
      expect(result).toBe(true)

      // Verify the update
      const license = await licenseRepo.findById(`${PREFIX}MIT`)
      expect(license?.allowed).toBe(true)
    })

    it('should update allowed status to false', async () => {
      if (!ctx.neo4jAvailable) return

      // Create a test license that is allowed
      await session.run(`
        CREATE (l:License {
          id: $id,
          name: 'Apache License 2.0',
          spdxId: 'Apache-2.0',
          allowed: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id: `${PREFIX}Apache-2.0`
      })

      // Update allowed status
      const result = await licenseRepo.updateAllowedStatus(`${PREFIX}Apache-2.0`, false)
      expect(result).toBe(true)

      // Verify the update
      const license = await licenseRepo.findById(`${PREFIX}Apache-2.0`)
      expect(license?.allowed).toBe(false)
    })

    it('should return false when license does not exist', async () => {
      if (!ctx.neo4jAvailable) return

      const result = await licenseRepo.updateAllowedStatus(`${PREFIX}nonexistent`, true)
      expect(result).toBe(false)
    })

    it('should update timestamp when updating allowed status', async () => {
      if (!ctx.neo4jAvailable) return

      // Create a test license with an old timestamp
      await session.run(`
        CREATE (l:License {
          id: $id,
          name: 'MIT License',
          spdxId: 'MIT',
          allowed: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime() - duration('PT1H')
        })
      `, {
        id: `${PREFIX}MIT`
      })

      const beforeUpdate = await licenseRepo.findById(`${PREFIX}MIT`)
      const beforeTimestamp = new Date(beforeUpdate!.updatedAt).getTime()
      
      // Update allowed status
      await licenseRepo.updateAllowedStatus(`${PREFIX}MIT`, true)

      const afterUpdate = await licenseRepo.findById(`${PREFIX}MIT`)
      const afterTimestamp = new Date(afterUpdate!.updatedAt).getTime()
      
      // The updated timestamp should be later than the original
      expect(afterTimestamp).toBeGreaterThan(beforeTimestamp)
    })
  })

  describe('getAllowedLicenses()', () => {
    it('should return only allowed licenses', async () => {
      if (!ctx.neo4jAvailable) return

      // Create test licenses with mixed allowed status
      await session.run(`
        CREATE (l1:License {
          id: $id1,
          name: 'MIT License',
          spdxId: 'MIT',
          allowed: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l2:License {
          id: $id2,
          name: 'Apache License 2.0',
          spdxId: 'Apache-2.0',
          allowed: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l3:License {
          id: $id3,
          name: 'BSD 3-Clause',
          spdxId: 'BSD-3-Clause',
          allowed: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id1: `${PREFIX}MIT`,
        id2: `${PREFIX}Apache-2.0`,
        id3: `${PREFIX}BSD-3-Clause`
      })

      const result = await licenseRepo.getAllowedLicenses()
      const testLicenses = result.filter(l => l.id.startsWith(PREFIX))

      expect(testLicenses.length).toBe(2)
      testLicenses.forEach(license => {
        expect(license.allowed).toBe(true)
      })
    })

    it('should return empty array when no licenses are allowed', async () => {
      if (!ctx.neo4jAvailable) return

      // Create test licenses that are not allowed
      await session.run(`
        CREATE (l1:License {
          id: $id1,
          name: 'GPL 3.0',
          spdxId: 'GPL-3.0',
          allowed: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id1: `${PREFIX}GPL-3.0`
      })

      const result = await licenseRepo.getAllowedLicenses()
      const testLicenses = result.filter(l => l.id.startsWith(PREFIX))

      expect(testLicenses.length).toBe(0)
    })
  })

  describe('isAllowed()', () => {
    it('should return true when license is allowed', async () => {
      if (!ctx.neo4jAvailable) return

      await session.run(`
        CREATE (l:License {
          id: $id,
          name: 'MIT License',
          spdxId: 'MIT',
          allowed: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id: `${PREFIX}MIT`
      })

      const result = await licenseRepo.isAllowed(`${PREFIX}MIT`)
      expect(result).toBe(true)
    })

    it('should return false when license is not allowed', async () => {
      if (!ctx.neo4jAvailable) return

      await session.run(`
        CREATE (l:License {
          id: $id,
          name: 'GPL 3.0',
          spdxId: 'GPL-3.0',
          allowed: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id: `${PREFIX}GPL-3.0`
      })

      const result = await licenseRepo.isAllowed(`${PREFIX}GPL-3.0`)
      expect(result).toBe(false)
    })

    it('should return false when license does not exist', async () => {
      if (!ctx.neo4jAvailable) return

      const result = await licenseRepo.isAllowed(`${PREFIX}nonexistent`)
      expect(result).toBe(false)
    })

    it('should return false when license has no whitelist property', async () => {
      if (!ctx.neo4jAvailable) return

      // Create a license without the allowed property
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
        id: `${PREFIX}Old-License`
      })

      const result = await licenseRepo.isAllowed(`${PREFIX}Old-License`)
      expect(result).toBe(false)
    })
  })

  describe('bulkUpdateAllowedStatus()', () => {
    it('should update multiple licenses at once', async () => {
      if (!ctx.neo4jAvailable) return

      // Create multiple test licenses
      await session.run(`
        CREATE (l1:License {
          id: $id1,
          name: 'MIT License',
          spdxId: 'MIT',
          allowed: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l2:License {
          id: $id2,
          name: 'Apache License 2.0',
          spdxId: 'Apache-2.0',
          allowed: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id1: `${PREFIX}MIT`,
        id2: `${PREFIX}Apache-2.0`
      })

      // Update allowed status for both licenses
      const updated = await licenseRepo.bulkUpdateAllowedStatus(
        [`${PREFIX}MIT`, `${PREFIX}Apache-2.0`],
        true
      )

      expect(updated).toBe(2)

      // Verify both licenses were updated
      const mit = await licenseRepo.findById(`${PREFIX}MIT`)
      const apache = await licenseRepo.findById(`${PREFIX}Apache-2.0`)
      expect(mit?.allowed).toBe(true)
      expect(apache?.allowed).toBe(true)
    })

    it('should rollback entire transaction if any license does not exist', async () => {
      if (!ctx.neo4jAvailable) return

      // Create only one license
      await session.run(`
        CREATE (l3:License {
          id: $id3,
          name: 'BSD 3-Clause',
          spdxId: 'BSD-3-Clause',
          allowed: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id3: `${PREFIX}BSD-3-Clause`
      })

      // Try to update multiple licenses (but only BSD-3-Clause exists)
      const licenseIds = [
        `${PREFIX}MIT`,
        `${PREFIX}Apache-2.0`,
        `${PREFIX}BSD-3-Clause`
      ]
      
      // Should throw an error because MIT and Apache-2.0 don't exist
      await expect(
        licenseRepo.bulkUpdateAllowedStatus(licenseIds, true)
      ).rejects.toThrow('One or more licenses not found')

      // Verify BSD-3-Clause was NOT updated (rollback)
      const bsd = await licenseRepo.findById(`${PREFIX}BSD-3-Clause`)
      expect(bsd?.allowed).toBe(false)
    })

    it('should handle partial updates when some licenses do not exist', async () => {
      if (!ctx.neo4jAvailable) return

      // Create one test license
      await session.run(`
        CREATE (l:License {
          id: $id,
          name: 'MIT License',
          spdxId: 'MIT',
          allowed: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id: `${PREFIX}MIT`
      })

      // Try to update with one existing and one non-existing license
      await expect(
        licenseRepo.bulkUpdateAllowedStatus(
          [`${PREFIX}MIT`, `${PREFIX}nonexistent`],
          true
        )
      ).rejects.toThrow('One or more licenses not found')

      // Verify the existing license was NOT updated (rollback)
      const mit = await licenseRepo.findById(`${PREFIX}MIT`)
      expect(mit?.allowed).toBe(false)
    })

    it('should return 0 when empty array is provided', async () => {
      if (!ctx.neo4jAvailable) return

      const result = await licenseRepo.bulkUpdateAllowedStatus([], true)
      expect(result).toBe(0)
    })

    it('should update allowed status to false for multiple licenses', async () => {
      if (!ctx.neo4jAvailable) return

      // Create test licenses that are allowed
      await session.run(`
        CREATE (l1:License {
          id: $id1,
          name: 'MIT License',
          spdxId: 'MIT',
          allowed: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l2:License {
          id: $id2,
          name: 'Apache License 2.0',
          spdxId: 'Apache-2.0',
          allowed: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id1: `${PREFIX}MIT`,
        id2: `${PREFIX}Apache-2.0`
      })

      // Update to not allowed
      const licenseIds = [`${PREFIX}MIT`, `${PREFIX}Apache-2.0`]
      const result = await licenseRepo.bulkUpdateAllowedStatus(licenseIds, false)
      
      expect(result).toBe(2)

      // Verify all licenses are not allowed
      for (const id of licenseIds) {
        const license = await licenseRepo.findById(id)
        expect(license?.allowed).toBe(false)
      }
    })
  })

  describe('findAll() with allowed filter', () => {
    it('should filter licenses by allowed status', async () => {
      if (!ctx.neo4jAvailable) return

      // Create test licenses with different allowed status
      await session.run(`
        CREATE (l1:License {
          id: $id1,
          name: 'MIT License',
          spdxId: 'MIT',
          allowed: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l2:License {
          id: $id2,
          name: 'GPL 3.0',
          spdxId: 'GPL-3.0',
          allowed: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l3:License {
          id: $id3,
          name: 'Apache License 2.0',
          spdxId: 'Apache-2.0',
          allowed: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id1: `${PREFIX}MIT`,
        id2: `${PREFIX}GPL-3.0`,
        id3: `${PREFIX}Apache-2.0`
      })

      const allowedResult = await licenseRepo.findAll({ allowed: true })
      const testAllowed = allowedResult.filter(l => l.id.startsWith(PREFIX))

      expect(testAllowed.length).toBe(2)
      testAllowed.forEach(license => {
        expect(license.allowed).toBe(true)
      })

      const notAllowedResult = await licenseRepo.findAll({ allowed: false })
      const testNotAllowed = notAllowedResult.filter(l => l.id.startsWith(PREFIX))

      expect(testNotAllowed.length).toBe(1)
      expect(testNotAllowed[0].id).toBe(`${PREFIX}GPL-3.0`)
      expect(testNotAllowed[0].allowed).toBe(false)
    })

    it('should combine allowed filter with other filters', async () => {
      if (!ctx.neo4jAvailable) return

      // Create test licenses with different properties
      await session.run(`
        CREATE (l1:License {
          id: $id1,
          name: 'MIT License',
          spdxId: 'MIT',
          category: 'permissive',
          allowed: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l2:License {
          id: $id2,
          name: 'GPL 3.0',
          spdxId: 'GPL-3.0',
          category: 'copyleft',
          allowed: true,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (l3:License {
          id: $id3,
          name: 'Apache License 2.0',
          spdxId: 'Apache-2.0',
          category: 'permissive',
          allowed: false,
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id1: `${PREFIX}MIT`,
        id2: `${PREFIX}GPL-3.0`,
        id3: `${PREFIX}Apache-2.0`
      })

      // Filter by both allowed and category
      const result = await licenseRepo.findAll({ 
        allowed: true, 
        category: 'permissive' 
      })
      const testLicenses = result.filter(l => l.id.startsWith(PREFIX))

      expect(testLicenses.length).toBe(1)
      expect(testLicenses[0].id).toBe(`${PREFIX}MIT`)
      expect(testLicenses[0].allowed).toBe(true)
      expect(testLicenses[0].category).toBe('permissive')
    })
  })
})
