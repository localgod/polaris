import { gitHubOrgImportService } from '../../../services/singletons'

/**
 * @openapi
 * /admin/import/github-org:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Start a GitHub owner import job
 *     description: |
 *       Lists repositories for a GitHub organization or user and starts a background import job.
 *       Returns immediately with a job ID that can be polled for progress.
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - owner
 *               - ownerTeam
 *             properties:
 *               owner:
 *                 type: string
 *                 description: GitHub organization/user login or profile URL
 *                 example: "https://github.com/localgod"
 *               organization:
 *                 type: string
 *                 deprecated: true
 *                 description: Backward-compatible alias for owner
 *               filters:
 *                 type: object
 *                 properties:
 *                   language:
 *                     type: string
 *                   topic:
 *                     type: string
 *                   namePattern:
 *                     type: string
 *               dryRun:
 *                 type: boolean
 *               repositories:
 *                 type: array
 *                 description: Selected repositories to import. When omitted, all matching owner repositories are imported.
 *                 items:
 *                   type: object
 *                   required:
 *                     - repositoryFullName
 *                     - repositoryUrl
 *                   properties:
 *                     repositoryFullName:
 *                       type: string
 *                     repositoryUrl:
 *                       type: string
 *               domain:
 *                 type: string
 *               ownerTeam:
 *                 type: string
 *               businessCriticality:
 *                 type: string
 *                 enum: [critical, high, medium, low]
 *               environment:
 *                 type: string
 *                 enum: [dev, test, staging, prod]
 *     responses:
 *       202:
 *         description: Import job accepted
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Superuser access required
 */
export default defineEventHandler(async (event) => {
  const user = await requireSuperuser(event)
  const realUserId = await getImpersonatorId(event)
  const body = await readBody(event) || {}

  const owner = typeof body.owner === 'string'
    ? body.owner.trim()
    : typeof body.organization === 'string' ? body.organization.trim() : ''
  const ownerTeam = typeof body.ownerTeam === 'string' ? body.ownerTeam.trim() : ''
  const filters = body.filters && typeof body.filters === 'object' ? body.filters : {}
  const repositories = Array.isArray(body.repositories)
    ? body.repositories.map((repo: Record<string, unknown>) => ({
        repositoryFullName: typeof repo.repositoryFullName === 'string' ? repo.repositoryFullName.trim() : '',
        repositoryUrl: typeof repo.repositoryUrl === 'string' ? repo.repositoryUrl.trim() : ''
      }))
    : undefined

  if (!owner) {
    throw createError({ statusCode: 400, message: 'owner is required' })
  }

  if (!ownerTeam) {
    throw createError({ statusCode: 400, message: 'ownerTeam is required' })
  }

  try {
    const job = await gitHubOrgImportService.start({
      organization: owner,
      filters: {
        language: typeof filters.language === 'string' ? filters.language.trim() || undefined : undefined,
        topic: typeof filters.topic === 'string' ? filters.topic.trim() || undefined : undefined,
        namePattern: typeof filters.namePattern === 'string' ? filters.namePattern.trim() || undefined : undefined
      },
      repositories,
      dryRun: Boolean(body.dryRun),
      domain: typeof body.domain === 'string' ? body.domain.trim() || undefined : undefined,
      ownerTeam,
      businessCriticality: body.businessCriticality,
      environment: body.environment,
      userId: user.id,
      realUserId
    })

    setResponseStatus(event, 202)
    return {
      success: true,
      data: job
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    const message = error instanceof Error ? error.message : 'GitHub owner import failed'
    throw createError({ statusCode: 422, statusMessage: message, message })
  }
})
