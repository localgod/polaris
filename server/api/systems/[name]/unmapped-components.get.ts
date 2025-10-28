import type { UnmappedComponent } from '~~/types/api'

export default defineEventHandler(async (event) => {
  try {
    const rawName = getRouterParam(event, 'name')
    
    if (!rawName) {
      throw createError({
        statusCode: 400,
        message: 'System name is required'
      })
    }
    
    const systemName = decodeURIComponent(rawName)
    const driver = useDriver()

    // First check if system exists
    const { records: systemCheck } = await driver.executeQuery(`
      MATCH (s:System {name: $systemName})
      RETURN s.name as name
    `, { systemName })

    if (systemCheck.length === 0) {
      throw createError({
        statusCode: 404,
        message: `System '${systemName}' not found`
      })
    }

    // Get unmapped components for this system
    const { records } = await driver.executeQuery(`
      MATCH (sys:System {name: $systemName})-[:USES]->(c:Component)
      WHERE NOT (c)-[:IS_VERSION_OF]->(:Technology)
      RETURN c.name as name,
             c.version as version,
             c.packageManager as packageManager,
             c.license as license,
             c.sourceRepo as sourceRepo,
             c.importPath as importPath,
             c.hash as hash
      ORDER BY c.name
    `, { systemName })

    const components: UnmappedComponent[] = records.map(record => ({
      name: record.get('name'),
      version: record.get('version'),
      packageManager: record.get('packageManager'),
      license: record.get('license'),
      sourceRepo: record.get('sourceRepo'),
      importPath: record.get('importPath'),
      hash: record.get('hash')
    }))

    return {
      success: true,
      data: {
        system: systemName,
        components,
        count: components.length
      }
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch unmapped components'
    return {
      success: false,
      error: errorMessage,
      data: {
        system: '',
        components: [],
        count: 0
      }
    }
  }
})
