import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VersionConstraintService } from '../../../server/services/version-constraint.service'
import { VersionConstraintRepository } from '../../../server/repositories/version-constraint.repository'
import '../../fixtures/service-test-helper'

vi.mock('../../../server/repositories/version-constraint.repository')

describe('VersionConstraintService - create()', () => {
  let service: VersionConstraintService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new VersionConstraintService()
  })

  it('should create a version constraint', async () => {
    vi.mocked(VersionConstraintRepository.prototype.exists).mockResolvedValue(false)
    vi.mocked(VersionConstraintRepository.prototype.create).mockResolvedValue({
      constraint: {
        name: 'test-vc', description: 'Test', severity: 'warning',
        status: 'active', scope: 'organization', subjectTeam: null,
        versionRange: '>=18.0.0', subjectTeams: [], governedTechnologies: [],
        technologyCount: 0
      },
      relationshipsCreated: 2
    })

    const result = await service.create({
      name: 'test-vc', description: 'Test',
      severity: 'warning', scope: 'organization',
      versionRange: '>=18.0.0', userId: 'test-user'
    })

    expect(result.constraint.name).toBe('test-vc')
    expect(VersionConstraintRepository.prototype.exists).toHaveBeenCalledOnce()
    expect(VersionConstraintRepository.prototype.create).toHaveBeenCalledOnce()
  })

  it('should throw if name already exists', async () => {
    vi.mocked(VersionConstraintRepository.prototype.exists).mockResolvedValue(true)

    await expect(
      service.create({ name: 'existing', severity: 'warning', versionRange: '>=1.0.0', userId: 'test-user' })
    ).rejects.toThrow()

    expect(VersionConstraintRepository.prototype.create).not.toHaveBeenCalled()
  })

  it('should throw if severity is invalid', async () => {
    vi.mocked(VersionConstraintRepository.prototype.exists).mockResolvedValue(false)

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.create({ name: 'bad-sev', severity: 'invalid' as any, versionRange: '>=1.0.0', userId: 'test-user' })
    ).rejects.toThrow()

    expect(VersionConstraintRepository.prototype.create).not.toHaveBeenCalled()
  })

  it('should throw if versionRange is missing', async () => {
    vi.mocked(VersionConstraintRepository.prototype.exists).mockResolvedValue(false)

    await expect(
      service.create({ name: 'no-range', severity: 'warning', versionRange: '', userId: 'test-user' })
    ).rejects.toThrow()

    expect(VersionConstraintRepository.prototype.create).not.toHaveBeenCalled()
  })

  it('should propagate repository errors', async () => {
    vi.mocked(VersionConstraintRepository.prototype.exists).mockResolvedValue(false)
    vi.mocked(VersionConstraintRepository.prototype.create).mockRejectedValue(new Error('DB error'))

    await expect(
      service.create({ name: 'fail', severity: 'warning', versionRange: '>=1.0.0', userId: 'test-user' })
    ).rejects.toThrow('DB error')
  })
})
