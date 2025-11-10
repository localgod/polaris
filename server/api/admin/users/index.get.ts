import { UserService } from '../../../services/user.service'

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
  await requireSuperuser(event)

  const userService = new UserService()
  const result = await userService.findAll()

  return {
    success: true,
    ...result
  }
})
