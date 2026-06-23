import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GitHubImportService } from '../../../server/services/github-import.service'
import { fetchManifestFiles, fetchRepoMetadata } from '../../../server/utils/github'
import { SystemService } from '../../../server/services/system.service'
import { SBOMService } from '../../../server/services/sbom.service'

vi.mock('../../../server/utils/github', () => ({
  parseGitHubRepo: vi.fn(() => ({ owner: 'acme', repo: 'repo-a' })),
  fetchRepoMetadata: vi.fn(),
  fetchManifestFiles: vi.fn()
}))

vi.mock('../../../server/services/system.service', () => ({
  SystemService: vi.fn()
}))

vi.mock('../../../server/services/sbom.service', () => ({
  SBOMService: vi.fn()
}))

const metadata = {
  name: 'repo-a',
  full_name: 'acme/repo-a',
  description: 'Test repo',
  default_branch: 'main',
  language: 'TypeScript',
  private: false,
  html_url: 'https://github.com/acme/repo-a',
  topics: [],
  license: null
}

describe('GitHubImportService', () => {
  const systemService = {
    create: vi.fn(),
    addRepository: vi.fn()
  }
  const sbomService = {
    processSBOM: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(SystemService).mockImplementation(function () {
      return systemService
    } as never)
    vi.mocked(SBOMService).mockImplementation(function () {
      return sbomService
    } as never)
    vi.mocked(fetchRepoMetadata).mockResolvedValue(metadata)
    vi.mocked(fetchManifestFiles).mockResolvedValue([])
  })

  it('uses a systemName override when creating and returning the imported system', async () => {
    const service = new GitHubImportService()

    const result = await service.import({
      repositoryUrl: 'https://github.com/acme/repo-a',
      systemName: 'Curated System Name',
      domain: 'Platform',
      ownerTeam: 'Platform Team',
      businessCriticality: 'high',
      environment: 'prod',
      userId: 'user-1'
    })

    expect(result.systemName).toBe('Curated System Name')
    expect(systemService.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Curated System Name',
      domain: 'Platform',
      ownerTeam: 'Platform Team',
      businessCriticality: 'high',
      environment: 'prod',
      repositories: [expect.objectContaining({
        url: 'https://github.com/acme/repo-a',
        name: 'repo-a'
      })],
      userId: 'user-1'
    }))
  })

  it('links repositories to the overridden system name when the system already exists', async () => {
    systemService.create.mockRejectedValueOnce({ statusCode: 409 })
    const service = new GitHubImportService()

    await service.import({
      repositoryUrl: 'https://github.com/acme/repo-a',
      systemName: 'Curated System Name',
      ownerTeam: 'Platform Team',
      userId: 'user-1'
    })

    expect(systemService.addRepository).toHaveBeenCalledWith(
      'Curated System Name',
      { url: 'https://github.com/acme/repo-a', name: 'repo-a' },
      'user-1'
    )
  })
})
