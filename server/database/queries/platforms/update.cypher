MATCH (p:Platform {name: $name})

// Update properties
SET p.type = $type,
    p.domain = $domain,
    p.vendor = $vendor

// Update stewardship
WITH p
OPTIONAL MATCH (p)<-[oldSteward:STEWARDED_BY]-(oldTeam:Team)
DELETE oldSteward

WITH p
OPTIONAL MATCH (newTeam:Team {name: $stewardTeam})
FOREACH (_ IN CASE WHEN newTeam IS NOT NULL THEN [1] ELSE [] END |
  MERGE (newTeam)-[:STEWARDED_BY]->(p)
)

// Audit log
WITH p
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'UPDATE',
  entityType: 'Platform',
  entityId: p.name,
  entityLabel: p.name,
  changedFields: ['type', 'domain', 'vendor', 'stewardTeam'],
  changes: $changes,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
})
CREATE (a)-[:AUDITS]->(p)

RETURN p.name as name
