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

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      await driver.verifyAuthentication()
      logger.info('Neo4j connected successfully')
      break
    } catch (err) {
      if (attempt === RETRY_ATTEMPTS) {
        throw err
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
