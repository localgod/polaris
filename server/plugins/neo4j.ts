import { logger } from '../utils/logger'

/**
 * Neo4j server plugin
 * Verifies the database connection at startup and aborts if unreachable.
 *
 * The async callback is awaited by Nitro — an unhandled throw here aborts
 * the startup process cleanly rather than letting the app start in a broken
 * state. Both environments guarantee Neo4j is healthy before this runs:
 * production via docker-compose depends_on/service_healthy, dev via the
 * devcontainer compose healthcheck added alongside this change.
 */
export default defineNitroPlugin(async (nitroApp) => {
  const driver = useDriver()

  await driver.verifyAuthentication()
  logger.info('Neo4j connected successfully')

  nitroApp.hooks.hook('close', async () => {
    logger.info('Closing Neo4j connection')
    await driver.close()
  })
})
