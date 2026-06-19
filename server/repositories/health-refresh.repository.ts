import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'

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
  async enqueueForSystem(systemName: string, trigger: HealthRefreshTrigger = 'sbom_import'): Promise<string> {
    return await this.enqueue(trigger, systemName)
  }

  async enqueueAll(trigger: HealthRefreshTrigger = 'scheduled'): Promise<string> {
    return await this.enqueue(trigger, null)
  }

  private async enqueue(trigger: HealthRefreshTrigger, systemName: string | null): Promise<string> {
    const { records } = await this.executeQuery(`
      CREATE (job:HealthRefreshJob {
        id: randomUUID(),
        status: 'queued',
        trigger: $trigger,
        systemName: $systemName,
        totalItems: 0,
        completedItems: 0,
        failedItems: 0,
        createdAt: datetime(),
        startedAt: null,
        finishedAt: null,
        error: null
      })
      WITH job
      CALL {
        WITH job
        MATCH (c:Component)
        WHERE $systemName IS NULL
           OR EXISTS {
             MATCH (:System {name: $systemName})-[:USES]->(c)
           }
        RETURN collect(DISTINCT c) AS components
      }
      SET job.totalItems = size(components)
      FOREACH (component IN components |
        CREATE (job)-[:HAS_ITEM]->(:HealthRefreshJobItem {
          id: randomUUID(),
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
        })
      )
      RETURN job.id AS id
    `, { trigger, systemName })

    const id = records[0]?.get('id')
    if (!id) throw new Error('Failed to enqueue health refresh job')
    return id
  }

  async claimNextQueuedJob(): Promise<string | null> {
    const { records } = await this.executeQuery(`
      MATCH (job:HealthRefreshJob {status: 'queued'})
      WITH job
      ORDER BY job.createdAt ASC
      LIMIT 1
      SET job.status = 'running',
          job.startedAt = coalesce(job.startedAt, datetime()),
          job.error = null
      RETURN job.id AS id
    `)

    return records[0]?.get('id') ?? null
  }

  async findById(id: string): Promise<HealthRefreshJob | null> {
    const { records } = await this.executeQuery(`
      MATCH (job:HealthRefreshJob {id: $id})
      OPTIONAL MATCH (job)-[:HAS_ITEM]->(item:HealthRefreshJobItem)
      WITH job, item
      ORDER BY item.componentName ASC, item.componentVersion ASC
      RETURN job, collect(item) AS items
    `, { id })

    if (records.length === 0) return null
    return this.mapJob(records[0]!)
  }

  async getPendingItems(jobId: string, limit = 25): Promise<HealthRefreshJobItem[]> {
    const { records } = await this.executeQuery(`
      MATCH (:HealthRefreshJob {id: $jobId})-[:HAS_ITEM]->(item:HealthRefreshJobItem {status: 'pending'})
      RETURN item
      ORDER BY item.componentName ASC, item.componentVersion ASC
      LIMIT toInteger($limit)
    `, { jobId, limit })

    return records.map(record => this.mapItem(record.get('item').properties))
  }

  async markItemRunning(jobId: string, itemId: string): Promise<void> {
    await this.executeQuery(`
      MATCH (:HealthRefreshJob {id: $jobId})-[:HAS_ITEM]->(item:HealthRefreshJobItem {id: $itemId})
      SET item.status = 'running',
          item.startedAt = coalesce(item.startedAt, datetime()),
          item.errorSummary = null
    `, { jobId, itemId })
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
    await this.executeQuery(`
      MATCH (job:HealthRefreshJob {id: $jobId})-[:HAS_ITEM]->(item:HealthRefreshJobItem {id: $itemId})
      SET item.status = $status,
          item.failedSources = $failedSources,
          item.failedFields = $failedFields,
          item.errorSummary = $errorSummary,
          item.finishedAt = datetime()
      SET job.completedItems = job.completedItems + 1,
          job.failedItems = job.failedItems + CASE WHEN $status = 'failed' THEN 1 ELSE 0 END
    `, {
      jobId,
      itemId,
      status,
      failedSources: updates.failedSources ?? [],
      failedFields: updates.failedFields ?? [],
      errorSummary: updates.errorSummary ?? null
    })
  }

  async markJobCompletedIfDone(jobId: string): Promise<void> {
    await this.executeQuery(`
      MATCH (job:HealthRefreshJob {id: $jobId})
      OPTIONAL MATCH (job)-[:HAS_ITEM]->(item:HealthRefreshJobItem)
      WITH job,
           count(item) AS itemCount,
           sum(CASE WHEN item.status IN ['pending', 'running'] THEN 1 ELSE 0 END) AS unfinished
      WHERE unfinished = 0
      SET job.status = 'completed',
          job.finishedAt = datetime(),
          job.completedItems = itemCount
    `, { jobId })
  }

  async markJobFailed(jobId: string, error: string): Promise<void> {
    await this.executeQuery(`
      MATCH (job:HealthRefreshJob {id: $jobId})
      SET job.status = 'failed',
          job.finishedAt = datetime(),
          job.error = $error
    `, { jobId, error })
  }

  async upsertHealthSnapshot(update: HealthSnapshotUpdate): Promise<void> {
    const setClauses = Object.keys(update.values).map(key => `h.${key} = $values.${key}`)
    if (setClauses.length === 0 && update.advisories === undefined) return

    const snapshotSet = setClauses.length > 0 ? `SET ${setClauses.join(',\n          ')}` : ''
    const advisoryQuery = update.advisories === undefined
      ? ''
      : `
      WITH c, h
      OPTIONAL MATCH (c)-[oldAdvisory:HAS_ADVISORY]->(:Advisory)
      DELETE oldAdvisory
      WITH c, h
      UNWIND $advisories AS advisory
      MERGE (a:Advisory {id: advisory.id})
      SET a.aliases = advisory.aliases,
          a.summary = advisory.summary,
          a.cvssVector = advisory.cvssVector,
          a.cvssScore = advisory.cvssScore,
          a.advisoryUrl = advisory.advisoryUrl,
          a.publishedAt = CASE WHEN advisory.publishedAt IS NULL THEN null ELSE datetime(advisory.publishedAt) END,
          a.modifiedAt = CASE WHEN advisory.modifiedAt IS NULL THEN null ELSE datetime(advisory.modifiedAt) END,
          a.source = advisory.source
      MERGE (c)-[r:HAS_ADVISORY]->(a)
      SET r.observedAt = datetime()
      WITH h
      `

    await this.executeQuery(`
      MATCH (c:Component {purl: $componentPurl})
      MERGE (h:HealthSnapshot {componentPurl: $componentPurl})
      ON CREATE SET h.createdAt = datetime()
      SET h.componentName = $componentName
      MERGE (c)-[:HAS_HEALTH_SNAPSHOT]->(h)
      ${snapshotSet}
      ${advisoryQuery}
      RETURN h.componentPurl AS componentPurl
    `, {
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
}
