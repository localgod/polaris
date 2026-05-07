import { logger } from '../utils/logger'

/**
 * Neo4j server plugin
 * Initializes and verifies Neo4j connection at startup
 */
export default defineNitroPlugin((nitroApp) => {
  const driver = useDriver()
  
  // Verify connection at startup
  driver.verifyAuthentication()
    .then(() => {
      logger.info('Neo4j connected successfully')
    })
    .catch((err) => {
      logger.error({ err }, 'Neo4j connection failed')
    })
  
  // Cleanup on shutdown
  nitroApp.hooks.hook('close', async () => {
    logger.info('Closing Neo4j connection')
    await driver.close()
  })
})
