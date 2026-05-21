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
RETURN u {
  .id,
  .email,
  .name,
  .role,
  .provider,
  .avatarUrl,
  .lastLogin,
  .createdAt
} AS user
