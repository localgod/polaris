MATCH (team:Team {name: $team})
MATCH (tech:Technology {name: $technology})
OPTIONAL MATCH (tech)-[:HAS_VERSION]->(v:Version {version: $version})
// Priority 1: version-level, environment-specific
OPTIONAL MATCH (team)-[versionApprovalEnv:APPROVES]->(v)
  WHERE $environment IS NOT NULL AND versionApprovalEnv.environment = $environment
// Priority 2: version-level, blanket
OPTIONAL MATCH (team)-[versionApprovalBlanket:APPROVES]->(v)
  WHERE versionApprovalBlanket.environment IS NULL
// Priority 3: technology-level, environment-specific
OPTIONAL MATCH (team)-[techApprovalEnv:APPROVES]->(tech)
  WHERE $environment IS NOT NULL AND techApprovalEnv.environment = $environment
// Priority 4: technology-level, blanket
OPTIONAL MATCH (team)-[techApprovalBlanket:APPROVES]->(tech)
  WHERE techApprovalBlanket.environment IS NULL
WITH team, tech, v,
     versionApprovalEnv, versionApprovalBlanket,
     techApprovalEnv, techApprovalBlanket,
     coalesce(versionApprovalEnv, versionApprovalBlanket) AS versionApproval,
     coalesce(techApprovalEnv, techApprovalBlanket) AS techApproval
RETURN team.name as teamName,
       tech.name as technologyName,
       tech.type as type,
       tech.vendor as vendor,
       v.version as version,
       CASE
         WHEN versionApproval IS NOT NULL THEN {
           level: 'version',
           time: versionApproval.time,
           approvedAt: versionApproval.approvedAt,
           deprecatedAt: versionApproval.deprecatedAt,
           eolDate: versionApproval.eolDate,
           migrationTarget: versionApproval.migrationTarget,
           notes: versionApproval.notes,
           approvedBy: versionApproval.approvedBy
         }
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
           time: 'eliminate',
           notes: 'No explicit approval found for this team'
         }
       END as approval
