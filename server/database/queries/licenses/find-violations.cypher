// Find components using disallowed licenses.
// Optional filters:
//   $directOnly (boolean) — restrict to direct dependencies (USES {isDirect: true})
//   $depScope   (string)  — restrict to a specific scope on the USES edge
//   $includeWaived (boolean) — when false (default), excludes violations with an
//     active (unrevoked, unexpired) Waiver attached to their tracked LicenseViolation node
//   AND_CONDITIONS placeholder — additional filters (e.g. free-text search), via injectWhereConditions()
MATCH (team:Team)-[:OWNS]->(sys:System)-[u:USES]->(comp:Component)-[:HAS_LICENSE]->(license:License)
WHERE coalesce(license.allowed, false) = false
  AND ($directOnly IS NULL OR $directOnly = false OR u.isDirect = true)
  AND ($depScope IS NULL OR u.scope = $depScope)
  {{AND_CONDITIONS}}
WITH team, sys, comp, license, coalesce(comp.purl, comp.name + '@' + coalesce(comp.version, 'unknown')) AS purl
OPTIONAL MATCH (:LicenseViolation {naturalKey: sys.name + '|' + purl + '|' + license.id})<-[:WAIVES]-(w:Waiver)
  WHERE w.revokedAt IS NULL AND w.expiresAt > datetime()
WITH team, sys, comp, license, w
WHERE $includeWaived = true OR w IS NULL
RETURN team.name as teamName,
       sys.name as systemName,
       sys.businessCriticality as systemBusinessCriticality,
       sys.environment as systemEnvironment,
       comp.name as componentName,
       comp.version as componentVersion,
       comp.purl as componentPurl,
       license.id as licenseId,
       license.name as licenseName,
       license.category as licenseCategory,
       w.id as waiverId,
       w.reason as waiverReason,
       w.expiresAt as waiverExpiresAt
ORDER BY {{ORDER_BY}}
{{PAGINATION}}
