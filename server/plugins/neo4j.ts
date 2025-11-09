/**
 * Neo4j server plugin
 * Initializes and verifies Neo4j connection at startup
 */
export default defineNitroPlugin((nitroApp) => {
  const driver = useDriver()
  
  // Verify connection at startup
  driver.verifyConnectivity()
    .then(() => {
      console.log('✅ Neo4j connected successfully')
    })
    .catch((err) => {
      console.error('❌ Neo4j connection failed:', err)
    })
  
  // Cleanup on shutdown
  nitroApp.hooks.hook('close', async () => {
    console.log('🔌 Closing Neo4j connection...')
    await driver.close()
  })
})
