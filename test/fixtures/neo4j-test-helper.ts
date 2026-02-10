/**
 * Shared test helper for repository integration tests.
 *
 * Provides Neo4j connection management, real query loading (no stale mocks),
 * and consistent setup/teardown across all repository test files.
 */
import neo4j, { type Driver, type Session } from 'neo4j-driver'
import { loadQuery, injectWhereConditions } from '../../server/utils/query-loader'
import { cleanupTestData } from './db-cleanup'

// Wire Nuxt auto-imports that repositories expect as globals
declare global {
  var loadQuery: (path: string) => Promise<string>
  var injectWhereConditions: (query: string, conditions: string[]) => string
}
global.loadQuery = loadQuery
global.injectWhereConditions = injectWhereConditions

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687'
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j'
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword'

export interface TestContext {
  driver: Driver
  neo4jAvailable: boolean
}

let sharedDriver: Driver | null = null
let sharedAvailable = false
let initPromise: Promise<void> | null = null

/**
 * Initialise a shared Neo4j driver (once per process).
 * Call in `beforeAll`; the result is cached for subsequent files.
 */
async function init(): Promise<void> {
  if (sharedDriver) return
  try {
    sharedDriver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD))
    await sharedDriver.verifyAuthentication()
    sharedAvailable = true
  } catch {
    sharedAvailable = false
    console.warn('\n⚠️  Neo4j not available. Repository tests will be skipped.\n')
  }
}

export async function getTestContext(): Promise<TestContext> {
  if (!initPromise) initPromise = init()
  await initPromise
  return { driver: sharedDriver!, neo4jAvailable: sharedAvailable }
}

/**
 * Close the shared driver. Call in the last `afterAll` or rely on
 * the global teardown to handle it.
 */
export async function closeDriver(): Promise<void> {
  if (sharedDriver) {
    await sharedDriver.close()
    sharedDriver = null
    initPromise = null
  }
}

/**
 * Open a session, run a cleanup for the given prefix, and return the session.
 * Caller is responsible for closing the session via `afterEach`.
 */
export async function freshSession(driver: Driver, prefix: string): Promise<Session> {
  await cleanupTestData(driver, { prefix })
  return driver.session()
}

/**
 * Seed helper — runs a Cypher statement inside a session and closes it.
 */
export async function seed(driver: Driver, cypher: string, params: Record<string, unknown> = {}): Promise<void> {
  const session = driver.session()
  try {
    await session.run(cypher, params)
  } finally {
    await session.close()
  }
}

export { cleanupTestData }
