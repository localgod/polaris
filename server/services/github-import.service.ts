import { rmSync, existsSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { createBom } from '@cyclonedx/cdxgen'
import { logger } from '../utils/logger'
import {
  parseGitHubRepo,
  fetchRepoMetadata,
  cloneRepository,
  type GitHubRepoMetadata
} from '../utils/github'
import { SystemService } from './system.service'
import { SBOMService } from './sbom.service'

export interface GitHubImportInput {
  /** GitHub repo URL or owner/repo shorthand */
  repositoryUrl: string
  /** Override system name (defaults to the GitHub repository name) */
  systemName?: string
  /** Override system domain (defaults to 'Development') */
  domain?: string
  /** Owning team name (must exist) */
  ownerTeam: string
  /** Override business criticality (defaults to 'medium') */
  businessCriticality?: string
  /** Override environment (defaults to 'dev') */
  environment?: string
  /** Authenticated user ID */
  userId: string
  /** GitHub OAuth token for the requesting user — used to clone the repository */
  githubToken?: string
}

export interface GitHubImportResult {
  systemName: string
  repositoryUrl: string
  description: string | null
  defaultBranch: string
  language: string | null
  manifestsFound: number
  componentsAdded: number
  componentsUpdated: number
  relationshipsCreated: number
}

export class GitHubImportService {
  private systemService: SystemService
  private sbomService: SBOMService

  constructor() {
    this.systemService = new SystemService()
    this.sbomService = new SBOMService()
  }

  /**
   * Import a system from a GitHub repository.
   *
   * Steps:
   * 1. Parse the repo URL and fetch metadata from GitHub API
   * 2. Shallow-clone the repository to a temp directory
   * 3. Create the system with the repository linked
   * 4. Run cdxgen on the clone and submit the SBOM
   */
  async import(input: GitHubImportInput): Promise<GitHubImportResult> {
    const startedAt = Date.now()
    if (!input.githubToken) {
      throw new Error('GitHub authentication required — please sign in via GitHub to import repositories')
    }

    // 1. Parse and fetch metadata (name, description, topics, language)
    const { owner, repo } = parseGitHubRepo(input.repositoryUrl)
    const metadata = await fetchRepoMetadata(owner, repo, input.githubToken)
    const repoUrl = metadata.html_url

    // 2. Clone and generate SBOM
    const tempDir = join(process.cwd(), '.data', 'temp', `import-${randomBytes(8).toString('hex')}`)
    let sbomResult = { componentsAdded: 0, componentsUpdated: 0, relationshipsCreated: 0 }

    try {
      await cloneRepository(repoUrl, tempDir, input.githubToken)

      // 3. Create system with repository
      await this.createSystemWithRepo(metadata, input)

      // 4. Generate and submit SBOM
      const sbom = await this.generateSBOM(tempDir, metadata.name)

      if (sbom) {
        sbomResult = await this.sbomService.processSBOM({
          sbom,
          repositoryUrl: repoUrl,
          format: 'cyclonedx',
          userId: input.userId
        })
      }
    } finally {
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true })
      }
    }

    logger.info({
      repositoryUrl: repoUrl,
      componentsAdded: sbomResult.componentsAdded,
      componentsUpdated: sbomResult.componentsUpdated,
      durationMs: Date.now() - startedAt
    }, 'GitHub import workflow completed')

    return {
      systemName: input.systemName?.trim() || metadata.name,
      repositoryUrl: repoUrl,
      description: metadata.description,
      defaultBranch: metadata.default_branch,
      language: metadata.language,
      manifestsFound: 0,
      componentsAdded: sbomResult.componentsAdded,
      componentsUpdated: sbomResult.componentsUpdated,
      relationshipsCreated: sbomResult.relationshipsCreated
    }
  }

  /**
   * Create the system and link the repository.
   * If the system already exists, this is a no-op (the SBOM will still be processed).
   */
  private async createSystemWithRepo(
    metadata: GitHubRepoMetadata,
    input: GitHubImportInput
  ): Promise<void> {
    const repoUrl = metadata.html_url
    const systemName = input.systemName?.trim() || metadata.name

    try {
      await this.systemService.create({
        name: systemName,
        domain: input.domain || 'Development',
        ownerTeam: input.ownerTeam,
        businessCriticality: input.businessCriticality || 'medium',
        environment: input.environment || 'dev',
        repositories: [{
          url: repoUrl,
          name: metadata.name,
          isPublic: !metadata.private,
        }],
        userId: input.userId
      })
    } catch (error: unknown) {
      // If system already exists, add the repository to it
      if (error && typeof error === 'object' && 'statusCode' in error && (error as { statusCode: number }).statusCode === 409) {
        try {
          await this.systemService.addRepository(systemName, { url: repoUrl, name: metadata.name }, input.userId)
        } catch (repoError: unknown) {
          // Repository may already be linked — that's fine
          if (!(repoError && typeof repoError === 'object' && 'statusCode' in repoError && (repoError as { statusCode: number }).statusCode === 409)) {
            throw repoError
          }
        }
      } else {
        throw error
      }
    }
  }

  /**
   * Run cdxgen on a cloned repository directory to generate an SBOM.
   */
  private async generateSBOM(repoDir: string, projectName: string): Promise<object | null> {
    logger.info({ projectName, repoDir }, 'Running cdxgen for GitHub import')
    const startedAt = Date.now()

    try {
      const bom = await createBom(repoDir, {
        installDeps: false,
        projectName,
        projectVersion: '1.0.0',
        multiProject: true,
      })
      const durationMs = Date.now() - startedAt

      if (!bom) {
        logger.warn({ projectName, durationMs }, 'cdxgen returned no BOM')
        return null
      }

      logger.info({ projectName, durationMs }, 'cdxgen completed')

      if (typeof bom === 'string') {
        return JSON.parse(bom)
      } else if (bom && typeof bom === 'object' && 'bomJson' in bom) {
        return (bom as Record<string, unknown>).bomJson as object
      }

      return bom as object
    } catch (err) {
      logger.error({ err, projectName, durationMs: Date.now() - startedAt }, 'cdxgen threw during GitHub import')
      throw err
    }
  }
}
