// Create a PolicyException for the active policy of a given Technology.
MATCH (o:Organization {name: 'default'})-[:SETS]->(p:TechnologyPolicy {status: 'active'})-[:GOVERNS]->(t:Technology {name: $technologyName})
OPTIONAL MATCH (target)
  WHERE ($scope = 'team' AND target:Team {name: $scopeName})
     OR ($scope = 'system' AND target:System {name: $scopeName})
WITH p, t, target
CREATE (e:PolicyException {
  id: randomUUID(),
  time: $time,
  reason: $reason,
  approver: $approver,
  scope: $scope,
  scopeName: $scopeName,
  environment: $environment,
  effectiveDate: datetime($effectiveDate),
  expiresAt: datetime($expiresAt),
  createdAt: datetime(),
  revokedAt: null,
  revokedBy: null
})
CREATE (e)-[:OVERRIDES]->(p)
FOREACH (_ IN CASE WHEN target IS NOT NULL THEN [1] ELSE [] END |
  CREATE (e)-[:APPLIES_TO]->(target)
)
WITH e, p, t
CREATE (al:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'CREATE',
  entityType: 'PolicyException',
  entityId: e.id,
  entityLabel: t.name + ' exception (' + $scope + ':' + $scopeName + ')',
  changedFields: ['time', 'reason', 'scope', 'scopeName', 'effectiveDate', 'expiresAt'],
  changes: $changes,
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
       e.revokedAt as revokedAt,
       e.revokedBy as revokedBy
