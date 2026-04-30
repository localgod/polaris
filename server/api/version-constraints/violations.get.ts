import { versionConstraintService } from '../../services/singletons'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  try {
    const query = getQuery(event)

    const result = await versionConstraintService.getViolations({
      severity: query.severity as string | undefined,
      team: query.team as string | undefined,
      technology: query.technology as string | undefined
    })

    return { success: true, ...result }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch violations'
    return {
      success: false,
      error: errorMessage,
      data: [],
      count: 0,
      summary: { critical: 0, error: 0, warning: 0, info: 0 }
    }
  }
})
