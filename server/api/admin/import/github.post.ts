import { GitHubImportService } from '../../../services/github-import.service'
import { AuditLogRepository } from '../../../repositories/audit-log.repository'

/**
 * @openapi
 * /admin/import/github:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Import a system from a GitHub repository
 *     description: |
 *       Fetches repository metadata and dependency manifests from the GitHub API,
 *       generates an SBOM via cdxgen, creates the system with its repository,
 *       and ingests the SBOM. Superuser only.
 *     security:
 *       - session: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - repositoryUrl
 *             properties:
 *               repositoryUrl:
 *                 type: string
 *                 description: GitHub repo URL or owner/repo shorthand
 *                 example: "https://github.com/org/repo"
 *               domain:
 *                 type: string
 *                 description: Business domain (defaults to Development)
 *               ownerTeam:
 *                 type: string
 *                 description: Owning team name
 *               businessCriticality:
 *                 type: string
 *                 enum: [critical, high, medium, low]
 *               environment:
 *                 type: string
 *                 enum: [dev, test, staging, prod]
 *     responses:
 *       200:
 *         description: System imported successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not authorized
 *       422:
 *         description: GitHub repository not accessible or no manifests found
 */
export default defineEventHandler(async (event) => {
  const user = await requireSuperuser(event)

  const body = await readBody(event)

  if (!body?.repositoryUrl) {
    throw createError({ statusCode: 400, message: 'repositoryUrl is required' })
  }

  const importService = new GitHubImportService()

  try {
    const result = await importService.import({
      repositoryUrl: body.repositoryUrl,
      domain: body.domain,
      ownerTeam: body.ownerTeam,
      businessCriticality: body.businessCriticality,
      environment: body.environment,
      userId: user.id
    })

    // Audit log
    const auditRepo = new AuditLogRepository()
    await auditRepo.create({
      operation: 'IMPORT',
      entityType: 'System',
      entityId: result.systemName,
      entityLabel: result.systemName,
      changedFields: [
        'system',
        'repository',
        ...(result.componentsAdded > 0 ? ['sbom'] : [])
      ],
      source: 'GitHub Import',
      userId: user.id
    })

    return {
      success: true,
      data: result
    }
  } catch (error: unknown) {
    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    const message = error instanceof Error ? error.message : 'Import failed'

    // GitHub API errors (not found, rate limit, etc.)
    if (message.includes('not found') || message.includes('Cannot parse')) {
      throw createError({ statusCode: 422, message })
    }

    throw createError({ statusCode: 500, message })
  }
})
