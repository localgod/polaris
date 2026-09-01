// Activate a draft TechnologyPolicy.
// Archives any currently active policy for the same Technology first,
// then transitions the target policy from 'draft' to 'active'.
MATCH (p:TechnologyPolicy {id: $policyId, status: 'draft'})-[:GOVERNS]->(t:Technology)
MATCH (o:Organization {name: 'default'})
// Archive any currently active policy
OPTIONAL MATCH (o)-[:SETS]->(active:TechnologyPolicy {status: 'active'})-[:GOVERNS]->(t)
FOREACH (_ IN CASE WHEN active IS NOT NULL THEN [1] ELSE [] END |
  SET active.status = 'archived',
      active.updatedAt = datetime()
)
SET p.status = 'active',
    p.updatedAt = datetime()
WITH p, t
CREATE (al:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'UPDATE',
  entityType: 'TechnologyPolicy',
  entityId: t.name,
  entityLabel: t.name + ' policy activated (' + p.time + ')',
  changedFields: ['status'],
  changes: '{"status":{"before":"draft","after":"active"}}',
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
