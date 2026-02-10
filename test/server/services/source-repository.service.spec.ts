import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SourceRepositoryService } from '../../../server/services/source-repository.service'
import { SourceRepositoryRepository } from '../../../server/repositories/source-repository.repository'
import type { Repository } from '../../../types/api'

vi.mock('../../../server/repositories/source-repository.repository')

describe('SourceRepositoryService', () => {
  let service: SourceRepositoryService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new SourceRepositoryService()
  })

  describe('findAll()', () => {
    it('should return repositories with count', async () => {
      const mockRepos: Repository[] = [
        { url: 'https://github.com/org/repo', name: 'repo', createdAt: null, updatedAt: null, lastSbomScanAt: null, systemCount: 1 }
      ]
      vi.mocked(SourceRepositoryRepository.prototype.findAll).mockResolvedValue(mockRepos)

      const result = await service.findAll()

      expect(result.data).toEqual(mockRepos)
      expect(result.count).toBe(1)
      expect(SourceRepositoryRepository.prototype.findAll).toHaveBeenCalledOnce()
    })

    it('should return empty result when none exist', async () => {
      vi.mocked(SourceRepositoryRepository.prototype.findAll).mockResolvedValue([])

      const result = await service.findAll()

      expect(result.data).toEqual([])
      expect(result.count).toBe(0)
    })

    it('should propagate repository errors', async () => {
      vi.mocked(SourceRepositoryRepository.prototype.findAll).mockRejectedValue(new Error('DB error'))

      await expect(service.findAll()).rejects.toThrow('DB error')
    })
  })
})
