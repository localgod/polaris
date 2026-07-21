import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { createError } from 'h3'
import { mockEvent } from '../../fixtures/h3-event'
import postHandler from '../../../server/api/version-constraints.post'
import deleteHandler from '../../../server/api/version-constraints/[name].delete'
import patchHandler from '../../../server/api/version-constraints/[name].patch'
import putHandler from '../../../server/api/version-constraints/[name].put'
import { versionConstraintService } from '../../../server/services/singletons'
import { VersionConstraintRepository } from '../../../server/repositories/version-constraint.repository'

vi.mock('../../../server/services/singletons', () => ({
  versionConstraintService: {
    create: vi.fn(),
    delete: vi.fn(),
    updateStatus: vi.fn(),
    update: vi.fn(),
    findByName: vi.fn()
  }
}))

vi.mock('../../../server/repositories/version-constraint.repository')

const { mockRequireAuth, mockGetImpersonatorId } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockGetImpersonatorId: vi.fn().mockResolvedValue(null)
}))

beforeAll(() => {
  vi.stubGlobal('requireAuth', mockRequireAuth)
  vi.stubGlobal('getImpersonatorId', mockGetImpersonatorId)
})

const superuser = { id: 'admin-1', email: 'admin@example.com', role: 'superuser' as const, teams: [] }
const member = { id: 'user-1', email: 'user@example.com', role: 'user' as const, teams: [{ name: 'Platform Team' }] }

const mockConstraint = {
  name: 'Test Constraint', description: 'A test constraint', severity: 'warning',
  status: 'active', scope: 'organization', subjectTeam: null,
  versionRange: '>=18.0.0', subjectTeams: [], governedTechnologies: [], technologyCount: 0
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetImpersonatorId.mockResolvedValue(null)
})

describe('[contract] POST /api/version-constraints', () => {
  it('should return 401 when unauthenticated', async () => {
    mockRequireAuth.mockRejectedValue(createError({ statusCode: 401 }))

    const result = await postHandler(mockEvent({ method: 'POST', body: { name: 'vc', severity: 'warning', versionRange: '>=1.0.0' } }))

    expect(result).toMatchObject({ success: false })
  })

  it('should return 400 when name is missing', async () => {
    mockRequireAuth.mockResolvedValue(superuser)

    const result = await postHandler(mockEvent({ method: 'POST', body: { severity: 'warning', versionRange: '>=1.0.0' } }))

    expect(result).toMatchObject({ success: false, error: 'validation_error' })
  })

  it('should return 400 when severity is missing', async () => {
    mockRequireAuth.mockResolvedValue(superuser)

    const result = await postHandler(mockEvent({ method: 'POST', body: { name: 'vc', versionRange: '>=1.0.0' } }))

    expect(result).toMatchObject({ success: false, error: 'validation_error' })
  })

  it('should return 400 when versionRange is missing', async () => {
    mockRequireAuth.mockResolvedValue(superuser)

    const result = await postHandler(mockEvent({ method: 'POST', body: { name: 'vc', severity: 'warning' } }))

    expect(result).toMatchObject({ success: false, error: 'validation_error' })
  })

  it('should return 409 when constraint name already exists', async () => {
    mockRequireAuth.mockResolvedValue(superuser)
    vi.mocked(versionConstraintService.create).mockRejectedValue(
      createError({ statusCode: 409, message: "Version constraint 'vc' already exists" })
    )

    const result = await postHandler(mockEvent({ method: 'POST', body: { name: 'vc', severity: 'warning', versionRange: '>=1.0.0' } }))

    expect(result).toMatchObject({ success: false, error: 'conflict' })
  })

  it('should create constraint and return 201 on valid input', async () => {
    mockRequireAuth.mockResolvedValue(superuser)
    vi.mocked(versionConstraintService.create).mockResolvedValue({ constraint: mockConstraint, relationshipsCreated: 0 })

    const result = await postHandler(mockEvent({ method: 'POST', body: { name: 'Test Constraint', severity: 'warning', versionRange: '>=18.0.0' } }))

    expect(result).toMatchObject({ success: true, constraint: { name: 'Test Constraint' } })
    expect(versionConstraintService.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Constraint', severity: 'warning', userId: 'admin-1' })
    )
  })
})

describe('[contract] DELETE /api/version-constraints/:name', () => {
  it('should return 400 when name param is missing', async () => {
    mockRequireAuth.mockResolvedValue(superuser)

    await expect(deleteHandler(mockEvent({ method: 'DELETE', params: {} }))).rejects.toMatchObject({ statusCode: 400 })
  })

  it('should return 403 when non-creator non-superuser tries to delete', async () => {
    mockRequireAuth.mockResolvedValue(member)
    vi.mocked(VersionConstraintRepository.prototype.getCreator).mockResolvedValue('other-user')

    await expect(deleteHandler(mockEvent({ method: 'DELETE', params: { name: 'Test Constraint' } }))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('should delete when superuser', async () => {
    mockRequireAuth.mockResolvedValue(superuser)
    vi.mocked(versionConstraintService.delete).mockResolvedValue(undefined)

    const result = await deleteHandler(mockEvent({ method: 'DELETE', params: { name: 'Test Constraint' } }))

    expect(result).toBeNull()
    expect(versionConstraintService.delete).toHaveBeenCalledWith('Test Constraint', 'admin-1', null)
  })

  it('should delete when caller is the creator', async () => {
    mockRequireAuth.mockResolvedValue(member)
    vi.mocked(VersionConstraintRepository.prototype.getCreator).mockResolvedValue('user-1')
    vi.mocked(versionConstraintService.delete).mockResolvedValue(undefined)

    await deleteHandler(mockEvent({ method: 'DELETE', params: { name: 'Test Constraint' } }))

    expect(versionConstraintService.delete).toHaveBeenCalled()
  })
})

describe('[contract] PATCH /api/version-constraints/:name', () => {
  it('should return 400 when name param is missing', async () => {
    mockRequireAuth.mockResolvedValue(superuser)

    const result = await patchHandler(mockEvent({ method: 'PATCH', params: {}, body: { status: 'draft' } }))

    expect(result).toMatchObject({ success: false, error: 'validation_error' })
  })

  it('should return 400 for invalid status value', async () => {
    mockRequireAuth.mockResolvedValue(superuser)
    vi.mocked(VersionConstraintRepository.prototype.getCreator).mockResolvedValue('admin-1')

    const result = await patchHandler(mockEvent({ method: 'PATCH', params: { name: 'vc' }, body: { status: 'invalid' } }))

    expect(result).toMatchObject({ success: false, error: 'validation_error' })
  })

  it('should return 403 when non-creator non-superuser tries to patch', async () => {
    mockRequireAuth.mockResolvedValue(member)
    vi.mocked(VersionConstraintRepository.prototype.getCreator).mockResolvedValue('other-user')

    await expect(patchHandler(mockEvent({ method: 'PATCH', params: { name: 'vc' }, body: { status: 'draft' } }))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('should update status when superuser', async () => {
    mockRequireAuth.mockResolvedValue(superuser)
    vi.mocked(versionConstraintService.updateStatus).mockResolvedValue({ constraint: { ...mockConstraint, status: 'draft' }, previousStatus: 'active' })

    const result = await patchHandler(mockEvent({ method: 'PATCH', params: { name: 'Test Constraint' }, body: { status: 'draft' } }))

    expect(result).toMatchObject({ success: true, constraint: { status: 'draft' } })
  })
})

describe('[contract] PUT /api/version-constraints/:name — subjectTeam reassignment authorization', () => {
  const teamConstraint = { ...mockConstraint, scope: 'team', subjectTeam: 'Platform Team' }

  it('should return 404 when constraint does not exist', async () => {
    mockRequireAuth.mockResolvedValue(superuser)
    vi.mocked(versionConstraintService.findByName).mockResolvedValue(null)

    await expect(putHandler(mockEvent({ method: 'PUT', params: { name: 'nonexistent' }, body: {} }))).rejects.toMatchObject({ statusCode: 404 })
  })

  it('should return 403 when non-superuser tries to edit org-scoped constraint', async () => {
    mockRequireAuth.mockResolvedValue(member)
    vi.mocked(versionConstraintService.findByName).mockResolvedValue(mockConstraint)

    await expect(putHandler(mockEvent({ method: 'PUT', params: { name: 'Test Constraint' }, body: {} }))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('should return 403 when member is not in the constraint team', async () => {
    mockRequireAuth.mockResolvedValue({ ...member, teams: [{ name: 'Other Team' }] })
    vi.mocked(versionConstraintService.findByName).mockResolvedValue(teamConstraint)

    await expect(putHandler(mockEvent({ method: 'PUT', params: { name: 'Test Constraint' }, body: {} }))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('should return 403 when member tries to reassign to a team they do not belong to', async () => {
    mockRequireAuth.mockResolvedValue(member)
    vi.mocked(versionConstraintService.findByName).mockResolvedValue(teamConstraint)

    await expect(putHandler(mockEvent({ method: 'PUT', params: { name: 'Test Constraint' }, body: { subjectTeam: 'Other Team' } }))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('should allow superuser to reassign to any team', async () => {
    mockRequireAuth.mockResolvedValue(superuser)
    vi.mocked(versionConstraintService.findByName).mockResolvedValue(teamConstraint)
    vi.mocked(versionConstraintService.update).mockResolvedValue({ ...teamConstraint, subjectTeam: 'Other Team' })

    const result = await putHandler(mockEvent({ method: 'PUT', params: { name: 'Test Constraint' }, body: { subjectTeam: 'Other Team' } }))

    expect(result).toMatchObject({ success: true })
  })

  it('should allow member to update their own team constraint without reassignment', async () => {
    mockRequireAuth.mockResolvedValue(member)
    vi.mocked(versionConstraintService.findByName).mockResolvedValue(teamConstraint)
    vi.mocked(versionConstraintService.update).mockResolvedValue(teamConstraint)

    const result = await putHandler(mockEvent({ method: 'PUT', params: { name: 'Test Constraint' }, body: { description: 'Updated' } }))

    expect(result).toMatchObject({ success: true })
  })
})
