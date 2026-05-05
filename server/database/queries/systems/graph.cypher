// Always returns at least one row when the system exists (c may be null when
// there are no components). Returns zero rows when the system does not exist,
// allowing the caller to distinguish not-found from empty without a separate
// exists() query.
MATCH (sys:System {name: $name})
OPTIONAL MATCH (sys)-[:USES]->(c:Component)
OPTIONAL MATCH (c)-[:IS_VERSION_OF]->(tech:Technology)
OPTIONAL MATCH (c)-[:HAS_LICENSE]->(l:License)
WITH sys, c, tech,
     collect(DISTINCT {id: l.id, name: l.name, allowed: l.allowed}) AS licenses
// direct=true when the system has a DIRECT_DEP edge to this component
// (set at ingest time from the root component's dependsOn list)
WITH sys, c, tech, licenses,
     EXISTS { (sys)-[:DIRECT_DEP]->(c) } AS direct
// Collect purls of c's direct dependencies that are also used by this system.
// Filter null purls at match time to avoid collecting them into the list.
OPTIONAL MATCH (c)-[:DEPENDS_ON]->(dep:Component)<-[:USES]-(sys)
WHERE dep.purl IS NOT NULL
WITH sys, c, tech, licenses, direct,
     collect(DISTINCT dep.purl) AS dependsOnPurls
RETURN sys.name AS systemName,
       c.name AS name,
       c.version AS version,
       c.packageManager AS packageManager,
       c.purl AS purl,
       c.cpe AS cpe,
       c.type AS type,
       c.group AS `group`,
       c.scope AS scope,
       c.description AS description,
       [lic IN licenses WHERE lic.id IS NOT NULL OR lic.name IS NOT NULL | lic] AS licenses,
       tech.name AS technologyName,
       direct,
       dependsOnPurls
ORDER BY c.packageManager, c.name, c.version
