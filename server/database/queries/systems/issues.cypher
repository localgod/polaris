// Returns components belonging to the system that have at least one of:
//   - a known advisory (vulnerability)
//   - a disallowed license
//   - an unsupported/deprecated/stale health snapshot
//
// Returns zero rows when the system exists but has no issues.
// System-not-found is handled in the service layer (findByName check).
//
// Staged OPTIONAL MATCHes avoid the N×M Cartesian product that would occur
// if all three were chained without intermediate WITH clauses.

MATCH (sys:System {name: $name})
MATCH (sys)-[u:USES]->(c:Component)

OPTIONAL MATCH (c)-[:HAS_ADVISORY]->(adv:Advisory)
WITH c, u,
     collect(DISTINCT {
       id: adv.id,
       summary: adv.summary,
       cvssScore: adv.cvssScore,
       publishedAt: toString(adv.publishedAt)
     }) AS rawAdvisories

OPTIONAL MATCH (c)-[:HAS_LICENSE]->(lic:License)
WITH c, u, rawAdvisories,
     collect(DISTINCT {
       id: lic.id,
       name: lic.name,
       category: lic.category,
       allowed: lic.allowed
     }) AS rawLicenses

OPTIONAL MATCH (c)-[:HAS_HEALTH_SNAPSHOT]->(h:HealthSnapshot)

WITH c, h,
     [a IN rawAdvisories WHERE a.id IS NOT NULL] AS advisories,
     [l IN rawLicenses WHERE l.id IS NOT NULL AND l.allowed = false] AS disallowedLicenses,
     coalesce(u.isDirect, false) AS isDirect

WHERE size(advisories) > 0
   OR size(disallowedLicenses) > 0
   OR h.eolStatus = 'unsupported'
   OR h.isDeprecated = true
   OR h.maintenanceStatus = 'stale'

RETURN c.name AS componentName,
       c.version AS componentVersion,
       c.purl AS componentPurl,
       isDirect,
       advisories,
       disallowedLicenses,
       h.eolStatus AS eolStatus,
       toString(h.eolDate) AS eolDate,
       coalesce(h.isDeprecated, false) AS isDeprecated,
       h.maintenanceStatus AS maintenanceStatus
ORDER BY isDirect DESC, size(advisories) DESC, componentName
