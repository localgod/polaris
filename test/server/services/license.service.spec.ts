import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LicenseService } from '../../../server/services/license.service'
import type { LicenseRepository, License } from '../../../server/repositories/license.repository'

// Mock the LicenseRepository
vi.mock('../../../server/repositories/license.repository')

describe('LicenseService', () => {
  let licenseService: LicenseService
  let mockLicenseRepo: LicenseRepository

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
    licenseService = new LicenseService()
    mockLicenseRepo = licenseService['licenseRepo']
  })

  describe('Class Definition', () => {
    it('should be defined as a class', () => {
      expect(LicenseService).toBeDefined()
      expect(typeof LicenseService).toBe('function')
    })

    it('should have findAll method', () => {
      expect(LicenseService.prototype.findAll).toBeDefined()
    })

    it('should have findById method', () => {
      expect(LicenseService.prototype.findById).toBeDefined()
    })

    it('should have getStatistics method', () => {
      expect(LicenseService.prototype.getStatistics).toBeDefined()
    })

    it('should have getWhitelistedLicenses method', () => {
      expect(LicenseService.prototype.getWhitelistedLicenses).toBeDefined()
    })

    it('should have updateWhitelistStatus method', () => {
      expect(LicenseService.prototype.updateWhitelistStatus).toBeDefined()
    })

    it('should have bulkUpdateWhitelistStatus method', () => {
      expect(LicenseService.prototype.bulkUpdateWhitelistStatus).toBeDefined()
    })

    it('should have isWhitelisted method', () => {
      expect(LicenseService.prototype.isWhitelisted).toBeDefined()
    })

    it('should have exists method', () => {
      expect(LicenseService.prototype.exists).toBeDefined()
    })
  })

  describe('findAll()', () => {
    it('should return all licenses with correct structure', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.findAll).mockResolvedValue(mockLicenses)

      // Act
      const result = await licenseService.findAll()

      // Assert
      expect(mockLicenseRepo.findAll).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        data: mockLicenses,
        count: 3,
        total: 3
      })
    })

    it('should apply default limit of 50', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.findAll).mockResolvedValue(mockLicenses)

      // Act
      await licenseService.findAll()

      // Assert
      expect(mockLicenseRepo.findAll).toHaveBeenCalledWith({
        limit: 50,
        offset: 0
      })
    })

    it('should apply custom limit and offset', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.findAll).mockResolvedValue(mockLicenses)

      // Act
      await licenseService.findAll({ limit: 10, offset: 20 })

      // Assert
      expect(mockLicenseRepo.findAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 20
      })
    })

    it('should pass category filter to repository', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.findAll).mockResolvedValue([mockLicenses[0]])

      // Act
      await licenseService.findAll({ category: 'Permissive' })

      // Assert
      expect(mockLicenseRepo.findAll).toHaveBeenCalledWith({
        category: 'Permissive',
        limit: 50,
        offset: 0
      })
    })

    it('should pass osiApproved filter to repository', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.findAll).mockResolvedValue(mockLicenses)

      // Act
      await licenseService.findAll({ osiApproved: true })

      // Assert
      expect(mockLicenseRepo.findAll).toHaveBeenCalledWith({
        osiApproved: true,
        limit: 50,
        offset: 0
      })
    })

    it('should pass deprecated filter to repository', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.findAll).mockResolvedValue([])

      // Act
      await licenseService.findAll({ deprecated: true })

      // Assert
      expect(mockLicenseRepo.findAll).toHaveBeenCalledWith({
        deprecated: true,
        limit: 50,
        offset: 0
      })
    })

    it('should pass whitelisted filter to repository', async () => {
      // Arrange
      const whitelisted = mockLicenses.filter(l => l.whitelisted)
      vi.mocked(mockLicenseRepo.findAll).mockResolvedValue(whitelisted)

      // Act
      await licenseService.findAll({ whitelisted: true })

      // Assert
      expect(mockLicenseRepo.findAll).toHaveBeenCalledWith({
        whitelisted: true,
        limit: 50,
        offset: 0
      })
    })

    it('should pass search filter to repository', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.findAll).mockResolvedValue([mockLicenses[0]])

      // Act
      await licenseService.findAll({ search: 'MIT' })

      // Assert
      expect(mockLicenseRepo.findAll).toHaveBeenCalledWith({
        search: 'MIT',
        limit: 50,
        offset: 0
      })
    })

    it('should pass multiple filters to repository', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.findAll).mockResolvedValue([mockLicenses[0]])

      // Act
      await licenseService.findAll({
        category: 'Permissive',
        osiApproved: true,
        whitelisted: true,
        search: 'MIT',
        limit: 25,
        offset: 10
      })

      // Assert
      expect(mockLicenseRepo.findAll).toHaveBeenCalledWith({
        category: 'Permissive',
        osiApproved: true,
        whitelisted: true,
        search: 'MIT',
        limit: 25,
        offset: 10
      })
    })

    it('should return empty array when no licenses exist', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.findAll).mockResolvedValue([])

      // Act
      const result = await licenseService.findAll()

      // Assert
      expect(mockLicenseRepo.findAll).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        data: [],
        count: 0,
        total: 0
      })
    })

    it('should calculate count correctly for single license', async () => {
      // Arrange
      const singleLicense = [mockLicenses[0]]
      vi.mocked(mockLicenseRepo.findAll).mockResolvedValue(singleLicense)

      // Act
      const result = await licenseService.findAll()

      // Assert
      expect(result.count).toBe(1)
      expect(result.data).toHaveLength(1)
    })

    it('should propagate repository errors', async () => {
      // Arrange
      const error = new Error('Database connection failed')
      vi.mocked(mockLicenseRepo.findAll).mockRejectedValue(error)

      // Act & Assert
      await expect(licenseService.findAll()).rejects.toThrow('Database connection failed')
      expect(mockLicenseRepo.findAll).toHaveBeenCalledTimes(1)
    })

    it('should return licenses with all required properties', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.findAll).mockResolvedValue(mockLicenses)

      // Act
      const result = await licenseService.findAll()

      // Assert
      expect(result.data[0]).toHaveProperty('id')
      expect(result.data[0]).toHaveProperty('name')
      expect(result.data[0]).toHaveProperty('spdxId')
      expect(result.data[0]).toHaveProperty('osiApproved')
      expect(result.data[0]).toHaveProperty('category')
      expect(result.data[0]).toHaveProperty('whitelisted')
      expect(result.data[0]).toHaveProperty('deprecated')
    })
  })

  describe('findById()', () => {
    it('should return a license by ID', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.findById).mockResolvedValue(mockLicenses[0])

      // Act
      const result = await licenseService.findById('MIT')

      // Assert
      expect(mockLicenseRepo.findById).toHaveBeenCalledWith('MIT')
      expect(result).toEqual(mockLicenses[0])
    })

    it('should return null when license is not found', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.findById).mockResolvedValue(null)

      // Act
      const result = await licenseService.findById('NONEXISTENT')

      // Assert
      expect(mockLicenseRepo.findById).toHaveBeenCalledWith('NONEXISTENT')
      expect(result).toBeNull()
    })
  })

  describe('getStatistics()', () => {
    it('should return license statistics with whitelist count', async () => {
      // Arrange
      const whitelistedLicenses = mockLicenses.filter(l => l.whitelisted)
      vi.mocked(mockLicenseRepo.getStatistics).mockResolvedValue(mockStatistics)
      vi.mocked(mockLicenseRepo.getWhitelistedLicenses).mockResolvedValue(whitelistedLicenses)

      // Act
      const result = await licenseService.getStatistics()

      // Assert
      expect(mockLicenseRepo.getStatistics).toHaveBeenCalledTimes(1)
      expect(mockLicenseRepo.getWhitelistedLicenses).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        total: 100,
        byCategory: {
          'Permissive': 60,
          'Copyleft': 30,
          'Proprietary': 10
        },
        osiApproved: 80,
        deprecated: 5,
        whitelisted: 2
      })
    })

    it('should return zero whitelisted count when no licenses are whitelisted', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.getStatistics).mockResolvedValue(mockStatistics)
      vi.mocked(mockLicenseRepo.getWhitelistedLicenses).mockResolvedValue([])

      // Act
      const result = await licenseService.getStatistics()

      // Assert
      expect(result.whitelisted).toBe(0)
    })

    it('should propagate repository errors from getStatistics', async () => {
      // Arrange
      const error = new Error('Query failed')
      vi.mocked(mockLicenseRepo.getStatistics).mockRejectedValue(error)

      // Act & Assert
      await expect(licenseService.getStatistics()).rejects.toThrow('Query failed')
    })

    it('should propagate repository errors from getWhitelistedLicenses', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.getStatistics).mockResolvedValue(mockStatistics)
      const error = new Error('Whitelist query failed')
      vi.mocked(mockLicenseRepo.getWhitelistedLicenses).mockRejectedValue(error)

      // Act & Assert
      await expect(licenseService.getStatistics()).rejects.toThrow('Whitelist query failed')
    })
  })

  describe('getWhitelistedLicenses()', () => {
    it('should return all whitelisted licenses', async () => {
      // Arrange
      const whitelistedLicenses = mockLicenses.filter(l => l.whitelisted)
      vi.mocked(mockLicenseRepo.getWhitelistedLicenses).mockResolvedValue(whitelistedLicenses)

      // Act
      const result = await licenseService.getWhitelistedLicenses()

      // Assert
      expect(mockLicenseRepo.getWhitelistedLicenses).toHaveBeenCalledTimes(1)
      expect(result).toEqual(whitelistedLicenses)
      expect(result).toHaveLength(2)
      expect(result.every(l => l.whitelisted)).toBe(true)
    })

    it('should return empty array when no licenses are whitelisted', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.getWhitelistedLicenses).mockResolvedValue([])

      // Act
      const result = await licenseService.getWhitelistedLicenses()

      // Assert
      expect(mockLicenseRepo.getWhitelistedLicenses).toHaveBeenCalledTimes(1)
      expect(result).toEqual([])
    })

    it('should propagate repository errors', async () => {
      // Arrange
      const error = new Error('Query execution failed')
      vi.mocked(mockLicenseRepo.getWhitelistedLicenses).mockRejectedValue(error)

      // Act & Assert
      await expect(licenseService.getWhitelistedLicenses()).rejects.toThrow('Query execution failed')
    })
  })

  describe('updateWhitelistStatus()', () => {
    it('should successfully update whitelist status to true', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.findById).mockResolvedValue(mockLicenses[2])
      vi.mocked(mockLicenseRepo.updateWhitelistStatus).mockResolvedValue(true)

      // Act
      const result = await licenseService.updateWhitelistStatus('GPL-3.0', true)

      // Assert
      expect(mockLicenseRepo.findById).toHaveBeenCalledWith('GPL-3.0')
      expect(mockLicenseRepo.updateWhitelistStatus).toHaveBeenCalledWith('GPL-3.0', true)
      expect(result).toBe(true)
    })

    it('should successfully update whitelist status to false', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.findById).mockResolvedValue(mockLicenses[0])
      vi.mocked(mockLicenseRepo.updateWhitelistStatus).mockResolvedValue(true)

      // Act
      const result = await licenseService.updateWhitelistStatus('MIT', false)

      // Assert
      expect(mockLicenseRepo.findById).toHaveBeenCalledWith('MIT')
      expect(mockLicenseRepo.updateWhitelistStatus).toHaveBeenCalledWith('MIT', false)
      expect(result).toBe(true)
    })

    it('should throw error when license does not exist', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.findById).mockResolvedValue(null)

      // Act & Assert
      await expect(licenseService.updateWhitelistStatus('NONEXISTENT', true))
        .rejects.toThrow("License 'NONEXISTENT' not found")
      expect(mockLicenseRepo.findById).toHaveBeenCalledWith('NONEXISTENT')
      expect(mockLicenseRepo.updateWhitelistStatus).not.toHaveBeenCalled()
    })

    it('should throw error when repository update fails', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.findById).mockResolvedValue(mockLicenses[0])
      vi.mocked(mockLicenseRepo.updateWhitelistStatus).mockResolvedValue(false)

      // Act & Assert
      await expect(licenseService.updateWhitelistStatus('MIT', true))
        .rejects.toThrow("Failed to update whitelist status for license 'MIT'")
      expect(mockLicenseRepo.findById).toHaveBeenCalledWith('MIT')
      expect(mockLicenseRepo.updateWhitelistStatus).toHaveBeenCalledWith('MIT', true)
    })

    it('should propagate repository errors from findById', async () => {
      // Arrange
      const error = new Error('Database error')
      vi.mocked(mockLicenseRepo.findById).mockRejectedValue(error)

      // Act & Assert
      await expect(licenseService.updateWhitelistStatus('MIT', true))
        .rejects.toThrow('Database error')
    })

    it('should propagate repository errors from updateWhitelistStatus', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.findById).mockResolvedValue(mockLicenses[0])
      const error = new Error('Update failed')
      vi.mocked(mockLicenseRepo.updateWhitelistStatus).mockRejectedValue(error)

      // Act & Assert
      await expect(licenseService.updateWhitelistStatus('MIT', true))
        .rejects.toThrow('Update failed')
    })
  })

  describe('bulkUpdateWhitelistStatus()', () => {
    it('should successfully update multiple licenses', async () => {
      // Arrange
      const licenseIds = ['MIT', 'Apache-2.0']
      vi.mocked(mockLicenseRepo.findById)
        .mockResolvedValueOnce(mockLicenses[0])
        .mockResolvedValueOnce(mockLicenses[1])
      vi.mocked(mockLicenseRepo.bulkUpdateWhitelistStatus).mockResolvedValue(2)

      // Act
      const result = await licenseService.bulkUpdateWhitelistStatus(licenseIds, false)

      // Assert
      expect(mockLicenseRepo.findById).toHaveBeenCalledTimes(2)
      expect(mockLicenseRepo.findById).toHaveBeenCalledWith('MIT')
      expect(mockLicenseRepo.findById).toHaveBeenCalledWith('Apache-2.0')
      expect(mockLicenseRepo.bulkUpdateWhitelistStatus).toHaveBeenCalledWith(licenseIds, false)
      expect(result).toEqual({
        success: true,
        updated: 2,
        errors: []
      })
    })

    it('should return error when license does not exist', async () => {
      // Arrange
      const licenseIds = ['MIT', 'NONEXISTENT']
      vi.mocked(mockLicenseRepo.findById)
        .mockResolvedValueOnce(mockLicenses[0])
        .mockResolvedValueOnce(null)

      // Act
      const result = await licenseService.bulkUpdateWhitelistStatus(licenseIds, true)

      // Assert
      expect(mockLicenseRepo.findById).toHaveBeenCalledTimes(2)
      expect(mockLicenseRepo.bulkUpdateWhitelistStatus).not.toHaveBeenCalled()
      expect(result).toEqual({
        success: false,
        updated: 0,
        errors: ["License 'NONEXISTENT' not found"]
      })
    })

    it('should return multiple errors when multiple licenses do not exist', async () => {
      // Arrange
      const licenseIds = ['NONEXISTENT1', 'NONEXISTENT2']
      vi.mocked(mockLicenseRepo.findById)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      // Act
      const result = await licenseService.bulkUpdateWhitelistStatus(licenseIds, true)

      // Assert
      expect(mockLicenseRepo.findById).toHaveBeenCalledTimes(2)
      expect(mockLicenseRepo.bulkUpdateWhitelistStatus).not.toHaveBeenCalled()
      expect(result).toEqual({
        success: false,
        updated: 0,
        errors: ["License 'NONEXISTENT1' not found", "License 'NONEXISTENT2' not found"]
      })
    })

    it('should return error when partial update occurs', async () => {
      // Arrange
      const licenseIds = ['MIT', 'Apache-2.0', 'GPL-3.0']
      vi.mocked(mockLicenseRepo.findById)
        .mockResolvedValueOnce(mockLicenses[0])
        .mockResolvedValueOnce(mockLicenses[1])
        .mockResolvedValueOnce(mockLicenses[2])
      vi.mocked(mockLicenseRepo.bulkUpdateWhitelistStatus).mockResolvedValue(2) // Only 2 out of 3 updated

      // Act
      const result = await licenseService.bulkUpdateWhitelistStatus(licenseIds, true)

      // Assert
      expect(mockLicenseRepo.findById).toHaveBeenCalledTimes(3)
      expect(mockLicenseRepo.bulkUpdateWhitelistStatus).toHaveBeenCalledWith(licenseIds, true)
      expect(result).toEqual({
        success: false,
        updated: 2,
        errors: ['Some licenses failed to update (unexpected partial update)']
      })
    })

    it('should handle empty license array', async () => {
      // Arrange
      const licenseIds: string[] = []
      vi.mocked(mockLicenseRepo.bulkUpdateWhitelistStatus).mockResolvedValue(0)

      // Act
      const result = await licenseService.bulkUpdateWhitelistStatus(licenseIds, true)

      // Assert
      expect(mockLicenseRepo.findById).not.toHaveBeenCalled()
      expect(mockLicenseRepo.bulkUpdateWhitelistStatus).toHaveBeenCalledWith(licenseIds, true)
      expect(result).toEqual({
        success: true,
        updated: 0,
        errors: []
      })
    })

    it('should validate all licenses before attempting update', async () => {
      // Arrange
      const licenseIds = ['MIT', 'NONEXISTENT', 'Apache-2.0']
      vi.mocked(mockLicenseRepo.findById)
        .mockResolvedValueOnce(mockLicenses[0])
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockLicenses[1])

      // Act
      const result = await licenseService.bulkUpdateWhitelistStatus(licenseIds, true)

      // Assert
      expect(mockLicenseRepo.findById).toHaveBeenCalledTimes(3)
      expect(mockLicenseRepo.bulkUpdateWhitelistStatus).not.toHaveBeenCalled()
      expect(result.success).toBe(false)
      expect(result.errors).toContain("License 'NONEXISTENT' not found")
    })

    it('should handle repository errors from findById', async () => {
      // Arrange
      const licenseIds = ['MIT']
      const error = new Error('Database error')
      vi.mocked(mockLicenseRepo.findById).mockRejectedValue(error)

      // Act
      const result = await licenseService.bulkUpdateWhitelistStatus(licenseIds, true)

      // Assert
      expect(result).toEqual({
        success: false,
        updated: 0,
        errors: ['Database error']
      })
      expect(mockLicenseRepo.bulkUpdateWhitelistStatus).not.toHaveBeenCalled()
    })

    it('should handle repository errors from bulkUpdateWhitelistStatus', async () => {
      // Arrange
      const licenseIds = ['MIT', 'Apache-2.0']
      vi.mocked(mockLicenseRepo.findById)
        .mockResolvedValueOnce(mockLicenses[0])
        .mockResolvedValueOnce(mockLicenses[1])
      const error = new Error('Bulk update failed')
      vi.mocked(mockLicenseRepo.bulkUpdateWhitelistStatus).mockRejectedValue(error)

      // Act
      const result = await licenseService.bulkUpdateWhitelistStatus(licenseIds, true)

      // Assert
      expect(result).toEqual({
        success: false,
        updated: 0,
        errors: ['Bulk update failed']
      })
    })
  })

  describe('isWhitelisted()', () => {
    it('should return true when license is whitelisted', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.isWhitelisted).mockResolvedValue(true)

      // Act
      const result = await licenseService.isWhitelisted('MIT')

      // Assert
      expect(mockLicenseRepo.isWhitelisted).toHaveBeenCalledWith('MIT')
      expect(result).toBe(true)
    })

    it('should return false when license is not whitelisted', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.isWhitelisted).mockResolvedValue(false)

      // Act
      const result = await licenseService.isWhitelisted('GPL-3.0')

      // Assert
      expect(mockLicenseRepo.isWhitelisted).toHaveBeenCalledWith('GPL-3.0')
      expect(result).toBe(false)
    })

    it('should propagate repository errors', async () => {
      // Arrange
      const error = new Error('Query failed')
      vi.mocked(mockLicenseRepo.isWhitelisted).mockRejectedValue(error)

      // Act & Assert
      await expect(licenseService.isWhitelisted('MIT')).rejects.toThrow('Query failed')
    })
  })

  describe('exists()', () => {
    it('should return true when license exists', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.exists).mockResolvedValue(true)

      // Act
      const result = await licenseService.exists('MIT')

      // Assert
      expect(mockLicenseRepo.exists).toHaveBeenCalledWith('MIT')
      expect(result).toBe(true)
    })

    it('should return false when license does not exist', async () => {
      // Arrange
      vi.mocked(mockLicenseRepo.exists).mockResolvedValue(false)

      // Act
      const result = await licenseService.exists('NONEXISTENT')

      // Assert
      expect(mockLicenseRepo.exists).toHaveBeenCalledWith('NONEXISTENT')
      expect(result).toBe(false)
    })

    it('should propagate repository errors', async () => {
      // Arrange
      const error = new Error('Database connection lost')
      vi.mocked(mockLicenseRepo.exists).mockRejectedValue(error)

      // Act & Assert
      await expect(licenseService.exists('MIT')).rejects.toThrow('Database connection lost')
    })
  })
})
