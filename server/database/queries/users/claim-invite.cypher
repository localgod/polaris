MATCH (u:User {id: $pendingId, status: 'pending'})
SET u.id               = $realId,
    u.email            = $email,
    u.name             = $name,
    u.avatarUrl        = $avatarUrl,
    u.status           = 'active',
    u.lastLogin        = datetime(),
    u.inviteToken      = null,
    u.inviteExpiresAt  = null,
    u.role             = CASE
                           WHEN $isSuperuser THEN 'superuser'
                           WHEN u.role = 'superuser' THEN 'superuser'
                           ELSE u.role
                         END
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'CLAIM_INVITE',
  entityType: 'User',
  entityId: $realId,
  entityLabel: coalesce($name, $email),
  previousStatus: 'pending',
  newStatus: 'active',
  changedFields: ['status', 'id'],
  reason: 'Invite claimed by GitHub user @' + u.githubUsername,
  source: 'OAuth',
  userId: $realId,
  realUserId: null
})
CREATE (a)-[:AUDITS]->(u)
RETURN u
