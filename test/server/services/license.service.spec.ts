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
      allowed: true,
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
      allowed: true,
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
      allowed: false,
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

    it('should pass allowed filter to repository', async () => {
      vi.mocked(LicenseRepository.prototype.findAll).mockResolvedValue(mockLicenses.filter(l => l.allowed))

      await service.findAll({ allowed: true })

      expect(LicenseRepository.prototype.findAll).toHaveBeenCalledWith({
        allowed: true,
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
        allowed: true,
        search: 'MIT',
        limit: 25,
        offset: 10
      })

      expect(LicenseRepository.prototype.findAll).toHaveBeenCalledWith({
        category: 'Permissive',
        osiApproved: true,
        allowed: true,
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
      vi.mocked(LicenseRepository.prototype.getAllowedLicenses).mockResolvedValue(
        mockLicenses.filter(l => l.allowed)
      )

      const result = await service.getStatistics()

      expect(LicenseRepository.prototype.getStatistics).toHaveBeenCalledOnce()
      expect(LicenseRepository.prototype.getAllowedLicenses).toHaveBeenCalledOnce()
      expect(result).toEqual({
        total: 100,
        byCategory: { 'Permissive': 60, 'Copyleft': 30, 'Proprietary': 10 },
        osiApproved: 80,
        deprecated: 5,
        allowed: 2
      })
    })

    it('should return zero allowed count when no licenses are allowed', async () => {
      vi.mocked(LicenseRepository.prototype.getStatistics).mockResolvedValue(mockStatistics)
      vi.mocked(LicenseRepository.prototype.getAllowedLicenses).mockResolvedValue([])

      const result = await service.getStatistics()

      expect(result.allowed).toBe(0)
    })

    it('should propagate repository errors from getStatistics', async () => {
      vi.mocked(LicenseRepository.prototype.getStatistics).mockRejectedValue(new Error('Query failed'))

      await expect(service.getStatistics()).rejects.toThrow('Query failed')
    })

    it('should propagate repository errors from getAllowedLicenses', async () => {
      vi.mocked(LicenseRepository.prototype.getStatistics).mockResolvedValue(mockStatistics)
      vi.mocked(LicenseRepository.prototype.getAllowedLicenses).mockRejectedValue(new Error('Allowed query failed'))

      await expect(service.getStatistics()).rejects.toThrow('Allowed query failed')
    })
  })

  describe('getAllowedLicenses()', () => {
    it('should return all allowed licenses', async () => {
      const allowedList = mockLicenses.filter(l => l.allowed)
      vi.mocked(LicenseRepository.prototype.getAllowedLicenses).mockResolvedValue(allowedList)

      const result = await service.getAllowedLicenses()

      expect(LicenseRepository.prototype.getAllowedLicenses).toHaveBeenCalledOnce()
      expect(result).toHaveLength(2)
      expect(result.every(l => l.allowed)).toBe(true)
    })

    it('should return empty array when no licenses are allowed', async () => {
      vi.mocked(LicenseRepository.prototype.getAllowedLicenses).mockResolvedValue([])

      const result = await service.getAllowedLicenses()

      expect(result).toEqual([])
    })

    it('should propagate repository errors', async () => {
      vi.mocked(LicenseRepository.prototype.getAllowedLicenses).mockRejectedValue(new Error('Query execution failed'))

      await expect(service.getAllowedLicenses()).rejects.toThrow('Query execution failed')
    })
  })

  describe('updateAllowedStatus()', () => {
    it('should successfully update whitelist status to true', async () => {
      vi.mocked(LicenseRepository.prototype.findById).mockResolvedValue(mockLicenses[2])
      vi.mocked(LicenseRepository.prototype.updateAllowedStatus).mockResolvedValue(true)

      const result = await service.updateAllowedStatus('GPL-3.0', true)

      expect(LicenseRepository.prototype.findById).toHaveBeenCalledWith('GPL-3.0')
      expect(LicenseRepository.prototype.updateAllowedStatus).toHaveBeenCalledWith('GPL-3.0', true, undefined)
      expect(result).toBe(true)
    })

    it('should successfully update whitelist status to false', async () => {
      vi.mocked(LicenseRepository.prototype.findById).mockResolvedValue(mockLicenses[0])
      vi.mocked(LicenseRepository.prototype.updateAllowedStatus).mockResolvedValue(true)

      const result = await service.updateAllowedStatus('MIT', false)

      expect(LicenseRepository.prototype.findById).toHaveBeenCalledWith('MIT')
      expect(LicenseRepository.prototype.updateAllowedStatus).toHaveBeenCalledWith('MIT', false, undefined)
      expect(result).toBe(true)
    })

    it('should throw error when license does not exist', async () => {
      vi.mocked(LicenseRepository.prototype.findById).mockResolvedValue(null)

      await expect(service.updateAllowedStatus('NONEXISTENT', true))
        .rejects.toThrow("License 'NONEXISTENT' not found")
      expect(LicenseRepository.prototype.updateAllowedStatus).not.toHaveBeenCalled()
    })

    it('should throw error when repository update fails', async () => {
      vi.mocked(LicenseRepository.prototype.findById).mockResolvedValue(mockLicenses[0])
      vi.mocked(LicenseRepository.prototype.updateAllowedStatus).mockResolvedValue(false)

      await expect(service.updateAllowedStatus('MIT', true))
        .rejects.toThrow("Failed to update allowed status for license 'MIT'")
    })

    it('should propagate repository errors from findById', async () => {
      vi.mocked(LicenseRepository.prototype.findById).mockRejectedValue(new Error('Database error'))

      await expect(service.updateAllowedStatus('MIT', true)).rejects.toThrow('Database error')
    })

    it('should propagate repository errors from updateAllowedStatus', async () => {
      vi.mocked(LicenseRepository.prototype.findById).mockResolvedValue(mockLicenses[0])
      vi.mocked(LicenseRepository.prototype.updateAllowedStatus).mockRejectedValue(new Error('Update failed'))

      await expect(service.updateAllowedStatus('MIT', true)).rejects.toThrow('Update failed')
    })
  })

  describe('bulkUpdateAllowedStatus()', () => {
    it('should successfully update multiple licenses', async () => {
      vi.mocked(LicenseRepository.prototype.findById)
        .mockResolvedValueOnce(mockLicenses[0])
        .mockResolvedValueOnce(mockLicenses[1])
      vi.mocked(LicenseRepository.prototype.bulkUpdateAllowedStatus).mockResolvedValue(2)

      const result = await service.bulkUpdateAllowedStatus(['MIT', 'Apache-2.0'], false)

      expect(LicenseRepository.prototype.findById).toHaveBeenCalledTimes(2)
      expect(LicenseRepository.prototype.bulkUpdateAllowedStatus).toHaveBeenCalledWith(['MIT', 'Apache-2.0'], false, undefined)
      expect(result).toEqual({ success: true, updated: 2, errors: [] })
    })

    it('should return error when license does not exist', async () => {
      vi.mocked(LicenseRepository.prototype.findById)
        .mockResolvedValueOnce(mockLicenses[0])
        .mockResolvedValueOnce(null)

      const result = await service.bulkUpdateAllowedStatus(['MIT', 'NONEXISTENT'], true)

      expect(LicenseRepository.prototype.bulkUpdateAllowedStatus).not.toHaveBeenCalled()
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

      const result = await service.bulkUpdateAllowedStatus(['NONEXISTENT1', 'NONEXISTENT2'], true)

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
      vi.mocked(LicenseRepository.prototype.bulkUpdateAllowedStatus).mockResolvedValue(2)

      const result = await service.bulkUpdateAllowedStatus(['MIT', 'Apache-2.0', 'GPL-3.0'], true)

      expect(result).toEqual({
        success: false,
        updated: 2,
        errors: ['Some licenses failed to update (unexpected partial update)']
      })
    })

    it('should handle empty license array', async () => {
      const result = await service.bulkUpdateAllowedStatus([], true)

      expect(LicenseRepository.prototype.findById).not.toHaveBeenCalled()
      expect(LicenseRepository.prototype.bulkUpdateAllowedStatus).not.toHaveBeenCalled()
      expect(result).toEqual({ success: true, updated: 0, errors: [] })
    })

    it('should validate all licenses before attempting update', async () => {
      vi.mocked(LicenseRepository.prototype.findById)
        .mockResolvedValueOnce(mockLicenses[0])
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockLicenses[1])

      const result = await service.bulkUpdateAllowedStatus(['MIT', 'NONEXISTENT', 'Apache-2.0'], true)

      expect(LicenseRepository.prototype.findById).toHaveBeenCalledTimes(3)
      expect(LicenseRepository.prototype.bulkUpdateAllowedStatus).not.toHaveBeenCalled()
      expect(result.success).toBe(false)
      expect(result.errors).toContain("License 'NONEXISTENT' not found")
    })

    it('should handle repository errors from findById', async () => {
      vi.mocked(LicenseRepository.prototype.findById).mockRejectedValue(new Error('Database error'))

      const result = await service.bulkUpdateAllowedStatus(['MIT'], true)

      expect(result).toEqual({
        success: false,
        updated: 0,
        errors: ["License 'MIT': Database error"]
      })
      expect(LicenseRepository.prototype.bulkUpdateAllowedStatus).not.toHaveBeenCalled()
    })

    it('should handle repository errors from bulkUpdateAllowedStatus', async () => {
      vi.mocked(LicenseRepository.prototype.findById)
        .mockResolvedValueOnce(mockLicenses[0])
        .mockResolvedValueOnce(mockLicenses[1])
      vi.mocked(LicenseRepository.prototype.bulkUpdateAllowedStatus).mockRejectedValue(new Error('Bulk update failed'))

      const result = await service.bulkUpdateAllowedStatus(['MIT', 'Apache-2.0'], true)

      expect(result).toEqual({
        success: false,
        updated: 0,
        errors: ['Bulk update failed']
      })
    })
  })

  describe('isAllowed()', () => {
    it('should return true when license is allowed', async () => {
      vi.mocked(LicenseRepository.prototype.isAllowed).mockResolvedValue(true)

      expect(await service.isAllowed('MIT')).toBe(true)
      expect(LicenseRepository.prototype.isAllowed).toHaveBeenCalledWith('MIT')
    })

    it('should return false when license is not allowed', async () => {
      vi.mocked(LicenseRepository.prototype.isAllowed).mockResolvedValue(false)

      expect(await service.isAllowed('GPL-3.0')).toBe(false)
    })

    it('should propagate repository errors', async () => {
      vi.mocked(LicenseRepository.prototype.isAllowed).mockRejectedValue(new Error('Query failed'))

      await expect(service.isAllowed('MIT')).rejects.toThrow('Query failed')
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
