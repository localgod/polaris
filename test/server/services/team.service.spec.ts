import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TeamService } from '../../../server/services/team.service'
import { TeamRepository } from '../../../server/repositories/team.repository'
import type { Team } from '../../../server/repositories/team.repository'
import '../../fixtures/service-test-helper'

vi.mock('../../../server/repositories/team.repository')

const mockTeam: Team = {
  name: 'Platform', email: null, responsibilityArea: 'Infrastructure',
  technologyCount: 0, systemCount: 3, memberCount: 5
}

describe('TeamService', () => {
  let service: TeamService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new TeamService()
  })

  describe('findAll()', () => {
    it('should return teams with count', async () => {
      vi.mocked(TeamRepository.prototype.findAll).mockResolvedValue([mockTeam])

      const result = await service.findAll()

      expect(result.data).toHaveLength(1)
      expect(result.count).toBe(1)
      expect(TeamRepository.prototype.findAll).toHaveBeenCalledOnce()
    })
  })

  describe('findByName()', () => {
    it('should return team when found', async () => {
      vi.mocked(TeamRepository.prototype.findByName).mockResolvedValue(mockTeam)

      const result = await service.findByName('Platform')

      expect(result).not.toBeNull()
      expect(result!.name).toBe('Platform')
    })

    it('should return null when not found', async () => {
      vi.mocked(TeamRepository.prototype.findByName).mockResolvedValue(null)

      expect(await service.findByName('nonexistent')).toBeNull()
    })
  })

  describe('delete()', () => {
    it('should delete team that exists and owns no systems', async () => {
      vi.mocked(TeamRepository.prototype.findByName).mockResolvedValue(mockTeam)
      vi.mocked(TeamRepository.prototype.countOwnedSystems).mockResolvedValue(0)
      vi.mocked(TeamRepository.prototype.delete).mockResolvedValue(undefined)

      await service.delete('Platform', 'user-123')

      expect(TeamRepository.prototype.delete).toHaveBeenCalledWith(
        'Platform',
        'user-123',
        expect.any(Object)
      )
    })

    it('should throw when team does not exist', async () => {
      vi.mocked(TeamRepository.prototype.findByName).mockResolvedValue(null)

      await expect(service.delete('nonexistent', 'user-123')).rejects.toThrow()
      expect(TeamRepository.prototype.delete).not.toHaveBeenCalled()
    })

    it('should throw when team owns systems', async () => {
      vi.mocked(TeamRepository.prototype.findByName).mockResolvedValue(mockTeam)
      vi.mocked(TeamRepository.prototype.countOwnedSystems).mockResolvedValue(3)

      await expect(service.delete('Platform', 'user-123')).rejects.toThrow()
      expect(TeamRepository.prototype.delete).not.toHaveBeenCalled()
    })
  })

  describe('create() — optional field coercion', () => {
    beforeEach(() => {
      vi.mocked(TeamRepository.prototype.exists).mockResolvedValue(false)
      vi.mocked(TeamRepository.prototype.create).mockResolvedValue('Platform')
    })

    it('should pass a provided string value through unchanged', async () => {
      await service.create({ name: 'Platform', email: 'platform@example.com', userId: 'u1' })

      const params = vi.mocked(TeamRepository.prototype.create).mock.calls[0][0]
      expect(params.email).toBe('platform@example.com')
    })

    it('should coerce undefined optional fields to null', async () => {
      await service.create({ name: 'Platform', userId: 'u1' })

      const params = vi.mocked(TeamRepository.prototype.create).mock.calls[0][0]
      expect(params.email).toBeNull()
      expect(params.responsibilityArea).toBeNull()
    })

    it('should coerce empty string optional fields to null', async () => {
      await service.create({ name: 'Platform', email: '', responsibilityArea: '', userId: 'u1' })

      const params = vi.mocked(TeamRepository.prototype.create).mock.calls[0][0]
      expect(params.email).toBeNull()
      expect(params.responsibilityArea).toBeNull()
    })

    it('should coerce whitespace-only optional fields to null', async () => {
      await service.create({ name: 'Platform', email: '   ', responsibilityArea: '  ', userId: 'u1' })

      const params = vi.mocked(TeamRepository.prototype.create).mock.calls[0][0]
      expect(params.email).toBeNull()
      expect(params.responsibilityArea).toBeNull()
    })

    it('should trim whitespace from optional fields that have real content', async () => {
      await service.create({ name: 'Platform', email: '  platform@example.com  ', userId: 'u1' })

      const params = vi.mocked(TeamRepository.prototype.create).mock.calls[0][0]
      expect(params.email).toBe('platform@example.com')
    })
  })
})
