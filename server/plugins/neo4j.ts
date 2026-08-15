import { logger } from '../utils/logger'

const RETRY_ATTEMPTS = 10
const RETRY_DELAY_MS = 3000

/**
 * Neo4j server plugin
 * Verifies the database connection at startup, retrying up to RETRY_ATTEMPTS
 * times before aborting. Retries guard against the window between Neo4j's
 * Bolt port accepting TCP connections and the database being ready to
 * authenticate — which can occur even after the compose healthcheck passes.
 */
export default defineNitroPlugin(async (nitroApp) => {
  const driver = useDriver()
  const uri = useRuntimeConfig().neo4j?.uri || process.env.NEO4J_URI || 'bolt://localhost:7687'

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      await driver.verifyAuthentication()
      logger.info('Neo4j connected successfully')
      break
    } catch (err) {
      if (attempt === RETRY_ATTEMPTS) {
        // One fewer delay than attempts — the final attempt throws instead of sleeping.
        const seconds = ((RETRY_ATTEMPTS - 1) * RETRY_DELAY_MS) / 1000
        const cause = err instanceof Error ? err.message : String(err)
        throw new Error(
          `Neo4j unreachable at ${uri} after ${RETRY_ATTEMPTS} attempts over ${seconds}s. `
          + 'Check the database container: `docker ps -a --filter name=polaris-neo4j`, '
          + 'then `docker logs --tail 50 polaris-neo4j`. '
          + `Underlying driver error: ${cause}`,
          { cause: err }
        )
      }
      logger.warn({ attempt, err }, `Neo4j not ready, retrying in ${RETRY_DELAY_MS}ms`)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
    }
  }

  nitroApp.hooks.hook('close', async () => {
    logger.info('Closing Neo4j connection')
    await driver.close()
  })
})
