CALL {
  MATCH (c:Component)-[:HAS_HEALTH_SNAPSHOT]->(h:HealthSnapshot)
  WHERE h.eolStatus = 'unsupported'
    AND EXISTS { MATCH (:System)-[:USES {isDirect: true}]->(c) }
  RETURN count(DISTINCT coalesce(c.purl, h.componentPurl, elementId(c))) AS total
}
CALL {
  MATCH (c:Component)-[:HAS_HEALTH_SNAPSHOT]->(h:HealthSnapshot)
  WHERE h.eolStatus = 'unsupported'
    AND EXISTS { MATCH (:System)-[:USES {isDirect: true}]->(c) }
  OPTIONAL MATCH (c)-[:IS_VERSION_OF]->(t:Technology)
  OPTIONAL MATCH (sys:System)-[:USES {isDirect: true}]->(c)
  WITH coalesce(t.name, c.name) AS name, c.version AS version, collect(DISTINCT sys.name) AS systems
  WITH name, version, size(systems) AS systemCount
  ORDER BY systemCount DESC
  RETURN collect({name: name, version: version, systemCount: systemCount})[0..5] AS topItems
}
RETURN total, topItems
