import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import handler from '../../../server/api/dashboard/attention.get'
import {
  versionConstraintService,
  complianceService,
  healthRefreshService,
  componentService,
  gitHubOrgImportService,
  teamService
} from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  versionConstraintService: { getViolations: vi.fn() },
  complianceService: { findViolations: vi.fn() },
  healthRefreshService: { getDashboardSummary: vi.fn() },
  componentService: { getLinkSuggestions: vi.fn() },
  gitHubOrgImportService: { findRecentActive: vi.fn() },
  teamService: { getStewardshipGaps: vi.fn() }
}))

vi.mock('../../../server/utils/cache', () => ({
  cachedFetch: (_key: string, producer: () => Promise<unknown>) => producer()
}))

const { mockGetCurrentUser } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn()
}))

vi.mock('../../../server/utils/auth', () => ({
  getCurrentUser: mockGetCurrentUser
}))

const user = { id: 'user-1', email: 'user@example.com', role: 'user' as const, teams: [] }
const superuser = { id: 'admin-1', email: 'admin@example.com', role: 'superuser' as const, teams: [] }

const healthSummary = {
  vulnerabilityExposure: {
    vulnerableComponents: 4, criticalComponents: 1, highComponents: 3,
    affectedSystems: 2, criticalVulnerabilities: 1, highVulnerabilities: 3
  },
  advisoryHotspots: [],
  refreshCoverage: { totalComponents: 10, refreshedComponents: 8, staleComponents: 1, neverCheckedComponents: 1, failedItems: 0 },
  criticalSystemsAtRisk: { systems: 1, criticalSystems: 1, highSystems: 0, affectedComponents: 1 },
  eolExposure: { total: 2, topItems: [{ name: 'OldTech', version: '1.0.0', systemCount: 4 }] }
}

const stewardshipGaps = {
  unstewardedTechnologies: 2,
  sampleTechnologies: ['Orphan Tech'],
  unstewardedPlatforms: 0,
  samplePlatforms: [],
  unownedSystems: 1,
  sampleSystems: ['Orphan System']
}

beforeAll(() => {
  vi.stubGlobal('requireAuth', vi.fn())
  vi.stubGlobal('requireSuperuser', vi.fn())
})

beforeEach(() => {
  vi.clearAllMocks()

  vi.mocked(versionConstraintService.getViolations).mockResolvedValue({
    data: [], count: 5, summary: { critical: 1, error: 2, warning: 2, info: 0 }
  })
  vi.mocked(complianceService.findViolations).mockResolvedValue({
    violations: [
      { team: 'Payments', technology: 'Legacy SDK', type: 'library', systemCount: 3, systems: ['a', 'b', 'c'], violationType: 'eliminated', notes: null, migrationTarget: null }
    ],
    summary: { totalViolations: 1, teamsAffected: 1, byTeam: [{ team: 'Payments', violationCount: 1, systemsAffected: 3 }] }
  })
  vi.mocked(healthRefreshService.getDashboardSummary).mockResolvedValue(healthSummary as never)
  vi.mocked(teamService.getStewardshipGaps).mockResolvedValue(stewardshipGaps)
  vi.mocked(gitHubOrgImportService.findRecentActive).mockResolvedValue({
    total: 1,
    jobs: [{ id: 'job-1', status: 'failed', organization: 'acme', total: 3, completed: 1, failed: 1, createdAt: '2026-01-01T00:00:00Z', error: 'boom' }]
  })
  vi.mocked(componentService.getLinkSuggestions).mockResolvedValue({ data: [], count: 0, total: 7 })
})

describe('[pin] GET /api/dashboard/attention', () => {
  it('composes the actionable dashboard summary', async () => {
    mockGetCurrentUser.mockResolvedValue(user)

    const result = await handler(mockEvent())

    expect(result.success).toBe(true)
    expect(result.data.versionConstraintViolations).toEqual({ total: 5, critical: 1, error: 2, warning: 2 })
    expect(result.data.complianceViolations).toEqual({
      total: 1,
      teamsAffected: 1,
      topViolations: [{ team: 'Payments', technology: 'Legacy SDK', violationType: 'eliminated', systemCount: 3 }]
    })
    expect(result.data.eolExposure).toEqual({
      total: 2,
      topItems: [{ name: 'OldTech', version: '1.0.0', systemCount: 4 }]
    })
    expect(result.data.stewardshipGaps).toEqual(stewardshipGaps)
    expect(result.data.importJobHealth.total).toBe(1)
    expect(result.data.importJobHealth.jobs).toEqual([
      { id: 'job-1', organization: 'acme', status: 'failed', createdAt: '2026-01-01T00:00:00Z' }
    ])
  })

  it('omits the component link queue for non-superusers', async () => {
    mockGetCurrentUser.mockResolvedValue(user)

    const result = await handler(mockEvent())

    expect(result.data.componentLinkQueue).toBeNull()
    expect(componentService.getLinkSuggestions).not.toHaveBeenCalled()
  })

  it('includes the component link queue for superusers', async () => {
    mockGetCurrentUser.mockResolvedValue(superuser)

    const result = await handler(mockEvent())

    expect(result.data.componentLinkQueue).toEqual({ total: 7 })
    expect(componentService.getLinkSuggestions).toHaveBeenCalledWith(0, 5)
  })

  it('omits the component link queue for anonymous visitors', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await handler(mockEvent())

    expect(result.data.componentLinkQueue).toBeNull()
  })
})
