MATCH (t:Technology {name: $name})

// Update properties
SET t.category = $category,
    t.vendor = $vendor,
    t.lastReviewed = CASE WHEN $lastReviewed IS NOT NULL THEN date($lastReviewed) ELSE t.lastReviewed END

// Update ownership
WITH t
OPTIONAL MATCH (t)<-[oldOwns:OWNS]-(oldTeam:Team)
DELETE oldOwns

WITH t
OPTIONAL MATCH (newTeam:Team {name: $ownerTeam})
FOREACH (_ IN CASE WHEN newTeam IS NOT NULL THEN [1] ELSE [] END |
  MERGE (newTeam)-[:OWNS]->(t)
)

// Audit log
WITH t
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'UPDATE',
  entityType: 'Technology',
  entityId: t.name,
  entityLabel: t.name,
  changedFields: ['category', 'vendor', 'ownerTeam', 'lastReviewed'],
  source: 'API',
  userId: $userId
})
CREATE (a)-[:AUDITS]->(t)

RETURN t.name as name
