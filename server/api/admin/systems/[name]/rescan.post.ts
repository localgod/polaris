import { gitHubImportService, systemService } from '../../../../services/singletons'

export default defineEventHandler(async (event) => {
  const user = await requireSuperuser(event)

  const rawName = getRouterParam(event, 'name')

  if (!rawName) {
    throw createError({ statusCode: 400, message: 'System name is required' })
  }

  const name = decodeURIComponent(rawName)

  const system = await systemService.findByName(name)

  if (!system) {
    throw createError({ statusCode: 404, message: `System '${name}' not found` })
  }

  if (!system.ownerTeam) {
    throw createError({ statusCode: 422, message: `System '${name}' has no owner team — cannot rescan` })
  }

  const { data: repositories } = await systemService.getRepositories(name)

  if (repositories.length === 0) {
    throw createError({ statusCode: 422, message: `System '${name}' has no linked repositories — cannot rescan` })
  }

  const results = await Promise.allSettled(
    repositories.map(repo =>
      gitHubImportService.import({
        repositoryUrl: repo.url,
        systemName: name,
        ownerTeam: system.ownerTeam!,
        userId: user.id
      })
    )
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  const failures = results
    .map((r, i) => r.status === 'rejected' ? { repository: repositories[i]!.url, error: r.reason instanceof Error ? r.reason.message : String(r.reason) } : null)
    .filter(Boolean)

  if (failures.length > 0) {
    event.context.logger?.warn({ failures }, 'Some repositories failed to rescan')
  }

  return {
    success: true,
    data: { total: repositories.length, succeeded, failed, failures }
  }
})
