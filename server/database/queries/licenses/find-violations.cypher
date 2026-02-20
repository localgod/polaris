// Find components using disallowed licenses
MATCH (team:Team)-[:OWNS]->(sys:System)-[:USES]->(comp:Component)-[:HAS_LICENSE]->(license:License)
WHERE license.allowed = false
RETURN team.name as teamName,
       sys.name as systemName,
       comp.name as componentName,
       comp.version as componentVersion,
       comp.purl as componentPurl,
       license.id as licenseId,
       license.name as licenseName,
       license.category as licenseCategory
ORDER BY team.name, sys.name, comp.name
