/**
 * @openapi
 * /technologies/{name}/approvals:
 *   post:
 *     tags:
 *       - Technologies
 *     summary: "[Deprecated] Set a team's TIME approval for a technology"
 *     description: |
 *       **This endpoint is deprecated and no longer accepts writes.**
 *
 *       Team-level TIME approvals have been replaced by organization-level TechnologyPolicy.
 *       Use `POST /api/technologies/{name}/policy` to propose a policy and
 *       `POST /api/technologies/{name}/policy/activate` to activate it.
 *
 *       See ADR-0008 for the rationale.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Technology name
 *     responses:
 *       410:
 *         description: Gone — team-level approvals replaced by org-level TechnologyPolicy
 */
export default defineEventHandler(async (_event) => {
  throw createError({
    statusCode: 410,
    statusMessage: 'Gone',
    message:
      'Team-level TIME approvals are no longer supported. ' +
      'Use POST /api/technologies/{name}/policy to propose an org-level policy. ' +
      'See ADR-0008 for details.'
  })
})
