/**
 * @openapi
 * /admin/users/{userId}/teams:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Assign user to teams
 *     description: |
 *       Assigns a user to one or more teams, replacing existing team memberships.
 *       
 *       **Authorization:** Superuser
 *       
 *       **Behavior:**
 *       - Removes all existing team memberships
 *       - Creates new memberships for specified teams
 *       - Optionally grants team management permissions
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teams
 *             properties:
 *               teams:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of team names
 *               canManage:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of team names user can manage (optional)
 *           example:
 *             teams: ["frontend-team", "platform-team"]
 *             canManage: ["frontend-team"]
 *     responses:
 *       200:
 *         description: User teams updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     teams:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                     canManage:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: User ID or teams array is required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Superuser access required
 *       404:
 *         description: User not found
 */
export default defineEventHandler(async (event) => {
  // Require superuser access
  await requireSuperuser(event)
  
  const userId = getRouterParam(event, 'userId')
  
  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'User ID is required'
    })
  }

  const body = await readBody(event)
  
  if (!body.teams || !Array.isArray(body.teams)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Teams array is required'
    })
  }

  const driver = useDriver()
  const session = driver.session()

  try {
    // Remove existing team memberships
    await session.run(
      `
      MATCH (u:User {id: $userId})-[r:MEMBER_OF]->(:Team)
      DELETE r
      `,
      { userId }
    )

    // Add new team memberships
    if (body.teams.length > 0) {
      await session.run(
        `
        MATCH (u:User {id: $userId})
        UNWIND $teamNames as teamName
        MATCH (t:Team {name: teamName})
        MERGE (u)-[:MEMBER_OF]->(t)
        `,
        { userId, teamNames: body.teams }
      )
    }

    // Optionally set team management permissions
    if (body.canManage && Array.isArray(body.canManage) && body.canManage.length > 0) {
      await session.run(
        `
        MATCH (u:User {id: $userId})
        UNWIND $teamNames as teamName
        MATCH (t:Team {name: teamName})
        MERGE (u)-[:CAN_MANAGE]->(t)
        `,
        { userId, teamNames: body.canManage }
      )
    }

    // Fetch updated user with teams
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})
      OPTIONAL MATCH (u)-[:MEMBER_OF]->(t:Team)
      OPTIONAL MATCH (u)-[:CAN_MANAGE]->(mt:Team)
      RETURN u {
        .*,
        teams: collect(DISTINCT {name: t.name, email: t.email}),
        canManage: collect(DISTINCT mt.name)
      } as user
      `,
      { userId }
    )

    const record = getFirstRecordOrThrow(result.records, 'User not found')

    setResponseStatus(event, 200)
    return {
      success: true,
      data: record.get('user')
    }
  } finally {
    await session.close()
  }
})
