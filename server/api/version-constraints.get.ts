import { versionConstraintService } from '../services/singletons'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const rawLimit = query.limit ? parseInt(query.limit as string, 10) : 50
    const rawOffset = query.offset ? parseInt(query.offset as string, 10) : 0

    if (isNaN(rawLimit) || isNaN(rawOffset)) {
      return { success: false, error: 'limit and offset must be valid integers', data: [] }
    }

    const limit = Math.min(Math.max(1, rawLimit), 200)
    const offset = Math.max(0, rawOffset)
    const scope = query.scope as string | undefined
    const status = query.status as string | undefined

    const result = await versionConstraintService.findAll({
      scope, status,
      search: query.search as string | undefined,
      limit, offset,
      sortBy: query.sortBy as string | undefined,
      sortOrder: (query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' as const : 'asc' as const
    })

    return {
      success: true,
      data: result.data,
      count: result.count,
      total: result.total
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
