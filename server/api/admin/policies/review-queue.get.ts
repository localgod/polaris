/**
 * @openapi
 * /admin/policies/review-queue:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get technologies flagged for manual policy review
 *     description: |
 *       Returns technologies whose legacy team TIME approvals conflicted during the
 *       migration to org-level TechnologyPolicy. These must be reviewed manually by
 *       an org-admin who will propose and activate an appropriate policy.
 *
 *       **Authorization:** Org-admin or superuser
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: List of review queue entries
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Organization admin access required
 */
import { policyService } from '../../../services/singletons'
import { sendSuccess } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  await requireOrgAdmin(event)
  const queue = await policyService.getReviewQueue()
  return sendSuccess(event, queue)
})
