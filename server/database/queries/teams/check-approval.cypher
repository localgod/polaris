// Resolve the effective TIME classification for a team's use of a technology.
//
// Resolution order (deterministic, no voting):
//   1. Active org TechnologyPolicy for this technology
//   2. Valid PolicyException for this team (unrevoked, unexpired)
//      — environment qualifier applied if $environment is provided
//   3. No active policy → 'unclassified'
//
// Note: System-scoped exceptions are not checked here because this query
// operates in a team context. Use the policies/resolve.cypher query for
// full context-aware resolution (team + system + environment).
MATCH (team:Team {name: $team})
MATCH (tech:Technology {name: $technology})
OPTIONAL MATCH (:Organization {name: 'default'})-[:SETS]->(p:TechnologyPolicy {status: 'active'})-[:GOVERNS]->(tech)
OPTIONAL MATCH (p)<-[:OVERRIDES]-(e:PolicyException {scope: 'team', scopeName: $team})
  WHERE e.revokedAt IS NULL
    AND e.expiresAt > datetime()
    AND (e.effectiveDate IS NULL OR e.effectiveDate <= datetime())
    AND ($environment IS NULL OR e.environment IS NULL OR e.environment = $environment)
WITH team, tech, p, e
RETURN team.name as teamName,
       tech.name as technologyName,
       tech.type as type,
       tech.vendor as vendor,
       CASE
         WHEN e IS NOT NULL THEN {
           level: 'exception',
           time: e.time,
           migrationTarget: null,
           notes: e.reason,
           policyId: p.id,
           exceptionId: e.id
         }
         WHEN p IS NOT NULL THEN {
           level: 'policy',
           time: p.time,
           migrationTarget: p.migrationTarget,
           notes: p.rationale,
           policyId: p.id,
           exceptionId: null
         }
         ELSE {
           level: 'unclassified',
           time: 'unclassified',
           migrationTarget: null,
           notes: 'No active organization policy for this technology',
           policyId: null,
           exceptionId: null
         }
       END as approval
