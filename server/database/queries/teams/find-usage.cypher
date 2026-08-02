MATCH (team:Team {name: $teamName})-[u:USES]->(tech:Technology)
OPTIONAL MATCH (team)-[a:APPROVES]->(tech)
WITH team, tech, u, a, NOT EXISTS {
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
  a.time as approvalStatus,
  CASE
    WHEN NOT notWaived THEN 'compliant'
    WHEN a IS NULL THEN 'unapproved'
    WHEN a.time IN ['invest', 'tolerate'] THEN 'compliant'
    WHEN a.time = 'migrate' THEN 'migration-needed'
    WHEN a.time = 'eliminate' THEN 'violation'
    ELSE 'unknown'
  END as complianceStatus
ORDER BY u.systemCount DESC, tech.name
