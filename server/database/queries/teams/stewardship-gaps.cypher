CALL {
  MATCH (t:Technology)
  WHERE NOT EXISTS { MATCH (:Team)-[:STEWARDED_BY]->(t) }
  WITH t
  ORDER BY t.name
  RETURN count(t) AS unstewardedTechnologies, collect(t.name)[0..5] AS sampleTechnologies
}
CALL {
  MATCH (p:Platform)
  WHERE NOT EXISTS { MATCH (:Team)-[:STEWARDED_BY]->(p) }
  WITH p
  ORDER BY p.name
  RETURN count(p) AS unstewardedPlatforms, collect(p.name)[0..5] AS samplePlatforms
}
CALL {
  MATCH (s:System)
  WHERE NOT EXISTS { MATCH (:Team)-[:OWNS]->(s) }
  WITH s
  ORDER BY s.name
  RETURN count(s) AS unownedSystems, collect(s.name)[0..5] AS sampleSystems
}
RETURN unstewardedTechnologies, sampleTechnologies,
       unstewardedPlatforms, samplePlatforms,
       unownedSystems, sampleSystems
