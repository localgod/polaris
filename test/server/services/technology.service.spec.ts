import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TechnologyService } from '../../../server/services/technology.service'
import { TechnologyRepository } from '../../../server/repositories/technology.repository'
import type { TechnologyDetail } from '../../../server/repositories/technology.repository'
import '../../fixtures/service-test-helper'

vi.mock('../../../server/repositories/technology.repository')

const mockTech: TechnologyDetail = {
  name: 'React', type: 'framework', domain: 'framework', vendor: 'Meta',
  lastReviewed: null, ownerTeamName: null, componentCount: 0, versions: [], approvals: []
}

describe('TechnologyService', () => {
  let service: TechnologyService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new TechnologyService()
  })

  describe('findAll()', () => {
    it('should return technologies with count', async () => {
      vi.mocked(TechnologyRepository.prototype.findAll).mockResolvedValue([mockTech])

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
      vi.mocked(TechnologyRepository.prototype.findByName).mockResolvedValue(mockTech)

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

  describe('create() — optional field coercion', () => {
    beforeEach(() => {
      vi.mocked(TechnologyRepository.prototype.exists).mockResolvedValue(false)
      vi.mocked(TechnologyRepository.prototype.create).mockResolvedValue('React')
    })

    it('should pass a provided string value through unchanged', async () => {
      await service.create({ name: 'React', type: 'framework', vendor: 'Meta', userId: 'u1' })

      const params = vi.mocked(TechnologyRepository.prototype.create).mock.calls[0][0]
      expect(params.vendor).toBe('Meta')
    })

    it('should coerce undefined optional fields to null', async () => {
      await service.create({ name: 'React', type: 'framework', userId: 'u1' })

      const params = vi.mocked(TechnologyRepository.prototype.create).mock.calls[0][0]
      expect(params.domain).toBeNull()
      expect(params.vendor).toBeNull()
      expect(params.ownerTeam).toBeNull()
    })

    it('should coerce empty string optional fields to null', async () => {
      await service.create({ name: 'React', type: 'framework', domain: '', vendor: '', ownerTeam: '', userId: 'u1' })

      const params = vi.mocked(TechnologyRepository.prototype.create).mock.calls[0][0]
      expect(params.domain).toBeNull()
      expect(params.vendor).toBeNull()
      expect(params.ownerTeam).toBeNull()
    })

    it('should coerce whitespace-only optional fields to null', async () => {
      await service.create({ name: 'React', type: 'framework', vendor: '  ', ownerTeam: '  ', userId: 'u1' })

      const params = vi.mocked(TechnologyRepository.prototype.create).mock.calls[0][0]
      expect(params.vendor).toBeNull()
      expect(params.ownerTeam).toBeNull()
    })

    it('should trim whitespace from optional fields that have real content', async () => {
      await service.create({ name: 'React', type: 'framework', vendor: '  Meta  ', userId: 'u1' })

      const params = vi.mocked(TechnologyRepository.prototype.create).mock.calls[0][0]
      expect(params.vendor).toBe('Meta')
    })
  })

  describe('update() — optional field coercion', () => {
    beforeEach(() => {
      vi.mocked(TechnologyRepository.prototype.findByName).mockResolvedValue(mockTech)
      vi.mocked(TechnologyRepository.prototype.update).mockResolvedValue('React')
    })

    it('should coerce empty string optional fields to null', async () => {
      await service.update({ name: 'React', type: 'framework', domain: '', vendor: '', ownerTeam: '', userId: 'u1' })

      const params = vi.mocked(TechnologyRepository.prototype.update).mock.calls[0][0]
      expect(params.domain).toBeNull()
      expect(params.vendor).toBeNull()
      expect(params.ownerTeam).toBeNull()
    })

    it('should coerce undefined optional fields to null', async () => {
      await service.update({ name: 'React', type: 'framework', userId: 'u1' })

      const params = vi.mocked(TechnologyRepository.prototype.update).mock.calls[0][0]
      expect(params.domain).toBeNull()
      expect(params.vendor).toBeNull()
    })

    it('should trim whitespace from optional fields that have real content', async () => {
      await service.update({ name: 'React', type: 'framework', vendor: '  Meta  ', userId: 'u1' })

      const params = vi.mocked(TechnologyRepository.prototype.update).mock.calls[0][0]
      expect(params.vendor).toBe('Meta')
    })
  })
})
