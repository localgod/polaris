import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'

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

export interface CreateImportJobItemParams {
  repositoryFullName: string
  repositoryUrl: string
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
    const { records } = await this.executeQuery(`
      CREATE (job:ImportJob {
        id: randomUUID(),
        type: $type,
        status: 'queued',
        requestedBy: $requestedBy,
        organization: $organization,
        filters: $filters,
        dryRun: $dryRun,
        total: 0,
        completed: 0,
        failed: 0,
        skipped: 0,
        createdAt: datetime(),
        startedAt: null,
        finishedAt: null,
        error: null
      })
      WITH job
      OPTIONAL MATCH (user:User {id: $requestedBy})
      FOREACH (_ IN CASE WHEN user IS NULL THEN [] ELSE [1] END |
        MERGE (user)-[:REQUESTED]->(job)
      )
      RETURN job, [] AS items
    `, {
      ...params,
      filters: JSON.stringify(params.filters)
    })

    if (records.length === 0) {
      throw new Error('Failed to create import job')
    }

    return this.mapJob(records[0]!)
  }

  async findById(id: string): Promise<ImportJob | null> {
    const { records } = await this.executeQuery(`
      MATCH (job:ImportJob {id: $id})
      OPTIONAL MATCH (job)-[:HAS_ITEM]->(item:ImportJobItem)
      WITH job, item
      ORDER BY item.repositoryFullName ASC
      RETURN job, collect(item) AS items
    `, { id })

    if (records.length === 0) return null
    return this.mapJob(records[0]!)
  }

  async markRunning(id: string): Promise<void> {
    await this.executeQuery(`
      MATCH (job:ImportJob {id: $id})
      SET job.status = 'running',
          job.startedAt = coalesce(job.startedAt, datetime()),
          job.error = null
    `, { id })
  }

  async markCompleted(id: string): Promise<void> {
    await this.executeQuery(`
      MATCH (job:ImportJob {id: $id})
      SET job.status = 'completed',
          job.finishedAt = datetime()
    `, { id })
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.executeQuery(`
      MATCH (job:ImportJob {id: $id})
      SET job.status = 'failed',
          job.finishedAt = datetime(),
          job.error = $error
    `, { id, error })
  }

  async createItems(jobId: string, items: CreateImportJobItemParams[]): Promise<void> {
    if (items.length === 0) {
      await this.executeQuery(`
        MATCH (job:ImportJob {id: $jobId})
        SET job.total = 0
      `, { jobId })
      return
    }

    await this.executeQuery(`
      MATCH (job:ImportJob {id: $jobId})
      SET job.total = size($items)
      WITH job
      UNWIND $items AS item
      CREATE (job)-[:HAS_ITEM]->(:ImportJobItem {
        id: randomUUID(),
        repositoryFullName: item.repositoryFullName,
        repositoryUrl: item.repositoryUrl,
        status: coalesce(item.status, 'pending'),
        message: item.message,
        systemName: item.systemName,
        manifestsFound: coalesce(item.manifestsFound, 0),
        componentsAdded: coalesce(item.componentsAdded, 0),
        componentsUpdated: coalesce(item.componentsUpdated, 0),
        relationshipsCreated: coalesce(item.relationshipsCreated, 0),
        startedAt: null,
        finishedAt: CASE WHEN coalesce(item.status, 'pending') <> 'pending' THEN datetime() ELSE null END
      })
    `, { jobId, items })
  }

  async markItemRunning(jobId: string, repositoryFullName: string): Promise<void> {
    await this.executeQuery(`
      MATCH (:ImportJob {id: $jobId})-[:HAS_ITEM]->(item:ImportJobItem {repositoryFullName: $repositoryFullName})
      SET item.status = 'running',
          item.startedAt = coalesce(item.startedAt, datetime()),
          item.message = null
    `, { jobId, repositoryFullName })
  }

  async markItemFinished(
    jobId: string,
    repositoryFullName: string,
    status: Exclude<ImportJobItemStatus, 'pending' | 'running'>,
    updates: Partial<Omit<ImportJobItem, 'id' | 'repositoryFullName' | 'repositoryUrl' | 'status' | 'startedAt' | 'finishedAt'>>
  ): Promise<void> {
    await this.executeQuery(`
      MATCH (job:ImportJob {id: $jobId})-[:HAS_ITEM]->(item:ImportJobItem {repositoryFullName: $repositoryFullName})
      SET item.status = $status,
          item.message = $message,
          item.systemName = $systemName,
          item.manifestsFound = $manifestsFound,
          item.componentsAdded = $componentsAdded,
          item.componentsUpdated = $componentsUpdated,
          item.relationshipsCreated = $relationshipsCreated,
          item.finishedAt = datetime()
      SET job.completed = job.completed + 1,
          job.failed = job.failed + CASE WHEN $status = 'failed' THEN 1 ELSE 0 END,
          job.skipped = job.skipped + CASE WHEN $status = 'skipped' THEN 1 ELSE 0 END
    `, {
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

  private mapItem(item: Record<string, unknown>): ImportJobItem {
    return {
      id: item.id as string,
      repositoryFullName: item.repositoryFullName as string,
      repositoryUrl: item.repositoryUrl as string,
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
