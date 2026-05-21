MATCH (u:User {id: $userId})
SET u.role = $role
WITH u
OPTIONAL MATCH (performer:User {id: $performedBy})
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'CHANGE_ROLE',
  entityType: 'User',
  entityId: u.id,
  entityLabel: coalesce(u.name, u.email),
  previousStatus: $previousRole,
  newStatus: $role,
  changedFields: ['role'],
  reason: 'Role changed from ' + $previousRole + ' to ' + $role,
  source: 'API',
  userId: $performedBy,
  realUserId: $realUserId
})
CREATE (a)-[:AUDITS]->(u)
FOREACH (_ IN CASE WHEN performer IS NOT NULL THEN [1] ELSE [] END |
  CREATE (a)-[:PERFORMED_BY]->(performer)
)
WITH u
OPTIONAL MATCH (u)-[:MEMBER_OF]->(t:Team)
OPTIONAL MATCH (u)-[:CAN_MANAGE]->(mt:Team)
WITH u,
     collect(DISTINCT {name: t.name, email: t.email}) AS teams,
     collect(DISTINCT mt.name) AS canManage
RETURN u {
  .*,
  teams: teams,
  canManage: canManage
} AS user
