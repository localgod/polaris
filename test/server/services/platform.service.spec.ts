import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PlatformService } from '../../../server/services/platform.service'
import { PlatformRepository } from '../../../server/repositories/platform.repository'
import type { PlatformDetail } from '../../../server/repositories/platform.repository'
import '../../fixtures/service-test-helper'

vi.mock('../../../server/repositories/platform.repository')

const mockPlatform: PlatformDetail = {
  name: 'PostgreSQL', type: 'platform', domain: 'data-platform', vendor: 'PostgreSQL Global Development Group',
  stewardTeamName: null, approvals: []
}

describe('PlatformService', () => {
  let service: PlatformService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PlatformService()
  })

  describe('findAll()', () => {
    it('should return platforms with count', async () => {
      vi.mocked(PlatformRepository.prototype.findAll).mockResolvedValue({ data: [mockPlatform], total: 1 })

      const result = await service.findAll()

      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('PostgreSQL')
      expect(result.count).toBe(1)
      expect(result.total).toBe(1)
    })
  })

  describe('findByName()', () => {
    it('should return platform when found', async () => {
      vi.mocked(PlatformRepository.prototype.findByName).mockResolvedValue(mockPlatform)

      const result = await service.findByName('PostgreSQL')

      expect(result).not.toBeNull()
      expect(result!.name).toBe('PostgreSQL')
    })

    it('should return null when not found', async () => {
      vi.mocked(PlatformRepository.prototype.findByName).mockResolvedValue(null)

      expect(await service.findByName('nonexistent')).toBeNull()
    })
  })

  describe('create() — no Component required, unlike Technology', () => {
    beforeEach(() => {
      vi.mocked(PlatformRepository.prototype.exists).mockResolvedValue(false)
      vi.mocked(PlatformRepository.prototype.create).mockResolvedValue('PostgreSQL')
    })

    it('should create with just name and type', async () => {
      const name = await service.create({ name: 'PostgreSQL', type: 'platform', userId: 'u1' })

      expect(name).toBe('PostgreSQL')
      expect(PlatformRepository.prototype.create).toHaveBeenCalledOnce()
    })

    it('should reject when name is missing', async () => {
      await expect(service.create({ name: '', type: 'platform', userId: 'u1' }))
        .rejects.toMatchObject({ statusCode: 400 })
    })

    it('should reject when type is missing', async () => {
      await expect(service.create({ name: 'PostgreSQL', type: '', userId: 'u1' }))
        .rejects.toMatchObject({ statusCode: 400 })
    })

    it('should reject an invalid type', async () => {
      await expect(service.create({ name: 'PostgreSQL', type: 'not-a-real-type', userId: 'u1' }))
        .rejects.toMatchObject({ statusCode: 422 })
    })

    it('should reject an invalid domain', async () => {
      await expect(service.create({ name: 'PostgreSQL', type: 'platform', domain: 'not-a-real-domain', userId: 'u1' }))
        .rejects.toMatchObject({ statusCode: 422 })
    })

    it('should reject when a platform with the same name already exists', async () => {
      vi.mocked(PlatformRepository.prototype.exists).mockResolvedValue(true)

      await expect(service.create({ name: 'PostgreSQL', type: 'platform', userId: 'u1' }))
        .rejects.toMatchObject({ statusCode: 409 })
    })

    it('should coerce undefined optional fields to null', async () => {
      await service.create({ name: 'PostgreSQL', type: 'platform', userId: 'u1' })

      const params = vi.mocked(PlatformRepository.prototype.create).mock.calls[0][0]
      expect(params.domain).toBeNull()
      expect(params.vendor).toBeNull()
      expect(params.stewardTeam).toBeNull()
    })

    it('should trim whitespace from optional fields that have real content', async () => {
      await service.create({ name: 'PostgreSQL', type: 'platform', vendor: '  Postgres Inc.  ', userId: 'u1' })

      const params = vi.mocked(PlatformRepository.prototype.create).mock.calls[0][0]
      expect(params.vendor).toBe('Postgres Inc.')
    })
  })

  describe('setApproval()', () => {
    const baseInput = {
      platformName: 'PostgreSQL',
      teamName: 'Data Platform',
      time: 'invest',
      userId: 'u1'
    }

    beforeEach(() => {
      vi.mocked(PlatformRepository.prototype.exists).mockResolvedValue(true)
      vi.mocked(PlatformRepository.prototype.findExistingApproval).mockResolvedValue(null)
      vi.mocked(PlatformRepository.prototype.upsertApproval).mockResolvedValue({ time: 'invest', team: 'Data Platform' })
    })

    it('should pass environment=null for a blanket approval', async () => {
      await service.setApproval(baseInput)

      expect(PlatformRepository.prototype.upsertApproval).toHaveBeenCalledWith(
        expect.objectContaining({ environment: null })
      )
    })

    it('should reject an invalid TIME value', async () => {
      await expect(service.setApproval({ ...baseInput, time: 'adopt' }))
        .rejects.toMatchObject({ statusCode: 422 })
    })

    it('should reject when the platform does not exist', async () => {
      vi.mocked(PlatformRepository.prototype.exists).mockResolvedValue(false)

      await expect(service.setApproval(baseInput)).rejects.toMatchObject({ statusCode: 404 })
    })

    it('should include team name and environment in the audit changes, not just entityId', async () => {
      await service.setApproval({ ...baseInput, environment: 'prod' })

      const params = vi.mocked(PlatformRepository.prototype.upsertApproval).mock.calls[0][0]
      expect(params.changes.team).toEqual({ before: 'Data Platform', after: 'Data Platform' })
      expect(params.changes.environment).toEqual({ before: 'prod', after: 'prod' })
    })

    it('should pass correlationId through to the repository', async () => {
      await service.setApproval({ ...baseInput, correlationId: 'corr-1' })

      expect(PlatformRepository.prototype.upsertApproval).toHaveBeenCalledWith(
        expect.objectContaining({ correlationId: 'corr-1' })
      )
    })
  })

  describe('delete()', () => {
    it('should reject when the platform does not exist', async () => {
      vi.mocked(PlatformRepository.prototype.findByName).mockResolvedValue(null)

      await expect(service.delete('nonexistent', 'u1')).rejects.toMatchObject({ statusCode: 404 })
    })

    it('should delete an existing platform', async () => {
      vi.mocked(PlatformRepository.prototype.findByName).mockResolvedValue(mockPlatform)
      vi.mocked(PlatformRepository.prototype.delete).mockResolvedValue(undefined)

      await service.delete('PostgreSQL', 'u1')

      expect(PlatformRepository.prototype.delete).toHaveBeenCalledOnce()
    })
  })
})
