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


  describe('[pin] count()', () => {
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

  describe('[pin] findAll()', () => {
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

  describe('[pin] findById()', () => {
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

  describe('[pin] exists()', () => {
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

  describe('[pin] getStatistics()', () => {
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

  describe('[pin] updateAllowedStatus()', () => {
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

  describe('[pin] getAllowedLicenses()', () => {
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

  describe('[contract] findViolations() default-deny for unreviewed licenses', () => {
    it('treats a license with no recorded allowed decision as a violation, same as an explicitly denied one', async () => {
      if (!ctx.neo4jAvailable) return

      // Team -> System -> Component -> License graph. One component carries an
      // explicitly denied license, the other a license that was never reviewed
      // (no `allowed` property at all) — per ADR-0005, both must surface as violations.
      await session.run(`
        CREATE (t:Team {name: $teamName})
        CREATE (s:System {name: $systemName, businessCriticality: 'medium', environment: 'prod'})
        CREATE (c1:Component {name: $componentName1, version: '1.0.0', purl: $purl1})
        CREATE (c2:Component {name: $componentName2, version: '1.0.0', purl: $purl2})
        CREATE (l1:License {id: $licenseId1, name: 'Denied License', deprecated: false, allowed: false, createdAt: datetime(), updatedAt: datetime()})
        CREATE (l2:License {id: $licenseId2, name: 'Unreviewed License', deprecated: false, createdAt: datetime(), updatedAt: datetime()})
        CREATE (t)-[:OWNS]->(s)
        CREATE (s)-[:USES {isDirect: true}]->(c1)
        CREATE (s)-[:USES {isDirect: true}]->(c2)
        CREATE (c1)-[:HAS_LICENSE]->(l1)
        CREATE (c2)-[:HAS_LICENSE]->(l2)
      `, {
        teamName: `${PREFIX}team`,
        systemName: `${PREFIX}system`,
        componentName1: `${PREFIX}denied-pkg`,
        componentName2: `${PREFIX}unreviewed-pkg`,
        purl1: `pkg:npm/${PREFIX}denied-pkg@1.0.0`,
        purl2: `pkg:npm/${PREFIX}unreviewed-pkg@1.0.0`,
        licenseId1: `${PREFIX}Denied-License`,
        licenseId2: `${PREFIX}Unreviewed-License`
      })

      const { data, total } = await licenseRepo.findViolations({ search: PREFIX })

      expect(total).toBe(2)
      const licenseIds = data.map(v => v.licenseId).sort()
      expect(licenseIds).toEqual([`${PREFIX}Denied-License`, `${PREFIX}Unreviewed-License`].sort())
    })

    it('does not flag a component whose license was explicitly allowed', async () => {
      if (!ctx.neo4jAvailable) return

      await session.run(`
        CREATE (t:Team {name: $teamName})
        CREATE (s:System {name: $systemName, businessCriticality: 'medium', environment: 'prod'})
        CREATE (c:Component {name: $componentName, version: '1.0.0', purl: $purl})
        CREATE (l:License {id: $licenseId, name: 'Allowed License', deprecated: false, allowed: true, createdAt: datetime(), updatedAt: datetime()})
        CREATE (t)-[:OWNS]->(s)
        CREATE (s)-[:USES {isDirect: true}]->(c)
        CREATE (c)-[:HAS_LICENSE]->(l)
      `, {
        teamName: `${PREFIX}team2`,
        systemName: `${PREFIX}system2`,
        componentName: `${PREFIX}allowed-pkg`,
        purl: `pkg:npm/${PREFIX}allowed-pkg@1.0.0`,
        licenseId: `${PREFIX}Allowed-License`
      })

      const { data } = await licenseRepo.findViolations({ search: PREFIX })

      expect(data.find(v => v.licenseId === `${PREFIX}Allowed-License`)).toBeUndefined()
    })
  })

  describe('[contract] bulkUpdateAllowedStatus()', () => {
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

  describe('[pin] findAll() with allowed filter', () => {
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

    it('includes a license with no recorded allowed decision when filtering by allowed: false', async () => {
      if (!ctx.neo4jAvailable) return

      await session.run(`
        CREATE (l:License {
          id: $id,
          name: 'Unreviewed License',
          spdxId: 'Unreviewed',
          deprecated: false,
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, {
        id: `${PREFIX}Unreviewed`
      })

      const notAllowedResult = await licenseRepo.findAll({ allowed: false })
      const testNotAllowed = notAllowedResult.filter(l => l.id.startsWith(PREFIX))

      expect(testNotAllowed.some(l => l.id === `${PREFIX}Unreviewed`)).toBe(true)
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

  describe('[contract] findAll()/count() with directOnly filter', () => {
    it('counts only direct usage and excludes licenses with none when directOnly is true', async () => {
      if (!ctx.neo4jAvailable) return

      // MIT: used both directly and transitively across two systems
      // GPL: used only transitively — must disappear when directOnly is true
      await session.run(`
        CREATE (mit:License { id: $mitId, name: 'MIT License', spdxId: 'MIT', category: 'permissive', deprecated: false, createdAt: datetime(), updatedAt: datetime() })
        CREATE (gpl:License { id: $gplId, name: 'GPL 3.0', spdxId: 'GPL-3.0', category: 'copyleft', deprecated: false, createdAt: datetime(), updatedAt: datetime() })
        CREATE (compDirect:Component { name: $compDirectName, version: '1.0.0', purl: $compDirectPurl })
        CREATE (compTransitive:Component { name: $compTransitiveName, version: '1.0.0', purl: $compTransitivePurl })
        CREATE (compGpl:Component { name: $compGplName, version: '1.0.0', purl: $compGplPurl })
        CREATE (sys:System { name: $sysName })
        CREATE (compDirect)-[:HAS_LICENSE]->(mit)
        CREATE (compTransitive)-[:HAS_LICENSE]->(mit)
        CREATE (compGpl)-[:HAS_LICENSE]->(gpl)
        CREATE (sys)-[:USES { isDirect: true }]->(compDirect)
        CREATE (sys)-[:USES { isDirect: false }]->(compTransitive)
        CREATE (sys)-[:USES { isDirect: false }]->(compGpl)
      `, {
        mitId: `${PREFIX}MIT`,
        gplId: `${PREFIX}GPL-3.0`,
        compDirectName: `${PREFIX}comp-direct`,
        compDirectPurl: `pkg:npm/${PREFIX}comp-direct@1.0.0`,
        compTransitiveName: `${PREFIX}comp-transitive`,
        compTransitivePurl: `pkg:npm/${PREFIX}comp-transitive@1.0.0`,
        compGplName: `${PREFIX}comp-gpl`,
        compGplPurl: `pkg:npm/${PREFIX}comp-gpl@1.0.0`,
        sysName: `${PREFIX}sys`
      })

      // Off: both licenses present, MIT counts both its components
      const allResult = await licenseRepo.findAll({ search: PREFIX })
      const mitAll = allResult.find(l => l.id === `${PREFIX}MIT`)
      const gplAll = allResult.find(l => l.id === `${PREFIX}GPL-3.0`)
      expect(mitAll?.componentCount).toBe(2)
      expect(gplAll?.componentCount).toBe(1)
      expect(await licenseRepo.count({ search: PREFIX })).toBe(2)

      // On: GPL (transitive-only) drops out entirely, MIT counts only its direct component
      const directResult = await licenseRepo.findAll({ search: PREFIX, directOnly: true })
      const mitDirect = directResult.find(l => l.id === `${PREFIX}MIT`)
      expect(mitDirect?.componentCount).toBe(1)
      expect(directResult.find(l => l.id === `${PREFIX}GPL-3.0`)).toBeUndefined()
      expect(await licenseRepo.count({ search: PREFIX, directOnly: true })).toBe(1)
    })
  })
})
