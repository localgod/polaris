import { TeamService } from '../../../services/team.service'

export default defineEventHandler(async (event) => {
  try {
    const teamName = getRouterParam(event, 'name')

    if (!teamName) {
      throw createError({ statusCode: 400, message: 'Team name is required' })
    }

    const teamService = new TeamService()
    const result = await teamService.findConstraints(teamName)

    return { success: true, data: result }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch team version constraints'
    return { success: false, error: errorMessage }
  }
})
