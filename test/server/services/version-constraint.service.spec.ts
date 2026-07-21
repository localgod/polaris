import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VersionConstraintService } from '../../../server/services/version-constraint.service'
import { VersionConstraintRepository } from '../../../server/repositories/version-constraint.repository'
import { logger } from '../../../server/utils/logger'
import '../../fixtures/service-test-helper'

vi.mock('../../../server/repositories/version-constraint.repository')

describe('VersionConstraintService', () => {
  let service: VersionConstraintService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new VersionConstraintService()
  })

  describe('[pin] delete()', () => {
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

  describe('[pin] findAll()', () => {
    it('returns data with count and total', async () => {
      vi.mocked(VersionConstraintRepository.prototype.findAll).mockResolvedValue({
        data: [{
          name: 'vc-1',
          description: null,
          severity: 'warning',
          scope: 'organization',
          subjectTeam: null,
          versionRange: '>=1.0.0',
          status: 'active',
          subjectTeams: [],
          governedTechnologies: [],
          technologyCount: 0,
        }],
        total: 12,
      })

      const result = await service.findAll({ limit: 1, offset: 0 })

      expect(result.count).toBe(1)
      expect(result.total).toBe(12)
      expect(result.data[0]?.name).toBe('vc-1')
    })
  })

  describe('[contract] getViolations()', () => {
    it('filters out compliant and non-semver component versions', async () => {
      vi.mocked(VersionConstraintRepository.prototype.findViolations).mockResolvedValue([
        {
          team: 'Platform',
          system: 'orders',
          systemBusinessCriticality: null,
          systemEnvironment: null,
          component: 'node',
          componentVersion: '18.0.0',
          technology: 'Node.js',
          technologyType: 'runtime',
          constraint: { name: 'node-policy', description: '', severity: 'error', versionRange: '>=20.0.0' },
        },
        {
          team: 'Platform',
          system: 'orders',
          systemBusinessCriticality: null,
          systemEnvironment: null,
          component: 'node',
          componentVersion: '20.1.0',
          technology: 'Node.js',
          technologyType: 'runtime',
          constraint: { name: 'node-policy', description: '', severity: 'error', versionRange: '>=20.0.0' },
        },
        {
          team: 'Platform',
          system: 'orders',
          systemBusinessCriticality: null,
          systemEnvironment: null,
          component: 'node',
          componentVersion: 'not-semver',
          technology: 'Node.js',
          technologyType: 'runtime',
          constraint: { name: 'node-policy', description: '', severity: 'critical', versionRange: '>=20.0.0' },
        },
      ])

      const result = await service.getViolations({})

      expect(result.count).toBe(1)
      expect(result.data[0]?.componentVersion).toBe('18.0.0')
      expect(result.summary.error).toBe(1)
      expect(result.summary.critical).toBe(0)
    })

    it('throws for invalid severity filter', async () => {
      await expect(service.getViolations({ severity: 'bogus' })).rejects.toMatchObject({ statusCode: 400 })
    })

    it('logs a warn for critical/error violations but not warning/info', async () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => logger)
      vi.mocked(VersionConstraintRepository.prototype.findViolations).mockResolvedValue([
        {
          team: 'Platform', system: 'orders', systemBusinessCriticality: null, systemEnvironment: null,
          component: 'node', componentVersion: '18.0.0', technology: 'Node.js', technologyType: 'runtime',
          constraint: { name: 'node-critical', description: '', severity: 'critical', versionRange: '>=20.0.0' },
        },
        {
          team: 'Platform', system: 'orders', systemBusinessCriticality: null, systemEnvironment: null,
          component: 'lodash', componentVersion: '3.0.0', technology: 'lodash', technologyType: 'library',
          constraint: { name: 'lodash-info', description: '', severity: 'info', versionRange: '>=4.0.0' },
        },
      ])

      await service.getViolations({})

      expect(warnSpy).toHaveBeenCalledOnce()
      expect(warnSpy).toHaveBeenCalledWith(
        expect.objectContaining({ constraintName: 'node-critical', severity: 'critical' }),
        'Version constraint violated'
      )
    })
  })

  describe('[pin] findByName()', () => {
    it('delegates to repository', async () => {
      vi.mocked(VersionConstraintRepository.prototype.findByName).mockResolvedValue(null)

      await expect(service.findByName('vc-1')).resolves.toBeNull()
      expect(VersionConstraintRepository.prototype.findByName).toHaveBeenCalledWith('vc-1')
    })
  })

  describe('[contract] update()', () => {
    it('throws 404 when target does not exist', async () => {
      vi.mocked(VersionConstraintRepository.prototype.exists).mockResolvedValue(false)

      await expect(service.update('missing', { userId: 'u1' })).rejects.toMatchObject({ statusCode: 404 })
      expect(VersionConstraintRepository.prototype.update).not.toHaveBeenCalled()
    })

    it('throws 400 for invalid severity', async () => {
      vi.mocked(VersionConstraintRepository.prototype.exists).mockResolvedValue(true)

      await expect(
        service.update('vc-1', { userId: 'u1', severity: 'bogus' as never })
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('throws 400 for team scope without subjectTeam', async () => {
      vi.mocked(VersionConstraintRepository.prototype.exists).mockResolvedValue(true)

      await expect(
        service.update('vc-1', { userId: 'u1', scope: 'team', subjectTeam: '' })
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('updates when payload is valid', async () => {
      vi.mocked(VersionConstraintRepository.prototype.exists).mockResolvedValue(true)
      vi.mocked(VersionConstraintRepository.prototype.update).mockResolvedValue({
        name: 'vc-1',
        description: null,
        severity: 'warning',
        scope: 'organization',
        subjectTeam: null,
        versionRange: '>=1.0.0',
        status: 'active',
        subjectTeams: [],
        governedTechnologies: [],
        technologyCount: 0,
      })

      const result = await service.update('vc-1', { userId: 'u1', severity: 'warning' })

      expect(result.name).toBe('vc-1')
      expect(VersionConstraintRepository.prototype.update).toHaveBeenCalledWith('vc-1', { userId: 'u1', severity: 'warning' })
    })
  })

  describe('[pin] updateStatus()', () => {
    it('throws for invalid status value', async () => {
      await expect(
        service.updateStatus('vc-1', { status: 'invalid' as never }, 'u1')
      ).rejects.toMatchObject({ statusCode: 400 })
      expect(VersionConstraintRepository.prototype.updateStatus).not.toHaveBeenCalled()
    })

    it('delegates updateStatus for valid status values', async () => {
      vi.mocked(VersionConstraintRepository.prototype.updateStatus).mockResolvedValue({
        previousStatus: 'draft',
        constraint: {
          name: 'vc-1',
          description: null,
          severity: 'warning',
          scope: 'organization',
          subjectTeam: null,
          versionRange: '>=1.0.0',
          status: 'active',
          subjectTeams: [],
          governedTechnologies: [],
          technologyCount: 0,
        }
      })

      const result = await service.updateStatus('vc-1', { status: 'active' }, 'u1', 'admin-1')

      expect(result.previousStatus).toBe('draft')
      expect(VersionConstraintRepository.prototype.updateStatus).toHaveBeenCalledWith('vc-1', { status: 'active' }, 'u1', 'admin-1')
    })
  })
})
