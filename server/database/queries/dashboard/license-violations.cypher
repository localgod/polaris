MATCH (team:Team)-[:OWNS]->(sys:System)-[u:USES]->(comp:Component)-[:HAS_LICENSE]->(license:License)
WHERE coalesce(license.allowed, false) = false
  AND u.isDirect = true
WITH team, sys, comp, license, coalesce(comp.purl, comp.name + '@' + coalesce(comp.version, 'unknown')) AS purl
WHERE NOT EXISTS {
  MATCH (:LicenseViolation {naturalKey: sys.name + '|' + purl + '|' + license.id})<-[:WAIVES]-(w:Waiver)
  WHERE w.revokedAt IS NULL AND w.expiresAt > datetime()
}
RETURN count(DISTINCT team.name + ' ' + sys.name + ' ' + purl + ' ' + license.id) AS violations
