import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ViolationService } from '../../../server/services/violation.service'
import { ViolationRepository } from '../../../server/repositories/violation.repository'
import { LicenseRepository } from '../../../server/repositories/license.repository'
import { ComplianceRepository } from '../../../server/repositories/compliance.repository'
import { VersionConstraintService } from '../../../server/services/version-constraint.service'
import '../../fixtures/service-test-helper'

vi.mock('../../../server/repositories/violation.repository')
vi.mock('../../../server/repositories/license.repository')
vi.mock('../../../server/repositories/compliance.repository')
vi.mock('../../../server/services/version-constraint.service')

describe('[contract] ViolationService.reconcileAll()', () => {
  let service: ViolationService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ViolationService()
  })

  it('fetches all three violation types with directOnly and includeWaived both true, and reconciles each', async () => {
    vi.mocked(LicenseRepository.prototype.findViolations).mockResolvedValue({
      data: [{
        teamName: 'Platform', systemName: 'checkout', systemBusinessCriticality: null, systemEnvironment: null,
        componentName: 'left-pad', componentVersion: '1.0.0', componentPurl: 'pkg:npm/left-pad@1.0.0',
        licenseId: 'gpl-3.0', licenseName: 'GPL 3.0', licenseCategory: 'copyleft', waiver: null
      }],
      total: 1
    })
    vi.mocked(ComplianceRepository.prototype.findViolations).mockResolvedValue([{
      team: 'Platform', technology: 'jQuery', type: 'library', systemCount: 1, systems: ['checkout'],
      violationType: 'unapproved', notes: null, migrationTarget: null, waiver: null
    }])
    vi.mocked(VersionConstraintService.prototype.getViolations).mockResolvedValue({
      data: [{
        team: 'Platform', system: 'checkout', systemBusinessCriticality: null, systemEnvironment: null,
        component: 'node', componentVersion: '18.0.0', componentPurl: 'pkg:npm/node@18.0.0',
        technology: 'Node.js', technologyType: 'runtime',
        constraint: { name: 'node-policy', description: '', severity: 'error', versionRange: '>=20.0.0' },
        waiver: null
      }],
      count: 1,
      summary: { critical: 0, error: 1, warning: 0, info: 0 }
    })

    vi.mocked(ViolationRepository.prototype.reconcileLicenseViolations).mockResolvedValue({ touched: 1, resolved: 0 })
    vi.mocked(ViolationRepository.prototype.reconcileComplianceViolations).mockResolvedValue({ touched: 1, resolved: 0 })
    vi.mocked(ViolationRepository.prototype.reconcileVersionConstraintViolations).mockResolvedValue({ touched: 1, resolved: 0 })

    const summary = await service.reconcileAll()

    expect(summary).toEqual({
      license: { touched: 1, resolved: 0 },
      compliance: { touched: 1, resolved: 0 },
      versionConstraint: { touched: 1, resolved: 0 }
    })

    // includeWaived must be true — the reconciler needs to see waived
    // violations too, since waiving doesn't mean the condition resolved.
    expect(LicenseRepository.prototype.findViolations).toHaveBeenCalledWith({ directOnly: true, includeWaived: true })
    expect(ComplianceRepository.prototype.findViolations).toHaveBeenCalledWith({ directOnly: true, includeWaived: true })
    expect(VersionConstraintService.prototype.getViolations).toHaveBeenCalledWith({ directOnly: true, includeWaived: true })

    expect(ViolationRepository.prototype.reconcileLicenseViolations).toHaveBeenCalledWith(
      [{ systemName: 'checkout', componentPurl: 'pkg:npm/left-pad@1.0.0', licenseId: 'gpl-3.0' }],
      expect.any(String)
    )
    expect(ViolationRepository.prototype.reconcileComplianceViolations).toHaveBeenCalledWith(
      [{ teamName: 'Platform', technologyName: 'jQuery' }],
      expect.any(String)
    )
    expect(ViolationRepository.prototype.reconcileVersionConstraintViolations).toHaveBeenCalledWith(
      [{ systemName: 'checkout', componentPurl: 'pkg:npm/node@18.0.0', constraintName: 'node-policy' }],
      expect.any(String)
    )
  })

  it('falls back to a name@version-derived purl when a license violation has no componentPurl', async () => {
    vi.mocked(LicenseRepository.prototype.findViolations).mockResolvedValue({
      data: [{
        teamName: 'Platform', systemName: 'checkout', systemBusinessCriticality: null, systemEnvironment: null,
        componentName: 'left-pad', componentVersion: '1.0.0', componentPurl: null,
        licenseId: 'gpl-3.0', licenseName: 'GPL 3.0', licenseCategory: 'copyleft', waiver: null
      }],
      total: 1
    })
    vi.mocked(ComplianceRepository.prototype.findViolations).mockResolvedValue([])
    vi.mocked(VersionConstraintService.prototype.getViolations).mockResolvedValue({ data: [], count: 0, summary: { critical: 0, error: 0, warning: 0, info: 0 } })
    vi.mocked(ViolationRepository.prototype.reconcileLicenseViolations).mockResolvedValue({ touched: 1, resolved: 0 })
    vi.mocked(ViolationRepository.prototype.reconcileComplianceViolations).mockResolvedValue({ touched: 0, resolved: 0 })
    vi.mocked(ViolationRepository.prototype.reconcileVersionConstraintViolations).mockResolvedValue({ touched: 0, resolved: 0 })

    await service.reconcileAll()

    expect(ViolationRepository.prototype.reconcileLicenseViolations).toHaveBeenCalledWith(
      [{ systemName: 'checkout', componentPurl: 'left-pad@1.0.0', licenseId: 'gpl-3.0' }],
      expect.any(String)
    )
  })
})
