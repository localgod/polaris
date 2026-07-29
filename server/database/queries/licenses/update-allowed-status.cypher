MATCH (l:License {id: $id})
WITH l, l.allowed as previousAllowed
SET l.allowed = $allowed,
    l.updatedAt = datetime()
WITH l, {
  operation: CASE $allowed WHEN true THEN 'ENABLE' ELSE 'DISABLE' END,
  entityType: 'License',
  entityId: l.id,
  entityLabel: l.name,
  previousStatus: CASE previousAllowed WHEN true THEN 'enabled' ELSE 'disabled' END,
  newStatus: CASE $allowed WHEN true THEN 'enabled' ELSE 'disabled' END,
  changedFields: ['allowed'],
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
} AS auditFields
{{AUDIT_LOG_WRITE}}
CREATE (a)-[:AUDITS]->(l)
RETURN count(l) as updated
