import { initializeSbomValidator } from '../utils/sbom-validator'
import { logger } from '../utils/logger'

/**
 * Initialize SBOM validators at application startup
 * 
 * This plugin loads and compiles CycloneDX and SPDX JSON schemas
 * for efficient validation during runtime.
 */
export default defineNitroPlugin(async () => {
  try {
    await initializeSbomValidator()
    logger.info('SBOM validator plugin initialized')
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize SBOM validator plugin')
    // Don't throw - allow app to start, but validation will fail
  }
})
