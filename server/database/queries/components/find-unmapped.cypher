MATCH (c:Component)
WHERE NOT (c)-[:IS_VERSION_OF]->(:Technology)
OPTIONAL MATCH (sys:System)-[:USES]->(c)
OPTIONAL MATCH (c)-[:HAS_HASH]->(h:Hash)
OPTIONAL MATCH (c)-[:HAS_LICENSE]->(l:License)
WITH c, collect(DISTINCT sys.name) as systems,
     collect(DISTINCT {algorithm: h.algorithm, value: h.value}) as hashes,
     collect(DISTINCT {id: l.id, name: l.name, url: l.url, text: l.text}) as licenses
RETURN c.name as name,
       c.version as version,
       c.packageManager as packageManager,
       c.purl as purl,
       c.cpe as cpe,
       c.type as type,
       c.group as group,
       hashes,
       licenses,
       systems,
       size(systems) as systemCount
ORDER BY size(systems) DESC, c.name
