/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check endpoint
 *     description: Checks the health of the API and database connectivity
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               status: healthy
 *               database: connected
 *               timestamp: '2025-10-30T13:00:00.000Z'
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               status: unhealthy
 *               database: disconnected
 *               error: Database connection failed
 *               timestamp: '2025-10-30T13:00:00.000Z'
 */
export default defineEventHandler(async (event) => {
  try {
    const driver = useDriver()
    
    // Verify connectivity
    await driver.verifyAuthentication()
    
    // Run a simple query
    const { records } = await driver.executeQuery('RETURN 1 as status')
    
    if (records && records.length > 0) {
      return {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString()
      }
    }
    
    setResponseStatus(event, 503)
    return {
      status: 'unhealthy',
      database: 'no_results',
      timestamp: new Date().toISOString()
    }
  } catch (error: unknown) {
    setResponseStatus(event, 503)
    const errorMessage = error instanceof Error ? error.message : 'Database connection failed'
    return {
      status: 'unhealthy',
      database: 'disconnected',
      error: errorMessage,
      timestamp: new Date().toISOString()
    }
  }
})
