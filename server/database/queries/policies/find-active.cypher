// Returns the single active TechnologyPolicy for a given Technology,
// plus all unrevoked, unexpired exceptions for that policy.
MATCH (o:Organization {name: 'default'})-[:SETS]->(p:TechnologyPolicy {status: 'active'})-[:GOVERNS]->(t:Technology {name: $technologyName})
OPTIONAL MATCH (p)<-[:OVERRIDES]-(e:PolicyException)
  WHERE e.revokedAt IS NULL AND datetime(e.expiresAt) > datetime()
OPTIONAL MATCH (e)-[:APPLIES_TO]->(target)
WITH p, collect(
  CASE WHEN e IS NOT NULL THEN {
    id: e.id,
    time: e.time,
    reason: e.reason,
    approver: e.approver,
    scope: e.scope,
    scopeName: e.scopeName,
    environment: e.environment,
    effectiveDate: toString(e.effectiveDate),
    expiresAt: toString(e.expiresAt),
    createdAt: toString(e.createdAt),
    revokedAt: null,
    revokedBy: null
  } ELSE null END
) as rawExceptions
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
       toString(p.updatedAt) as updatedAt,
       [e IN rawExceptions WHERE e IS NOT NULL] as exceptions
