CREATE (u:User {
  id: $id,
  email: $email,
  name: $name,
  provider: 'github',
  role: 'user',
  avatarUrl: $avatarUrl,
  githubUsername: $githubUsername,
  status: 'pending',
  inviteToken: $inviteToken,
  inviteExpiresAt: CASE WHEN $expiryDays IS NOT NULL THEN datetime() + duration({days: $expiryDays}) ELSE null END,
  createdAt: datetime(),
  lastLogin: null
})
WITH u
OPTIONAL MATCH (creator:User {id: $createdBy})
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'CREATE_INVITE',
  entityType: 'User',
  entityId: u.id,
  entityLabel: $githubUsername,
  previousStatus: null,
  newStatus: 'pending',
  changedFields: ['status'],
  reason: 'Invite created for GitHub user @' + $githubUsername,
  source: 'API',
  userId: $createdBy,
  realUserId: $realUserId
})
CREATE (a)-[:AUDITS]->(u)
FOREACH (_ IN CASE WHEN creator IS NOT NULL THEN [1] ELSE [] END |
  CREATE (a)-[:PERFORMED_BY]->(creator)
)
RETURN u {
  .id, .email, .name, .provider, .role, .avatarUrl,
  .githubUsername, .status, .inviteToken, .inviteExpiresAt,
  .createdAt, .lastLogin
} AS user
