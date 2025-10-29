import type { ApiResponse, Repository } from '~~/types/api'

export default defineEventHandler(async (): Promise<ApiResponse<Repository>> => {
  try {
    const driver = useDriver()
    
    const { records } = await driver.executeQuery(`
      MATCH (r:Repository)
      OPTIONAL MATCH (s:System)-[:HAS_SOURCE_IN]->(r)
      RETURN r.url as url,
             r.scmType as scmType,
             r.name as name,
             r.description as description,
             r.isPublic as isPublic,
             r.requiresAuth as requiresAuth,
             r.defaultBranch as defaultBranch,
             r.createdAt as createdAt,
             r.lastSyncedAt as lastSyncedAt,
             count(DISTINCT s) as systemCount
      ORDER BY r.name
    `)
    
    const repositories: Repository[] = records.map(record => ({
      url: record.get('url'),
      scmType: record.get('scmType'),
      name: record.get('name'),
      description: record.get('description'),
      isPublic: record.get('isPublic'),
      requiresAuth: record.get('requiresAuth'),
      defaultBranch: record.get('defaultBranch'),
      createdAt: record.get('createdAt')?.toString() || null,
      lastSyncedAt: record.get('lastSyncedAt')?.toString() || null,
      systemCount: record.get('systemCount').toNumber()
    }))
    
    return {
      success: true,
      data: repositories,
      count: repositories.length
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch repositories'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
