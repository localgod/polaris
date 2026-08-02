MATCH (team:Team)-[:OWNS]->(sys:System)-[u:USES]->(comp:Component)-[:HAS_LICENSE]->(license:License)
WHERE coalesce(license.allowed, false) = false
  AND ($directOnly IS NULL OR $directOnly = false OR u.isDirect = true)
  AND ($depScope IS NULL OR u.scope = $depScope)
  {{AND_CONDITIONS}}
WITH sys, comp, license, coalesce(comp.purl, comp.name + '@' + coalesce(comp.version, 'unknown')) AS purl
OPTIONAL MATCH (:LicenseViolation {naturalKey: sys.name + '|' + purl + '|' + license.id})<-[:WAIVES]-(w:Waiver)
  WHERE w.revokedAt IS NULL AND w.expiresAt > datetime()
WITH w
WHERE $includeWaived = true OR w IS NULL
RETURN count(*) as total
