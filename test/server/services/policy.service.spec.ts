import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PolicyService } from '../../../server/services/policy.service'
import { PolicyRepository } from '../../../server/repositories/policy.repository'
import '../../fixtures/service-test-helper'

vi.mock('../../../server/repositories/policy.repository')

const mockPolicy = {
  name: 'test-policy', description: 'Test', ruleType: 'compliance',
  severity: 'warning', status: 'active', scope: 'organization',
  licenseMode: null, allowedLicenses: [], deniedLicenses: [],
  enforcedBy: null, createdAt: '', updatedAt: ''
}

describe('PolicyService', () => {
  let service: PolicyService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PolicyService()
  })

  describe('findAll()', () => {
    it('should return policies with count', async () => {
      vi.mocked(PolicyRepository.prototype.findAll).mockResolvedValue([mockPolicy as any])

      const result = await service.findAll()

      expect(result.data).toHaveLength(1)
      expect(result.count).toBe(1)
      expect(PolicyRepository.prototype.findAll).toHaveBeenCalledOnce()
    })

    it('should pass filters to repository', async () => {
      vi.mocked(PolicyRepository.prototype.findAll).mockResolvedValue([])

      await service.findAll({ status: 'active' })

      expect(PolicyRepository.prototype.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      )
    })
  })

  describe('findByName()', () => {
    it('should return policy when found', async () => {
      vi.mocked(PolicyRepository.prototype.findByName).mockResolvedValue(mockPolicy as any)

      const result = await service.findByName('test-policy')

      expect(result).not.toBeNull()
      expect(result!.name).toBe('test-policy')
    })

    it('should return null when not found', async () => {
      vi.mocked(PolicyRepository.prototype.findByName).mockResolvedValue(null)

      expect(await service.findByName('nonexistent')).toBeNull()
    })
  })

  describe('delete()', () => {
    it('should delete existing policy', async () => {
      vi.mocked(PolicyRepository.prototype.exists).mockResolvedValue(true)
      vi.mocked(PolicyRepository.prototype.delete).mockResolvedValue(undefined)

      await service.delete('test-policy')

      expect(PolicyRepository.prototype.delete).toHaveBeenCalledWith('test-policy')
    })

    it('should throw when policy does not exist', async () => {
      vi.mocked(PolicyRepository.prototype.exists).mockResolvedValue(false)

      await expect(service.delete('nonexistent')).rejects.toThrow()
      expect(PolicyRepository.prototype.delete).not.toHaveBeenCalled()
    })
  })

  describe('getLicenseViolations()', () => {
    it('should return violations with summary', async () => {
      const violation = {
        team: 'Team A', system: 'System 1',
        component: { name: 'pkg', version: '1.0.0', purl: 'pkg:npm/pkg@1.0.0' },
        license: { id: 'GPL-3.0', name: 'GPL-3.0', category: 'copyleft', osiApproved: true },
        policy: { name: 'No GPL', description: '', severity: 'error', ruleType: 'license-compliance', enforcedBy: null }
      }

      vi.mocked(PolicyRepository.prototype.findLicenseViolations).mockResolvedValue([violation as any])

      const result = await service.getLicenseViolations({})

      expect(result.data).toHaveLength(1)
      expect(result.count).toBe(1)
      expect(result.summary).toBeDefined()
      expect(result.summary.error).toBe(1)
    })

    it('should return empty result when no violations', async () => {
      vi.mocked(PolicyRepository.prototype.findLicenseViolations).mockResolvedValue([])

      const result = await service.getLicenseViolations({})

      expect(result.data).toEqual([])
      expect(result.count).toBe(0)
    })
  })
})
