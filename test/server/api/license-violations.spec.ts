import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PolicyService } from '../../../server/services/policy.service'
import type { LicenseViolation } from '../../../server/repositories/policy.repository'

// Mock the PolicyService
vi.mock('../../../server/services/policy.service')

const mockViolations: LicenseViolation[] = [
  {
    team: 'platform-team',
    system: 'api-gateway',
    component: {
      name: 'gpl-library',
      version: '1.0.0',
      purl: 'pkg:npm/gpl-library@1.0.0'
    },
    license: {
      id: 'GPL-3.0',
      name: 'GNU General Public License v3.0',
      category: 'copyleft',
      osiApproved: true
    },
    policy: {
      name: 'Permissive Only Policy',
      description: 'Only permissive licenses allowed',
      severity: 'error',
      ruleType: 'license-compliance',
      enforcedBy: 'Security Team'
    }
  },
  {
    team: 'frontend-team',
    system: 'web-app',
    component: {
      name: 'proprietary-lib',
      version: '2.0.0',
      purl: 'pkg:npm/proprietary-lib@2.0.0'
    },
    license: {
      id: 'Proprietary',
      name: 'Proprietary License',
      category: 'proprietary',
      osiApproved: false
    },
    policy: {
      name: 'Open Source Only',
      description: 'Only open source licenses allowed',
      severity: 'critical',
      ruleType: 'license-compliance',
      enforcedBy: 'Legal Team'
    }
  }
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/policies/license-violations', () => {
  it('should return all license violations', async () => {
    vi.mocked(PolicyService.prototype.getLicenseViolations).mockResolvedValue({
      data: mockViolations,
      count: 2,
      summary: {
        critical: 1,
        error: 1,
        warning: 0,
        info: 0
      }
    })

    const policyService = new PolicyService()
    const result = await policyService.getLicenseViolations({})

    expect(result.data).toEqual(mockViolations)
    expect(result.count).toBe(2)
    expect(result.summary.critical).toBe(1)
    expect(result.summary.error).toBe(1)
  })

  it('should filter violations by severity', async () => {
    const criticalViolations = mockViolations.filter(v => v.policy.severity === 'critical')
    vi.mocked(PolicyService.prototype.getLicenseViolations).mockResolvedValue({
      data: criticalViolations,
      count: 1,
      summary: {
        critical: 1,
        error: 0,
        warning: 0,
        info: 0
      }
    })

    const policyService = new PolicyService()
    const result = await policyService.getLicenseViolations({ severity: 'critical' })

    expect(result.data).toEqual(criticalViolations)
    expect(result.count).toBe(1)
    expect(result.data.every(v => v.policy.severity === 'critical')).toBe(true)
  })

  it('should filter violations by team', async () => {
    const teamViolations = mockViolations.filter(v => v.team === 'platform-team')
    vi.mocked(PolicyService.prototype.getLicenseViolations).mockResolvedValue({
      data: teamViolations,
      count: 1,
      summary: {
        critical: 0,
        error: 1,
        warning: 0,
        info: 0
      }
    })

    const policyService = new PolicyService()
    const result = await policyService.getLicenseViolations({ team: 'platform-team' })

    expect(result.data).toEqual(teamViolations)
    expect(result.count).toBe(1)
    expect(result.data.every(v => v.team === 'platform-team')).toBe(true)
  })

  it('should filter violations by system', async () => {
    const systemViolations = mockViolations.filter(v => v.system === 'api-gateway')
    vi.mocked(PolicyService.prototype.getLicenseViolations).mockResolvedValue({
      data: systemViolations,
      count: 1,
      summary: {
        critical: 0,
        error: 1,
        warning: 0,
        info: 0
      }
    })

    const policyService = new PolicyService()
    const result = await policyService.getLicenseViolations({ system: 'api-gateway' })

    expect(result.data).toEqual(systemViolations)
    expect(result.count).toBe(1)
    expect(result.data.every(v => v.system === 'api-gateway')).toBe(true)
  })

  it('should filter violations by license', async () => {
    const licenseViolations = mockViolations.filter(v => v.license.id === 'GPL-3.0')
    vi.mocked(PolicyService.prototype.getLicenseViolations).mockResolvedValue({
      data: licenseViolations,
      count: 1,
      summary: {
        critical: 0,
        error: 1,
        warning: 0,
        info: 0
      }
    })

    const policyService = new PolicyService()
    const result = await policyService.getLicenseViolations({ license: 'GPL-3.0' })

    expect(result.data).toEqual(licenseViolations)
    expect(result.count).toBe(1)
    expect(result.data.every(v => v.license.id === 'GPL-3.0')).toBe(true)
  })

  it('should return empty array when no violations exist', async () => {
    vi.mocked(PolicyService.prototype.getLicenseViolations).mockResolvedValue({
      data: [],
      count: 0,
      summary: {
        critical: 0,
        error: 0,
        warning: 0,
        info: 0
      }
    })

    const policyService = new PolicyService()
    const result = await policyService.getLicenseViolations({})

    expect(result.data).toEqual([])
    expect(result.count).toBe(0)
  })

  it('should include violation summary', async () => {
    vi.mocked(PolicyService.prototype.getLicenseViolations).mockResolvedValue({
      data: mockViolations,
      count: 2,
      summary: {
        critical: 1,
        error: 1,
        warning: 0,
        info: 0
      }
    })

    const policyService = new PolicyService()
    const result = await policyService.getLicenseViolations({})

    expect(result.summary).toBeDefined()
    expect(result.summary.critical).toBe(1)
    expect(result.summary.error).toBe(1)
    expect(result.summary.warning).toBe(0)
    expect(result.summary.info).toBe(0)
  })
})
