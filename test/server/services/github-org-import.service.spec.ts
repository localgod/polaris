import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GitHubOrgImportService } from '../../../server/services/github-org-import.service'
import { listGitHubOwnerRepositories } from '../../../server/utils/github'
import type { ImportJob } from '../../../server/repositories/import-job.repository'

vi.mock('../../../server/utils/github', () => ({
  listGitHubOwnerRepositories: vi.fn(),
  parseGitHubOwner: vi.fn((value: string) => value.replace(/^https:\/\/github\.com\//, ''))
}))

const baseJob: ImportJob = {
  id: 'job-1',
  type: 'github-org',
  status: 'queued',
  requestedBy: 'user-1',
  organization: 'acme',
  filters: {},
  dryRun: false,
  total: 0,
  completed: 0,
  failed: 0,
  skipped: 0,
  createdAt: '2026-06-18',
  startedAt: null,
  finishedAt: null,
  error: null,
  items: []
}

function createRepoMocks() {
  return {
    create: vi.fn().mockResolvedValue(baseJob),
    findById: vi.fn().mockResolvedValue({ ...baseJob, status: 'completed' }),
    markRunning: vi.fn().mockResolvedValue(undefined),
    markCompleted: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
    createItems: vi.fn().mockResolvedValue(undefined),
    markItemRunning: vi.fn().mockResolvedValue(undefined),
    markItemFinished: vi.fn().mockResolvedValue(undefined)
  }
}

describe('GitHubOrgImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a job and starts background processing', async () => {
    const repo = createRepoMocks()
    const service = new GitHubOrgImportService(
      repo as never,
      { import: vi.fn() } as never,
      { create: vi.fn() } as never
    )
    const processSpy = vi.spyOn(service, 'process').mockResolvedValue(undefined)

    const job = await service.start({
      organization: 'acme',
      ownerTeam: 'Platform',
      userId: 'user-1'
    })

    expect(job.id).toBe('job-1')
    expect(repo.create).toHaveBeenCalledWith({
      type: 'github-org',
      requestedBy: 'user-1',
      organization: 'acme',
      filters: {},
      dryRun: false
    })
    expect(processSpy).toHaveBeenCalledWith('job-1', expect.objectContaining({ organization: 'acme' }))
  })

  it('marks dry-run repositories as skipped and completes the job', async () => {
    const repo = createRepoMocks()
    vi.mocked(listGitHubOwnerRepositories).mockResolvedValue([
      {
        name: 'repo-a',
        full_name: 'acme/repo-a',
        html_url: 'https://github.com/acme/repo-a',
        description: null,
        default_branch: 'main',
        language: 'TypeScript',
        private: false,
        fork: false,
        archived: false,
        topics: []
      }
    ])

    const service = new GitHubOrgImportService(
      repo as never,
      { import: vi.fn() } as never,
      { create: vi.fn() } as never
    )

    await service.process('job-1', {
      organization: 'acme',
      ownerTeam: 'Platform',
      dryRun: true,
      userId: 'user-1'
    })

    expect(repo.markRunning).toHaveBeenCalledWith('job-1')
    expect(repo.createItems).toHaveBeenCalledWith('job-1', [
      { repositoryFullName: 'acme/repo-a', repositoryUrl: 'https://github.com/acme/repo-a' }
    ])
    expect(repo.markItemFinished).toHaveBeenCalledWith('job-1', 'acme/repo-a', 'skipped', {
      message: 'Dry run only'
    })
    expect(repo.markCompleted).toHaveBeenCalledWith('job-1')
  })

  it('previews repositories for an owner without creating a job', async () => {
    const repo = createRepoMocks()
    vi.mocked(listGitHubOwnerRepositories).mockResolvedValue([
      {
        name: 'repo-a',
        full_name: 'acme/repo-a',
        html_url: 'https://github.com/acme/repo-a',
        description: null,
        default_branch: 'main',
        language: 'TypeScript',
        private: false,
        fork: false,
        archived: false,
        topics: []
      }
    ])

    const service = new GitHubOrgImportService(
      repo as never,
      { import: vi.fn() } as never,
      { create: vi.fn() } as never
    )

    const result = await service.previewRepositories('https://github.com/acme', { language: 'TypeScript' })

    expect(result).toHaveLength(1)
    expect(listGitHubOwnerRepositories).toHaveBeenCalledWith('acme', { language: 'TypeScript' })
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('imports only selected repositories when provided', async () => {
    const repo = createRepoMocks()
    const importService = {
      import: vi.fn().mockResolvedValue({
        systemName: 'repo-a',
        repositoryUrl: 'https://github.com/acme/repo-a',
        description: null,
        defaultBranch: 'main',
        language: 'TypeScript',
        manifestsFound: 1,
        componentsAdded: 2,
        componentsUpdated: 0,
        relationshipsCreated: 1
      })
    }

    const service = new GitHubOrgImportService(
      repo as never,
      importService as never,
      { create: vi.fn() } as never
    )

    await service.process('job-1', {
      organization: 'acme',
      ownerTeam: 'Platform',
      userId: 'user-1',
      repositories: [
        { repositoryFullName: 'acme/repo-a', repositoryUrl: 'https://github.com/acme/repo-a' }
      ]
    })

    expect(listGitHubOwnerRepositories).not.toHaveBeenCalled()
    expect(repo.createItems).toHaveBeenCalledWith('job-1', [
      { repositoryFullName: 'acme/repo-a', repositoryUrl: 'https://github.com/acme/repo-a' }
    ])
    expect(importService.import).toHaveBeenCalledTimes(1)
    expect(importService.import).toHaveBeenCalledWith(expect.objectContaining({
      repositoryUrl: 'https://github.com/acme/repo-a'
    }))
  })

  it('continues importing after a per-repository failure', async () => {
    const repo = createRepoMocks()
    const importService = {
      import: vi.fn()
        .mockRejectedValueOnce(new Error('repo failed'))
        .mockResolvedValueOnce({
          systemName: 'repo-b',
          repositoryUrl: 'https://github.com/acme/repo-b',
          description: null,
          defaultBranch: 'main',
          language: 'TypeScript',
          manifestsFound: 2,
          componentsAdded: 3,
          componentsUpdated: 4,
          relationshipsCreated: 5
        })
    }
    vi.mocked(listGitHubOwnerRepositories).mockResolvedValue([
      {
        name: 'repo-a',
        full_name: 'acme/repo-a',
        html_url: 'https://github.com/acme/repo-a',
        description: null,
        default_branch: 'main',
        language: 'TypeScript',
        private: false,
        fork: false,
        archived: false,
        topics: []
      },
      {
        name: 'repo-b',
        full_name: 'acme/repo-b',
        html_url: 'https://github.com/acme/repo-b',
        description: null,
        default_branch: 'main',
        language: 'TypeScript',
        private: false,
        fork: false,
        archived: false,
        topics: []
      }
    ])

    const service = new GitHubOrgImportService(
      repo as never,
      importService as never,
      { create: vi.fn() } as never
    )

    await service.process('job-1', {
      organization: 'acme',
      ownerTeam: 'Platform',
      userId: 'user-1'
    })

    expect(importService.import).toHaveBeenCalledTimes(2)
    expect(repo.markItemFinished).toHaveBeenCalledWith('job-1', 'acme/repo-a', 'failed', {
      message: 'repo failed'
    })
    expect(repo.markItemFinished).toHaveBeenCalledWith('job-1', 'acme/repo-b', 'imported', expect.objectContaining({
      systemName: 'repo-b',
      manifestsFound: 2,
      componentsAdded: 3
    }))
    expect(repo.markCompleted).toHaveBeenCalledWith('job-1')
  })
})
