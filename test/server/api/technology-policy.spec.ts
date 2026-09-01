import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import getHandler from '../../../server/api/technologies/[name]/policy.get'
import postHandler from '../../../server/api/technologies/[name]/policy.post'
import historyHandler from '../../../server/api/technologies/[name]/policy/history.get'
import activateHandler from '../../../server/api/technologies/[name]/policy/activate.post'
import archiveHandler from '../../../server/api/technologies/[name]/policy/archive.post'
import exceptionsPostHandler from '../../../server/api/technologies/[name]/policy/exceptions.post'
import exceptionDeleteHandler from '../../../server/api/technologies/[name]/policy/exceptions/[exceptionId].delete'
import type { TechnologyDetail } from '../../../server/services/technology.service'
import { policyService, technologyService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  policyService: {
    getActive: vi.fn(),
    propose: vi.fn(),
    getHistory: vi.fn(),
    activate: vi.fn(),
    archive: vi.fn(),
    createException: vi.fn(),
    revokeException: vi.fn(),
  },
  technologyService: {
    findByName: vi.fn(),
  },
}))

const { mockRequireAuth, mockRequireOrgAdmin, mockGetImpersonatorId } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockRequireOrgAdmin: vi.fn(),
  mockGetImpersonatorId: vi.fn().mockResolvedValue(null),
}))

beforeAll(() => {
  vi.stubGlobal('requireAuth', mockRequireAuth)
  vi.stubGlobal('requireOrgAdmin', mockRequireOrgAdmin)
  vi.stubGlobal('getImpersonatorId', mockGetImpersonatorId)
})

const authUser = { id: 'u1', email: 'user@example.com', role: 'user' as const, orgAdmin: false, teams: [{ name: 'Platform' }] }
const orgAdmin = { id: 'oa1', email: 'oa@example.com', role: 'user' as const, orgAdmin: true, teams: [] }

const mockPolicy = {
  id: 'p-1',
  time: 'invest' as const,
  rationale: 'Strategic investment',
  migrationTarget: null,
  status: 'active' as const,
  effectiveDate: null,
  expiryDate: null,
  createdBy: 'u1',
  createdByName: 'Alice',
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
  exceptions: [],
}

const mockException = {
  id: 'e-1',
  time: 'tolerate' as const,
  reason: 'Legacy integration',
  approver: 'oa1',
  scope: 'team' as const,
  scopeName: 'Platform',
  environment: null,
  effectiveDate: '2026-08-01',
  expiresAt: '2027-08-01',
  createdAt: '2026-08-01T00:00:00Z',
  revokedAt: null,
  revokedBy: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAuth.mockResolvedValue(authUser)
  mockRequireOrgAdmin.mockResolvedValue(orgAdmin)
})

describe('[contract] GET /api/technologies/:name/policy', () => {
  it('returns the active policy when one exists', async () => {
    vi.mocked(policyService.getActive).mockResolvedValue(mockPolicy)

    const result = await getHandler(mockEvent({ params: { name: 'React' } }))

    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({ id: 'p-1', time: 'invest', status: 'active' })
  })

  it('returns null data when no active policy exists', async () => {
    vi.mocked(policyService.getActive).mockResolvedValue(null)

    const result = await getHandler(mockEvent({ params: { name: 'React' } }))

    expect(result.success).toBe(true)
    expect(result.data).toBeNull()
  })

  it('decodes URL-encoded technology name', async () => {
    vi.mocked(policyService.getActive).mockResolvedValue(null)

    await getHandler(mockEvent({ params: { name: 'Node.js%20Runtime' } }))

    expect(policyService.getActive).toHaveBeenCalledWith('Node.js Runtime')
  })

  it('throws 400 when name param is missing', async () => {
    await expect(getHandler(mockEvent())).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('[contract] POST /api/technologies/:name/policy (propose)', () => {
  it('allows org-admin to propose a policy without steward check', async () => {
    mockRequireAuth.mockResolvedValue(orgAdmin)
    vi.mocked(policyService.propose).mockResolvedValue(mockPolicy)

    const result = await postHandler(mockEvent({
      params: { name: 'React' },
      body: { time: 'invest', rationale: 'Strategic investment' },
    }))

    expect(result.success).toBe(true)
    expect(technologyService.findByName).not.toHaveBeenCalled()
  })

  it('allows steward of the technology to propose', async () => {
    mockRequireAuth.mockResolvedValue(authUser)
    vi.mocked(technologyService.findByName).mockResolvedValue({ name: 'React', stewardTeamName: 'Platform' } as unknown as TechnologyDetail)
    vi.mocked(policyService.propose).mockResolvedValue(mockPolicy)

    const result = await postHandler(mockEvent({
      params: { name: 'React' },
      body: { time: 'invest' },
    }))

    expect(result.success).toBe(true)
  })

  it('throws 403 when user is neither org-admin nor steward', async () => {
    const regularUser = { ...authUser, teams: [{ name: 'Other' }] }
    mockRequireAuth.mockResolvedValue(regularUser)
    vi.mocked(technologyService.findByName).mockResolvedValue({ name: 'React', stewardTeamName: 'Platform' } as unknown as TechnologyDetail)

    await expect(postHandler(mockEvent({
      params: { name: 'React' },
      body: { time: 'invest' },
    }))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('throws 404 when technology does not exist (non-admin proposer)', async () => {
    mockRequireAuth.mockResolvedValue(authUser)
    vi.mocked(technologyService.findByName).mockResolvedValue(null)

    await expect(postHandler(mockEvent({
      params: { name: 'Unknown' },
      body: { time: 'invest' },
    }))).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 400 when time is missing', async () => {
    await expect(postHandler(mockEvent({
      params: { name: 'React' },
      body: {},
    }))).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('[contract] GET /api/technologies/:name/policy/history', () => {
  it('returns all policy records ordered newest first', async () => {
    const archived = { ...mockPolicy, id: 'p-0', status: 'archived' as const }
    vi.mocked(policyService.getHistory).mockResolvedValue([mockPolicy, archived])

    const result = await historyHandler(mockEvent({ params: { name: 'React' } }))

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
    expect(result.data[0].id).toBe('p-1')
  })
})

describe('[contract] POST /api/technologies/:name/policy/activate', () => {
  it('activates a draft policy and returns the updated policy', async () => {
    vi.mocked(policyService.activate).mockResolvedValue({ ...mockPolicy, status: 'active' })

    const result = await activateHandler(mockEvent({
      params: { name: 'React' },
      body: { policyId: 'p-1' },
    }))

    expect(result.success).toBe(true)
    expect(result.data.status).toBe('active')
    expect(policyService.activate).toHaveBeenCalledWith('p-1', orgAdmin.id, null, undefined)
  })

  it('throws 400 when policyId is missing', async () => {
    await expect(activateHandler(mockEvent({
      params: { name: 'React' },
      body: {},
    }))).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('[contract] POST /api/technologies/:name/policy/archive', () => {
  it('archives a policy and returns the archived policy', async () => {
    vi.mocked(policyService.archive).mockResolvedValue({ ...mockPolicy, status: 'archived' })

    const result = await archiveHandler(mockEvent({
      params: { name: 'React' },
      body: { policyId: 'p-1' },
    }))

    expect(result.success).toBe(true)
    expect(result.data.status).toBe('archived')
  })

  it('throws 400 when policyId is missing', async () => {
    await expect(archiveHandler(mockEvent({
      params: { name: 'React' },
      body: {},
    }))).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('[contract] POST /api/technologies/:name/policy/exceptions', () => {
  const validBody = {
    time: 'tolerate',
    reason: 'Legacy integration',
    approver: 'oa1',
    scope: 'team',
    scopeName: 'Platform',
    effectiveDate: '2026-08-01',
    expiresAt: '2027-08-01',
  }

  it('creates an exception and returns 201', async () => {
    vi.mocked(policyService.createException).mockResolvedValue(mockException)

    const result = await exceptionsPostHandler(mockEvent({
      params: { name: 'React' },
      body: validBody,
    }))

    expect(result.data).toMatchObject({ id: 'e-1', time: 'tolerate', scope: 'team' })
  })

  it('throws 400 when required fields are missing', async () => {
    await expect(exceptionsPostHandler(mockEvent({
      params: { name: 'React' },
      body: { time: 'tolerate' },
    }))).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('[contract] DELETE /api/technologies/:name/policy/exceptions/:exceptionId', () => {
  it('revokes the exception and returns the revoked record', async () => {
    vi.mocked(policyService.revokeException).mockResolvedValue({ ...mockException, revokedAt: '2026-09-01T00:00:00Z', revokedBy: 'oa1' })

    const result = await exceptionDeleteHandler(mockEvent({
      params: { name: 'React', exceptionId: 'e-1' },
    }))

    expect(result.success).toBe(true)
    expect(result.data.revokedAt).toBeTruthy()
    expect(policyService.revokeException).toHaveBeenCalledWith('e-1', orgAdmin.id, null, undefined)
  })

  it('throws 400 when exceptionId is missing', async () => {
    await expect(exceptionDeleteHandler(mockEvent({
      params: { name: 'React' },
    }))).rejects.toMatchObject({ statusCode: 400 })
  })
})
