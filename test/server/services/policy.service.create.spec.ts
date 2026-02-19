import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PolicyService } from '../../../server/services/policy.service'
import { PolicyRepository } from '../../../server/repositories/policy.repository'
import '../../fixtures/service-test-helper'

vi.mock('../../../server/repositories/policy.repository')

describe('PolicyService - create()', () => {
  let service: PolicyService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PolicyService()
  })

  it('should create a version-constraint policy', async () => {
    vi.mocked(PolicyRepository.prototype.exists).mockResolvedValue(false)
    vi.mocked(PolicyRepository.prototype.create).mockResolvedValue({
      policy: {
        name: 'test-policy', description: 'Test', ruleType: 'version-constraint',
        severity: 'warning', status: 'active', scope: 'organization',
        licenseMode: null, allowedLicenses: [], deniedLicenses: [],
        enforcedBy: null, createdAt: '', updatedAt: ''
      },
      relationshipsCreated: 2
    })

    const result = await service.create({
      name: 'test-policy', description: 'Test',
      ruleType: 'version-constraint', severity: 'warning', scope: 'organization',
      versionRange: '>=18.0.0'
    })

    expect(result.policy.name).toBe('test-policy')
    expect(result.policy.ruleType).toBe('version-constraint')
    expect(PolicyRepository.prototype.exists).toHaveBeenCalledOnce()
    expect(PolicyRepository.prototype.create).toHaveBeenCalledOnce()
  })

  it('should throw if policy name already exists', async () => {
    vi.mocked(PolicyRepository.prototype.exists).mockResolvedValue(true)

    await expect(
      service.create({ name: 'existing', ruleType: 'version-constraint', severity: 'warning', versionRange: '>=1.0.0' })
    ).rejects.toThrow()

    expect(PolicyRepository.prototype.create).not.toHaveBeenCalled()
  })

  it('should throw if ruleType is invalid', async () => {
    vi.mocked(PolicyRepository.prototype.exists).mockResolvedValue(false)

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.create({ name: 'bad-rule', ruleType: 'invalid' as any, severity: 'warning' })
    ).rejects.toThrow()

    expect(PolicyRepository.prototype.create).not.toHaveBeenCalled()
  })

  it('should throw if severity is invalid', async () => {
    vi.mocked(PolicyRepository.prototype.exists).mockResolvedValue(false)

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.create({ name: 'bad-sev', ruleType: 'version-constraint', severity: 'invalid' as any, versionRange: '>=1.0.0' })
    ).rejects.toThrow()

    expect(PolicyRepository.prototype.create).not.toHaveBeenCalled()
  })

  it('should create a license-compliance policy with denylist', async () => {
    vi.mocked(PolicyRepository.prototype.exists).mockResolvedValue(false)
    vi.mocked(PolicyRepository.prototype.create).mockResolvedValue({
      policy: {
        name: 'deny-gpl', description: 'Deny GPL', ruleType: 'license-compliance',
        severity: 'error', status: 'active', scope: 'organization',
        licenseMode: 'denylist', allowedLicenses: [], deniedLicenses: ['GPL-3.0'],
        enforcedBy: null, createdAt: '', updatedAt: ''
      },
      relationshipsCreated: 3
    })

    const result = await service.create({
      name: 'deny-gpl', ruleType: 'license-compliance', severity: 'error',
      licenseMode: 'denylist', deniedLicenses: ['GPL-3.0']
    })

    expect(result.policy.licenseMode).toBe('denylist')
    expect(result.policy.deniedLicenses).toContain('GPL-3.0')
  })

  it('should throw if denylist mode has no denied licenses', async () => {
    vi.mocked(PolicyRepository.prototype.exists).mockResolvedValue(false)

    await expect(
      service.create({
        name: 'bad-deny', ruleType: 'license-compliance', severity: 'error',
        licenseMode: 'denylist', deniedLicenses: []
      })
    ).rejects.toThrow()
  })

  it('should throw if allowlist mode has no allowed licenses', async () => {
    vi.mocked(PolicyRepository.prototype.exists).mockResolvedValue(false)

    await expect(
      service.create({
        name: 'bad-allow', ruleType: 'license-compliance', severity: 'error',
        licenseMode: 'allowlist', allowedLicenses: []
      })
    ).rejects.toThrow()
  })

  it('should create a license-compliance policy with allowlist', async () => {
    vi.mocked(PolicyRepository.prototype.exists).mockResolvedValue(false)
    vi.mocked(PolicyRepository.prototype.create).mockResolvedValue({
      policy: {
        name: 'allow-mit', description: null, ruleType: 'license-compliance',
        severity: 'error', status: 'active', scope: 'organization',
        licenseMode: 'allowlist', allowedLicenses: ['MIT'], deniedLicenses: [],
        enforcedBy: null, createdAt: '', updatedAt: ''
      },
      relationshipsCreated: 3
    })

    const result = await service.create({
      name: 'allow-mit', ruleType: 'license-compliance', severity: 'error',
      licenseMode: 'allowlist', allowedLicenses: ['MIT']
    })

    expect(result.policy.licenseMode).toBe('allowlist')
    expect(result.policy.allowedLicenses).toContain('MIT')
  })

  it('should default status to active', async () => {
    vi.mocked(PolicyRepository.prototype.exists).mockResolvedValue(false)
    vi.mocked(PolicyRepository.prototype.create).mockResolvedValue({
      policy: {
        name: 'default-status', description: null, ruleType: 'version-constraint',
        severity: 'info', status: 'active', scope: 'organization',
        licenseMode: null, allowedLicenses: [], deniedLicenses: [],
        enforcedBy: null, createdAt: '', updatedAt: ''
      },
      relationshipsCreated: 0
    })

    const result = await service.create({
      name: 'default-status', ruleType: 'version-constraint', severity: 'info',
      versionRange: '>=1.0.0'
    })

    expect(result.policy.status).toBe('active')
  })

  it('should propagate repository errors', async () => {
    vi.mocked(PolicyRepository.prototype.exists).mockResolvedValue(false)
    vi.mocked(PolicyRepository.prototype.create).mockRejectedValue(new Error('DB error'))

    await expect(
      service.create({ name: 'fail', ruleType: 'version-constraint', severity: 'warning', versionRange: '>=1.0.0' })
    ).rejects.toThrow('DB error')
  })
})
