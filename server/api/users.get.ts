import { getServerSession } from '#auth'
import neo4j from 'neo4j-driver'

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'devpassword'
  )
)

/**
 * @openapi
 * /users:
 *   get:
 *     tags:
 *       - Users
 *     summary: List all users (superuser only)
 *     description: Retrieves a list of all users with their team counts (requires superuser role)
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/User'
 *                   - type: object
 *                     properties:
 *                       teamCount:
 *                         type: integer
 *       403:
 *         description: Forbidden - superuser access required
 *       500:
 *         description: Failed to fetch users
 */
export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session || session.user?.role !== 'superuser') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: Superuser access required'
    })
  }

  const neo4jSession = driver.session()

  try {
    const result = await neo4jSession.run(
      `
      MATCH (u:User)
      OPTIONAL MATCH (u)-[:MEMBER_OF]->(t:Team)
      WITH u, count(t) as teamCount
      RETURN u.id as id,
             u.email as email,
             u.name as name,
             u.provider as provider,
             u.role as role,
             u.avatarUrl as avatarUrl,
             u.lastLogin as lastLogin,
             u.createdAt as createdAt,
             teamCount
      ORDER BY u.createdAt DESC
      `
    )

    const users = result.records.map(record => {
      const lastLogin = record.get('lastLogin')
      const createdAt = record.get('createdAt')
      
      return {
        id: record.get('id'),
        email: record.get('email'),
        name: record.get('name'),
        provider: record.get('provider'),
        role: record.get('role') || 'user',
        avatarUrl: record.get('avatarUrl'),
        teamCount: record.get('teamCount').toNumber(),
        lastLogin: lastLogin ? lastLogin.toString() : null,
        createdAt: createdAt ? createdAt.toString() : null
      }
    })

    return users
  } catch (error) {
    console.error('Error fetching users:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch users'
    })
  } finally {
    await neo4jSession.close()
  }
})
