CALL {
  MATCH (c:Component)-[:HAS_HEALTH_SNAPSHOT]->(h:HealthSnapshot)
  WHERE h.eolStatus = 'unsupported'
  RETURN count(DISTINCT coalesce(c.purl, h.componentPurl, elementId(c))) AS unsupported
}
CALL {
  MATCH (c:Component)-[:HAS_HEALTH_SNAPSHOT]->(h:HealthSnapshot)
  WHERE h.eolStatus = 'approaching_eol'
  RETURN count(DISTINCT coalesce(c.purl, h.componentPurl, elementId(c))) AS approaching
}
CALL {
  MATCH (c:Component)-[:HAS_HEALTH_SNAPSHOT]->(h:HealthSnapshot)
  WHERE h.eolStatus IN ['unsupported', 'approaching_eol']
  OPTIONAL MATCH (sys:System)-[:USES]->(c)
  RETURN count(DISTINCT sys.name) AS systems
}
RETURN unsupported,
       approaching,
       systems
