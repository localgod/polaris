MATCH (a:Advisory)<-[:HAS_ADVISORY]-(c:Component)
OPTIONAL MATCH (s:System)-[u:USES]->(c)
WHERE u.isDirect = true
WITH a,
     count(DISTINCT c) AS affectedComponents,
     count(DISTINCT s) AS affectedSystems
ORDER BY affectedSystems DESC, affectedComponents DESC, coalesce(a.cvssScore, 0) DESC, a.id ASC
LIMIT 3
RETURN a.id AS id,
       a.aliases AS aliases,
       a.summary AS summary,
       a.cvssScore AS cvssScore,
       affectedComponents,
       affectedSystems
