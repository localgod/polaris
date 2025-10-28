import type { Record as Neo4jRecord } from 'neo4j-driver'

/**
 * List all users with their team memberships
 * Requires: Superuser access
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
