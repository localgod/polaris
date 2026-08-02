MATCH (team:Team {name: $team})
MATCH (tech:Technology {name: $technology})
// Priority 1: technology-level, environment-specific
OPTIONAL MATCH (team)-[techApprovalEnv:APPROVES]->(tech)
  WHERE $environment IS NOT NULL AND techApprovalEnv.environment = $environment
// Priority 2: technology-level, blanket
OPTIONAL MATCH (team)-[techApprovalBlanket:APPROVES]->(tech)
  WHERE techApprovalBlanket.environment IS NULL
WITH team, tech,
     coalesce(techApprovalEnv, techApprovalBlanket) AS techApproval
RETURN team.name as teamName,
       tech.name as technologyName,
       tech.type as type,
       tech.vendor as vendor,
       CASE
         WHEN techApproval IS NOT NULL THEN {
           level: 'technology',
           time: techApproval.time,
           approvedAt: techApproval.approvedAt,
           deprecatedAt: techApproval.deprecatedAt,
           eolDate: techApproval.eolDate,
           migrationTarget: techApproval.migrationTarget,
           notes: techApproval.notes,
           approvedBy: techApproval.approvedBy
         }
         ELSE {
           level: 'default',
           time: 'unclassified',
           notes: 'No explicit approval found for this team'
         }
       END as approval
