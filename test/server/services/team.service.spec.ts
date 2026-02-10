import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TeamService } from '../../../server/services/team.service'
import { TeamRepository } from '../../../server/repositories/team.repository'
import '../../fixtures/service-test-helper'

vi.mock('../../../server/repositories/team.repository')

const mockTeam = { name: 'Platform', responsibilityArea: 'Infrastructure', memberCount: 5, systemCount: 3 }

describe('TeamService', () => {
  let service: TeamService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new TeamService()
  })

  describe('findAll()', () => {
    it('should return teams with count', async () => {
      vi.mocked(TeamRepository.prototype.findAll).mockResolvedValue([mockTeam as any])

      const result = await service.findAll()

      expect(result.data).toHaveLength(1)
      expect(result.count).toBe(1)
      expect(TeamRepository.prototype.findAll).toHaveBeenCalledOnce()
    })
  })

  describe('findByName()', () => {
    it('should return team when found', async () => {
      vi.mocked(TeamRepository.prototype.findByName).mockResolvedValue(mockTeam as any)

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
      vi.mocked(TeamRepository.prototype.exists).mockResolvedValue(true)
      vi.mocked(TeamRepository.prototype.countOwnedSystems).mockResolvedValue(0)
      vi.mocked(TeamRepository.prototype.delete).mockResolvedValue(undefined)

      await service.delete('Platform')

      expect(TeamRepository.prototype.delete).toHaveBeenCalledWith('Platform')
    })

    it('should throw when team does not exist', async () => {
      vi.mocked(TeamRepository.prototype.exists).mockResolvedValue(false)

      await expect(service.delete('nonexistent')).rejects.toThrow()
      expect(TeamRepository.prototype.delete).not.toHaveBeenCalled()
    })

    it('should throw when team owns systems', async () => {
      vi.mocked(TeamRepository.prototype.exists).mockResolvedValue(true)
      vi.mocked(TeamRepository.prototype.countOwnedSystems).mockResolvedValue(3)

      await expect(service.delete('Platform')).rejects.toThrow()
      expect(TeamRepository.prototype.delete).not.toHaveBeenCalled()
    })
  })
})
