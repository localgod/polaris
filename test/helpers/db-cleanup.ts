import type { Driver, Session } from 'neo4j-driver'

/**
 * Database cleanup utilities for tests
 * 
 * Ensures tests leave the database in a clean state
 */

export interface CleanupOptions {
  /** Prefix for test data (e.g., 'test_') */
  prefix?: string
  /** Node labels to clean up */
  labels?: string[]
  /** Whether to delete all test data */
  deleteAll?: boolean
}

/**
 * Clean up test data from the database
 * 
 * @param driver - Neo4j driver instance
 * @param options - Cleanup options
 */
export async function cleanupTestData(
  driver: Driver,
  options: CleanupOptions = {}
): Promise<void> {
  const session = driver.session()
  
  try {
    if (options.deleteAll) {
      // Delete all nodes with test prefix
      const prefix = options.prefix || 'test_'
      await session.run(`
        MATCH (n)
        WHERE any(prop IN keys(n) WHERE n[prop] STARTS WITH $prefix)
        DETACH DELETE n
      `, { prefix })
    } else if (options.labels && options.labels.length > 0) {
      // Delete specific node types
      for (const label of options.labels) {
        const prefix = options.prefix || 'test_'
        await session.run(`
          MATCH (n:${label})
          WHERE any(prop IN keys(n) WHERE n[prop] STARTS WITH $prefix)
          DETACH DELETE n
        `, { prefix })
      }
    } else if (options.prefix) {
      // Delete by prefix only
      await session.run(`
        MATCH (n)
        WHERE any(prop IN keys(n) WHERE n[prop] STARTS WITH $prefix)
        DETACH DELETE n
      `, { prefix: options.prefix })
    }
  } finally {
    await session.close()
  }
}

/**
 * Create a cleanup function for use in afterAll/afterEach
 * 
 * @param driver - Neo4j driver instance
 * @param options - Cleanup options
 * @returns Cleanup function
 * 
 * @example
 * ```typescript
 * const cleanup = createCleanup(driver, { prefix: 'test_' })
 * afterAll(cleanup)
 * ```
 */
export function createCleanup(
  driver: Driver,
  options: CleanupOptions = {}
): () => Promise<void> {
  return async () => {
    await cleanupTestData(driver, options)
  }
}

/**
 * Verify database is clean (no test data remains)
 * 
 * @param driver - Neo4j driver instance
 * @param prefix - Test data prefix
 * @returns True if clean, false if test data remains
 */
export async function verifyCleanDatabase(
  driver: Driver,
  prefix: string = 'test_'
): Promise<boolean> {
  const session = driver.session()
  
  try {
    const result = await session.run(`
      MATCH (n)
      WHERE any(prop IN keys(n) WHERE n[prop] STARTS WITH $prefix)
      RETURN count(n) as count
    `, { prefix })
    
    const count = result.records[0]?.get('count').toNumber() || 0
    return count === 0
  } finally {
    await session.close()
  }
}

/**
 * Create isolated test data with automatic cleanup
 * 
 * @param driver - Neo4j driver instance
 * @param prefix - Test data prefix
 * @returns Session with cleanup function
 * 
 * @example
 * ```typescript
 * const { session, cleanup } = await createIsolatedTest(driver, 'test_mytest_')
 * try {
 *   await session.run('CREATE (n:Test {name: $name})', { name: 'test_mytest_node' })
 *   // ... test code
 * } finally {
 *   await cleanup()
 * }
 * ```
 */
export async function createIsolatedTest(
  driver: Driver,
  prefix: string
): Promise<{ session: Session; cleanup: () => Promise<void> }> {
  const session = driver.session()
  
  const cleanup = async () => {
    try {
      await cleanupTestData(driver, { prefix })
    } finally {
      await session.close()
    }
  }
  
  return { session, cleanup }
}

/**
 * Snapshot database state for comparison
 * 
 * @param driver - Neo4j driver instance
 * @returns Snapshot of node and relationship counts
 */
export async function snapshotDatabase(driver: Driver): Promise<{
  nodes: number
  relationships: number
  labels: Record<string, number>
}> {
  const session = driver.session()
  
  try {
    // Count nodes
    const nodeResult = await session.run('MATCH (n) RETURN count(n) as count')
    const nodes = nodeResult.records[0]?.get('count').toNumber() || 0
    
    // Count relationships
    const relResult = await session.run('MATCH ()-[r]->() RETURN count(r) as count')
    const relationships = relResult.records[0]?.get('count').toNumber() || 0
    
    // Count by label
    const labelResult = await session.run(`
      CALL db.labels() YIELD label
      CALL {
        WITH label
        MATCH (n)
        WHERE label IN labels(n)
        RETURN count(n) as count
      }
      RETURN label, count
    `)
    
    const labels: Record<string, number> = {}
    for (const record of labelResult.records) {
      labels[record.get('label')] = record.get('count').toNumber()
    }
    
    return { nodes, relationships, labels }
  } finally {
    await session.close()
  }
}

/**
 * Compare database snapshots to detect changes
 * 
 * @param before - Snapshot before test
 * @param after - Snapshot after test
 * @returns True if database state is unchanged
 */
export function compareSnapshots(
  before: Awaited<ReturnType<typeof snapshotDatabase>>,
  after: Awaited<ReturnType<typeof snapshotDatabase>>
): boolean {
  if (before.nodes !== after.nodes) return false
  if (before.relationships !== after.relationships) return false
  
  const allLabels = new Set([...Object.keys(before.labels), ...Object.keys(after.labels)])
  for (const label of allLabels) {
    if ((before.labels[label] || 0) !== (after.labels[label] || 0)) {
      return false
    }
  }
  
  return true
}
