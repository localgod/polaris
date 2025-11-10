import neo4j from 'neo4j-driver'

/**
 * Global test teardown
 * 
 * Runs once after all tests to clean up any remaining test data
 */
export default async function globalTeardown() {
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687'
  const username = process.env.NEO4J_USERNAME || 'neo4j'
  const password = process.env.NEO4J_PASSWORD || 'devpassword'
  
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password))
  
  try {
    const session = driver.session()
    try {
      // Clean up all test data
      await session.run(`
        MATCH (n)
        WHERE any(prop IN keys(n) WHERE n[prop] STARTS WITH 'test_')
        DETACH DELETE n
      `)
      
      console.log('✓ Test data cleaned up')
    } finally {
      await session.close()
    }
  } catch (error) {
    console.warn('⚠️  Could not clean up test data:', error)
  } finally {
    await driver.close()
  }
}
