MATCH (:System)-[u:USES]->(c:Component)
WHERE u.isDirect = true
WITH DISTINCT coalesce(c.packageManager, 'unknown') AS packageManagerKey,
              coalesce(c.group, '') AS groupKey,
              c.name AS name
RETURN count(*) AS components
