import { userService } from '../../../services/singletons'
import { auditSensitiveRead } from '../../../utils/audit'

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags:
 *       - Admin
 *     summary: List all users
 *     description: |
 *       Retrieves all users with their team memberships and management permissions.
 *       
 *       **Authorization:** Superuser
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/User'
 *                       - type: object
 *                         properties:
 *                           teams:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 name:
 *                                   type: string
 *                                 email:
 *                                   type: string
 *                           canManage:
 *                             type: array
 *                             items:
 *                               type: string
 *                 count:
 *                   type: integer
 *             example:
 *               success: true
 *               data:
 *                 - id: "user123"
 *                   name: John Doe
 *                   email: john@example.com
 *                   teams:
 *                     - name: frontend-team
 *                       email: frontend@example.com
 *                   canManage: ["frontend-team"]
 *               count: 1
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Superuser access required
 */
export default defineEventHandler(async (event) => {
  // Require superuser access
  const currentUser = await requireSuperuser(event)
  const realUserId = await getImpersonatorId(event)

  const result = await userService.findAll()

  await auditSensitiveRead(event, {
    entityType: 'User',
    entityId: 'all',
    reason: 'Listed all users with team memberships',
    userId: currentUser.id,
    realUserId
  })

  return {
    success: true,
    ...result
  }
})
