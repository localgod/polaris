import neo4j from 'neo4j-driver'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  let driver = null
  
  try {
    // Create driver instance
    driver = neo4j.driver(
      config.neo4j?.uri || process.env.NEO4J_URI || 'bolt://172.19.0.2:7687',
      neo4j.auth.basic(
        config.neo4j?.auth?.username || process.env.NEO4J_USERNAME || 'neo4j',
        config.neo4j?.auth?.password || process.env.NEO4J_PASSWORD || 'devpassword'
      )
    )
    
    // Verify connectivity
    await driver.verifyConnectivity()
    
    // Run a simple query
    const session = driver.session()
    try {
      const result = await session.run('RETURN 1 as status')
      
      if (result && result.records && result.records.length > 0) {
        return {
          status: 'online',
          message: 'Database connection successful'
        }
      }
      
      return {
        status: 'offline',
        message: 'Database query returned no results'
      }
    } finally {
      await session.close()
    }
  } catch (error: any) {
    return {
      status: 'offline',
      message: error.message || 'Database connection failed'
    }
  } finally {
    if (driver) {
      await driver.close()
    }
  }
})
