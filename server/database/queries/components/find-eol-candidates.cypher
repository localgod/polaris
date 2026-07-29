MATCH (sys:System)-[u:USES]->(c:Component)
WHERE c.purl IS NOT NULL
  AND u.isDirect = true
OPTIONAL MATCH (c)-[:IS_VERSION_OF]->(tech:Technology)
WITH c, tech, collect(DISTINCT sys.name) as systems
RETURN c.name as name,
       c.version as version,
       c.packageManager as packageManager,
       c.purl as purl,
       c.group as `group`,
       tech.name as technologyName,
       [system IN systems WHERE system IS NOT NULL | system] as systems
ORDER BY coalesce(tech.name, c.name), c.version
