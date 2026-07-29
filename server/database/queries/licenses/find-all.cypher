MATCH (l:License)
{{WHERE_CONDITIONS}}
OPTIONAL MATCH (c:Component)-[:HAS_LICENSE]->(l)
WITH l, count(DISTINCT c) as componentCount
RETURN
  l.id as id,
  l.name as name,
  l.spdxId as spdxId,
  l.osiApproved as osiApproved,
  l.url as url,
  l.category as category,
  l.text as text,
  l.deprecated as deprecated,
  l.allowed as allowed,
  l.createdAt as createdAt,
  l.updatedAt as updatedAt,
  componentCount
ORDER BY {{ORDER_BY}}
{{PAGINATION}}
