// Deterministic policy resolution for a Technology in a given context.
//
// Parameters:
//   $technologyName  — Technology.name
//   $teamName        — nullable: team context (for exception lookup)
//   $systemName      — nullable: system context (higher specificity than team)
//   $environment     — nullable: further qualifies system or team scope
//
// Resolution order:
//   1. Active org policy
//   2. Valid exception (System scope beats Team scope; environment qualifier applied)
//   3. No active policy → 'unclassified'
MATCH (t:Technology {name: $technologyName})
OPTIONAL MATCH (o:Organization {name: 'default'})-[:SETS]->(p:TechnologyPolicy {status: 'active'})-[:GOVERNS]->(t)
// System-scoped exception (highest specificity)
OPTIONAL MATCH (p)<-[:OVERRIDES]-(eSystem:PolicyException {scope: 'system', scopeName: $systemName})
  WHERE $systemName IS NOT NULL
    AND eSystem.revokedAt IS NULL
    AND eSystem.expiresAt > datetime()
    AND (eSystem.effectiveDate IS NULL OR eSystem.effectiveDate <= datetime())
    AND ($environment IS NULL OR eSystem.environment IS NULL OR eSystem.environment = $environment)
// Team-scoped exception (lower specificity than system)
OPTIONAL MATCH (p)<-[:OVERRIDES]-(eTeam:PolicyException {scope: 'team', scopeName: $teamName})
  WHERE $teamName IS NOT NULL
    AND eTeam.revokedAt IS NULL
    AND eTeam.expiresAt > datetime()
    AND (eTeam.effectiveDate IS NULL OR eTeam.effectiveDate <= datetime())
    AND ($environment IS NULL OR eTeam.environment IS NULL OR eTeam.environment = $environment)
WITH p,
     CASE WHEN eSystem IS NOT NULL THEN eSystem ELSE eTeam END AS matchedException
RETURN
  CASE
    WHEN matchedException IS NOT NULL THEN matchedException.time
    WHEN p IS NOT NULL THEN p.time
    ELSE 'unclassified'
  END AS time,
  CASE
    WHEN matchedException IS NOT NULL THEN 'exception'
    WHEN p IS NOT NULL THEN 'policy'
    ELSE 'unclassified'
  END AS source,
  p.id AS policyId,
  matchedException.id AS exceptionId
