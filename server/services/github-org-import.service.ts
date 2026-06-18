import { AuditLogRepository } from '../repositories/audit-log.repository'
import {
  ImportJobRepository,
  type ImportJob,
  type ImportJobFilters,
  type ImportJobItem,
  type CreateImportJobItemParams
} from '../repositories/import-job.repository'
import { GitHubImportService } from './github-import.service'
import { listGitHubOwnerRepositories, parseGitHubOwner, type GitHubOrgRepository } from '../utils/github'
import { logger } from '../utils/logger'

export interface GitHubRepositorySelection {
  repositoryFullName: string
  repositoryUrl: string
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

  async previewRepositories(ownerInput: string, filters: ImportJobFilters = {}): Promise<GitHubOrgRepository[]> {
    const owner = parseGitHubOwner(ownerInput)
    return await listGitHubOwnerRepositories(owner, filters)
  }

  async findById(id: string): Promise<ImportJob | null> {
    return await this.jobRepo.findById(id)
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
    await this.jobRepo.markRunning(jobId)

    try {
      const repositories = input.repositories && input.repositories.length > 0
        ? input.repositories
        : (await listGitHubOwnerRepositories(input.organization, input.filters || {})).map(repo => ({
            repositoryFullName: repo.full_name,
            repositoryUrl: repo.html_url
          }))
      const items = repositories.map(repo => ({
        repositoryFullName: repo.repositoryFullName,
        repositoryUrl: repo.repositoryUrl
      }))

      await this.jobRepo.createItems(jobId, items)

      if (input.dryRun) {
        await this.finishDryRun(jobId, items)
        await this.jobRepo.markCompleted(jobId)
        return
      }

      for (const item of items) {
        await this.importRepository(jobId, item, input)
      }

      await this.jobRepo.markCompleted(jobId)
      await this.createAuditLog(jobId, input)
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
    item: Pick<ImportJobItem, 'repositoryFullName' | 'repositoryUrl'>,
    input: GitHubOrgImportInput
  ): Promise<void> {
    await this.jobRepo.markItemRunning(jobId, item.repositoryFullName)

    try {
      const result = await this.gitHubImportService.import({
        repositoryUrl: item.repositoryUrl,
        domain: input.domain,
        ownerTeam: input.ownerTeam,
        businessCriticality: input.businessCriticality,
        environment: input.environment,
        userId: input.userId
      })

      await this.jobRepo.markItemFinished(jobId, item.repositoryFullName, 'imported', {
        message: 'Imported',
        systemName: result.systemName,
        manifestsFound: result.manifestsFound,
        componentsAdded: result.componentsAdded,
        componentsUpdated: result.componentsUpdated,
        relationshipsCreated: result.relationshipsCreated
      })
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
        repositoryUrl: typeof repo.repositoryUrl === 'string' ? repo.repositoryUrl.trim() : ''
      }))
      .filter(repo => repo.repositoryFullName && repo.repositoryUrl)

    if (normalized.length === 0) {
      throw createError({ statusCode: 400, message: 'At least one repository must be selected' })
    }

    return normalized
  }
}
