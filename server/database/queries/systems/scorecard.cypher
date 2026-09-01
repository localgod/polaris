// Raw signals for the system compliance scorecard: SBOM freshness, TIME
// classification of used technologies (resolved via the active org TechnologyPolicy
// + team-scoped PolicyException, environment-aware), and disallowed-license usage.
// Critical version-constraint violations are computed separately in the service
// layer (semver evaluation happens in JS).
//
// Direct dependencies only (USES.isDirect = true) — the scorecard should read
// consistently with the Issues card's default view.
//
// Staged CALL {} subqueries avoid cross-multiplying unrelated OPTIONAL MATCHes.
MATCH (sys:System {name: $name})
OPTIONAL MATCH (owner:Team)-[:OWNS]->(sys)

CALL {
  WITH sys
  OPTIONAL MATCH (sys)-[:HAS_SOURCE_IN]->(r:Repository)
  RETURN max(r.lastSbomScanAt) AS lastSbomScanAt
}

CALL {
  WITH sys, owner
  OPTIONAL MATCH (sys)-[u:USES]->(:Component)-[:IS_VERSION_OF]->(tech:Technology)
    WHERE u.isDirect = true
  WITH sys, owner, collect(DISTINCT tech) AS usedTechs
  UNWIND (CASE WHEN size(usedTechs) = 0 THEN [null] ELSE usedTechs END) AS tech
  // Active org policy
  OPTIONAL MATCH (:Organization {name: 'default'})-[:SETS]->(p:TechnologyPolicy {status: 'active'})-[:GOVERNS]->(tech)
    WHERE tech IS NOT NULL
  // Team-scoped exception with optional environment qualifier
  OPTIONAL MATCH (p)<-[:OVERRIDES]-(e:PolicyException {scope: 'team', scopeName: owner.name})
    WHERE owner IS NOT NULL AND tech IS NOT NULL
      AND e.revokedAt IS NULL
      AND e.expiresAt > datetime()
      AND (e.effectiveDate IS NULL OR e.effectiveDate <= datetime())
      AND (sys.environment IS NULL OR e.environment IS NULL OR e.environment = sys.environment)
  WITH owner, tech,
       CASE
         WHEN e IS NOT NULL THEN e.time
         WHEN p IS NOT NULL THEN p.time
         ELSE null
       END AS resolvedTime
  WHERE tech IS NOT NULL
  // Waiver check only gates the two violation-count buckets below, not
  // usedTechnologyCount — a waived violation is still real usage, just an
  // accepted one, so it must stay in the usage count while dropping out of
  // the violation counts.
  WITH tech, resolvedTime, owner IS NULL OR NOT EXISTS {
    MATCH (:ComplianceViolation {naturalKey: owner.name + '|' + tech.name})<-[:WAIVES]-(w:Waiver)
    WHERE w.revokedAt IS NULL AND w.expiresAt > datetime()
  } AS notWaived
  RETURN count(DISTINCT tech) AS usedTechnologyCount,
         count(DISTINCT CASE WHEN resolvedTime IS NULL AND notWaived THEN tech END) AS unclassifiedCount,
         count(DISTINCT CASE WHEN resolvedTime = 'eliminate' AND notWaived THEN tech END) AS eliminateCount
}

CALL {
  WITH sys
  OPTIONAL MATCH (sys)-[u:USES]->(comp:Component)-[:HAS_LICENSE]->(lic:License)
    WHERE u.isDirect = true AND coalesce(lic.allowed, false) = false
  WITH comp, lic, coalesce(comp.purl, comp.name + '@' + coalesce(comp.version, 'unknown')) AS purl
  WHERE comp IS NULL OR NOT EXISTS {
    MATCH (:LicenseViolation {naturalKey: $name + '|' + purl + '|' + lic.id})<-[:WAIVES]-(w:Waiver)
    WHERE w.revokedAt IS NULL AND w.expiresAt > datetime()
  }
  RETURN count(DISTINCT comp) AS licenseViolationCount
}

RETURN
  lastSbomScanAt,
  usedTechnologyCount,
  unclassifiedCount,
  eliminateCount,
  licenseViolationCount
