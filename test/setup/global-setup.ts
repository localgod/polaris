import neo4j from 'neo4j-driver'

/**
 * Global test setup
 *
 * Runs once before all tests to ensure the database is in a clean state.
 * Returns a teardown function that runs after all tests.
 */
export default async function globalSetup() {
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687'
  const username = process.env.NEO4J_USERNAME || 'neo4j'
  const password = process.env.NEO4J_PASSWORD || 'devpassword'

  // Only match string properties to avoid toString() errors on arrays/maps
  const cleanupQuery = `
    MATCH (n)
    WHERE any(prop IN keys(n) WHERE
      valueType(n[prop]) = 'STRING' AND (
        n[prop] STARTS WITH 'test_' OR
        n[prop] STARTS WITH 'test-'
      )
    )
    DETACH DELETE n
  `

  async function teardown() {
    const teardownDriver = neo4j.driver(uri, neo4j.auth.basic(username, password))
    try {
      const session = teardownDriver.session()
      try {
        await session.run(cleanupQuery)
        console.log('✓ Test data cleaned up')
      } finally {
        await session.close()
      }
    } catch (error) {
      console.warn('⚠️  Could not clean up test data:', error)
    } finally {
      await teardownDriver.close()
    }
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password))

  try {
    // Verify connectivity — retry to tolerate slow bolt startup
    let lastError: unknown
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await driver.verifyAuthentication()
        lastError = undefined
        break
      } catch (err) {
        lastError = err
        if (attempt < 5) await new Promise(r => setTimeout(r, 1000 * attempt))
      }
    }

    if (lastError) {
      const msg = lastError instanceof Error ? lastError.message : String(lastError)
      console.warn(`⚠️  Could not connect to Neo4j after 5 attempts (${msg}) - some tests may be skipped`)
      return teardown
    }

    // Clean up any leftover test data from previous runs
    const session = driver.session()
    try {
      await session.run(cleanupQuery)
      console.log('✓ Database cleaned - ready for tests')
    } finally {
      await session.close()
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`⚠️  Could not connect to Neo4j (${msg}) - some tests may be skipped`)
  } finally {
    await driver.close()
  }

  return teardown
}
