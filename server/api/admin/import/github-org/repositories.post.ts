import { gitHubOrgImportService } from '../../../../services/singletons'
import { getServerSession } from '#auth'

/**
 * @openapi
 * /admin/import/github-org/repositories:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Preview GitHub owner repositories
 *     description: |
 *       Lists repositories for a GitHub organization or user before starting an import job.
 *       Superusers can use the returned list to choose which repositories to import.
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
 *     responses:
 *       200:
 *         description: Repositories retrieved successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Superuser access required
 *       422:
 *         description: GitHub owner not accessible
 */
export default defineEventHandler(async (event) => {
  await requireSuperuser(event)
  const session = await getServerSession(event)
  const githubToken = session?.user?.githubToken
  const body = await readBody(event) || {}

  const owner = typeof body.owner === 'string'
    ? body.owner.trim()
    : typeof body.organization === 'string' ? body.organization.trim() : ''
  const filters = body.filters && typeof body.filters === 'object' ? body.filters : {}

  if (!owner) {
    throw createError({ statusCode: 400, message: 'owner is required' })
  }

  try {
    const repositories = await gitHubOrgImportService.previewRepositories(owner, {
      language: typeof filters.language === 'string' ? filters.language.trim() || undefined : undefined,
      topic: typeof filters.topic === 'string' ? filters.topic.trim() || undefined : undefined,
      namePattern: typeof filters.namePattern === 'string' ? filters.namePattern.trim() || undefined : undefined
    }, githubToken)

    return {
      success: true,
      data: repositories.map(repo => ({
        name: repo.name,
        fullName: repo.full_name,
        url: repo.html_url,
        description: repo.description,
        language: repo.language,
        private: repo.private,
        fork: repo.fork,
        archived: repo.archived,
        topics: repo.topics || []
      })),
      count: repositories.length
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    const message = error instanceof Error ? error.message : 'Failed to fetch GitHub repositories'
    throw createError({ statusCode: 422, statusMessage: message, message })
  }
})
