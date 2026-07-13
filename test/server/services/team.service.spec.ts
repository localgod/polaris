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
      vi.mocked(TeamRepository.prototype.findAll).mockResolvedValue({ data: [mockTeam], total: 1 })

      const result = await service.findAll()

      expect(result.data).toHaveLength(1)
      expect(result.count).toBe(1)
      expect(result.total).toBe(1)
      expect(TeamRepository.prototype.findAll).toHaveBeenCalledOnce()
    })
  })

  describe('findByName()', () => {
    beforeEach(() => {
      vi.mocked(TeamRepository.prototype.findUsage).mockResolvedValue({
        team: 'Platform', usage: [], summary: { totalTechnologies: 0, compliant: 0, unapproved: 0, violations: 0, migrationNeeded: 0 }
      })
      vi.mocked(TeamRepository.prototype.findApprovals).mockResolvedValue({
        team: 'Platform', technologyApprovals: [], versionApprovals: []
      })
    })

    it('should return team when found', async () => {
      vi.mocked(TeamRepository.prototype.findByName).mockResolvedValue(mockTeam)

      const result = await service.findByName('Platform')

      expect(result).not.toBeNull()
      expect(result!.name).toBe('Platform')
    })

    it('should return null when not found', async () => {
      vi.mocked(TeamRepository.prototype.findByName).mockResolvedValue(null)

      expect(await service.findByName('nonexistent')).toBeNull()
      expect(TeamRepository.prototype.findUsage).not.toHaveBeenCalled()
    })

    it('should merge used technologies (not already stewarded) and approvals into the team', async () => {
      vi.mocked(TeamRepository.prototype.findByName).mockResolvedValue({
        ...mockTeam,
        technologies: [{ name: 'React', type: 'framework', timeCategory: 'invest', relationship: 'Steward' }]
      })
      vi.mocked(TeamRepository.prototype.findUsage).mockResolvedValue({
        team: 'Platform',
        usage: [
          { technology: 'React', type: 'framework', domain: null, vendor: null, systemCount: 2, firstUsed: null, lastVerified: null, approvalStatus: 'invest', complianceStatus: 'compliant' },
          { technology: 'Node.js', type: 'runtime', domain: null, vendor: null, systemCount: 1, firstUsed: null, lastVerified: null, approvalStatus: null, complianceStatus: 'unapproved' }
        ],
        summary: { totalTechnologies: 2, compliant: 1, unapproved: 1, violations: 0, migrationNeeded: 0 }
      })
      vi.mocked(TeamRepository.prototype.findApprovals).mockResolvedValue({
        team: 'Platform',
        technologyApprovals: [{ technology: 'React', type: 'framework', vendor: null, time: 'invest', approvedAt: '2024-01-15', deprecatedAt: null, eolDate: null, migrationTarget: null, notes: null, approvedBy: 'jsf' }],
        versionApprovals: []
      })

      const result = await service.findByName('Platform')

      expect(result!.technologies).toEqual([
        { name: 'React', type: 'framework', timeCategory: 'invest', relationship: 'Steward' },
        { name: 'Node.js', type: 'runtime', timeCategory: null, relationship: 'User' }
      ])
      expect(result!.approvals).toEqual([
        { technologyName: 'React', timeCategory: 'invest', approvedAt: '2024-01-15', approvedBy: 'jsf' }
      ])
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
        expect.any(Object),
        undefined
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

  describe('create() validation', () => {
    it('throws when name is empty', async () => {
      await expect(service.create({ name: '', userId: 'u1' })).rejects.toMatchObject({ statusCode: 400 })
      expect(TeamRepository.prototype.create).not.toHaveBeenCalled()
    })

    it('throws when team already exists', async () => {
      vi.mocked(TeamRepository.prototype.exists).mockResolvedValue(true)

      await expect(service.create({ name: 'Platform', userId: 'u1' })).rejects.toMatchObject({ statusCode: 409 })
      expect(TeamRepository.prototype.create).not.toHaveBeenCalled()
    })
  })

  describe('update()', () => {
    beforeEach(() => {
      vi.mocked(TeamRepository.prototype.findByName).mockResolvedValue(mockTeam)
    })

    it('throws when team does not exist', async () => {
      vi.mocked(TeamRepository.prototype.findByName).mockResolvedValue(null)

      await expect(
        service.update({ name: 'missing', userId: 'u1' })
      ).rejects.toMatchObject({ statusCode: 404 })
    })

    it('throws when no fields are provided to update', async () => {
      await expect(
        service.update({ name: 'Platform', userId: 'u1' })
      ).rejects.toMatchObject({ statusCode: 422 })
    })

    it('throws when renaming to an existing team', async () => {
      vi.mocked(TeamRepository.prototype.exists).mockResolvedValue(true)

      await expect(
        service.update({ name: 'Platform', newName: 'Security', userId: 'u1' })
      ).rejects.toMatchObject({ statusCode: 409 })
    })

    it('updates with change metadata', async () => {
      vi.mocked(TeamRepository.prototype.exists).mockResolvedValue(false)
      vi.mocked(TeamRepository.prototype.update).mockResolvedValue('Platform')

      const result = await service.update({
        name: 'Platform',
        newName: 'Platform Engineering',
        email: 'platform@example.com',
        responsibilityArea: 'Infra',
        userId: 'u1',
        realUserId: 'admin-1',
      })

      expect(result).toBe('Platform')
      expect(TeamRepository.prototype.update).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Platform',
        newName: 'Platform Engineering',
        changedFields: expect.arrayContaining(['name', 'email', 'responsibilityArea']),
        userId: 'u1',
        realUserId: 'admin-1',
      }))
    })
  })

  describe('query methods', () => {
    it('findApprovals returns data from repository', async () => {
      vi.mocked(TeamRepository.prototype.findApprovals).mockResolvedValue({
        team: 'Platform',
        technologyApprovals: [],
        versionApprovals: [],
      })

      const result = await service.findApprovals('Platform')

      expect(result.team).toBe('Platform')
    })

    it('findApprovals wraps repository errors as 404', async () => {
      vi.mocked(TeamRepository.prototype.findApprovals).mockRejectedValue(new Error('missing'))

      await expect(service.findApprovals('Missing')).rejects.toMatchObject({ statusCode: 404 })
    })

    it('findConstraints delegates to repository', async () => {
      vi.mocked(TeamRepository.prototype.findConstraints).mockResolvedValue({
        team: 'Platform',
        enforced: [],
        subjectTo: [],
        enforcedCount: 0,
        subjectToCount: 0,
      })

      const result = await service.findConstraints('Platform')
      expect(result.team).toBe('Platform')
    })

    it('findUsage delegates to repository', async () => {
      vi.mocked(TeamRepository.prototype.findUsage).mockResolvedValue({
        team: 'Platform',
        usage: [],
        summary: {
          totalTechnologies: 0,
          compliant: 0,
          unapproved: 0,
          violations: 0,
          migrationNeeded: 0,
        },
      })

      const result = await service.findUsage('Platform')
      expect(result.team).toBe('Platform')
    })

    it('checkApproval throws when repo returns null', async () => {
      vi.mocked(TeamRepository.prototype.checkApproval).mockResolvedValue(null)

      await expect(service.checkApproval('Platform', 'Node.js')).rejects.toMatchObject({ statusCode: 404 })
    })

    it('checkApproval returns approval when found', async () => {
      vi.mocked(TeamRepository.prototype.checkApproval).mockResolvedValue({
        team: 'Platform',
        technology: 'Node.js',
        type: null,
        vendor: null,
        version: null,
        approval: {
          level: 'technology',
          time: 'Tolerate',
        },
      })

      const result = await service.checkApproval('Platform', 'Node.js', '20.0.0', 'production')

      expect(result.approval.level).toBe('technology')
      expect(TeamRepository.prototype.checkApproval).toHaveBeenCalledWith('Platform', 'Node.js', '20.0.0', 'production')
    })
  })
})
