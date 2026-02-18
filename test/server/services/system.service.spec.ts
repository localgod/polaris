import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SystemService } from '../../../server/services/system.service'
import { SystemRepository } from '../../../server/repositories/system.repository'
import type { System } from '../../../server/repositories/system.repository'
import '../../fixtures/service-test-helper'

vi.mock('../../../server/repositories/system.repository')
vi.mock('../../../server/repositories/source-repository.repository')
vi.mock('../../../server/utils/repository', () => ({
  normalizeRepoUrl: vi.fn((url: string) => url.toLowerCase().replace(/\.git$/, ''))
}))

describe('SystemService', () => {
  let systemService: SystemService

  const mockSystems: System[] = [
    {
      name: 'polaris-api',
      domain: 'Platform',
      ownerTeam: 'Platform Team',
      businessCriticality: 'high',
      environment: 'prod',
      componentCount: 42,
      repositoryCount: 2
    },
    {
      name: 'customer-portal',
      domain: 'Customer',
      ownerTeam: 'Customer Team',
      businessCriticality: 'critical',
      environment: 'prod',
      componentCount: 156,
      repositoryCount: 3
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    systemService = new SystemService()
  })

  describe('findAll', () => {
    it('should return all systems with count', async () => {
      // Mock repository response
      vi.mocked(SystemRepository.prototype.findAll).mockResolvedValue(mockSystems)

      const result = await systemService.findAll()

      expect(result.data).toEqual(mockSystems)
      expect(result.count).toBe(2)
      expect(SystemRepository.prototype.findAll).toHaveBeenCalledOnce()
    })

    it('should return empty array when no systems exist', async () => {
      vi.mocked(SystemRepository.prototype.findAll).mockResolvedValue([])

      const result = await systemService.findAll()

      expect(result.data).toEqual([])
      expect(result.count).toBe(0)
    })
  })

  describe('findByName', () => {
    it('should return system when found', async () => {
      const system = mockSystems[0]
      vi.mocked(SystemRepository.prototype.findByName).mockResolvedValue(system)

      const result = await systemService.findByName('polaris-api')

      expect(result).toEqual(system)
      expect(SystemRepository.prototype.findByName).toHaveBeenCalledWith('polaris-api')
    })

    it('should return null when system not found', async () => {
      vi.mocked(SystemRepository.prototype.findByName).mockResolvedValue(null)

      const result = await systemService.findByName('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    const validInput = {
      name: 'new-system',
      domain: 'Platform',
      ownerTeam: 'Platform Team',
      businessCriticality: 'medium',
      environment: 'dev',
      userId: 'user-123'
    }

    it('should create system with valid input', async () => {
      vi.mocked(SystemRepository.prototype.exists).mockResolvedValue(false)
      vi.mocked(SystemRepository.prototype.create).mockResolvedValue('new-system')

      const result = await systemService.create(validInput)

      expect(result).toBe('new-system')
      expect(SystemRepository.prototype.exists).toHaveBeenCalledWith('new-system')
      expect(SystemRepository.prototype.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'new-system',
          domain: 'Platform',
          ownerTeam: 'Platform Team',
          businessCriticality: 'medium',
          environment: 'dev'
        })
      )
    })

    it('should throw error when required fields are missing', async () => {
      const invalidInput = {
        name: 'incomplete-system'
      } as unknown as Parameters<typeof systemService.create>[0]

      await expect(systemService.create(invalidInput)).rejects.toThrow('Missing required fields')
    })

    it('should throw error when businessCriticality is invalid', async () => {
      const invalidInput = {
        ...validInput,
        businessCriticality: 'invalid-value'
      }

      await expect(systemService.create(invalidInput)).rejects.toThrow('Invalid business criticality')
    })

    it('should throw error when environment is invalid', async () => {
      const invalidInput = {
        ...validInput,
        environment: 'invalid-env'
      }

      await expect(systemService.create(invalidInput)).rejects.toThrow('Invalid environment')
    })

    it('should throw error when system already exists', async () => {
      vi.mocked(SystemRepository.prototype.exists).mockResolvedValue(true)

      await expect(systemService.create(validInput)).rejects.toThrow('already exists')
      expect(SystemRepository.prototype.create).not.toHaveBeenCalled()
    })

    it('should normalize repository URLs', async () => {
      const inputWithRepos = {
        ...validInput,
        repositories: [
          {
            url: 'HTTPS://GITHUB.COM/ORG/REPO.GIT',
            scmType: 'git',
            name: 'repo',
            isPublic: true,
            requiresAuth: false
          }
        ]
      }

      vi.mocked(SystemRepository.prototype.exists).mockResolvedValue(false)
      vi.mocked(SystemRepository.prototype.create).mockResolvedValue('new-system')

      await systemService.create(inputWithRepos)

      expect(SystemRepository.prototype.create).toHaveBeenCalledWith(
        expect.objectContaining({
          repositories: [
            expect.objectContaining({
              url: 'https://github.com/org/repo'
            })
          ]
        })
      )
    })
  })

  describe('delete', () => {
    it('should delete existing system', async () => {
      vi.mocked(SystemRepository.prototype.exists).mockResolvedValue(true)
      vi.mocked(SystemRepository.prototype.delete).mockResolvedValue()

      await systemService.delete('polaris-api', 'user-123')

      expect(SystemRepository.prototype.exists).toHaveBeenCalledWith('polaris-api')
      expect(SystemRepository.prototype.delete).toHaveBeenCalledWith('polaris-api', 'user-123')
    })

    it('should throw error when system does not exist', async () => {
      vi.mocked(SystemRepository.prototype.exists).mockResolvedValue(false)

      await expect(systemService.delete('nonexistent', 'user-123')).rejects.toThrow('not found')
      expect(SystemRepository.prototype.delete).not.toHaveBeenCalled()
    })
  })

  describe('findUnmappedComponents', () => {
    it('should return unmapped components for existing system', async () => {
      const mockResult = {
        systemName: 'polaris-api',
        unmappedComponents: [
          {
            name: 'unknown-lib',
            version: '1.0.0',
            packageManager: 'npm',
            purl: 'pkg:npm/unknown-lib@1.0.0'
          }
        ],
        count: 1
      }

      vi.mocked(SystemRepository.prototype.exists).mockResolvedValue(true)
      vi.mocked(SystemRepository.prototype.findUnmappedComponents).mockResolvedValue(mockResult)

      const result = await systemService.findUnmappedComponents('polaris-api')

      expect(result).toEqual(mockResult)
      expect(SystemRepository.prototype.exists).toHaveBeenCalledWith('polaris-api')
      expect(SystemRepository.prototype.findUnmappedComponents).toHaveBeenCalledWith('polaris-api')
    })

    it('should throw error when system does not exist', async () => {
      vi.mocked(SystemRepository.prototype.exists).mockResolvedValue(false)

      await expect(systemService.findUnmappedComponents('nonexistent')).rejects.toThrow('not found')
      expect(SystemRepository.prototype.findUnmappedComponents).not.toHaveBeenCalled()
    })
  })
})
