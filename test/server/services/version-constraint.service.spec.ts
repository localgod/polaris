import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VersionConstraintService } from '../../../server/services/version-constraint.service'
import { VersionConstraintRepository } from '../../../server/repositories/version-constraint.repository'
import '../../fixtures/service-test-helper'

vi.mock('../../../server/repositories/version-constraint.repository')

describe('VersionConstraintService', () => {
  let service: VersionConstraintService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new VersionConstraintService()
  })

  describe('delete()', () => {
    it('should delete existing constraint', async () => {
      vi.mocked(VersionConstraintRepository.prototype.exists).mockResolvedValue(true)
      vi.mocked(VersionConstraintRepository.prototype.delete).mockResolvedValue(undefined)

      await service.delete('test-vc', 'user-123')

      expect(VersionConstraintRepository.prototype.delete).toHaveBeenCalledWith('test-vc', 'user-123', undefined)
    })

    it('should throw when constraint does not exist', async () => {
      vi.mocked(VersionConstraintRepository.prototype.exists).mockResolvedValue(false)

      await expect(service.delete('nonexistent', 'user-123')).rejects.toThrow()
      expect(VersionConstraintRepository.prototype.delete).not.toHaveBeenCalled()
    })
  })
})
