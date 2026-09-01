// Archive an active TechnologyPolicy.
MATCH (p:TechnologyPolicy {id: $policyId})-[:GOVERNS]->(t:Technology)
WHERE p.status IN ['active', 'draft']
SET p.status = 'archived',
    p.updatedAt = datetime()
WITH p, t
CREATE (al:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'UPDATE',
  entityType: 'TechnologyPolicy',
  entityId: t.name,
  entityLabel: t.name + ' policy archived',
  changedFields: ['status'],
  changes: '{"status":{"before":"active","after":"archived"}}',
  source: 'API',
  userId: $userId,
  realUserId: $realUserId,
  correlationId: $correlationId
})
CREATE (al)-[:AUDITS]->(t)
RETURN p.id as id,
       p.time as time,
       p.rationale as rationale,
       p.migrationTarget as migrationTarget,
       p.status as status,
       toString(p.effectiveDate) as effectiveDate,
       toString(p.expiryDate) as expiryDate,
       p.createdBy as createdBy,
       p.createdByName as createdByName,
       toString(p.createdAt) as createdAt,
       toString(p.updatedAt) as updatedAt
