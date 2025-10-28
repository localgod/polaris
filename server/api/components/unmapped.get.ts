import type { ApiResponse, UnmappedComponent } from '~~/types/api'

export default defineEventHandler(async (): Promise<ApiResponse<UnmappedComponent>> => {
  try {
    const driver = useDriver()

    const { records } = await driver.executeQuery(`
      MATCH (c:Component)
      WHERE NOT (c)-[:IS_VERSION_OF]->(:Technology)
      OPTIONAL MATCH (sys:System)-[:USES]->(c)
      WITH c, collect(DISTINCT sys.name) as systems
      RETURN c.name as name,
             c.version as version,
             c.packageManager as packageManager,
             c.license as license,
             c.sourceRepo as sourceRepo,
             c.importPath as importPath,
             c.hash as hash,
             systems,
             size(systems) as systemCount
      ORDER BY size(systems) DESC, c.name
    `)

    const components: UnmappedComponent[] = records.map(record => ({
      name: record.get('name'),
      version: record.get('version'),
      packageManager: record.get('packageManager'),
      license: record.get('license'),
      sourceRepo: record.get('sourceRepo'),
      importPath: record.get('importPath'),
      hash: record.get('hash'),
      systems: record.get('systems').filter((s: string) => s),
      systemCount: record.get('systemCount').toNumber()
    }))

    return {
      success: true,
      data: components,
      count: components.length
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch unmapped components'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
