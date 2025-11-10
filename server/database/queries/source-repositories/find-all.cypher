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
