MATCH (l:License)
RETURN
  count(l) as total,
  count(CASE WHEN l.osiApproved = true THEN 1 END) as osiApproved,
  count(CASE WHEN l.deprecated = true THEN 1 END) as deprecated,
  collect({category: l.category, count: 1}) as categories
