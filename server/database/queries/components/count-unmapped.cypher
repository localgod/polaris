MATCH (c:Component)
WHERE NOT (c)-[:IS_VERSION_OF]->(:Technology)
RETURN count(c) as total
