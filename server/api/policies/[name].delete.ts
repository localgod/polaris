/**
 * @openapi
 * /policies/{name}:
 *   delete:
 *     tags:
 *       - Policies
 *     summary: Delete a policy
 *     description: |
 *       Deletes a policy and all its relationships.
 *       
 *       **Authorization:** Superuser
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Policy name
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       204:
 *         description: Policy deleted successfully
 *       400:
 *         description: Policy name is required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Superuser access required
 *       404:
 *         description: Policy not found
 */
export default defineEventHandler(async (event) => {
  // Require superuser access for deleting policies
  await requireSuperuser(event)
  
  const rawName = getRouterParam(event, 'name')
  
  if (!rawName) {
    throw createError({
      statusCode: 400,
      message: 'Policy name is required'
    })
  }
  
  const name = decodeURIComponent(rawName)
  const driver = useDriver()
  
  // Check if policy exists
  const { records: checkRecords } = await driver.executeQuery(`
    MATCH (p:Policy {name: $name})
    RETURN p
  `, { name })
  
  if (checkRecords.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Policy '${name}' not found`
    })
  }
  
  // Delete policy and all its relationships
  await driver.executeQuery(`
    MATCH (p:Policy {name: $name})
    DETACH DELETE p
  `, { name })
  
  setResponseStatus(event, 204)
  return null
})
