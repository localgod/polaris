MATCH (l:License)
RETURN count(l) AS total,
       sum(CASE WHEN l.category = 'permissive' THEN 1 ELSE 0 END) AS permissive,
       sum(CASE WHEN l.category = 'copyleft' THEN 1 ELSE 0 END) AS copyleft
