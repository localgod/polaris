import semver from 'semver'
import type { VersionSprawlDetection, VersionSprawlSeverity, VersionSprawlSummary } from '~~/types/api'
import { ComponentRepository, type VersionSprawlRaw } from '../repositories/component.repository'
import { EOLService } from './eol.service'

const MIN_VERSIONS = 2
const HIGH_VERSION_THRESHOLD = 5
const MEDIUM_VERSION_THRESHOLD = 3

export class VersionSprawlService {
  constructor(
    private readonly componentRepo = new ComponentRepository(),
    private readonly eolService = new EOLService()
  ) {}

  async detect(): Promise<VersionSprawlDetection[]> {
    const raw = await this.componentRepo.findVersionSprawl(MIN_VERSIONS)
    const detections = await Promise.all(raw.map(group => this.toDetection(group)))
    return detections.sort((a, b) => b.sprawlScore - a.sprawlScore)
  }

  async getSummary(): Promise<VersionSprawlSummary> {
    const detections = await this.detect()
    return detections.reduce<VersionSprawlSummary>((summary, detection) => {
      summary[detection.severity] += 1
      summary.total += 1
      return summary
    }, { high: 0, medium: 0, low: 0, total: 0 })
  }

  private async toDetection(group: VersionSprawlRaw): Promise<VersionSprawlDetection> {
    const versions = sortVersionsAscending(group.versions)
    const hasEolVersion = await this.anyVersionEol(group.technologyName, versions)

    return {
      technologyName: group.technologyName,
      versions,
      versionCount: group.versionCount,
      versionRange: { oldest: versions[0], newest: versions[versions.length - 1] },
      affectedSystemCount: group.affectedSystemCount,
      versionBreakdown: group.versionBreakdown,
      sprawlScore: calculateSprawlScore(group, hasEolVersion),
      severity: severityFor(group.versionCount),
      recommendedVersion: versions[versions.length - 1],
      hasEolVersion
    }
  }

  private async anyVersionEol(technologyName: string, versions: string[]): Promise<boolean> {
    const statuses = await Promise.all(versions.map(version =>
      this.eolService.getEOLStatus({ name: technologyName, version, technologyName })
    ))
    return statuses.some(status => status.status === 'unsupported')
  }
}

function severityFor(versionCount: number): VersionSprawlSeverity {
  if (versionCount >= HIGH_VERSION_THRESHOLD) return 'high'
  if (versionCount >= MEDIUM_VERSION_THRESHOLD) return 'medium'
  return 'low'
}

function calculateSprawlScore(group: VersionSprawlRaw, hasEolVersion: boolean): number {
  const versionCountScore = Math.min(group.versionCount * 10, 40)
  const systemCountScore = Math.min(group.affectedSystemCount * 2, 30)
  const majorSpreadScore = Math.min(countDistinctMajors(group.versions) * 10, 30)
  const eolScore = hasEolVersion ? 20 : 0

  return Math.min(versionCountScore + systemCountScore + majorSpreadScore + eolScore, 100)
}

function countDistinctMajors(versions: string[]): number {
  const majors = new Set<number>()
  for (const version of versions) {
    const coerced = semver.coerce(version)
    if (coerced) majors.add(coerced.major)
  }
  return majors.size
}

// Semver-aware sort with a lexicographic fallback for non-semver schemes
// (e.g. Maven, Go pseudo-versions) so sprawl detection degrades gracefully
// instead of throwing on unparsable versions.
function sortVersionsAscending(versions: string[]): string[] {
  return [...versions].sort((a, b) => {
    const coercedA = semver.coerce(a)
    const coercedB = semver.coerce(b)
    if (coercedA && coercedB) return semver.compare(coercedA, coercedB)
    return a.localeCompare(b)
  })
}
