import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ScorecardService } from '../../../server/services/scorecard.service'
import { SystemRepository } from '../../../server/repositories/system.repository'
import { TeamRepository } from '../../../server/repositories/team.repository'
import { VersionConstraintRepository } from '../../../server/repositories/version-constraint.repository'
import type { System } from '../../../server/repositories/system.repository'
import type { Team, TeamUsageResult } from '../../../server/repositories/team.repository'
import type { Violation } from '../../../server/repositories/version-constraint.repository'
import '../../fixtures/service-test-helper'

vi.mock('../../../server/repositories/system.repository')
vi.mock('../../../server/repositories/team.repository')
vi.mock('../../../server/repositories/version-constraint.repository')

const mockSystem: System = {
  name: 'checkout-api',
  domain: 'commerce',
  ownerTeam: 'payments-team',
  businessCriticality: 'high',
  environment: 'prod',
  componentCount: 10,
  repositoryCount: 1,
}

const mockTeam: Team = {
  name: 'payments-team',
  email: null,
  responsibilityArea: null,
  technologyCount: 5,
  systemCount: 2,
}

const cleanUsage: TeamUsageResult = {
  team: 'payments-team',
  usage: [],
  summary: { totalTechnologies: 4, compliant: 4, unapproved: 0, violations: 0, migrationNeeded: 0 }
}

const criticalViolation: Violation = {
  team: 'payments-team',
  system: 'checkout-api',
  systemBusinessCriticality: 'high',
  systemEnvironment: 'prod',
  component: 'left-pad',
  componentVersion: '1.0.0',
  technology: 'Node.js',
  technologyType: 'runtime',
  constraint: { name: 'no-legacy-node', description: null, severity: 'critical', versionRange: '>=18.0.0' }
}

function freshDate(): string {
  return new Date().toISOString()
}

function staleDate(): string {
  return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
}

describe('ScorecardService', () => {
  let service: ScorecardService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ScorecardService()
  })

  describe('getSystemScorecard()', () => {
    it('returns null when the system does not exist', async () => {
      vi.mocked(SystemRepository.prototype.findByName).mockResolvedValue(null)

      const result = await service.getSystemScorecard('missing-system')

      expect(result).toBeNull()
    })

    it('passes every check when signals are all clean', async () => {
      vi.mocked(SystemRepository.prototype.findByName).mockResolvedValue(mockSystem)
      vi.mocked(SystemRepository.prototype.getScorecardRaw).mockResolvedValue({
        lastSbomScanAt: freshDate(),
        usedTechnologyCount: 4,
        unclassifiedCount: 0,
        eliminateCount: 0,
        licenseViolationCount: 0,
      })
      vi.mocked(VersionConstraintRepository.prototype.findViolations).mockResolvedValue([])

      const result = await service.getSystemScorecard('checkout-api')

      expect(result).not.toBeNull()
      expect(result!.score).toBe(5)
      expect(result!.maxScore).toBe(5)
      expect(result!.checks.every(check => check.passed)).toBe(true)
    })

    it('fails checks when signals indicate violations', async () => {
      vi.mocked(SystemRepository.prototype.findByName).mockResolvedValue(mockSystem)
      vi.mocked(SystemRepository.prototype.getScorecardRaw).mockResolvedValue({
        lastSbomScanAt: staleDate(),
        usedTechnologyCount: 4,
        unclassifiedCount: 2,
        eliminateCount: 1,
        licenseViolationCount: 3,
      })
      vi.mocked(VersionConstraintRepository.prototype.findViolations).mockResolvedValue([criticalViolation])

      const result = await service.getSystemScorecard('checkout-api')

      expect(result!.score).toBe(0)
      expect(result!.maxScore).toBe(5)

      const byId = Object.fromEntries(result!.checks.map(check => [check.id, check]))
      expect(byId['sbom-freshness']!.passed).toBe(false)
      expect(byId['no-eliminate-violations']!.passed).toBe(false)
      expect(byId['no-license-violations']!.passed).toBe(false)
      expect(byId['no-critical-version-violations']!.passed).toBe(false)
      expect(byId['time-classification-coverage']!.passed).toBe(false)
    })

    it('treats a missing SBOM scan as stale', async () => {
      vi.mocked(SystemRepository.prototype.findByName).mockResolvedValue(mockSystem)
      vi.mocked(SystemRepository.prototype.getScorecardRaw).mockResolvedValue({
        lastSbomScanAt: null,
        usedTechnologyCount: 0,
        unclassifiedCount: 0,
        eliminateCount: 0,
        licenseViolationCount: 0,
      })
      vi.mocked(VersionConstraintRepository.prototype.findViolations).mockResolvedValue([])

      const result = await service.getSystemScorecard('checkout-api')

      const sbomCheck = result!.checks.find(check => check.id === 'sbom-freshness')
      expect(sbomCheck!.passed).toBe(false)
    })
  })

  describe('getTeamScorecard()', () => {
    it('returns null when the team does not exist', async () => {
      vi.mocked(TeamRepository.prototype.findByName).mockResolvedValue(null)

      const result = await service.getTeamScorecard('missing-team')

      expect(result).toBeNull()
    })

    it('passes every check when signals are all clean', async () => {
      vi.mocked(TeamRepository.prototype.findByName).mockResolvedValue(mockTeam)
      vi.mocked(TeamRepository.prototype.getScorecardRaw).mockResolvedValue({
        systemScans: [{ system: 'checkout-api', lastSbomScanAt: freshDate() }],
        licenseViolationCount: 0,
      })
      vi.mocked(TeamRepository.prototype.findUsage).mockResolvedValue(cleanUsage)
      vi.mocked(VersionConstraintRepository.prototype.findViolations).mockResolvedValue([])

      const result = await service.getTeamScorecard('payments-team')

      expect(result!.score).toBe(5)
      expect(result!.maxScore).toBe(5)
    })

    it('treats owning no systems as a vacuous pass for SBOM freshness', async () => {
      vi.mocked(TeamRepository.prototype.findByName).mockResolvedValue(mockTeam)
      vi.mocked(TeamRepository.prototype.getScorecardRaw).mockResolvedValue({
        systemScans: [],
        licenseViolationCount: 0,
      })
      vi.mocked(TeamRepository.prototype.findUsage).mockResolvedValue(cleanUsage)
      vi.mocked(VersionConstraintRepository.prototype.findViolations).mockResolvedValue([])

      const result = await service.getTeamScorecard('payments-team')

      const sbomCheck = result!.checks.find(check => check.id === 'sbom-freshness')
      expect(sbomCheck!.passed).toBe(true)
      expect(sbomCheck!.detail).toMatch(/owns no systems/)
    })

    it('fails checks when usage summary reports violations and unapproved technologies', async () => {
      vi.mocked(TeamRepository.prototype.findByName).mockResolvedValue(mockTeam)
      vi.mocked(TeamRepository.prototype.getScorecardRaw).mockResolvedValue({
        systemScans: [{ system: 'checkout-api', lastSbomScanAt: staleDate() }],
        licenseViolationCount: 2,
      })
      vi.mocked(TeamRepository.prototype.findUsage).mockResolvedValue({
        team: 'payments-team',
        usage: [],
        summary: { totalTechnologies: 4, compliant: 1, unapproved: 2, violations: 1, migrationNeeded: 0 }
      })
      vi.mocked(VersionConstraintRepository.prototype.findViolations).mockResolvedValue([criticalViolation])

      const result = await service.getTeamScorecard('payments-team')

      expect(result!.score).toBe(0)
      const byId = Object.fromEntries(result!.checks.map(check => [check.id, check]))
      expect(byId['no-eliminate-violations']!.passed).toBe(false)
      expect(byId['time-classification-coverage']!.passed).toBe(false)
      expect(byId['no-license-violations']!.passed).toBe(false)
      expect(byId['no-critical-version-violations']!.passed).toBe(false)
      expect(byId['sbom-freshness']!.passed).toBe(false)
    })
  })
})
