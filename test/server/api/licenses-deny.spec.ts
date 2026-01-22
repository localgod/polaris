import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PolicyRepository } from '../../../server/repositories/policy.repository'
import type { Policy } from '../../../server/repositories/policy.repository'

// Mock the repositories
vi.mock('../../../server/repositories/policy.repository')
vi.mock('../../../server/repositories/audit-log.repository')

const mockOrgLicensePolicy: Policy = {
  name: 'Organization License Policy',
  description: 'Organization-wide license policy',
  ruleType: 'license-compliance',
  severity: 'error',
  status: 'active',
  scope: 'organization',
  effectiveDate: null,
  expiryDate: null,
  enforcedBy: null,
  licenseMode: 'denylist',
  enforcerTeam: null,
  subjectTeams: [],
  governedTechnologies: [],
  governedVersions: [],
  allowedLicenses: [],
  deniedLicenses: ['GPL-3.0']
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/licenses/{id}/deny', () => {
  describe('Happy Paths', () => {
    it('should deny a license and return success', async () => {
      vi.mocked(PolicyRepository.prototype.getOrCreateOrgLicensePolicy).mockResolvedValue(mockOrgLicensePolicy)
      vi.mocked(PolicyRepository.prototype.denyLicense).mockResolvedValue({
        added: true,
        policy: { ...mockOrgLicensePolicy, deniedLicenses: ['GPL-3.0', 'MIT'] }
      })

      const policyRepo = new PolicyRepository()
      const result = await policyRepo.denyLicense('MIT')

      expect(result.added).toBe(true)
      expect(result.policy.deniedLicenses).toContain('MIT')
    })

    it('should return added=false if license already denied', async () => {
      vi.mocked(PolicyRepository.prototype.getOrCreateOrgLicensePolicy).mockResolvedValue(mockOrgLicensePolicy)
      vi.mocked(PolicyRepository.prototype.denyLicense).mockResolvedValue({
        added: false,
        policy: mockOrgLicensePolicy
      })

      const policyRepo = new PolicyRepository()
      const result = await policyRepo.denyLicense('GPL-3.0')

      expect(result.added).toBe(false)
    })

    it('should create Organization License Policy if not exists', async () => {
      vi.mocked(PolicyRepository.prototype.getOrCreateOrgLicensePolicy).mockResolvedValue(mockOrgLicensePolicy)

      const policyRepo = new PolicyRepository()
      const policy = await policyRepo.getOrCreateOrgLicensePolicy()

      expect(policy.name).toBe('Organization License Policy')
      expect(policy.ruleType).toBe('license-compliance')
      expect(policy.licenseMode).toBe('denylist')
    })
  })
})

describe('POST /api/licenses/{id}/allow', () => {
  describe('Happy Paths', () => {
    it('should allow a previously denied license', async () => {
      vi.mocked(PolicyRepository.prototype.allowLicense).mockResolvedValue({
        removed: true,
        policy: { ...mockOrgLicensePolicy, deniedLicenses: [] }
      })

      const policyRepo = new PolicyRepository()
      const result = await policyRepo.allowLicense('GPL-3.0')

      expect(result.removed).toBe(true)
      expect(result.policy.deniedLicenses).not.toContain('GPL-3.0')
    })

    it('should return removed=false if license was not denied', async () => {
      vi.mocked(PolicyRepository.prototype.allowLicense).mockResolvedValue({
        removed: false,
        policy: mockOrgLicensePolicy
      })

      const policyRepo = new PolicyRepository()
      const result = await policyRepo.allowLicense('MIT')

      expect(result.removed).toBe(false)
    })
  })
})

describe('GET /api/licenses/denied', () => {
  describe('Happy Paths', () => {
    it('should return list of denied licenses', async () => {
      vi.mocked(PolicyRepository.prototype.getDeniedLicenseIds).mockResolvedValue(['GPL-3.0', 'AGPL-3.0'])

      const policyRepo = new PolicyRepository()
      const result = await policyRepo.getDeniedLicenseIds()

      expect(Array.isArray(result)).toBe(true)
      expect(result).toContain('GPL-3.0')
      expect(result).toContain('AGPL-3.0')
    })

    it('should return empty array when no licenses denied', async () => {
      vi.mocked(PolicyRepository.prototype.getDeniedLicenseIds).mockResolvedValue([])

      const policyRepo = new PolicyRepository()
      const result = await policyRepo.getDeniedLicenseIds()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })
  })
})

describe('License denial status check', () => {
  it('should return true for denied license', async () => {
    vi.mocked(PolicyRepository.prototype.isLicenseDenied).mockResolvedValue(true)

    const policyRepo = new PolicyRepository()
    const result = await policyRepo.isLicenseDenied('GPL-3.0')

    expect(result).toBe(true)
  })

  it('should return false for non-denied license', async () => {
    vi.mocked(PolicyRepository.prototype.isLicenseDenied).mockResolvedValue(false)

    const policyRepo = new PolicyRepository()
    const result = await policyRepo.isLicenseDenied('MIT')

    expect(result).toBe(false)
  })
})
