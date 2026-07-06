// Raw signals for the system compliance scorecard: SBOM freshness, TIME
// classification of used technologies (resolved via the owning team's
// approval, environment-aware — same precedence as compliance/find-violations.cypher),
// and disallowed-license usage. Critical version-constraint violations are
// computed separately in the service layer (semver evaluation happens in JS).
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
  OPTIONAL MATCH (sys)-[:USES]->(:Component)-[:IS_VERSION_OF]->(tech:Technology)
  WITH sys, owner, collect(DISTINCT tech) AS usedTechs
  UNWIND (CASE WHEN size(usedTechs) = 0 THEN [null] ELSE usedTechs END) AS tech
  OPTIONAL MATCH (owner)-[envApproval:APPROVES]->(tech)
    WHERE tech IS NOT NULL AND sys.environment IS NOT NULL AND envApproval.environment = sys.environment
  OPTIONAL MATCH (owner)-[blanketApproval:APPROVES]->(tech)
    WHERE tech IS NOT NULL AND blanketApproval.environment IS NULL
  WITH tech, coalesce(envApproval.time, blanketApproval.time) AS resolvedTime
  WHERE tech IS NOT NULL
  // DISTINCT guards against row multiplication if a team ever ends up with more
  // than one matching APPROVES relationship for the same (team, tech, environment) —
  // nothing at the database level prevents that (Neo4j Community Edition has no
  // relationship-cardinality constraints; see ADR-0004).
  RETURN count(DISTINCT tech) AS usedTechnologyCount,
         count(DISTINCT CASE WHEN resolvedTime IS NULL THEN tech END) AS unclassifiedCount,
         count(DISTINCT CASE WHEN resolvedTime = 'eliminate' THEN tech END) AS eliminateCount
}

CALL {
  WITH sys
  OPTIONAL MATCH (sys)-[:USES]->(comp:Component)-[:HAS_LICENSE]->(lic:License)
    WHERE lic.allowed = false
  RETURN count(DISTINCT comp) AS licenseViolationCount
}

RETURN
  lastSbomScanAt,
  usedTechnologyCount,
  unclassifiedCount,
  eliminateCount,
  licenseViolationCount
