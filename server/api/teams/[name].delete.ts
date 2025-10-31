/**
 * @openapi
 * /teams/{name}:
 *   delete:
 *     tags:
 *       - Teams
 *     summary: Delete a team
 *     description: |
 *       Deletes a team and all its relationships. Requires superuser access.
 *       
 *       **Authorization:** Superuser
 *       
 *       **Business Rules:**
 *       - Team cannot be deleted if it owns any systems
 *       - All systems must be reassigned or deleted first
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Team name
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       204:
 *         description: Team deleted successfully
 *       400:
 *         description: Team name is required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Superuser access required
 *       404:
 *         description: Team not found
 *       409:
 *         description: Cannot delete team that owns systems
 *         content:
 *           application/json:
 *             example:
 *               statusCode: 409
 *               message: "Cannot delete team 'frontend-team' because it owns 3 system(s). Please reassign or delete the systems first."
 */
export default defineEventHandler(async (event) => {
  // Require superuser access for deleting teams
  await requireSuperuser(event)
  
  const rawName = getRouterParam(event, 'name')
  
  if (!rawName) {
    throw createError({
      statusCode: 400,
      message: 'Team name is required'
    })
  }
  
  const name = decodeURIComponent(rawName)
  const driver = useDriver()
  
  // Check if team exists
  const { records: checkRecords } = await driver.executeQuery(`
    MATCH (t:Team {name: $name})
    RETURN t
  `, { name })
  
  if (checkRecords.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Team '${name}' not found`
    })
  }
  
  // Check if team owns any systems
  const { records: systemRecords } = await driver.executeQuery(`
    MATCH (t:Team {name: $name})-[:OWNS]->(s:System)
    RETURN count(s) as systemCount
  `, { name })
  
  const systemCount = systemRecords[0]?.get('systemCount').toNumber() || 0
  
  if (systemCount > 0) {
    throw createError({
      statusCode: 409,
      message: `Cannot delete team '${name}' because it owns ${systemCount} system(s). Please reassign or delete the systems first.`
    })
  }
  
  // Delete team and all its relationships
  await driver.executeQuery(`
    MATCH (t:Team {name: $name})
    DETACH DELETE t
  `, { name })
  
  setResponseStatus(event, 204)
  return null
})
