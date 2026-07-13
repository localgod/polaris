// Detect technologies with multiple distinct versions in use as *direct*
// dependencies across systems. Grouping is by claimed Technology (via
// IS_VERSION_OF) rather than raw component name, since Technology is the
// canonical, deduplicated identity in the graph model.
//
// Restricted to USES {isDirect: true}: a team can only change the version it
// declares in its own manifest, not one pulled in transitively by another
// dependency, so transitive-only versions would just be unactionable noise
// in a consolidation report.
// Staged CALL {} subqueries avoid cross-multiplying the per-version and
// tech-wide system MATCHes against each other.
MATCH (:System)-[:USES {isDirect: true}]->(c:Component)-[:IS_VERSION_OF]->(tech:Technology)
WITH tech, collect(DISTINCT c.version) AS versions
WHERE size(versions) >= toInteger($minVersions)

CALL {
  WITH tech
  MATCH (sys:System)-[:USES {isDirect: true}]->(comp:Component)-[:IS_VERSION_OF]->(tech)
  WITH comp.version AS version, collect(DISTINCT sys.name) AS systemNames
  RETURN collect({version: version, systemCount: size(systemNames), systems: systemNames}) AS versionBreakdown
}

CALL {
  WITH tech
  MATCH (sys2:System)-[:USES {isDirect: true}]->(comp2:Component)-[:IS_VERSION_OF]->(tech)
  RETURN count(DISTINCT sys2) AS affectedSystemCount
}

RETURN tech.name AS technologyName,
       versions,
       size(versions) AS versionCount,
       versionBreakdown,
       affectedSystemCount
ORDER BY versionCount DESC, affectedSystemCount DESC
