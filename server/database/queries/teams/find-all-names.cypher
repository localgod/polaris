MATCH (t:Team)
WHERE t.name IS NOT NULL
RETURN t.name as name
ORDER BY t.name ASC
