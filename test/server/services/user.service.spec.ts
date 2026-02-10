import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UserService } from '../../../server/services/user.service'
import { UserRepository } from '../../../server/repositories/user.repository'
import type { User, UserSummary } from '../../../server/repositories/user.repository'

vi.mock('../../../server/repositories/user.repository')

describe('UserService', () => {
  let service: UserService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new UserService()
  })

  describe('getAuthData()', () => {
    it('should return auth data when user exists', async () => {
      vi.mocked(UserRepository.prototype.getAuthData).mockResolvedValue({
        role: 'user', email: 'test@test.com', teams: []
      })

      const result = await service.getAuthData('user-1')

      expect(result).not.toBeNull()
      expect(result!.role).toBe('user')
      expect(UserRepository.prototype.getAuthData).toHaveBeenCalledWith('user-1')
    })

    it('should return null when user does not exist', async () => {
      vi.mocked(UserRepository.prototype.getAuthData).mockResolvedValue(null)

      expect(await service.getAuthData('nonexistent')).toBeNull()
    })
  })

  describe('createOrUpdateUser()', () => {
    it('should delegate to repository', async () => {
      vi.mocked(UserRepository.prototype.createOrUpdateUser).mockResolvedValue(undefined)

      await service.createOrUpdateUser({
        id: 'user-1', email: 'test@test.com', name: 'Test',
        provider: 'github', isSuperuser: false, role: 'user', avatarUrl: null
      })

      expect(UserRepository.prototype.createOrUpdateUser).toHaveBeenCalledOnce()
    })
  })

  describe('findAll()', () => {
    it('should return users with count', async () => {
      const mockUsers: User[] = [
        {
          id: 'u1', email: 'a@test.com', name: 'A', role: 'user',
          provider: 'github', avatarUrl: null, lastLogin: null,
          createdAt: null, teams: [], canManage: []
        }
      ]
      vi.mocked(UserRepository.prototype.findAll).mockResolvedValue(mockUsers)

      const result = await service.findAll()

      expect(result.data).toHaveLength(1)
      expect(result.count).toBe(1)
    })
  })

  describe('findAllSummary()', () => {
    it('should return user summaries', async () => {
      const mockSummaries: UserSummary[] = [
        {
          id: 'u1', email: 'a@test.com', name: 'A', role: 'user',
          provider: 'github', avatarUrl: null, lastLogin: null,
          createdAt: null, teamCount: 2
        }
      ]
      vi.mocked(UserRepository.prototype.findAllSummary).mockResolvedValue(mockSummaries)

      const result = await service.findAllSummary()

      expect(result).toHaveLength(1)
      expect(result[0].teamCount).toBe(2)
    })
  })

  describe('findById()', () => {
    it('should return user when found', async () => {
      const mockUser: User = {
        id: 'u1', email: 'a@test.com', name: 'A', role: 'user',
        provider: 'github', avatarUrl: null, lastLogin: null,
        createdAt: null, teams: [], canManage: []
      }
      vi.mocked(UserRepository.prototype.findById).mockResolvedValue(mockUser)

      const result = await service.findById('u1')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('u1')
    })

    it('should return null when not found', async () => {
      vi.mocked(UserRepository.prototype.findById).mockResolvedValue(null)

      expect(await service.findById('nonexistent')).toBeNull()
    })
  })
})
