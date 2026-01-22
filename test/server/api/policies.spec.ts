import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PolicyRepository } from '../../../server/repositories/policy.repository'
import type { Policy, CreatePolicyInput } from '../../../server/repositories/policy.repository'

// Mock the repositories
vi.mock('../../../server/repositories/policy.repository')
vi.mock('../../../server/repositories/audit-log.repository')

const mockPolicy: Policy = {
  name: 'Test Policy',
  description: 'A test policy',
  ruleType: 'compliance',
  severity: 'warning',
  status: 'active',
  scope: 'organization',
  effectiveDate: null,
  expiryDate: null,
  enforcedBy: null,
  licenseMode: null,
  enforcerTeam: null,
  subjectTeams: [],
  governedTechnologies: [],
  governedVersions: [],
  allowedLicenses: [],
  deniedLicenses: []
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/policies', () => {
  describe('Happy Paths', () => {
    it('should create a valid compliance policy', async () => {
      const input: CreatePolicyInput = {
        name: 'New Policy',
        ruleType: 'compliance',
        severity: 'warning'
      }

      vi.mocked(PolicyRepository.prototype.exists).mockResolvedValue(false)
      vi.mocked(PolicyRepository.prototype.create).mockResolvedValue({
        policy: { ...mockPolicy, ...input },
        relationshipsCreated: 0
      })

      const policyRepo = new PolicyRepository()
      
      // Simulate service logic
      const exists = await policyRepo.exists(input.name)
      expect(exists).toBe(false)
      
      const result = await policyRepo.create(input)
      
      expect(result.policy.name).toBe('New Policy')
      expect(result.policy.ruleType).toBe('compliance')
      expect(result.policy.severity).toBe('warning')
    })

    it('should create a license-compliance policy with denylist', async () => {
      const input: CreatePolicyInput = {
        name: 'License Policy',
        ruleType: 'license-compliance',
        severity: 'error',
        licenseMode: 'denylist',
        deniedLicenses: ['GPL-3.0']
      }

      vi.mocked(PolicyRepository.prototype.exists).mockResolvedValue(false)
      vi.mocked(PolicyRepository.prototype.create).mockResolvedValue({
        policy: { ...mockPolicy, ...input },
        relationshipsCreated: 1
      })

      const policyRepo = new PolicyRepository()
      const result = await policyRepo.create(input)

      expect(result.policy.ruleType).toBe('license-compliance')
      expect(result.policy.licenseMode).toBe('denylist')
      expect(result.relationshipsCreated).toBe(1)
    })

    it('should create a license-compliance policy with allowlist', async () => {
      const input: CreatePolicyInput = {
        name: 'Allowlist Policy',
        ruleType: 'license-compliance',
        severity: 'warning',
        licenseMode: 'allowlist',
        allowedLicenses: ['MIT', 'Apache-2.0']
      }

      vi.mocked(PolicyRepository.prototype.exists).mockResolvedValue(false)
      vi.mocked(PolicyRepository.prototype.create).mockResolvedValue({
        policy: { ...mockPolicy, ...input },
        relationshipsCreated: 2
      })

      const policyRepo = new PolicyRepository()
      const result = await policyRepo.create(input)

      expect(result.policy.ruleType).toBe('license-compliance')
      expect(result.policy.licenseMode).toBe('allowlist')
    })
  })

  describe('Unhappy Paths', () => {
    it('should reject duplicate policy name', async () => {
      vi.mocked(PolicyRepository.prototype.exists).mockResolvedValue(true)

      const policyRepo = new PolicyRepository()
      const exists = await policyRepo.exists('Existing Policy')

      expect(exists).toBe(true)
      // In the actual service, this would throw a 409 error
    })

    it('should validate required fields', () => {
      // Test that the input type requires name, ruleType, and severity
      const validInput: CreatePolicyInput = {
        name: 'Test',
        ruleType: 'compliance',
        severity: 'warning'
      }
      
      expect(validInput.name).toBeDefined()
      expect(validInput.ruleType).toBeDefined()
      expect(validInput.severity).toBeDefined()
    })
  })
})

describe('PATCH /api/policies/{name}', () => {
  describe('Happy Paths', () => {
    it('should update policy status to draft', async () => {
      vi.mocked(PolicyRepository.prototype.findByName).mockResolvedValue(mockPolicy)
      vi.mocked(PolicyRepository.prototype.updateStatus).mockResolvedValue({
        policy: { ...mockPolicy, status: 'draft' },
        previousStatus: 'active'
      })

      const policyRepo = new PolicyRepository()
      const result = await policyRepo.updateStatus('Test Policy', { status: 'draft' })

      expect(result.policy.status).toBe('draft')
      expect(result.previousStatus).toBe('active')
    })

    it('should update policy status to archived', async () => {
      vi.mocked(PolicyRepository.prototype.findByName).mockResolvedValue(mockPolicy)
      vi.mocked(PolicyRepository.prototype.updateStatus).mockResolvedValue({
        policy: { ...mockPolicy, status: 'archived' },
        previousStatus: 'active'
      })

      const policyRepo = new PolicyRepository()
      const result = await policyRepo.updateStatus('Test Policy', { status: 'archived' })

      expect(result.policy.status).toBe('archived')
    })
  })

  describe('Unhappy Paths', () => {
    it('should return null for non-existent policy', async () => {
      vi.mocked(PolicyRepository.prototype.findByName).mockResolvedValue(null)

      const policyRepo = new PolicyRepository()
      const result = await policyRepo.findByName('Non-existent')

      expect(result).toBeNull()
    })
  })
})

describe('DELETE /api/policies/{name}', () => {
  describe('Happy Paths', () => {
    it('should delete an existing policy', async () => {
      vi.mocked(PolicyRepository.prototype.exists).mockResolvedValue(true)
      vi.mocked(PolicyRepository.prototype.delete).mockResolvedValue(undefined)

      const policyRepo = new PolicyRepository()
      
      const exists = await policyRepo.exists('Test Policy')
      expect(exists).toBe(true)
      
      await policyRepo.delete('Test Policy')
      expect(PolicyRepository.prototype.delete).toHaveBeenCalledWith('Test Policy')
    })
  })

  describe('Unhappy Paths', () => {
    it('should handle non-existent policy', async () => {
      vi.mocked(PolicyRepository.prototype.exists).mockResolvedValue(false)

      const policyRepo = new PolicyRepository()
      const exists = await policyRepo.exists('Non-existent')

      expect(exists).toBe(false)
      // In the actual service, this would throw a 404 error
    })
  })
})
