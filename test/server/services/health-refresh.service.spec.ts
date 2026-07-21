import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HealthRefreshService } from '../../../server/services/health-refresh.service'

const component = {
  name: 'example',
  version: '1.2.3',
  packageManager: 'npm',
  purl: 'pkg:npm/example@1.2.3',
  cpe: null,
  bomRef: null,
  type: 'library',
  group: null,
  scope: null,
  isDirect: null,
  hashes: [],
  licenses: [],
  copyright: null,
  supplier: null,
  author: null,
  publisher: null,
  homepage: 'https://github.com/acme/example',
  externalReferences: [],
  description: null,
  releaseDate: '2026-01-01T00:00:00Z',
  publishedDate: null,
  modifiedDate: null,
  technologyName: null,
  systemCount: 1,
  systems: [],
  directDependencies: [],
  eol: null,
  packageMetadata: null,
  maintenanceHealth: null,
  securityScorecard: null,
  vulnerabilities: null
}

function createHealthRepo(correlationId: string | null = null) {
  let firstBatch = true
  return {
    findById: vi.fn(async () => ({
      id: 'job-1',
      status: 'running',
      trigger: 'sbom_import',
      systemName: null,
      totalItems: 1,
      completedItems: 0,
      failedItems: 0,
      createdAt: '2026-06-19T12:00:00Z',
      startedAt: '2026-06-19T12:00:00Z',
      finishedAt: null,
      error: null,
      correlationId,
      items: []
    })),
    getPendingItems: vi.fn(async () => {
      if (!firstBatch) return []
      firstBatch = false
      return [{
        id: 'item-1',
        componentPurl: component.purl,
        componentName: component.name,
        componentVersion: component.version,
        packageManager: component.packageManager,
        status: 'pending',
        failedSources: [],
        failedFields: [],
        errorSummary: null,
        startedAt: null,
        finishedAt: null
      }]
    }),
    markItemRunning: vi.fn(async () => {}),
    upsertHealthSnapshot: vi.fn(async () => {}),
    markItemFinished: vi.fn(async () => {}),
    markJobCompletedIfDone: vi.fn(async () => {})
  }
}

function createRefreshDeps() {
  const componentRepo = {
    findByIdentity: vi.fn(async () => component)
  }
  const auditRepo = {
    create: vi.fn(async () => {})
  }
  const eolService = {
    getEOLStatus: vi.fn(async () => ({
      status: 'unknown',
      reason: 'fetch_failed',
      productName: null,
      productLabel: null,
      matchedCycle: null,
      eolDate: null,
      supportEndDate: null,
      daysUntilEOL: null,
      daysSinceEOL: null,
      lts: null,
      latestVersion: null,
      latestReleaseDate: null,
      source: {
        name: 'endoflife.date',
        url: null
      }
    }))
  }
  const packageMetadataService = {
    getMetadata: vi.fn(async () => ({
      status: 'available',
      system: 'npm',
      packageName: 'example',
      currentVersion: '1.2.3',
      latestVersion: '1.3.0',
      defaultVersion: '1.3.0',
      publishedAt: '2026-01-01T00:00:00Z',
      isDeprecated: false,
      deprecatedReason: null,
      licenses: [],
      advisoryCount: 2,
      advisories: [],
      recentReleases: 1,
      source: {
        name: 'npm',
        url: 'https://www.npmjs.com/package/example'
      }
    }))
  }
  const securityScoreService = {
    getScore: vi.fn(async () => ({
      status: 'available',
      repository: {
        host: 'github.com',
        owner: 'acme',
        name: 'example',
        url: 'https://github.com/acme/example'
      },
      score: 7.5,
      checks: [],
      scannedAt: '2026-06-18T00:00:00Z',
      source: {
        name: 'OpenSSF Scorecard',
        url: 'https://scorecard.dev/viewer/?uri=github.com/acme/example'
      }
    }))
  }
  const vulnerabilityService = {
    getVulnerabilities: vi.fn(async () => ({
      status: 'available',
      vulnerabilities: [{
        id: 'GHSA-xxxx-yyyy-zzzz',
        aliases: ['CVE-2026-1234'],
        summary: 'Example advisory',
        severity: {
          type: 'CVSS_V3',
          score: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
          cvssScore: 9.8
        },
        affectedRanges: [],
        advisoryUrl: 'https://osv.dev/vulnerability/GHSA-xxxx-yyyy-zzzz',
        publishedAt: '2026-05-01T00:00:00Z',
        modifiedAt: '2026-05-02T00:00:00Z'
      }],
      source: {
        name: 'OSV.dev',
        url: 'https://osv.dev/list?q=pkg%3Anpm%2Fexample%401.2.3'
      }
    }))
  }

  return { componentRepo, auditRepo, eolService, packageMetadataService, securityScoreService, vulnerabilityService }
}

describe('[contract] HealthRefreshService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-19T12:00:00Z'))
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('preserves failed source fields while persisting successful dimensions and auditing failures', async () => {
    const healthRepo = createHealthRepo()
    const { componentRepo, auditRepo, eolService, packageMetadataService, securityScoreService, vulnerabilityService } = createRefreshDeps()

    const service = new HealthRefreshService(
      healthRepo as never,
      componentRepo as never,
      auditRepo as never,
      eolService as never,
      packageMetadataService as never,
      securityScoreService as never,
      vulnerabilityService as never
    )

    await service.processJob('job-1', { batchSize: 10 })

    expect(healthRepo.upsertHealthSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      componentPurl: 'pkg:npm/example@1.2.3',
      values: expect.objectContaining({
        vulnerabilityTotal: 1,
        vulnerabilityCritical: 1,
        maintenanceStatus: 'stable',
        maintenanceSource: 'npm',
        securityScore: 7.5
      }),
      advisories: [expect.objectContaining({
        id: 'GHSA-xxxx-yyyy-zzzz',
        aliases: ['CVE-2026-1234'],
        cvssScore: 9.8
      })]
    }))
    expect(healthRepo.upsertHealthSnapshot.mock.calls[0][0].values).not.toHaveProperty('eolStatus')
    expect(auditRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'HEALTH_REFRESH_FAILED',
      entityType: 'Component',
      entityId: 'pkg:npm/example@1.2.3',
      changedFields: expect.arrayContaining(['eolStatus', 'eolDate', 'eolSource', 'eolRefreshedAt']),
      source: 'HEALTH_REFRESH',
      correlationId: null
    }))
    expect(healthRepo.markItemFinished).toHaveBeenCalledWith('job-1', 'item-1', 'failed', expect.objectContaining({
      failedSources: ['endoflife.date'],
      failedFields: expect.arrayContaining(['eolStatus'])
    }))
  })

  it('stamps the HEALTH_REFRESH_FAILED audit entry with the job\'s correlationId', async () => {
    const healthRepo = createHealthRepo('corr-sbom-1')
    const { componentRepo, auditRepo, eolService, packageMetadataService, securityScoreService, vulnerabilityService } = createRefreshDeps()

    const service = new HealthRefreshService(
      healthRepo as never,
      componentRepo as never,
      auditRepo as never,
      eolService as never,
      packageMetadataService as never,
      securityScoreService as never,
      vulnerabilityService as never
    )

    await service.processJob('job-1', { batchSize: 10 })

    expect(healthRepo.findById).toHaveBeenCalledWith('job-1')
    expect(auditRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'HEALTH_REFRESH_FAILED',
      correlationId: 'corr-sbom-1'
    }))
  })
})
