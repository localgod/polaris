// Raw signals for the team compliance scorecard that aren't already covered
// by TeamRepository.findUsage() (teams/find-usage.cypher supplies the TIME
// classification coverage / Eliminate-violation counts): SBOM freshness across
// owned systems, and disallowed-license usage across owned systems.
//
// Staged CALL {} subqueries avoid cross-multiplying unrelated OPTIONAL MATCHes.
MATCH (t:Team {name: $name})

CALL {
  WITH t
  OPTIONAL MATCH (t)-[:OWNS]->(sys:System)
  OPTIONAL MATCH (sys)-[:HAS_SOURCE_IN]->(r:Repository)
  WITH sys, max(r.lastSbomScanAt) AS lastSbomScanAt
  WITH collect(CASE WHEN sys IS NOT NULL THEN {system: sys.name, lastSbomScanAt: lastSbomScanAt} END) AS raw
  RETURN [x IN raw WHERE x IS NOT NULL] AS systemScans
}

CALL {
  WITH t
  OPTIONAL MATCH (t)-[:OWNS]->(sys2:System)-[:USES]->(comp:Component)-[:HAS_LICENSE]->(lic:License)
    WHERE lic.allowed = false
  RETURN count(DISTINCT comp) AS licenseViolationCount
}

RETURN systemScans, licenseViolationCount
