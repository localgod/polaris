// Revoke a PolicyException by ID.
MATCH (e:PolicyException {id: $exceptionId})
  WHERE e.revokedAt IS NULL
MATCH (e)-[:OVERRIDES]->(p:TechnologyPolicy)-[:GOVERNS]->(t:Technology)
SET e.revokedAt = datetime(),
    e.revokedBy = $userId
WITH e, p, t
CREATE (al:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'UPDATE',
  entityType: 'PolicyException',
  entityId: e.id,
  entityLabel: t.name + ' exception revoked (' + e.scope + ':' + e.scopeName + ')',
  changedFields: ['revokedAt', 'revokedBy'],
  changes: '{"revokedAt":{"before":null,"after":"now"}}',
  source: 'API',
  userId: $userId,
  realUserId: $realUserId,
  correlationId: $correlationId
})
CREATE (al)-[:AUDITS]->(t)
RETURN e.id as id,
       e.time as time,
       e.reason as reason,
       e.approver as approver,
       e.scope as scope,
       e.scopeName as scopeName,
       e.environment as environment,
       toString(e.effectiveDate) as effectiveDate,
       toString(e.expiresAt) as expiresAt,
       toString(e.createdAt) as createdAt,
       toString(e.revokedAt) as revokedAt,
       e.revokedBy as revokedBy
