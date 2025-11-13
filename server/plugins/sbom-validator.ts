import { initializeSbomValidator } from '../utils/sbom-validator'

/**
 * Initialize SBOM validators at application startup
 * 
 * This plugin loads and compiles CycloneDX and SPDX JSON schemas
 * for efficient validation during runtime.
 */
export default defineNitroPlugin(async () => {
  try {
    await initializeSbomValidator()
    console.log('✅ SBOM validator plugin initialized')
  } catch (error) {
    console.error('❌ Failed to initialize SBOM validator plugin:', error)
    // Don't throw - allow app to start, but validation will fail
  }
})
