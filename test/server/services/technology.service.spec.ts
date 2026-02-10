import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TechnologyService } from '../../../server/services/technology.service'
import { TechnologyRepository } from '../../../server/repositories/technology.repository'

vi.mock('../../../server/repositories/technology.repository')

const mockTech = {
  name: 'React', category: 'framework', vendor: 'Meta',
  ownerTeam: 'Frontend', versions: [], approvals: []
}

describe('TechnologyService', () => {
  let service: TechnologyService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new TechnologyService()
  })

  describe('findAll()', () => {
    it('should return technologies with count', async () => {
      vi.mocked(TechnologyRepository.prototype.findAll).mockResolvedValue([mockTech as any])

      const result = await service.findAll()

      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('React')
      expect(result.count).toBe(1)
      expect(TechnologyRepository.prototype.findAll).toHaveBeenCalledOnce()
    })

    it('should return empty result when none exist', async () => {
      vi.mocked(TechnologyRepository.prototype.findAll).mockResolvedValue([])

      const result = await service.findAll()

      expect(result.data).toEqual([])
      expect(result.count).toBe(0)
    })
  })

  describe('findByName()', () => {
    it('should return technology when found', async () => {
      vi.mocked(TechnologyRepository.prototype.findByName).mockResolvedValue(mockTech as any)

      const result = await service.findByName('React')

      expect(result).not.toBeNull()
      expect(result!.name).toBe('React')
    })

    it('should return null when not found', async () => {
      vi.mocked(TechnologyRepository.prototype.findByName).mockResolvedValue(null)

      expect(await service.findByName('nonexistent')).toBeNull()
    })

    it('should propagate repository errors', async () => {
      vi.mocked(TechnologyRepository.prototype.findByName).mockRejectedValue(new Error('DB error'))

      await expect(service.findByName('React')).rejects.toThrow('DB error')
    })
  })
})
