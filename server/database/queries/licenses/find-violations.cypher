// Find components using disallowed licenses.
// Optional filters:
//   $directOnly (boolean) — restrict to direct dependencies (USES {isDirect: true})
//   $depScope   (string)  — restrict to a specific scope on the USES edge
MATCH (team:Team)-[:OWNS]->(sys:System)-[u:USES]->(comp:Component)-[:HAS_LICENSE]->(license:License)
WHERE license.allowed = false
  AND ($directOnly IS NULL OR $directOnly = false OR u.isDirect = true)
  AND ($depScope IS NULL OR u.scope = $depScope)
RETURN team.name as teamName,
       sys.name as systemName,
       comp.name as componentName,
       comp.version as componentVersion,
       comp.purl as componentPurl,
       license.id as licenseId,
       license.name as licenseName,
       license.category as licenseCategory
ORDER BY team.name, sys.name, comp.name
