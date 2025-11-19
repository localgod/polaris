import neo4j from 'neo4j-driver'

/**
 * Global test setup
 * 
 * Runs once before all tests to ensure database is in a clean state
 */
export default async function globalSetup() {
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687'
  const username = process.env.NEO4J_USERNAME || 'neo4j'
  const password = process.env.NEO4J_PASSWORD || 'devpassword'
  
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password))
  
  try {
    // Verify connectivity
    await driver.verifyAuthentication()
    
    // Clean up any leftover test data from previous runs
    const session = driver.session()
    try {
      // Clean nodes with properties starting with 'test_' or 'test-'
      await session.run(`
        MATCH (n)
        WHERE any(prop IN keys(n) WHERE 
          toString(n[prop]) STARTS WITH 'test_' OR 
          toString(n[prop]) STARTS WITH 'test-'
        )
        DETACH DELETE n
      `)
      
      console.log('✓ Database cleaned - ready for tests')
    } finally {
      await session.close()
    }
  } catch {
    console.warn('⚠️  Could not connect to Neo4j - some tests may be skipped')
  } finally {
    await driver.close()
  }
}
