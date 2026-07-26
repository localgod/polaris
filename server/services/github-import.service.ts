import { rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { execFile } from 'child_process'
import { promisify } from 'util'
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

const execFileAsync = promisify(execFile)

// cdxgen is run as its own subprocess (not imported in-process) so a memory-hungry or
// runaway scan can only take down that child, never the Nitro server itself. Previously,
// an in-process, unrestricted-project-type scan of a large repo OOM-killed the whole dev
// server — see the incident where self-importing this repo took down `nuxt dev`.
const CDXGEN_BIN = join(process.cwd(), 'node_modules', '@cyclonedx', 'cdxgen', 'bin', 'cdxgen.js')
const CDXGEN_TIMEOUT_MS = 5 * 60 * 1000
const CDXGEN_MAX_OLD_SPACE_MB = 2048

// Best-effort narrowing of cdxgen's scan to the ecosystem GitHub already detected as the
// repo's primary language — dramatically cuts scan cost vs. cdxgen's default "universal"
// mode, which walks every manifest type it knows about (Maven, Gradle, pip, Cargo, ...).
// Falls back to an unrestricted (but still subprocess-isolated) scan when unmapped.
const GITHUB_LANGUAGE_TO_CDXGEN_TYPE: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  vue: 'typescript',
  python: 'python',
  java: 'java',
  kotlin: 'java',
  scala: 'scala',
  go: 'go',
  rust: 'rust',
  php: 'php',
  csharp: 'csharp',
  'c#': 'csharp',
  ruby: 'ruby',
  swift: 'swift',
  'objective-c': 'objective-c',
  dart: 'dart',
  c: 'c',
  'c++': 'cpp',
  clojure: 'clojure',
  haskell: 'haskell',
  elixir: 'elixir'
}

function resolveCdxgenProjectType(githubLanguage: string | null): string | null {
  if (!githubLanguage) return null
  return GITHUB_LANGUAGE_TO_CDXGEN_TYPE[githubLanguage.toLowerCase()] ?? null
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
      const sbom = await this.generateSBOM(tempDir, metadata.name, metadata.language)

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
   *
   * Runs cdxgen as a subprocess rather than importing it in-process, capped with
   * --max-old-space-size and a hard timeout, so a memory-hungry or hanging scan
   * only kills that child process instead of the whole Nitro server.
   */
  private async generateSBOM(repoDir: string, projectName: string, githubLanguage: string | null): Promise<object | null> {
    logger.info({ projectName, repoDir }, 'Running cdxgen for GitHub import')
    const startedAt = Date.now()

    const outputFile = join(repoDir, `.cdxgen-bom-${randomBytes(4).toString('hex')}.json`)
    const projectType = resolveCdxgenProjectType(githubLanguage)

    const args = [
      `--max-old-space-size=${CDXGEN_MAX_OLD_SPACE_MB}`,
      CDXGEN_BIN,
      repoDir,
      '-o', outputFile,
      '--no-install-deps'
    ]
    if (projectType) {
      args.push('-t', projectType)
    }

    try {
      // With --no-install-deps, cdxgen has no local node_modules to read
      // per-package description/license/homepage from — so npm/yarn components
      // normally come back with none of that metadata. CDXGEN_FETCH_PKG_METADATA
      // makes cdxgen fetch the same fields from the public registry (e.g.
      // registry.npmjs.org) instead — read-only HTTP lookups, no install
      // scripts run — matching the pattern cdxgen's own CLI uses.
      await execFileAsync('node', args, {
        timeout: CDXGEN_TIMEOUT_MS,
        killSignal: 'SIGKILL',
        maxBuffer: 20 * 1024 * 1024,
        env: { ...process.env, CDXGEN_FETCH_PKG_METADATA: 'true' }
      })

      const durationMs = Date.now() - startedAt

      if (!existsSync(outputFile)) {
        logger.warn({ projectName, durationMs }, 'cdxgen produced no BOM file')
        return null
      }

      logger.info({ projectName, durationMs, projectType }, 'cdxgen completed')
      return JSON.parse(readFileSync(outputFile, 'utf8'))
    } catch (err) {
      const durationMs = Date.now() - startedAt
      const timedOut = (err as { killed?: boolean })?.killed === true
      logger.error({ err, projectName, durationMs, timedOut }, 'cdxgen failed during GitHub import')
      throw timedOut
        ? new Error(`cdxgen timed out after ${CDXGEN_TIMEOUT_MS}ms while scanning ${projectName}`)
        : err
    } finally {
      if (existsSync(outputFile)) {
        rmSync(outputFile, { force: true })
      }
    }
  }
}
