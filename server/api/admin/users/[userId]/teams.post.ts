/**
 * Assign a user to teams
 * Requires: Superuser access
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

    return {
      success: true,
      data: record.get('user')
    }
  } finally {
    await session.close()
  }
})
