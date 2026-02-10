import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ComplianceService } from '../../../server/services/compliance.service'
import { ComplianceRepository } from '../../../server/repositories/compliance.repository'
import type { ComplianceViolation } from '../../../server/repositories/compliance.repository'

vi.mock('../../../server/repositories/compliance.repository')

describe('ComplianceService', () => {
  let service: ComplianceService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ComplianceService()
  })

  describe('findViolations()', () => {
    it('should return violations with summary', async () => {
      const mockViolations: ComplianceViolation[] = [
        {
          team: 'Frontend',
          technology: 'React',
          category: 'framework',
          systemCount: 2,
          systems: ['App'],
          violationType: 'unapproved',
          notes: null,
          migrationTarget: null
        }
      ]
      vi.mocked(ComplianceRepository.prototype.findViolations).mockResolvedValue(mockViolations)

      const result = await service.findViolations()

      expect(result.violations).toHaveLength(1)
      expect(result.violations[0].technology).toBe('React')
      expect(result.summary.totalViolations).toBe(1)
      expect(result.summary.teamsAffected).toBe(1)
      expect(result.summary.byTeam).toHaveLength(1)
      expect(result.summary.byTeam[0].team).toBe('Frontend')
      expect(ComplianceRepository.prototype.findViolations).toHaveBeenCalledOnce()
    })

    it('should return empty result when no violations', async () => {
      vi.mocked(ComplianceRepository.prototype.findViolations).mockResolvedValue([])

      const result = await service.findViolations()

      expect(result.violations).toEqual([])
      expect(result.summary.totalViolations).toBe(0)
      expect(result.summary.teamsAffected).toBe(0)
      expect(result.summary.byTeam).toEqual([])
    })

    it('should propagate repository errors', async () => {
      vi.mocked(ComplianceRepository.prototype.findViolations).mockRejectedValue(new Error('DB error'))

      await expect(service.findViolations()).rejects.toThrow('DB error')
    })
  })
})
