import type { Record as Neo4jRecord } from 'neo4j-driver'

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

  const driver = useDriver()
  const session = driver.session()

  try {
    const result = await session.run(
      `
      MATCH (u:User)
      OPTIONAL MATCH (u)-[:MEMBER_OF]->(t:Team)
      OPTIONAL MATCH (u)-[:CAN_MANAGE]->(mt:Team)
      RETURN u {
        .*,
        teams: collect(DISTINCT {name: t.name, email: t.email}),
        canManage: collect(DISTINCT mt.name)
      } as user
      ORDER BY u.createdAt DESC
      `
    )

    const users = result.records.map((record: Neo4jRecord) => {
      const user = record.get('user')
      // Filter out null teams
      user.teams = user.teams.filter((t: { name: string | null }) => t.name !== null)
      user.canManage = user.canManage.filter((name: string) => name !== null)
      return user
    })

    return {
      success: true,
      data: users,
      count: users.length
    }
  } finally {
    await session.close()
  }
})
