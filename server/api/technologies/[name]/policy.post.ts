/**
 * @openapi
 * /technologies/{name}/policy:
 *   post:
 *     tags:
 *       - Technologies
 *     summary: Propose or update a draft TIME policy for a technology
 *     description: |
 *       Creates or updates a draft TechnologyPolicy. Only the technology's steward team or an org-admin may call this.
 *       The draft must be activated (via POST /policy/activate) by an org-admin before it becomes authoritative.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Technology name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - time
 *             properties:
 *               time:
 *                 type: string
 *                 enum: [tolerate, invest, migrate, eliminate]
 *               rationale:
 *                 type: string
 *               migrationTarget:
 *                 type: string
 *               effectiveDate:
 *                 type: string
 *                 format: date
 *               expiryDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Draft policy created or updated
 *       403:
 *         description: User is not the steward or org-admin
 *       404:
 *         description: Technology not found
 *       422:
 *         description: Invalid TIME value
 */
import { policyService, technologyService } from '../../../services/singletons'
import { sendSuccess } from '../../../utils/response'
import { auditFailedOperation } from '../../../utils/audit'

interface ProposePolicyRequest {
  time: string
  rationale?: string | null
  migrationTarget?: string | null
  effectiveDate?: string | null
  expiryDate?: string | null
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const realUserId = await getImpersonatorId(event)

  const rawName = getRouterParam(event, 'name')
  if (!rawName) throw createError({ statusCode: 400, message: 'Technology name is required' })
  const technologyName = decodeURIComponent(rawName)

  const body = await readBody<ProposePolicyRequest>(event)
  if (!body?.time) throw createError({ statusCode: 400, message: 'time is required' })

  // Authorization: org-admin or steward of the technology
  if (user.role !== 'superuser' && !user.orgAdmin) {
    const tech = await technologyService.findByName(technologyName)
    if (!tech) throw createError({ statusCode: 404, message: `Technology '${technologyName}' not found` })
    const userTeamNames = user.teams?.map((t: { name: string }) => t.name) || []
    if (!tech.stewardTeamName || !userTeamNames.includes(tech.stewardTeamName)) {
      throw createError({ statusCode: 403, message: 'Only the technology steward or an org-admin may propose a policy' })
    }
  }

  try {
    const result = await policyService.propose({
      technologyName,
      time: body.time,
      rationale: body.rationale ?? null,
      migrationTarget: body.migrationTarget ?? null,
      effectiveDate: body.effectiveDate ?? null,
      expiryDate: body.expiryDate ?? null,
      userId: user.id,
      realUserId,
      correlationId: event.context.correlationId
    })
    return sendSuccess(event, result)
  } catch (error) {
    await auditFailedOperation(event, {
      operation: 'PROPOSE_POLICY',
      entityType: 'Technology',
      entityId: technologyName,
      reason: error instanceof Error ? error.message : 'Failed to propose technology policy',
      userId: user.id,
      realUserId
    })
    throw error
  }
})
