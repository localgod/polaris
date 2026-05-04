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
      id: 'MIT', name: 'MIT License', spdxId: 'MIT', osiApproved: true,
      url: 'https://opensource.org/licenses/MIT', category: 'Permissive',
      text: 'MIT License text...', deprecated: false, allowed: true,
      createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', componentCount: 150
    },
    {
      id: 'Apache-2.0', name: 'Apache License 2.0', spdxId: 'Apache-2.0', osiApproved: true,
      url: 'https://opensource.org/licenses/Apache-2.0', category: 'Permissive',
      text: 'Apache License text...', deprecated: false, allowed: true,
      createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', componentCount: 100
    },
    {
      id: 'GPL-3.0', name: 'GNU General Public License v3.0', spdxId: 'GPL-3.0', osiApproved: true,
      url: 'https://opensource.org/licenses/GPL-3.0', category: 'Copyleft',
      text: 'GPL License text...', deprecated: false, allowed: false,
      createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', componentCount: 50
    }
  ]

  const mockStatistics = {
    total: 100,
    byCategory: { 'Permissive': 60, 'Copyleft': 30, 'Proprietary': 10 },
    osiApproved: 80,
    deprecated: 5
  }

  beforeEach(() => {
    vi.clearAllMocks()
    service = new LicenseService()
  })

  describe('getStatistics()', () => {
    it('should merge allowed count from getAllowedLicenses into statistics', async () => {
      vi.mocked(LicenseRepository.prototype.getStatistics).mockResolvedValue(mockStatistics)
      vi.mocked(LicenseRepository.prototype.getAllowedLicenses).mockResolvedValue(mockLicenses.filter(l => l.allowed))

      const result = await service.getStatistics()

      expect(result).toEqual({
        total: 100,
        byCategory: { 'Permissive': 60, 'Copyleft': 30, 'Proprietary': 10 },
        osiApproved: 80, deprecated: 5, allowed: 2
      })
    })

    it('should return zero allowed count when no licenses are allowed', async () => {
      vi.mocked(LicenseRepository.prototype.getStatistics).mockResolvedValue(mockStatistics)
      vi.mocked(LicenseRepository.prototype.getAllowedLicenses).mockResolvedValue([])

      expect((await service.getStatistics()).allowed).toBe(0)
    })
  })

  describe('updateAllowedStatus()', () => {
    it('should throw 404 when license does not exist', async () => {
      vi.mocked(LicenseRepository.prototype.findById).mockResolvedValue(null)

      await expect(service.updateAllowedStatus('NONEXISTENT', true))
        .rejects.toThrow("License 'NONEXISTENT' not found")
      expect(LicenseRepository.prototype.updateAllowedStatus).not.toHaveBeenCalled()
    })

    it('should throw when repository update returns false', async () => {
      vi.mocked(LicenseRepository.prototype.findById).mockResolvedValue(mockLicenses[0])
      vi.mocked(LicenseRepository.prototype.updateAllowedStatus).mockResolvedValue(false)

      await expect(service.updateAllowedStatus('MIT', true))
        .rejects.toThrow("Failed to update allowed status for license 'MIT'")
    })

    it('should return true on successful update', async () => {
      vi.mocked(LicenseRepository.prototype.findById).mockResolvedValue(mockLicenses[2])
      vi.mocked(LicenseRepository.prototype.updateAllowedStatus).mockResolvedValue(true)

      expect(await service.updateAllowedStatus('GPL-3.0', true)).toBe(true)
    })
  })

  describe('bulkUpdateAllowedStatus()', () => {
    it('should return success when all licenses exist and update succeeds', async () => {
      vi.mocked(LicenseRepository.prototype.findById)
        .mockResolvedValueOnce(mockLicenses[0]).mockResolvedValueOnce(mockLicenses[1])
      vi.mocked(LicenseRepository.prototype.bulkUpdateAllowedStatus).mockResolvedValue(2)

      expect(await service.bulkUpdateAllowedStatus(['MIT', 'Apache-2.0'], false))
        .toEqual({ success: true, updated: 2, errors: [] })
    })

    it('should return errors without calling bulk update when a license is missing', async () => {
      vi.mocked(LicenseRepository.prototype.findById)
        .mockResolvedValueOnce(mockLicenses[0]).mockResolvedValueOnce(null)

      const result = await service.bulkUpdateAllowedStatus(['MIT', 'NONEXISTENT'], true)

      expect(LicenseRepository.prototype.bulkUpdateAllowedStatus).not.toHaveBeenCalled()
      expect(result).toEqual({ success: false, updated: 0, errors: ["License 'NONEXISTENT' not found"] })
    })

    it('should collect errors for all missing licenses before aborting', async () => {
      vi.mocked(LicenseRepository.prototype.findById)
        .mockResolvedValueOnce(null).mockResolvedValueOnce(null)

      const result = await service.bulkUpdateAllowedStatus(['NONEXISTENT1', 'NONEXISTENT2'], true)

      expect(result.errors).toEqual(["License 'NONEXISTENT1' not found", "License 'NONEXISTENT2' not found"])
    })

    it('should return error on partial update (count mismatch)', async () => {
      vi.mocked(LicenseRepository.prototype.findById)
        .mockResolvedValueOnce(mockLicenses[0]).mockResolvedValueOnce(mockLicenses[1]).mockResolvedValueOnce(mockLicenses[2])
      vi.mocked(LicenseRepository.prototype.bulkUpdateAllowedStatus).mockResolvedValue(2)

      const result = await service.bulkUpdateAllowedStatus(['MIT', 'Apache-2.0', 'GPL-3.0'], true)

      expect(result).toEqual({ success: false, updated: 2, errors: ['Some licenses failed to update (unexpected partial update)'] })
    })

    it('should short-circuit on empty input without touching the repository', async () => {
      const result = await service.bulkUpdateAllowedStatus([], true)

      expect(LicenseRepository.prototype.findById).not.toHaveBeenCalled()
      expect(LicenseRepository.prototype.bulkUpdateAllowedStatus).not.toHaveBeenCalled()
      expect(result).toEqual({ success: true, updated: 0, errors: [] })
    })

    it('should wrap findById errors per-license and abort bulk update', async () => {
      vi.mocked(LicenseRepository.prototype.findById).mockRejectedValue(new Error('Database error'))

      const result = await service.bulkUpdateAllowedStatus(['MIT'], true)

      expect(result).toEqual({ success: false, updated: 0, errors: ["License 'MIT': Database error"] })
      expect(LicenseRepository.prototype.bulkUpdateAllowedStatus).not.toHaveBeenCalled()
    })

    it('should wrap bulk update errors in the result', async () => {
      vi.mocked(LicenseRepository.prototype.findById)
        .mockResolvedValueOnce(mockLicenses[0]).mockResolvedValueOnce(mockLicenses[1])
      vi.mocked(LicenseRepository.prototype.bulkUpdateAllowedStatus).mockRejectedValue(new Error('Bulk update failed'))

      expect(await service.bulkUpdateAllowedStatus(['MIT', 'Apache-2.0'], true))
        .toEqual({ success: false, updated: 0, errors: ['Bulk update failed'] })
    })
  })
})
