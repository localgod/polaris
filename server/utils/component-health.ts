import semver from 'semver'
import type {
  Component,
  MaintenanceHealth,
  MaintenanceHealthConfidence,
  MaintenanceHealthInput,
  MaintenanceHealthReasonCode,
  MaintenanceHealthStatus,
  PackageMetadata
} from '~~/types/api'

const DAY_MS = 24 * 60 * 60 * 1000
const RECENT_DAYS = 180
const OLD_DAYS = 365
const VERY_OLD_DAYS = 730

type UpdateType = MaintenanceHealth['updateType']

interface HealthState {
  ageInDays: number | null
  dateWasInvalid: boolean
  isMature: boolean | null
  currentVersion: string | null
  latestVersion: string | null
  updateType: UpdateType
  recentActivity: boolean | null
  isDeprecated: boolean
  advisoryCount: number | null
  inputsUsed: Set<MaintenanceHealthInput>
  reasonCodes: Set<MaintenanceHealthReasonCode>
}

export function calculateMaintenanceHealth(
  component: Pick<Component, 'releaseDate' | 'publishedDate' | 'modifiedDate' | 'version'>,
  packageMetadata?: PackageMetadata | null,
  now = new Date()
): MaintenanceHealth {
  const state = buildHealthState(component, packageMetadata, now)
  const { status, confidence } = scoreHealth(state)

  return {
    status,
    confidence,
    ageInDays: state.ageInDays,
    isMature: state.isMature,
    currentVersion: state.currentVersion,
    latestVersion: state.latestVersion,
    updateType: state.updateType,
    recentActivity: state.recentActivity,
    reasonCodes: [...state.reasonCodes],
    inputsUsed: [...state.inputsUsed],
    calculatedAt: now.toISOString()
  }
}

function buildHealthState(
  component: Pick<Component, 'releaseDate' | 'publishedDate' | 'modifiedDate' | 'version'>,
  packageMetadata: PackageMetadata | null | undefined,
  now: Date
): HealthState {
  const inputsUsed = new Set<MaintenanceHealthInput>()
  const reasonCodes = new Set<MaintenanceHealthReasonCode>()
  const releaseDate = selectReleaseDate(component, packageMetadata, inputsUsed)
  const ageResult = calculateAgeInDays(releaseDate, now)

  if (!releaseDate) {
    reasonCodes.add('missing_release_date')
  } else if (ageResult.invalid) {
    reasonCodes.add('invalid_release_date')
  } else if (ageResult.ageInDays !== null) {
    if (ageResult.ageInDays < RECENT_DAYS) reasonCodes.add('version_recent')
    else if (ageResult.ageInDays < OLD_DAYS) reasonCodes.add('version_moderately_old')
    else if (ageResult.ageInDays < VERY_OLD_DAYS) reasonCodes.add('version_old')
    else reasonCodes.add('version_very_old')
  }

  const currentVersion = component.version || packageMetadata?.currentVersion || null
  const latestVersion = packageMetadata?.status === 'available' ? packageMetadata.latestVersion : null
  const currentSemver = normalizeSemver(currentVersion)
  const latestSemver = normalizeSemver(latestVersion)

  if (component.version) {
    inputsUsed.add('component.version')
  } else if (packageMetadata?.currentVersion) {
    inputsUsed.add('packageMetadata.currentVersion')
  } else {
    reasonCodes.add('missing_version')
  }

  let isMature: boolean | null = null
  if (currentSemver) {
    isMature = semver.gte(currentSemver, '1.0.0')
    reasonCodes.add(isMature ? 'mature_version' : 'pre_1_0_version')
  } else if (currentVersion) {
    reasonCodes.add('unsupported_version_scheme')
  }

  if (latestVersion) {
    inputsUsed.add('packageMetadata.latestVersion')
  }

  const updateType = getUpdateType(currentSemver, latestSemver)
  addUpdateReason(updateType, reasonCodes)

  let recentActivity: boolean | null = null
  if (packageMetadata?.status === 'available') {
    if (packageMetadata.recentReleases !== null) {
      inputsUsed.add('packageMetadata.recentReleases')
      recentActivity = packageMetadata.recentReleases > 0
      reasonCodes.add(recentActivity ? 'upstream_recent_activity' : 'upstream_no_recent_activity')
    }
    if (packageMetadata.isDeprecated !== null) {
      inputsUsed.add('packageMetadata.isDeprecated')
    }
    if (packageMetadata.advisoryCount !== null) {
      inputsUsed.add('packageMetadata.advisoryCount')
    }
  } else if (packageMetadata?.status === 'unavailable') {
    reasonCodes.add('metadata_unavailable')
  }

  const isDeprecated = packageMetadata?.status === 'available' && packageMetadata.isDeprecated === true
  if (isDeprecated) reasonCodes.add('package_deprecated')

  const advisoryCount = packageMetadata?.status === 'available' ? packageMetadata.advisoryCount : null
  if (typeof advisoryCount === 'number' && advisoryCount > 0) reasonCodes.add('advisories_reported')

  return {
    ageInDays: ageResult.ageInDays,
    dateWasInvalid: ageResult.invalid,
    isMature,
    currentVersion,
    latestVersion,
    updateType,
    recentActivity,
    isDeprecated,
    advisoryCount,
    inputsUsed,
    reasonCodes
  }
}

function selectReleaseDate(
  component: Pick<Component, 'releaseDate' | 'publishedDate' | 'modifiedDate'>,
  packageMetadata: PackageMetadata | null | undefined,
  inputsUsed: Set<MaintenanceHealthInput>
): string | null {
  if (component.releaseDate) {
    inputsUsed.add('component.releaseDate')
    return component.releaseDate
  }
  if (component.publishedDate) {
    inputsUsed.add('component.publishedDate')
    return component.publishedDate
  }
  if (packageMetadata?.status === 'available' && packageMetadata.publishedAt) {
    inputsUsed.add('packageMetadata.publishedAt')
    return packageMetadata.publishedAt
  }
  if (component.modifiedDate) {
    inputsUsed.add('component.modifiedDate')
    return component.modifiedDate
  }
  return null
}

function calculateAgeInDays(dateString: string | null, now: Date): { ageInDays: number | null; invalid: boolean } {
  if (!dateString) return { ageInDays: null, invalid: false }

  const timestamp = Date.parse(dateString)
  if (Number.isNaN(timestamp)) return { ageInDays: null, invalid: true }
  if (timestamp > now.getTime()) return { ageInDays: null, invalid: true }

  return {
    ageInDays: Math.floor((now.getTime() - timestamp) / DAY_MS),
    invalid: false
  }
}

function normalizeSemver(version: string | null): string | null {
  if (!version) return null
  const trimmed = version.trim()
  if (!trimmed) return null

  return semver.valid(trimmed) || (trimmed.startsWith('v') ? semver.valid(trimmed.slice(1)) : null)
}

function getUpdateType(currentVersion: string | null, latestVersion: string | null): UpdateType {
  if (!currentVersion || !latestVersion) return 'unknown'
  if (semver.lte(latestVersion, currentVersion)) return 'none'
  if (semver.major(latestVersion) > semver.major(currentVersion)) return 'major'
  if (semver.minor(latestVersion) > semver.minor(currentVersion)) return 'minor'
  if (semver.patch(latestVersion) > semver.patch(currentVersion)) return 'patch'
  return 'unknown'
}

function addUpdateReason(updateType: UpdateType, reasonCodes: Set<MaintenanceHealthReasonCode>) {
  switch (updateType) {
    case 'none':
      reasonCodes.add('current_version_current')
      break
    case 'patch':
      reasonCodes.add('patch_update_available')
      break
    case 'minor':
      reasonCodes.add('minor_update_available')
      break
    case 'major':
      reasonCodes.add('major_update_available')
      break
    default:
      reasonCodes.add('update_status_unknown')
  }
}

function scoreHealth(state: HealthState): { status: MaintenanceHealthStatus; confidence: MaintenanceHealthConfidence } {
  if (state.isDeprecated) {
    return { status: 'stale', confidence: 'high' }
  }

  if (state.dateWasInvalid) {
    return { status: 'unknown', confidence: 'low' }
  }

  const hasDate = state.ageInDays !== null
  const hasVersionSignal = state.isMature !== null || state.updateType !== 'unknown'
  const hasActivitySignal = state.recentActivity !== null
  if (!hasDate && !hasVersionSignal && !hasActivitySignal) {
    state.reasonCodes.add('insufficient_data')
    return { status: 'unknown', confidence: 'low' }
  }

  if (hasDate && state.ageInDays! >= VERY_OLD_DAYS && state.recentActivity === false) {
    return { status: 'stale', confidence: 'high' }
  }

  if (hasDate && state.ageInDays! >= VERY_OLD_DAYS && state.updateType === 'major') {
    return { status: 'stale', confidence: 'high' }
  }

  if (hasDate && state.ageInDays! >= OLD_DAYS && state.updateType !== 'none') {
    return { status: 'aging', confidence: state.updateType === 'unknown' ? 'low' : 'medium' }
  }

  if (state.updateType === 'major') {
    return { status: 'aging', confidence: 'medium' }
  }

  if (hasDate && state.ageInDays! < RECENT_DAYS && (state.updateType === 'none' || state.updateType === 'unknown')) {
    return { status: 'healthy', confidence: state.updateType === 'none' ? 'high' : 'medium' }
  }

  if (state.isMature === true && state.updateType === 'none' && state.recentActivity !== false) {
    return { status: 'stable', confidence: hasActivitySignal ? 'high' : 'medium' }
  }

  if (state.isMature === true && hasDate && state.ageInDays! < VERY_OLD_DAYS) {
    return { status: 'stable', confidence: state.updateType === 'unknown' ? 'low' : 'medium' }
  }

  if (hasDate && state.ageInDays! >= VERY_OLD_DAYS) {
    return { status: 'stale', confidence: hasActivitySignal ? 'medium' : 'low' }
  }

  return { status: 'unknown', confidence: 'low' }
}
