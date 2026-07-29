MATCH (c:Component)-[:HAS_LICENSE]->(l:License {id: $licenseId})
OPTIONAL MATCH (s:System)-[:USES]->(c)
OPTIONAL MATCH (c)-[:IS_VERSION_OF]->(t:Technology)
WITH c, count(DISTINCT s) as systemCount, t.name as technologyName
ORDER BY c.packageManager ASC, c.name ASC, c.version ASC
SKIP toInteger($offset) LIMIT toInteger($limit)
RETURN c.name as name,
       c.version as version,
       c.packageManager as packageManager,
       c.type as type,
       c.purl as purl,
       systemCount,
       technologyName
