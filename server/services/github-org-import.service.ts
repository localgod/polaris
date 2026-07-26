import { AuditLogRepository } from '../repositories/audit-log.repository'
import {
  ImportJobRepository,
  type ImportJob,
  type ImportJobFilters,
  type ImportJobItem,
  type CreateImportJobItemParams,
  type FindAllImportJobsParams
} from '../repositories/import-job.repository'
import { GitHubImportService } from './github-import.service'
import { listGitHubOwnerRepositories, parseGitHubOwner, runWithConcurrency, type GitHubOrgRepository } from '../utils/github'
import { logger } from '../utils/logger'

export interface GitHubRepositorySelection {
  repositoryFullName: string
  repositoryUrl: string
  ownerTeam?: string
  systemName?: string
}

export interface GitHubOrgImportInput {
  organization: string
  filters?: ImportJobFilters
  repositories?: GitHubRepositorySelection[]
  dryRun?: boolean
  domain?: string
  ownerTeam: string
  businessCriticality?: string
  environment?: string
  userId: string
  realUserId?: string | null
  /** GitHub OAuth token for the requesting user — passed through to each repository clone */
  githubToken?: string
}

const activeJobs = new Set<string>()

export class GitHubOrgImportService {
  private jobRepo: ImportJobRepository
  private gitHubImportService: GitHubImportService
  private auditRepo: AuditLogRepository

  constructor(
    jobRepo = new ImportJobRepository(),
    gitHubImportService = new GitHubImportService(),
    auditRepo = new AuditLogRepository()
  ) {
    this.jobRepo = jobRepo
    this.gitHubImportService = gitHubImportService
    this.auditRepo = auditRepo
  }

  async start(input: GitHubOrgImportInput): Promise<ImportJob> {
    const organization = input.organization.trim()
    if (!organization) {
      throw createError({ statusCode: 400, message: 'owner is required' })
    }

    if (!input.ownerTeam?.trim()) {
      throw createError({ statusCode: 400, message: 'ownerTeam is required' })
    }

    const owner = parseGitHubOwner(organization)
    const repositories = this.normalizeSelections(input.repositories)
    const job = await this.jobRepo.create({
      type: 'github-org',
      requestedBy: input.userId,
      organization: owner,
      filters: input.filters || {},
      dryRun: Boolean(input.dryRun)
    })

    this.runInBackground(job.id, { ...input, organization: owner, repositories, ownerTeam: input.ownerTeam.trim() })
    return job
  }

  async previewRepositories(ownerInput: string, filters: ImportJobFilters = {}, token?: string): Promise<GitHubOrgRepository[]> {
    const owner = parseGitHubOwner(ownerInput)
    return await listGitHubOwnerRepositories(owner, filters, token)
  }

  async findById(id: string): Promise<ImportJob | null> {
    return await this.jobRepo.findById(id)
  }

  async findAll(params: FindAllImportJobsParams = {}) {
    return await this.jobRepo.findAll(params)
  }

  /**
   * Cancels a queued/running job. Already-finished jobs are rejected (409) rather
   * than silently no-op'd, since the caller likely expects a state change to happen.
   * A job orphaned by a dead/restarted process (no live `process()` loop anywhere)
   * is cancelled purely at the DB level; a job still executing in *this* process
   * is stopped between repositories via the status check in `importRepository`.
   */
  async cancel(jobId: string, actor: { userId: string; realUserId?: string | null }): Promise<ImportJob> {
    const job = await this.jobRepo.findById(jobId)
    if (!job) {
      throw createError({ statusCode: 404, message: 'Import job not found' })
    }
    if (job.status !== 'queued' && job.status !== 'running') {
      throw createError({ statusCode: 409, message: `Cannot cancel a job with status '${job.status}'` })
    }

    await this.jobRepo.markCancelled(jobId)
    await this.jobRepo.cancelPendingItems(jobId)

    await this.auditRepo.create({
      operation: 'CANCEL',
      entityType: 'ImportJob',
      entityId: jobId,
      entityLabel: `GitHub owner ${job.organization} import job`,
      changedFields: ['status'],
      source: 'Import Job Admin',
      userId: actor.userId,
      realUserId: actor.realUserId ?? null
    })

    return (await this.jobRepo.findById(jobId))!
  }

  /**
   * Deletes a finished job. Active jobs must be cancelled first — deleting out from
   * under a still-running `process()` loop would let it keep writing to a node that
   * no longer exists (silently, since the mark-* queries just no-op on a missing match).
   */
  async remove(jobId: string, actor: { userId: string; realUserId?: string | null }): Promise<void> {
    const job = await this.jobRepo.findById(jobId)
    if (!job) {
      throw createError({ statusCode: 404, message: 'Import job not found' })
    }
    if (job.status === 'queued' || job.status === 'running') {
      throw createError({ statusCode: 409, message: 'Cancel the job before deleting it' })
    }

    await this.jobRepo.delete(jobId)

    await this.auditRepo.create({
      operation: 'DELETE',
      entityType: 'ImportJob',
      entityId: jobId,
      entityLabel: `GitHub owner ${job.organization} import job`,
      source: 'Import Job Admin',
      userId: actor.userId,
      realUserId: actor.realUserId ?? null
    })
  }

  private runInBackground(jobId: string, input: GitHubOrgImportInput): void {
    if (activeJobs.has(jobId)) return
    activeJobs.add(jobId)

    void this.process(jobId, input)
      .catch(error => {
        logger.error({ err: error, jobId }, 'GitHub org import job failed')
      })
      .finally(() => {
        activeJobs.delete(jobId)
      })
  }

  async process(jobId: string, input: GitHubOrgImportInput): Promise<void> {
    const startedAt = Date.now()
    await this.jobRepo.markRunning(jobId)

    try {
      const repositories = input.repositories && input.repositories.length > 0
        ? input.repositories
        : (await listGitHubOwnerRepositories(input.organization, input.filters || {}, input.githubToken)).map(repo => ({
            repositoryFullName: repo.full_name,
            repositoryUrl: repo.html_url
          }))
      const items = repositories.map(repo => ({
        repositoryFullName: repo.repositoryFullName,
        repositoryUrl: repo.repositoryUrl,
        ownerTeam: repo.ownerTeam ?? null,
        systemName: repo.systemName ?? null
      }))

      await this.jobRepo.createItems(jobId, items)

      if (input.dryRun) {
        await this.finishDryRun(jobId, items)
        await this.jobRepo.markCompleted(jobId)
        return
      }

      const tasks = items.map(item => () => this.importRepository(jobId, item, input))
      await runWithConcurrency(tasks, 5)

      if ((await this.jobRepo.getStatus(jobId)) === 'cancelled') return

      await this.jobRepo.markCompleted(jobId)
      await this.createAuditLog(jobId, input)
      logger.info({
        jobId,
        organization: input.organization,
        repositoryCount: items.length,
        durationMs: Date.now() - startedAt
      }, 'GitHub org import job completed')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'GitHub owner import failed'
      await this.jobRepo.markFailed(jobId, message)
      throw error
    }
  }

  private async finishDryRun(jobId: string, items: CreateImportJobItemParams[]): Promise<void> {
    for (const item of items) {
      await this.jobRepo.markItemFinished(jobId, item.repositoryFullName, 'skipped', {
        message: 'Dry run only'
      })
    }
  }

  private async importRepository(
    jobId: string,
    item: Pick<ImportJobItem, 'repositoryFullName' | 'repositoryUrl'> & { ownerTeam?: string | null; systemName?: string | null },
    input: GitHubOrgImportInput
  ): Promise<void> {
    // An admin may have cancelled the job between task scheduling and this task
    // starting — `cancelPendingItems` already marked this item skipped in that case.
    if ((await this.jobRepo.getStatus(jobId)) === 'cancelled') return

    await this.jobRepo.markItemRunning(jobId, item.repositoryFullName)
    const startedAt = Date.now()

    try {
      const result = await this.gitHubImportService.import({
        repositoryUrl: item.repositoryUrl,
        domain: input.domain,
        ownerTeam: item.ownerTeam ?? input.ownerTeam,
        systemName: item.systemName ?? undefined,
        businessCriticality: input.businessCriticality,
        environment: input.environment,
        userId: input.userId,
        githubToken: input.githubToken
      })

      await this.jobRepo.markItemFinished(jobId, item.repositoryFullName, 'imported', {
        message: 'Imported',
        systemName: result.systemName,
        manifestsFound: result.manifestsFound,
        componentsAdded: result.componentsAdded,
        componentsUpdated: result.componentsUpdated,
        relationshipsCreated: result.relationshipsCreated
      })
      logger.info({
        jobId,
        repository: item.repositoryFullName,
        systemName: result.systemName,
        componentsAdded: result.componentsAdded,
        componentsUpdated: result.componentsUpdated,
        durationMs: Date.now() - startedAt
      }, 'GitHub repository imported')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Import failed'
      await this.jobRepo.markItemFinished(jobId, item.repositoryFullName, 'failed', { message })
      logger.warn({ err: error, jobId, repository: item.repositoryFullName }, 'GitHub repository import failed')
    }
  }

  private async createAuditLog(jobId: string, input: GitHubOrgImportInput): Promise<void> {
    const job = await this.jobRepo.findById(jobId)
    if (!job) return

    await this.auditRepo.create({
      operation: 'IMPORT',
      entityType: 'ImportJob',
      entityId: job.id,
      entityLabel: `GitHub owner ${job.organization}`,
      changedFields: ['repositories', 'systems', 'sboms'],
      source: 'GitHub Owner Import',
      userId: input.userId,
      realUserId: input.realUserId ?? null
    })
  }

  private normalizeSelections(repositories?: GitHubRepositorySelection[]): GitHubRepositorySelection[] | undefined {
    if (!repositories) return undefined
    if (repositories.length === 0) {
      throw createError({ statusCode: 400, message: 'At least one repository must be selected' })
    }

    const normalized = repositories
      .map(repo => ({
        repositoryFullName: typeof repo.repositoryFullName === 'string' ? repo.repositoryFullName.trim() : '',
        repositoryUrl: typeof repo.repositoryUrl === 'string' ? repo.repositoryUrl.trim() : '',
        ownerTeam: typeof repo.ownerTeam === 'string' && repo.ownerTeam.trim() ? repo.ownerTeam.trim() : undefined,
        systemName: typeof repo.systemName === 'string' && repo.systemName.trim() ? repo.systemName.trim() : undefined
      }))
      .filter(repo => repo.repositoryFullName && repo.repositoryUrl)

    const unique = new Map<string, GitHubRepositorySelection>()
    for (const repo of normalized) {
      if (!unique.has(repo.repositoryFullName)) {
        unique.set(repo.repositoryFullName, repo)
      }
    }

    if (unique.size === 0) {
      throw createError({ statusCode: 400, message: 'At least one repository must be selected' })
    }

    return [...unique.values()]
  }
}
