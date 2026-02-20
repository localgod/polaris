import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VersionConstraintService } from '../../../server/services/version-constraint.service'
import { VersionConstraintRepository } from '../../../server/repositories/version-constraint.repository'
import type { VersionConstraint } from '../../../server/repositories/version-constraint.repository'
import '../../fixtures/service-test-helper'

vi.mock('../../../server/repositories/version-constraint.repository')

const mockConstraint: VersionConstraint = {
  name: 'test-vc', description: 'Test', severity: 'warning',
  status: 'active', scope: 'organization', subjectTeam: null,
  versionRange: '>=18.0.0', subjectTeams: [], governedTechnologies: [],
  technologyCount: 0
}

describe('VersionConstraintService', () => {
  let service: VersionConstraintService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new VersionConstraintService()
  })

  describe('findAll()', () => {
    it('should return constraints with count', async () => {
      vi.mocked(VersionConstraintRepository.prototype.findAll).mockResolvedValue([mockConstraint])

      const result = await service.findAll()

      expect(result.data).toHaveLength(1)
      expect(result.count).toBe(1)
      expect(VersionConstraintRepository.prototype.findAll).toHaveBeenCalledOnce()
    })

    it('should pass filters to repository', async () => {
      vi.mocked(VersionConstraintRepository.prototype.findAll).mockResolvedValue([])

      await service.findAll({ status: 'active' })

      expect(VersionConstraintRepository.prototype.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      )
    })
  })

  describe('findByName()', () => {
    it('should return constraint when found', async () => {
      vi.mocked(VersionConstraintRepository.prototype.findByName).mockResolvedValue(mockConstraint)

      const result = await service.findByName('test-vc')

      expect(result).not.toBeNull()
      expect(result!.name).toBe('test-vc')
    })

    it('should return null when not found', async () => {
      vi.mocked(VersionConstraintRepository.prototype.findByName).mockResolvedValue(null)

      expect(await service.findByName('nonexistent')).toBeNull()
    })
  })

  describe('delete()', () => {
    it('should delete existing constraint', async () => {
      vi.mocked(VersionConstraintRepository.prototype.exists).mockResolvedValue(true)
      vi.mocked(VersionConstraintRepository.prototype.delete).mockResolvedValue(undefined)

      await service.delete('test-vc', 'user-123')

      expect(VersionConstraintRepository.prototype.delete).toHaveBeenCalledWith('test-vc', 'user-123')
    })

    it('should throw when constraint does not exist', async () => {
      vi.mocked(VersionConstraintRepository.prototype.exists).mockResolvedValue(false)

      await expect(service.delete('nonexistent', 'user-123')).rejects.toThrow()
      expect(VersionConstraintRepository.prototype.delete).not.toHaveBeenCalled()
    })
  })
})
