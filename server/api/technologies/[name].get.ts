import { TechnologyService } from '../../services/technology.service'

/**
 * @openapi
 * /technologies/{name}:
 *   get:
 *     tags:
 *       - Technologies
 *     summary: Get technology details
 *     description: |
 *       Retrieves detailed information about a specific technology including versions, components, systems, policies, and approvals.
 *       
 *       Returns comprehensive data about:
 *       - Technology metadata (category, vendor, risk level)
 *       - All versions with release and EOL dates
 *       - Components using this technology
 *       - Systems that depend on it
 *       - Applicable policies
 *       - Technology-level and version-specific approvals
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Technology name (e.g., "React", "PostgreSQL")
 *         example: React
 *     responses:
 *       200:
 *         description: Technology details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSingleResourceResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       allOf:
 *                         - $ref: '#/components/schemas/Technology'
 *                         - type: object
 *                           properties:
 *                             ownerTeamEmail:
 *                               type: string
 *                             components:
 *                               type: array
 *                               items:
 *                                 type: object
 *                             systems:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             policies:
 *                               type: array
 *                               items:
 *                                 type: object
 *                             versionApprovals:
 *                               type: array
 *                               items:
 *                                 type: object
 *             example:
 *               success: true
 *               data:
 *                 name: React
 *                 category: framework
 *                 vendor: Meta
 *                 lastReviewed: "2025-10-01"
 *                 ownerTeamName: Frontend Platform
 *                 ownerTeamEmail: frontend-platform@company.com
 *                 versions: ["18.2.0", "18.3.1"]
 *                 technologyApprovals:
 *                   - team: Frontend Platform
 *                     time: invest
 *                     approvedAt: "2025-10-21T19:23:55.763Z"
 *                     approvedBy: Frontend Lead
 *                     notes: Primary framework for customer-facing applications
 *       400:
 *         description: Technology name is required
 *       404:
 *         description: Technology not found
 *       500:
 *         description: Failed to fetch technology
 */
export default defineEventHandler(async (event) => {
  try {
    const name = getRouterParam(event, 'name')
    
    if (!name) {
      throw createError({
        statusCode: 400,
        message: 'Technology name is required'
      })
    }
    
    const technologyService = new TechnologyService()
    const technology = await technologyService.findByName(name)
    
    if (!technology) {
      throw createError({
        statusCode: 404,
        message: `Technology '${name}' not found`
      })
    }
    
    return {
      success: true,
      data: technology
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch technology'
    throw createError({
      statusCode: 500,
      message: errorMessage
    })
  }
})
