import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import neo4j from 'neo4j-driver'
import { loadQuery } from '../utils/query-loader'

export type ImportJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
export type ImportJobItemStatus = 'pending' | 'running' | 'imported' | 'skipped' | 'failed'

export interface ImportJobFilters {
  language?: string
  topic?: string
  namePattern?: string
}

export interface ImportJob {
  id: string
  type: 'github-org'
  status: ImportJobStatus
  requestedBy: string
  organization: string
  filters: ImportJobFilters
  dryRun: boolean
  total: number
  completed: number
  failed: number
  skipped: number
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  error: string | null
  items: ImportJobItem[]
}

export interface ImportJobItem {
  id: string
  repositoryFullName: string
  repositoryUrl: string
  ownerTeam: string | null
  status: ImportJobItemStatus
  message: string | null
  systemName: string | null
  manifestsFound: number
  componentsAdded: number
  componentsUpdated: number
  relationshipsCreated: number
  startedAt: string | null
  finishedAt: string | null
}

export interface CreateImportJobParams {
  type: 'github-org'
  requestedBy: string
  organization: string
  filters: ImportJobFilters
  dryRun: boolean
}

export interface ImportJobSummary {
  id: string
  status: ImportJobStatus
  organization: string
  total: number
  completed: number
  failed: number
  createdAt: string
  error: string | null
}

export interface CreateImportJobItemParams {
  repositoryFullName: string
  repositoryUrl: string
  ownerTeam?: string | null
  status?: ImportJobItemStatus
  message?: string | null
  systemName?: string | null
  manifestsFound?: number
  componentsAdded?: number
  componentsUpdated?: number
  relationshipsCreated?: number
}

function intValue(value: unknown): number {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    return value.toNumber()
  }
  return 0
}

export class ImportJobRepository extends BaseRepository {
  async create(params: CreateImportJobParams): Promise<ImportJob> {
    const { records } = await this.executeQuery(await loadQuery('import-jobs/create.cypher'), {
      ...params,
      filters: JSON.stringify(params.filters)
    })

    if (records.length === 0) {
      throw new Error('Failed to create import job')
    }

    return this.mapJob(records[0]!)
  }

  async findById(id: string): Promise<ImportJob | null> {
    const { records } = await this.executeQuery(await loadQuery('import-jobs/find-by-id.cypher'), { id })

    if (records.length === 0) return null
    return this.mapJob(records[0]!)
  }

  /**
   * Currently active jobs (running/queued) plus jobs that failed within the
   * last `sinceHours` — the set worth surfacing on a "needs attention" view.
   */
  async findRecentActive(sinceHours = 24, limit = 5): Promise<{ total: number; jobs: ImportJobSummary[] }> {
    const { records } = await this.executeQuery(await loadQuery('import-jobs/find-recent-active.cypher'), { sinceHours, limit: neo4j.int(limit) })

    if (records.length === 0) return { total: 0, jobs: [] }

    const record = records[0]!
    const rawJobs = (record.get('jobs') || []) as Array<{ properties: Record<string, unknown> }>

    return {
      total: intValue(record.get('total')),
      jobs: rawJobs.map(job => this.mapJobSummary(job.properties))
    }
  }

  async markRunning(id: string): Promise<void> {
    await this.executeQuery(await loadQuery('import-jobs/mark-running.cypher'), { id })
  }

  async markCompleted(id: string): Promise<void> {
    await this.executeQuery(await loadQuery('import-jobs/mark-completed.cypher'), { id })
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.executeQuery(await loadQuery('import-jobs/mark-failed.cypher'), { id, error })
  }

  async createItems(jobId: string, items: CreateImportJobItemParams[]): Promise<void> {
    if (items.length === 0) {
      await this.executeQuery(await loadQuery('import-jobs/set-total-zero.cypher'), { jobId })
      return
    }

    await this.executeQuery(await loadQuery('import-jobs/create-items.cypher'), { jobId, items })
  }

  async markItemRunning(jobId: string, repositoryFullName: string): Promise<void> {
    await this.executeQuery(await loadQuery('import-jobs/mark-item-running.cypher'), { jobId, repositoryFullName })
  }

  async markItemFinished(
    jobId: string,
    repositoryFullName: string,
    status: Exclude<ImportJobItemStatus, 'pending' | 'running'>,
    updates: Partial<Omit<ImportJobItem, 'id' | 'repositoryFullName' | 'repositoryUrl' | 'status' | 'startedAt' | 'finishedAt'>>
  ): Promise<void> {
    await this.executeQuery(await loadQuery('import-jobs/mark-item-finished.cypher'), {
      jobId,
      repositoryFullName,
      status,
      message: updates.message ?? null,
      systemName: updates.systemName ?? null,
      manifestsFound: updates.manifestsFound ?? 0,
      componentsAdded: updates.componentsAdded ?? 0,
      componentsUpdated: updates.componentsUpdated ?? 0,
      relationshipsCreated: updates.relationshipsCreated ?? 0
    })
  }

  private mapJob(record: Neo4jRecord): ImportJob {
    const job = record.get('job')
    const rawFilters = job.properties.filters
    let filters: ImportJobFilters = {}
    if (typeof rawFilters === 'string' && rawFilters) {
      try { filters = JSON.parse(rawFilters) as ImportJobFilters } catch { filters = {} }
    }

    const rawItems = (record.get('items') || []) as Array<{ properties?: Record<string, unknown> } | null>
    const items = rawItems
      .filter((item): item is { properties: Record<string, unknown> } => Boolean(item?.properties))
      .map(item => this.mapItem(item.properties))

    return {
      id: job.properties.id,
      type: job.properties.type,
      status: job.properties.status,
      requestedBy: job.properties.requestedBy,
      organization: job.properties.organization,
      filters,
      dryRun: Boolean(job.properties.dryRun),
      total: intValue(job.properties.total),
      completed: intValue(job.properties.completed),
      failed: intValue(job.properties.failed),
      skipped: intValue(job.properties.skipped),
      createdAt: job.properties.createdAt?.toString() || '',
      startedAt: job.properties.startedAt?.toString() || null,
      finishedAt: job.properties.finishedAt?.toString() || null,
      error: job.properties.error || null,
      items
    }
  }

  private mapJobSummary(job: Record<string, unknown>): ImportJobSummary {
    return {
      id: job.id as string,
      status: job.status as ImportJobStatus,
      organization: job.organization as string,
      total: intValue(job.total),
      completed: intValue(job.completed),
      failed: intValue(job.failed),
      createdAt: job.createdAt?.toString() || '',
      error: (job.error as string | null | undefined) ?? null
    }
  }

  private mapItem(item: Record<string, unknown>): ImportJobItem {
    return {
      id: item.id as string,
      repositoryFullName: item.repositoryFullName as string,
      repositoryUrl: item.repositoryUrl as string,
      ownerTeam: (item.ownerTeam as string | null | undefined) ?? null,
      status: item.status as ImportJobItemStatus,
      message: (item.message as string | null | undefined) ?? null,
      systemName: (item.systemName as string | null | undefined) ?? null,
      manifestsFound: intValue(item.manifestsFound),
      componentsAdded: intValue(item.componentsAdded),
      componentsUpdated: intValue(item.componentsUpdated),
      relationshipsCreated: intValue(item.relationshipsCreated),
      startedAt: item.startedAt?.toString() || null,
      finishedAt: item.finishedAt?.toString() || null
    }
  }
}
