import { VersionConstraintService } from '../services/version-constraint.service'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const limit = query.limit ? parseInt(query.limit as string, 10) : 50
    const offset = query.offset ? parseInt(query.offset as string, 10) : 0
    const scope = query.scope as string | undefined
    const status = query.status as string | undefined

    const service = new VersionConstraintService()
    const result = await service.findAll({
      scope, status,
      sortBy: query.sortBy as string | undefined,
      sortOrder: (query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' as const : 'asc' as const
    })
    const total = result.data.length
    const paginatedData = result.data.slice(offset, offset + limit)

    return {
      success: true,
      data: paginatedData,
      count: paginatedData.length,
      total
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch version constraints'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
