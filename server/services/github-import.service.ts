import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { randomBytes } from 'crypto'
import { createBom } from '@cyclonedx/cdxgen'
import {
  parseGitHubRepo,
  fetchRepoMetadata,
  fetchManifestFiles,
  type GitHubRepoMetadata,
  type GitHubFileContent
} from '../utils/github'
import { SystemService } from './system.service'
import { SBOMService } from './sbom.service'

export interface GitHubImportInput {
  /** GitHub repo URL or owner/repo shorthand */
  repositoryUrl: string
  /** Override system domain (defaults to 'Development') */
  domain?: string
  /** Override owner team */
  ownerTeam?: string
  /** Override business criticality (defaults to 'medium') */
  businessCriticality?: string
  /** Override environment (defaults to 'dev') */
  environment?: string
  /** Authenticated user ID */
  userId: string
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
   * 2. Fetch the file tree and download dependency manifests
   * 3. Write manifests to a temp directory and run cdxgen
   * 4. Create the system with the repository linked
   * 5. Submit the generated SBOM for processing
   */
  async import(input: GitHubImportInput): Promise<GitHubImportResult> {
    // 1. Parse and fetch metadata
    const { owner, repo } = parseGitHubRepo(input.repositoryUrl)
    const metadata = await fetchRepoMetadata(owner, repo)
    const repoUrl = metadata.html_url

    // 2. Fetch manifest files
    const manifests = await fetchManifestFiles(owner, repo, metadata.default_branch)

    // 3. Create system with repository
    await this.createSystemWithRepo(metadata, input)

    // 4. Generate and submit SBOM if manifests were found
    let sbomResult = { componentsAdded: 0, componentsUpdated: 0, relationshipsCreated: 0 }

    if (manifests.length > 0) {
      const sbom = await this.generateSBOM(manifests, metadata.name)

      if (sbom) {
        sbomResult = await this.sbomService.processSBOM({
          sbom,
          repositoryUrl: repoUrl,
          format: 'cyclonedx',
          userId: input.userId
        })
      }
    }

    return {
      systemName: metadata.name,
      repositoryUrl: repoUrl,
      description: metadata.description,
      defaultBranch: metadata.default_branch,
      language: metadata.language,
      manifestsFound: manifests.length,
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

    try {
      await this.systemService.create({
        name: metadata.name,
        domain: input.domain || 'Development',
        ownerTeam: input.ownerTeam || '',
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
          await this.systemService.addRepository(metadata.name, { url: repoUrl, name: metadata.name }, input.userId)
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
   * Write manifest files to a temp directory and run cdxgen to generate an SBOM.
   */
  private async generateSBOM(
    manifests: GitHubFileContent[],
    projectName: string
  ): Promise<object | null> {
    const tempDir = join(process.cwd(), '.data', 'temp', `import-${randomBytes(8).toString('hex')}`)

    try {
      // Write manifest files preserving directory structure
      for (const file of manifests) {
        const filePath = join(tempDir, file.path)
        mkdirSync(dirname(filePath), { recursive: true })
        writeFileSync(filePath, file.content, 'utf-8')
      }

      // Run cdxgen
      const bom = await createBom(tempDir, {
        installDeps: false,
        projectName,
        projectVersion: '1.0.0',
        multiProject: true
      })

      if (!bom) return null

      if (typeof bom === 'string') {
        return JSON.parse(bom)
      } else if (bom && typeof bom === 'object' && 'bomJson' in bom) {
        return (bom as Record<string, unknown>).bomJson as object
      }

      return bom as object
    } finally {
      // Always clean up
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true })
      }
    }
  }
}
