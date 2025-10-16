export default defineEventHandler(async () => {
  try {
    const driver = useDriver()
    
    // Verify connectivity
    await driver.verifyConnectivity()
    
    // Run a simple query
    const { records } = await driver.executeQuery('RETURN 1 as status')
    
    if (records && records.length > 0) {
      return {
        status: 'online',
        message: 'Database connection successful'
      }
    }
    
    return {
      status: 'offline',
      message: 'Database query returned no results'
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Database connection failed'
    return {
      status: 'offline',
      message: errorMessage
    }
  }
})
