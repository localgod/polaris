// Always returns at least one row when the system exists (c may be null when
// there are no components). Returns zero rows when the system does not exist,
// allowing the caller to distinguish not-found from empty without a separate
// exists() query.
MATCH (sys:System {name: $name})
OPTIONAL MATCH (sys)-[u:USES]->(c:Component)
OPTIONAL MATCH (c)-[:IS_VERSION_OF]->(tech:Technology)
OPTIONAL MATCH (c)-[:HAS_LICENSE]->(l:License)
WITH sys, c, u, tech,
     collect(DISTINCT {id: l.id, name: l.name, allowed: l.allowed}) AS licenses
// isDirect and scope come from the USES edge, set at ingest time by BFS propagation.
WITH sys, c, u, tech, licenses,
     coalesce(u.isDirect, false) AS direct,
     u.scope AS scope
// Collect purls of c's direct dependencies that are also used by this system.
// Filter null purls at match time to avoid collecting them into the list.
OPTIONAL MATCH (c)-[:DEPENDS_ON]->(dep:Component)<-[:USES]-(sys)
WHERE dep.purl IS NOT NULL
WITH sys, c, tech, licenses, direct, scope,
     collect(DISTINCT dep.purl) AS dependsOnPurls
RETURN sys.name AS systemName,
       c.name AS name,
       c.version AS version,
       c.packageManager AS packageManager,
       c.purl AS purl,
       c.cpe AS cpe,
       c.type AS type,
       c.group AS `group`,
       scope,
       c.description AS description,
       [lic IN licenses WHERE lic.id IS NOT NULL OR lic.name IS NOT NULL | lic] AS licenses,
       tech.name AS technologyName,
       direct,
       dependsOnPurls
ORDER BY c.packageManager, c.name, c.version
