// Returns a team's technology usage with effective TIME classification.
//
// Effective TIME is resolved from the active org TechnologyPolicy, with a
// team-scoped PolicyException applied if one exists. This gives the
// authoritative compliance status for this team's context.
MATCH (team:Team {name: $teamName})-[u:USES]->(tech:Technology)
// Active org policy
OPTIONAL MATCH (:Organization {name: 'default'})-[:SETS]->(p:TechnologyPolicy {status: 'active'})-[:GOVERNS]->(tech)
// Team-scoped exception (no environment qualifier — team-level view is environment-agnostic)
OPTIONAL MATCH (p)<-[:OVERRIDES]-(e:PolicyException {scope: 'team', scopeName: team.name})
  WHERE e.revokedAt IS NULL AND datetime(e.expiresAt) > datetime()
WITH team, tech, u, p, e,
     CASE
       WHEN e IS NOT NULL THEN e.time
       WHEN p IS NOT NULL THEN p.time
       ELSE null
     END AS resolvedTime,
     NOT EXISTS {
       MATCH (:ComplianceViolation {naturalKey: team.name + '|' + tech.name})<-[:WAIVES]-(w:Waiver)
       WHERE w.revokedAt IS NULL AND w.expiresAt > datetime()
     } AS notWaived
RETURN
  tech.name as technology,
  tech.type as type,
  tech.domain as domain,
  tech.vendor as vendor,
  u.systemCount as systemCount,
  u.firstUsed as firstUsed,
  u.lastVerified as lastVerified,
  resolvedTime as approvalStatus,
  CASE
    WHEN NOT notWaived THEN 'compliant'
    WHEN resolvedTime IS NULL THEN 'unapproved'
    WHEN resolvedTime IN ['invest', 'tolerate'] THEN 'compliant'
    WHEN resolvedTime = 'migrate' THEN 'migration-needed'
    WHEN resolvedTime = 'eliminate' THEN 'violation'
    ELSE 'unknown'
  END as complianceStatus
ORDER BY u.systemCount DESC, tech.name
