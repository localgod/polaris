export default defineEventHandler(async (event) => {
  try {
    const driver = useDriver()
    
    // Verify connectivity
    await driver.verifyConnectivity()
    
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
