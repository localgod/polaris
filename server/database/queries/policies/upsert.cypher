// Create or update a draft TechnologyPolicy for a Technology.
// Only one draft policy per Technology may exist — this query upserts it.
// An active policy cannot be updated via this query (use activate.cypher to
// transition draft→active; use archive.cypher to retire an active policy).
MATCH (t:Technology {name: $technologyName})
MATCH (o:Organization {name: 'default'})
// Find existing draft (at most one)
OPTIONAL MATCH (o)-[:SETS]->(existing:TechnologyPolicy {status: 'draft'})-[:GOVERNS]->(t)
WITH t, o, existing, (existing IS NULL) AS isNew
FOREACH (_ IN CASE WHEN isNew THEN [1] ELSE [] END |
  CREATE (o)-[:SETS]->(p:TechnologyPolicy {
    id: randomUUID(),
    time: $time,
    rationale: $rationale,
    migrationTarget: $migrationTarget,
    status: 'draft',
    effectiveDate: CASE WHEN $effectiveDate IS NOT NULL THEN datetime($effectiveDate) ELSE null END,
    expiryDate: CASE WHEN $expiryDate IS NOT NULL THEN datetime($expiryDate) ELSE null END,
    createdBy: $userId,
    createdByName: $userName,
    createdAt: datetime(),
    updatedAt: datetime()
  })-[:GOVERNS]->(t)
)
FOREACH (_ IN CASE WHEN NOT isNew THEN [1] ELSE [] END |
  SET existing.time = $time,
      existing.rationale = $rationale,
      existing.migrationTarget = $migrationTarget,
      existing.effectiveDate = CASE WHEN $effectiveDate IS NOT NULL THEN datetime($effectiveDate) ELSE null END,
      existing.expiryDate = CASE WHEN $expiryDate IS NOT NULL THEN datetime($expiryDate) ELSE null END,
      existing.updatedAt = datetime()
)
WITH t, o, isNew
MATCH (o)-[:SETS]->(p:TechnologyPolicy {status: 'draft'})-[:GOVERNS]->(t)
CREATE (al:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: CASE WHEN isNew THEN 'CREATE' ELSE 'UPDATE' END,
  entityType: 'TechnologyPolicy',
  entityId: t.name,
  entityLabel: t.name + ' policy (' + $time + ')',
  changedFields: ['time', 'rationale', 'migrationTarget', 'effectiveDate', 'expiryDate'],
  changes: $changes,
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
