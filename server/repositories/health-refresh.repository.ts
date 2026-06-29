import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import type { HealthDashboardSummary } from '~~/types/api'
import { loadQuery, injectPlaceholder } from '../utils/query-loader'

export type HealthRefreshJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
export type HealthRefreshJobItemStatus = 'pending' | 'running' | 'refreshed' | 'failed' | 'skipped'
export type HealthRefreshTrigger = 'sbom_import' | 'scheduled' | 'manual'

export interface HealthRefreshJob {
  id: string
  status: HealthRefreshJobStatus
  trigger: HealthRefreshTrigger
  systemName: string | null
  totalItems: number
  completedItems: number
  failedItems: number
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  error: string | null
  items: HealthRefreshJobItem[]
}

export interface HealthRefreshJobItem {
  id: string
  componentPurl: string
  componentName: string
  componentVersion: string
  packageManager: string | null
  status: HealthRefreshJobItemStatus
  failedSources: string[]
  failedFields: string[]
  errorSummary: string | null
  startedAt: string | null
  finishedAt: string | null
}

export interface AdvisorySnapshot {
  id: string
  aliases: string[]
  summary: string | null
  cvssVector: string | null
  cvssScore: number | null
  advisoryUrl: string
  publishedAt: string | null
  modifiedAt: string | null
  source: 'OSV.dev'
}

export interface HealthSnapshotUpdate {
  componentPurl: string
  componentName: string
  values: Record<string, unknown>
  advisories?: AdvisorySnapshot[]
}

function intValue(value: unknown): number {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    return value.toNumber()
  }
  return 0
}

export class HealthRefreshRepository extends BaseRepository {
  async getDashboardSummary(staleAfterDays = 7): Promise<HealthDashboardSummary> {
    const [
      vulnerabilityExposure,
      vulnerabilityAffectedSystems,
      advisoryHotspots,
      refreshCoverage,
      failedItems,
      criticalSystemsAtRisk
    ] = await Promise.all([
      this.getVulnerabilityExposure(),
      this.getVulnerabilityAffectedSystems(),
      this.getAdvisoryHotspots(),
      this.getRefreshCoverage(staleAfterDays),
      this.getRecentFailedItems(),
      this.getCriticalSystemsAtRisk()
    ])

    return {
      vulnerabilityExposure: {
        ...vulnerabilityExposure,
        affectedSystems: vulnerabilityAffectedSystems
      },
      advisoryHotspots,
      refreshCoverage: {
        ...refreshCoverage,
        failedItems
      },
      criticalSystemsAtRisk
    }
  }

  async enqueueForSystem(systemName: string, trigger: HealthRefreshTrigger = 'sbom_import'): Promise<string> {
    return await this.enqueue(trigger, systemName)
  }

  async enqueueAll(trigger: HealthRefreshTrigger = 'scheduled'): Promise<string> {
    return await this.enqueue(trigger, null)
  }

  private async enqueue(trigger: HealthRefreshTrigger, systemName: string | null): Promise<string> {
    const { records } = await this.executeQuery(await loadQuery('health-refresh/enqueue.cypher'), { trigger, systemName })

    const id = records[0]?.get('id')
    if (!id) throw new Error('Failed to enqueue health refresh job')
    return id
  }

  async claimNextQueuedJob(): Promise<string | null> {
    const { records } = await this.executeQuery(await loadQuery('health-refresh/claim-next-queued-job.cypher'))

    return records[0]?.get('id') ?? null
  }

  async findById(id: string): Promise<HealthRefreshJob | null> {
    const { records } = await this.executeQuery(await loadQuery('health-refresh/find-by-id.cypher'), { id })

    if (records.length === 0) return null
    return this.mapJob(records[0]!)
  }

  async getPendingItems(jobId: string, limit = 25): Promise<HealthRefreshJobItem[]> {
    const { records } = await this.executeQuery(await loadQuery('health-refresh/get-pending-items.cypher'), { jobId, limit })

    return records.map(record => this.mapItem(record.get('item').properties))
  }

  async markItemRunning(jobId: string, itemId: string): Promise<void> {
    await this.executeQuery(await loadQuery('health-refresh/mark-item-running.cypher'), { jobId, itemId })
  }

  async markItemFinished(
    jobId: string,
    itemId: string,
    status: Exclude<HealthRefreshJobItemStatus, 'pending' | 'running'>,
    updates: {
      failedSources?: string[]
      failedFields?: string[]
      errorSummary?: string | null
    } = {}
  ): Promise<void> {
    await this.executeQuery(await loadQuery('health-refresh/mark-item-finished.cypher'), {
      jobId,
      itemId,
      status,
      failedSources: updates.failedSources ?? [],
      failedFields: updates.failedFields ?? [],
      errorSummary: updates.errorSummary ?? null
    })
  }

  async markJobCompletedIfDone(jobId: string): Promise<void> {
    await this.executeQuery(await loadQuery('health-refresh/mark-job-completed-if-done.cypher'), { jobId })
  }

  async markJobFailed(jobId: string, error: string): Promise<void> {
    await this.executeQuery(await loadQuery('health-refresh/mark-job-failed.cypher'), { jobId, error })
  }

  async upsertHealthSnapshot(update: HealthSnapshotUpdate): Promise<void> {
    const setClauses = Object.keys(update.values).map(key => `h.${key} = $values.${key}`)
    if (setClauses.length === 0 && update.advisories === undefined) return

    const snapshotSet = setClauses.length > 0 ? `SET ${setClauses.join(',\n          ')}` : ''
    const advisoryQuery = update.advisories === undefined
      ? ''
      : await loadQuery('health-refresh/advisory-subquery.cypher')

    let query = await loadQuery('health-refresh/upsert-health-snapshot.cypher')
    query = injectPlaceholder(query, 'SNAPSHOT_SET', snapshotSet)
    query = injectPlaceholder(query, 'ADVISORY_QUERY', advisoryQuery)

    await this.executeQuery(query, {
      componentPurl: update.componentPurl,
      componentName: update.componentName,
      values: update.values,
      advisories: update.advisories ?? []
    })
  }

  private mapJob(record: Neo4jRecord): HealthRefreshJob {
    const job = record.get('job')
    const rawItems = (record.get('items') || []) as Array<{ properties?: Record<string, unknown> } | null>
    const items = rawItems
      .filter((item): item is { properties: Record<string, unknown> } => Boolean(item?.properties))
      .map(item => this.mapItem(item.properties))

    return {
      id: job.properties.id,
      status: job.properties.status,
      trigger: job.properties.trigger,
      systemName: job.properties.systemName ?? null,
      totalItems: intValue(job.properties.totalItems),
      completedItems: intValue(job.properties.completedItems),
      failedItems: intValue(job.properties.failedItems),
      createdAt: job.properties.createdAt?.toString() || '',
      startedAt: job.properties.startedAt?.toString() || null,
      finishedAt: job.properties.finishedAt?.toString() || null,
      error: job.properties.error || null,
      items
    }
  }

  private mapItem(item: Record<string, unknown>): HealthRefreshJobItem {
    return {
      id: item.id as string,
      componentPurl: item.componentPurl as string,
      componentName: item.componentName as string,
      componentVersion: item.componentVersion as string,
      packageManager: (item.packageManager as string | null | undefined) ?? null,
      status: item.status as HealthRefreshJobItemStatus,
      failedSources: (item.failedSources as string[] | null | undefined) ?? [],
      failedFields: (item.failedFields as string[] | null | undefined) ?? [],
      errorSummary: (item.errorSummary as string | null | undefined) ?? null,
      startedAt: item.startedAt?.toString() || null,
      finishedAt: item.finishedAt?.toString() || null
    }
  }

  private async getVulnerabilityExposure(): Promise<Omit<HealthDashboardSummary['vulnerabilityExposure'], 'affectedSystems'>> {
    const { records } = await this.executeQuery(await loadQuery('health-refresh/get-vulnerability-exposure.cypher'))
    const record = records[0]
    return {
      vulnerableComponents: intValue(record?.get('vulnerableComponents')),
      criticalComponents: intValue(record?.get('criticalComponents')),
      highComponents: intValue(record?.get('highComponents')),
      criticalVulnerabilities: intValue(record?.get('criticalVulnerabilities')),
      highVulnerabilities: intValue(record?.get('highVulnerabilities'))
    }
  }

  private async getVulnerabilityAffectedSystems(): Promise<number> {
    const { records } = await this.executeQuery(await loadQuery('health-refresh/get-vulnerability-affected-systems.cypher'))
    return intValue(records[0]?.get('affectedSystems'))
  }

  private async getAdvisoryHotspots(): Promise<HealthDashboardSummary['advisoryHotspots']> {
    const { records } = await this.executeQuery(await loadQuery('health-refresh/get-advisory-hotspots.cypher'))

    return records.map(record => ({
      id: record.get('id'),
      aliases: record.get('aliases') ?? [],
      summary: record.get('summary') ?? null,
      cvssScore: record.get('cvssScore') ?? null,
      affectedComponents: intValue(record.get('affectedComponents')),
      affectedSystems: intValue(record.get('affectedSystems'))
    }))
  }

  private async getRefreshCoverage(staleAfterDays: number): Promise<Omit<HealthDashboardSummary['refreshCoverage'], 'failedItems'>> {
    const { records } = await this.executeQuery(await loadQuery('health-refresh/get-refresh-coverage.cypher'), { staleAfterDays })
    const record = records[0]
    return {
      totalComponents: intValue(record?.get('totalComponents')),
      refreshedComponents: intValue(record?.get('refreshedComponents')),
      staleComponents: intValue(record?.get('staleComponents')),
      neverCheckedComponents: intValue(record?.get('neverCheckedComponents'))
    }
  }

  private async getRecentFailedItems(): Promise<number> {
    const { records } = await this.executeQuery(await loadQuery('health-refresh/get-recent-failed-items.cypher'))
    return intValue(records[0]?.get('failedItems'))
  }

  private async getCriticalSystemsAtRisk(): Promise<HealthDashboardSummary['criticalSystemsAtRisk']> {
    const { records } = await this.executeQuery(await loadQuery('health-refresh/get-critical-systems-at-risk.cypher'))
    const record = records[0]
    return {
      systems: intValue(record?.get('systems')),
      criticalSystems: intValue(record?.get('criticalSystems')),
      highSystems: intValue(record?.get('highSystems')),
      affectedComponents: intValue(record?.get('affectedComponents'))
    }
  }
}
