import { describe, expect, it } from 'vitest'
import { calculateMaintenanceHealth } from '../../../server/utils/component-health'
import type { Component, PackageMetadata } from '../../../types/api'

const now = new Date('2026-06-18T00:00:00Z')

const baseComponent: Pick<Component, 'releaseDate' | 'publishedDate' | 'modifiedDate' | 'version'> = {
  version: '1.2.3',
  releaseDate: null,
  publishedDate: null,
  modifiedDate: null
}

const baseMetadata: PackageMetadata = {
  status: 'available',
  system: 'npm',
  packageName: 'example',
  currentVersion: '1.2.3',
  latestVersion: '1.2.3',
  defaultVersion: '1.2.3',
  publishedAt: '2026-05-01T00:00:00Z',
  isDeprecated: false,
  deprecatedReason: null,
  licenses: [],
  advisoryCount: 0,
  advisories: [],
  recentReleases: 2,
  source: {
    name: 'deps.dev',
    url: 'https://deps.dev/npm/example/1.2.3'
  }
}

describe('[pin] calculateMaintenanceHealth', () => {
  it('returns healthy for a recent current version', () => {
    const health = calculateMaintenanceHealth(baseComponent, baseMetadata, now)

    expect(health).toMatchObject({
      status: 'healthy',
      confidence: 'high',
      ageInDays: 48,
      isMature: true,
      updateType: 'none',
      recentActivity: true,
      reasonCodes: expect.arrayContaining(['version_recent', 'current_version_current', 'upstream_recent_activity'])
    })
  })

  it('returns stable for mature current versions with moderate age', () => {
    const health = calculateMaintenanceHealth({
      ...baseComponent,
      releaseDate: '2025-09-01T00:00:00Z'
    }, {
      ...baseMetadata,
      publishedAt: null,
      recentReleases: 1
    }, now)

    expect(health).toMatchObject({
      status: 'stable',
      confidence: 'high',
      updateType: 'none',
      recentActivity: true,
      reasonCodes: expect.arrayContaining(['version_moderately_old', 'mature_version'])
    })
  })

  it('returns aging when an old version is behind a minor update', () => {
    const health = calculateMaintenanceHealth({
      ...baseComponent,
      releaseDate: '2025-01-01T00:00:00Z'
    }, {
      ...baseMetadata,
      latestVersion: '1.3.0',
      recentReleases: 0
    }, now)

    expect(health).toMatchObject({
      status: 'aging',
      confidence: 'medium',
      updateType: 'minor',
      recentActivity: false,
      reasonCodes: expect.arrayContaining(['version_old', 'minor_update_available', 'upstream_no_recent_activity'])
    })
  })

  it('returns stale for very old versions without recent upstream activity', () => {
    const health = calculateMaintenanceHealth({
      ...baseComponent,
      releaseDate: '2023-01-01T00:00:00Z'
    }, {
      ...baseMetadata,
      recentReleases: 0
    }, now)

    expect(health).toMatchObject({
      status: 'stale',
      confidence: 'high',
      recentActivity: false,
      reasonCodes: expect.arrayContaining(['version_very_old', 'upstream_no_recent_activity'])
    })
  })

  it('returns unknown when dates and usable version signals are missing', () => {
    const health = calculateMaintenanceHealth({
      ...baseComponent,
      version: ''
    }, {
      status: 'unavailable',
      reason: 'missing_purl',
      system: null,
      packageName: null,
      currentVersion: null,
      latestVersion: null,
      defaultVersion: null,
      publishedAt: null,
      isDeprecated: null,
      deprecatedReason: null,
      licenses: [],
      advisoryCount: null,
      advisories: [],
      recentReleases: null,
      source: {
        name: 'deps.dev',
        url: null
      }
    }, now)

    expect(health).toMatchObject({
      status: 'unknown',
      confidence: 'low',
      ageInDays: null,
      isMature: null,
      updateType: 'unknown',
      reasonCodes: expect.arrayContaining(['missing_release_date', 'missing_version', 'metadata_unavailable', 'insufficient_data'])
    })
  })

  it('returns unknown for invalid dates', () => {
    const health = calculateMaintenanceHealth({
      ...baseComponent,
      releaseDate: 'not-a-date'
    }, baseMetadata, now)

    expect(health).toMatchObject({
      status: 'unknown',
      confidence: 'low',
      ageInDays: null,
      reasonCodes: expect.arrayContaining(['invalid_release_date'])
    })
  })

  it('does not force unsupported version schemes through semver', () => {
    const health = calculateMaintenanceHealth({
      ...baseComponent,
      version: '1:2.0.0-1ubuntu1',
      releaseDate: '2026-04-01T00:00:00Z'
    }, {
      ...baseMetadata,
      currentVersion: '1:2.0.0-1ubuntu1',
      latestVersion: '1:2.0.0-2ubuntu1'
    }, now)

    expect(health).toMatchObject({
      status: 'healthy',
      confidence: 'medium',
      isMature: null,
      updateType: 'unknown',
      reasonCodes: expect.arrayContaining(['unsupported_version_scheme', 'update_status_unknown'])
    })
  })

  it('flags pre-1.0 versions without treating them as mature', () => {
    const health = calculateMaintenanceHealth({
      ...baseComponent,
      version: '0.8.0',
      releaseDate: '2026-02-01T00:00:00Z'
    }, {
      ...baseMetadata,
      currentVersion: '0.8.0',
      latestVersion: '0.8.1'
    }, now)

    expect(health).toMatchObject({
      status: 'unknown',
      isMature: false,
      updateType: 'patch',
      reasonCodes: expect.arrayContaining(['pre_1_0_version', 'patch_update_available'])
    })
  })

  it('marks deprecated packages stale', () => {
    const health = calculateMaintenanceHealth(baseComponent, {
      ...baseMetadata,
      isDeprecated: true,
      deprecatedReason: 'Package no longer maintained.'
    }, now)

    expect(health).toMatchObject({
      status: 'stale',
      confidence: 'high',
      reasonCodes: expect.arrayContaining(['package_deprecated'])
    })
  })

  it('prefers the component version when package metadata disagrees', () => {
    const health = calculateMaintenanceHealth({
      ...baseComponent,
      version: '1.2.3',
      releaseDate: '2026-05-01T00:00:00Z'
    }, {
      ...baseMetadata,
      currentVersion: '9.9.9',
      latestVersion: '1.2.4'
    }, now)

    expect(health).toMatchObject({
      currentVersion: '1.2.3',
      latestVersion: '1.2.4',
      updateType: 'patch',
      inputsUsed: expect.arrayContaining(['component.version'])
    })
    expect(health.inputsUsed).not.toContain('packageMetadata.currentVersion')
  })

  it('tracks package metadata current version when component version is missing', () => {
    const health = calculateMaintenanceHealth({
      ...baseComponent,
      version: '',
      releaseDate: '2026-05-01T00:00:00Z'
    }, {
      ...baseMetadata,
      currentVersion: '1.2.3',
      latestVersion: '1.2.4'
    }, now)

    expect(health).toMatchObject({
      currentVersion: '1.2.3',
      updateType: 'patch',
      inputsUsed: expect.arrayContaining(['packageMetadata.currentVersion'])
    })
    expect(health.inputsUsed).not.toContain('component.version')
  })

  it('treats future dates as invalid instead of clamping them to recent', () => {
    const health = calculateMaintenanceHealth({
      ...baseComponent,
      releaseDate: '2026-07-01T00:00:00Z'
    }, baseMetadata, now)

    expect(health).toMatchObject({
      status: 'unknown',
      confidence: 'low',
      ageInDays: null,
      reasonCodes: expect.arrayContaining(['invalid_release_date'])
    })
    expect(health.reasonCodes).not.toContain('version_recent')
  })
})
