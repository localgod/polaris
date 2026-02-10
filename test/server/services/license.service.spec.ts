import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LicenseService } from '../../../server/services/license.service'
import { LicenseRepository } from '../../../server/repositories/license.repository'
import type { License } from '../../../server/repositories/license.repository'
import '../../fixtures/service-test-helper'

vi.mock('../../../server/repositories/license.repository')

describe('LicenseService', () => {
  let service: LicenseService

  const mockLicenses: License[] = [
    {
      id: 'MIT',
      name: 'MIT License',
      spdxId: 'MIT',
      osiApproved: true,
      url: 'https://opensource.org/licenses/MIT',
      category: 'Permissive',
      text: 'MIT License text...',
      deprecated: false,
      whitelisted: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      componentCount: 150
    },
    {
      id: 'Apache-2.0',
      name: 'Apache License 2.0',
      spdxId: 'Apache-2.0',
      osiApproved: true,
      url: 'https://opensource.org/licenses/Apache-2.0',
      category: 'Permissive',
      text: 'Apache License text...',
      deprecated: false,
      whitelisted: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      componentCount: 100
    },
    {
      id: 'GPL-3.0',
      name: 'GNU General Public License v3.0',
      spdxId: 'GPL-3.0',
      osiApproved: true,
      url: 'https://opensource.org/licenses/GPL-3.0',
      category: 'Copyleft',
      text: 'GPL License text...',
      deprecated: false,
      whitelisted: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      componentCount: 50
    }
  ]

  const mockStatistics = {
    total: 100,
    byCategory: {
      'Permissive': 60,
      'Copyleft': 30,
      'Proprietary': 10
    },
    osiApproved: 80,
    deprecated: 5
  }

  beforeEach(() => {
    vi.clearAllMocks()
    service = new LicenseService()
  })

  describe('findAll()', () => {
    it('should return all licenses with correct structure', async () => {
      vi.mocked(LicenseRepository.prototype.findAll).mockResolvedValue(mockLicenses)

      const result = await service.findAll()

      expect(LicenseRepository.prototype.findAll).toHaveBeenCalledOnce()
      expect(result).toEqual({
        data: mockLicenses,
        count: 3,
        total: 3
      })
    })

    it('should apply default limit of 50', async () => {
      vi.mocked(LicenseRepository.prototype.findAll).mockResolvedValue(mockLicenses)

      await service.findAll()

      expect(LicenseRepository.prototype.findAll).toHaveBeenCalledWith({
        limit: 50,
        offset: 0
      })
    })

    it('should apply custom limit and offset', async () => {
      vi.mocked(LicenseRepository.prototype.findAll).mockResolvedValue(mockLicenses)

      await service.findAll({ limit: 10, offset: 20 })

      expect(LicenseRepository.prototype.findAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 20
      })
    })

    it('should pass category filter to repository', async () => {
      vi.mocked(LicenseRepository.prototype.findAll).mockResolvedValue([mockLicenses[0]])

      await service.findAll({ category: 'Permissive' })

      expect(LicenseRepository.prototype.findAll).toHaveBeenCalledWith({
        category: 'Permissive',
        limit: 50,
        offset: 0
      })
    })

    it('should pass osiApproved filter to repository', async () => {
      vi.mocked(LicenseRepository.prototype.findAll).mockResolvedValue(mockLicenses)

      await service.findAll({ osiApproved: true })

      expect(LicenseRepository.prototype.findAll).toHaveBeenCalledWith({
        osiApproved: true,
        limit: 50,
        offset: 0
      })
    })

    it('should pass deprecated filter to repository', async () => {
      vi.mocked(LicenseRepository.prototype.findAll).mockResolvedValue([])

      await service.findAll({ deprecated: true })

      expect(LicenseRepository.prototype.findAll).toHaveBeenCalledWith({
        deprecated: true,
        limit: 50,
        offset: 0
      })
    })

    it('should pass whitelisted filter to repository', async () => {
      vi.mocked(LicenseRepository.prototype.findAll).mockResolvedValue(mockLicenses.filter(l => l.whitelisted))

      await service.findAll({ whitelisted: true })

      expect(LicenseRepository.prototype.findAll).toHaveBeenCalledWith({
        whitelisted: true,
        limit: 50,
        offset: 0
      })
    })

    it('should pass search filter to repository', async () => {
      vi.mocked(LicenseRepository.prototype.findAll).mockResolvedValue([mockLicenses[0]])

      await service.findAll({ search: 'MIT' })

      expect(LicenseRepository.prototype.findAll).toHaveBeenCalledWith({
        search: 'MIT',
        limit: 50,
        offset: 0
      })
    })

    it('should pass multiple filters to repository', async () => {
      vi.mocked(LicenseRepository.prototype.findAll).mockResolvedValue([mockLicenses[0]])

      await service.findAll({
        category: 'Permissive',
        osiApproved: true,
        whitelisted: true,
        search: 'MIT',
        limit: 25,
        offset: 10
      })

      expect(LicenseRepository.prototype.findAll).toHaveBeenCalledWith({
        category: 'Permissive',
        osiApproved: true,
        whitelisted: true,
        search: 'MIT',
        limit: 25,
        offset: 10
      })
    })

    it('should return empty array when no licenses exist', async () => {
      vi.mocked(LicenseRepository.prototype.findAll).mockResolvedValue([])

      const result = await service.findAll()

      expect(result).toEqual({ data: [], count: 0, total: 0 })
    })

    it('should propagate repository errors', async () => {
      vi.mocked(LicenseRepository.prototype.findAll).mockRejectedValue(new Error('Database connection failed'))

      await expect(service.findAll()).rejects.toThrow('Database connection failed')
    })
  })

  describe('findById()', () => {
    it('should return a license by ID', async () => {
      vi.mocked(LicenseRepository.prototype.findById).mockResolvedValue(mockLicenses[0])

      const result = await service.findById('MIT')

      expect(LicenseRepository.prototype.findById).toHaveBeenCalledWith('MIT')
      expect(result).toEqual(mockLicenses[0])
    })

    it('should return null when license is not found', async () => {
      vi.mocked(LicenseRepository.prototype.findById).mockResolvedValue(null)

      const result = await service.findById('NONEXISTENT')

      expect(result).toBeNull()
    })
  })

  describe('getStatistics()', () => {
    it('should return license statistics with whitelist count', async () => {
      vi.mocked(LicenseRepository.prototype.getStatistics).mockResolvedValue(mockStatistics)
      vi.mocked(LicenseRepository.prototype.getWhitelistedLicenses).mockResolvedValue(
        mockLicenses.filter(l => l.whitelisted)
      )

      const result = await service.getStatistics()

      expect(LicenseRepository.prototype.getStatistics).toHaveBeenCalledOnce()
      expect(LicenseRepository.prototype.getWhitelistedLicenses).toHaveBeenCalledOnce()
      expect(result).toEqual({
        total: 100,
        byCategory: { 'Permissive': 60, 'Copyleft': 30, 'Proprietary': 10 },
        osiApproved: 80,
        deprecated: 5,
        whitelisted: 2
      })
    })

    it('should return zero whitelisted count when no licenses are whitelisted', async () => {
      vi.mocked(LicenseRepository.prototype.getStatistics).mockResolvedValue(mockStatistics)
      vi.mocked(LicenseRepository.prototype.getWhitelistedLicenses).mockResolvedValue([])

      const result = await service.getStatistics()

      expect(result.whitelisted).toBe(0)
    })

    it('should propagate repository errors from getStatistics', async () => {
      vi.mocked(LicenseRepository.prototype.getStatistics).mockRejectedValue(new Error('Query failed'))

      await expect(service.getStatistics()).rejects.toThrow('Query failed')
    })

    it('should propagate repository errors from getWhitelistedLicenses', async () => {
      vi.mocked(LicenseRepository.prototype.getStatistics).mockResolvedValue(mockStatistics)
      vi.mocked(LicenseRepository.prototype.getWhitelistedLicenses).mockRejectedValue(new Error('Whitelist query failed'))

      await expect(service.getStatistics()).rejects.toThrow('Whitelist query failed')
    })
  })

  describe('getWhitelistedLicenses()', () => {
    it('should return all whitelisted licenses', async () => {
      const whitelisted = mockLicenses.filter(l => l.whitelisted)
      vi.mocked(LicenseRepository.prototype.getWhitelistedLicenses).mockResolvedValue(whitelisted)

      const result = await service.getWhitelistedLicenses()

      expect(LicenseRepository.prototype.getWhitelistedLicenses).toHaveBeenCalledOnce()
      expect(result).toHaveLength(2)
      expect(result.every(l => l.whitelisted)).toBe(true)
    })

    it('should return empty array when no licenses are whitelisted', async () => {
      vi.mocked(LicenseRepository.prototype.getWhitelistedLicenses).mockResolvedValue([])

      const result = await service.getWhitelistedLicenses()

      expect(result).toEqual([])
    })

    it('should propagate repository errors', async () => {
      vi.mocked(LicenseRepository.prototype.getWhitelistedLicenses).mockRejectedValue(new Error('Query execution failed'))

      await expect(service.getWhitelistedLicenses()).rejects.toThrow('Query execution failed')
    })
  })

  describe('updateWhitelistStatus()', () => {
    it('should successfully update whitelist status to true', async () => {
      vi.mocked(LicenseRepository.prototype.findById).mockResolvedValue(mockLicenses[2])
      vi.mocked(LicenseRepository.prototype.updateWhitelistStatus).mockResolvedValue(true)

      const result = await service.updateWhitelistStatus('GPL-3.0', true)

      expect(LicenseRepository.prototype.findById).toHaveBeenCalledWith('GPL-3.0')
      expect(LicenseRepository.prototype.updateWhitelistStatus).toHaveBeenCalledWith('GPL-3.0', true)
      expect(result).toBe(true)
    })

    it('should successfully update whitelist status to false', async () => {
      vi.mocked(LicenseRepository.prototype.findById).mockResolvedValue(mockLicenses[0])
      vi.mocked(LicenseRepository.prototype.updateWhitelistStatus).mockResolvedValue(true)

      const result = await service.updateWhitelistStatus('MIT', false)

      expect(LicenseRepository.prototype.findById).toHaveBeenCalledWith('MIT')
      expect(LicenseRepository.prototype.updateWhitelistStatus).toHaveBeenCalledWith('MIT', false)
      expect(result).toBe(true)
    })

    it('should throw error when license does not exist', async () => {
      vi.mocked(LicenseRepository.prototype.findById).mockResolvedValue(null)

      await expect(service.updateWhitelistStatus('NONEXISTENT', true))
        .rejects.toThrow("License 'NONEXISTENT' not found")
      expect(LicenseRepository.prototype.updateWhitelistStatus).not.toHaveBeenCalled()
    })

    it('should throw error when repository update fails', async () => {
      vi.mocked(LicenseRepository.prototype.findById).mockResolvedValue(mockLicenses[0])
      vi.mocked(LicenseRepository.prototype.updateWhitelistStatus).mockResolvedValue(false)

      await expect(service.updateWhitelistStatus('MIT', true))
        .rejects.toThrow("Failed to update whitelist status for license 'MIT'")
    })

    it('should propagate repository errors from findById', async () => {
      vi.mocked(LicenseRepository.prototype.findById).mockRejectedValue(new Error('Database error'))

      await expect(service.updateWhitelistStatus('MIT', true)).rejects.toThrow('Database error')
    })

    it('should propagate repository errors from updateWhitelistStatus', async () => {
      vi.mocked(LicenseRepository.prototype.findById).mockResolvedValue(mockLicenses[0])
      vi.mocked(LicenseRepository.prototype.updateWhitelistStatus).mockRejectedValue(new Error('Update failed'))

      await expect(service.updateWhitelistStatus('MIT', true)).rejects.toThrow('Update failed')
    })
  })

  describe('bulkUpdateWhitelistStatus()', () => {
    it('should successfully update multiple licenses', async () => {
      vi.mocked(LicenseRepository.prototype.findById)
        .mockResolvedValueOnce(mockLicenses[0])
        .mockResolvedValueOnce(mockLicenses[1])
      vi.mocked(LicenseRepository.prototype.bulkUpdateWhitelistStatus).mockResolvedValue(2)

      const result = await service.bulkUpdateWhitelistStatus(['MIT', 'Apache-2.0'], false)

      expect(LicenseRepository.prototype.findById).toHaveBeenCalledTimes(2)
      expect(LicenseRepository.prototype.bulkUpdateWhitelistStatus).toHaveBeenCalledWith(['MIT', 'Apache-2.0'], false)
      expect(result).toEqual({ success: true, updated: 2, errors: [] })
    })

    it('should return error when license does not exist', async () => {
      vi.mocked(LicenseRepository.prototype.findById)
        .mockResolvedValueOnce(mockLicenses[0])
        .mockResolvedValueOnce(null)

      const result = await service.bulkUpdateWhitelistStatus(['MIT', 'NONEXISTENT'], true)

      expect(LicenseRepository.prototype.bulkUpdateWhitelistStatus).not.toHaveBeenCalled()
      expect(result).toEqual({
        success: false,
        updated: 0,
        errors: ["License 'NONEXISTENT' not found"]
      })
    })

    it('should return multiple errors when multiple licenses do not exist', async () => {
      vi.mocked(LicenseRepository.prototype.findById)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      const result = await service.bulkUpdateWhitelistStatus(['NONEXISTENT1', 'NONEXISTENT2'], true)

      expect(result).toEqual({
        success: false,
        updated: 0,
        errors: ["License 'NONEXISTENT1' not found", "License 'NONEXISTENT2' not found"]
      })
    })

    it('should return error when partial update occurs', async () => {
      vi.mocked(LicenseRepository.prototype.findById)
        .mockResolvedValueOnce(mockLicenses[0])
        .mockResolvedValueOnce(mockLicenses[1])
        .mockResolvedValueOnce(mockLicenses[2])
      vi.mocked(LicenseRepository.prototype.bulkUpdateWhitelistStatus).mockResolvedValue(2)

      const result = await service.bulkUpdateWhitelistStatus(['MIT', 'Apache-2.0', 'GPL-3.0'], true)

      expect(result).toEqual({
        success: false,
        updated: 2,
        errors: ['Some licenses failed to update (unexpected partial update)']
      })
    })

    it('should handle empty license array', async () => {
      const result = await service.bulkUpdateWhitelistStatus([], true)

      expect(LicenseRepository.prototype.findById).not.toHaveBeenCalled()
      expect(LicenseRepository.prototype.bulkUpdateWhitelistStatus).not.toHaveBeenCalled()
      expect(result).toEqual({ success: true, updated: 0, errors: [] })
    })

    it('should validate all licenses before attempting update', async () => {
      vi.mocked(LicenseRepository.prototype.findById)
        .mockResolvedValueOnce(mockLicenses[0])
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockLicenses[1])

      const result = await service.bulkUpdateWhitelistStatus(['MIT', 'NONEXISTENT', 'Apache-2.0'], true)

      expect(LicenseRepository.prototype.findById).toHaveBeenCalledTimes(3)
      expect(LicenseRepository.prototype.bulkUpdateWhitelistStatus).not.toHaveBeenCalled()
      expect(result.success).toBe(false)
      expect(result.errors).toContain("License 'NONEXISTENT' not found")
    })

    it('should handle repository errors from findById', async () => {
      vi.mocked(LicenseRepository.prototype.findById).mockRejectedValue(new Error('Database error'))

      const result = await service.bulkUpdateWhitelistStatus(['MIT'], true)

      expect(result).toEqual({
        success: false,
        updated: 0,
        errors: ["License 'MIT': Database error"]
      })
      expect(LicenseRepository.prototype.bulkUpdateWhitelistStatus).not.toHaveBeenCalled()
    })

    it('should handle repository errors from bulkUpdateWhitelistStatus', async () => {
      vi.mocked(LicenseRepository.prototype.findById)
        .mockResolvedValueOnce(mockLicenses[0])
        .mockResolvedValueOnce(mockLicenses[1])
      vi.mocked(LicenseRepository.prototype.bulkUpdateWhitelistStatus).mockRejectedValue(new Error('Bulk update failed'))

      const result = await service.bulkUpdateWhitelistStatus(['MIT', 'Apache-2.0'], true)

      expect(result).toEqual({
        success: false,
        updated: 0,
        errors: ['Bulk update failed']
      })
    })
  })

  describe('isWhitelisted()', () => {
    it('should return true when license is whitelisted', async () => {
      vi.mocked(LicenseRepository.prototype.isWhitelisted).mockResolvedValue(true)

      expect(await service.isWhitelisted('MIT')).toBe(true)
      expect(LicenseRepository.prototype.isWhitelisted).toHaveBeenCalledWith('MIT')
    })

    it('should return false when license is not whitelisted', async () => {
      vi.mocked(LicenseRepository.prototype.isWhitelisted).mockResolvedValue(false)

      expect(await service.isWhitelisted('GPL-3.0')).toBe(false)
    })

    it('should propagate repository errors', async () => {
      vi.mocked(LicenseRepository.prototype.isWhitelisted).mockRejectedValue(new Error('Query failed'))

      await expect(service.isWhitelisted('MIT')).rejects.toThrow('Query failed')
    })
  })

  describe('exists()', () => {
    it('should return true when license exists', async () => {
      vi.mocked(LicenseRepository.prototype.exists).mockResolvedValue(true)

      expect(await service.exists('MIT')).toBe(true)
      expect(LicenseRepository.prototype.exists).toHaveBeenCalledWith('MIT')
    })

    it('should return false when license does not exist', async () => {
      vi.mocked(LicenseRepository.prototype.exists).mockResolvedValue(false)

      expect(await service.exists('NONEXISTENT')).toBe(false)
    })

    it('should propagate repository errors', async () => {
      vi.mocked(LicenseRepository.prototype.exists).mockRejectedValue(new Error('Database connection lost'))

      await expect(service.exists('MIT')).rejects.toThrow('Database connection lost')
    })
  })
})
