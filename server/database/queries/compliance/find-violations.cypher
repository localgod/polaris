// Find teams using technologies with a violating effective TIME value.
//
// Effective TIME is resolved deterministically:
//   1. Active org TechnologyPolicy for the technology
//   2. Valid PolicyException for this team (unrevoked, unexpired) — environment qualified
//   3. No active policy → null (unclassified)
//
// A violation exists when the resolved TIME is null ('unclassified') or 'eliminate'.
//
// Optional filters:
//   $directOnly (boolean) — restrict to systems that use the technology via a direct dep
//   $depScope   (string)  — restrict to systems that use the technology via a dep with this scope
//   $includeWaived (boolean) — when false (default), excludes violations with an active
//     (unrevoked, unexpired) Waiver attached to their tracked ComplianceViolation node
MATCH (team:Team)-[u:USES]->(tech:Technology)

// Collect systems that use this technology via this team's ownership
OPTIONAL MATCH (team)-[:OWNS]->(sys:System)-[cu:USES]->(comp:Component)-[:IS_VERSION_OF]->(tech)
  WHERE ($directOnly IS NULL OR $directOnly = false OR cu.isDirect = true)
    AND ($depScope IS NULL OR cu.scope = $depScope)
WITH team, tech, u,
     collect(DISTINCT CASE WHEN sys IS NOT NULL THEN {name: sys.name, environment: sys.environment} END) AS systemInfos
WHERE size(systemInfos) > 0

// Resolve the active org policy for this technology
OPTIONAL MATCH (:Organization {name: 'default'})-[:SETS]->(p:TechnologyPolicy {status: 'active'})-[:GOVERNS]->(tech)

// UNWIND to resolve per-system (environment can affect exception applicability)
UNWIND systemInfos AS si

// Team-scoped exception with optional environment qualifier
OPTIONAL MATCH (p)<-[:OVERRIDES]-(e:PolicyException {scope: 'team', scopeName: team.name})
  WHERE e.revokedAt IS NULL
    AND datetime(e.expiresAt) > datetime()
    AND (si.environment IS NULL OR e.environment IS NULL OR e.environment = si.environment)

WITH team, tech, u, si, p, e,
     CASE
       WHEN e IS NOT NULL THEN e.time
       WHEN p IS NOT NULL THEN p.time
       ELSE null
     END AS resolvedTime

WITH team, tech, u, p,
     collect({
       name: si.name,
       environment: si.environment,
       resolvedTime: resolvedTime
     }) AS systemApprovals

// A violation exists when at least one system has no policy or an 'eliminate' policy
WITH team, tech, u, p, systemApprovals,
     [sa IN systemApprovals WHERE sa.resolvedTime IS NULL OR sa.resolvedTime = 'eliminate' | sa] AS violatingSystems
WHERE size(violatingSystems) > 0

WITH team, tech, u, p,
     [sa IN systemApprovals | sa.name] AS systems,
     CASE
       WHEN p IS NULL OR all(sa IN violatingSystems WHERE sa.resolvedTime IS NULL) THEN 'unapproved'
       ELSE 'eliminated'
     END AS violationType

OPTIONAL MATCH (:ComplianceViolation {naturalKey: team.name + '|' + tech.name})<-[:WAIVES]-(w:Waiver)
  WHERE w.revokedAt IS NULL AND w.expiresAt > datetime()
WITH team, tech, u, p, systems, violationType, w
WHERE $includeWaived = true OR w IS NULL

RETURN
  team.name AS team,
  tech.name AS technology,
  tech.type AS type,
  u.systemCount AS systemCount,
  systems,
  violationType,
  p.rationale AS notes,
  p.migrationTarget AS migrationTarget,
  w.id as waiverId,
  w.reason as waiverReason,
  w.expiresAt as waiverExpiresAt
ORDER BY u.systemCount DESC, team.name, tech.name
