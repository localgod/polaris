CALL {
  MATCH (c:Component)-[:HAS_HEALTH_SNAPSHOT]->(h:HealthSnapshot)
  WHERE h.eolStatus = 'unsupported'
  RETURN count(DISTINCT coalesce(c.purl, h.componentPurl, elementId(c))) AS total
}
CALL {
  MATCH (c:Component)-[:HAS_HEALTH_SNAPSHOT]->(h:HealthSnapshot)
  WHERE h.eolStatus = 'unsupported'
  OPTIONAL MATCH (c)-[:IS_VERSION_OF]->(t:Technology)
  OPTIONAL MATCH (sys:System)-[:USES]->(c)
  WITH coalesce(t.name, c.name) AS name, c.version AS version, collect(DISTINCT sys.name) AS systems
  WITH name, version, size(systems) AS systemCount
  ORDER BY systemCount DESC
  RETURN collect({name: name, version: version, systemCount: systemCount})[0..5] AS topItems
}
RETURN total, topItems
