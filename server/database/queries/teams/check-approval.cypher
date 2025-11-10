MATCH (team:Team {name: $team})
MATCH (tech:Technology {name: $technology})
OPTIONAL MATCH (tech)-[:HAS_VERSION]->(v:Version {version: $version})
OPTIONAL MATCH (team)-[versionApproval:APPROVES]->(v)
OPTIONAL MATCH (team)-[techApproval:APPROVES]->(tech)
RETURN team.name as teamName,
       tech.name as technologyName,
       tech.category as category,
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
           approvedBy: techApproval.approvedBy,
           versionConstraint: techApproval.versionConstraint
         }
         ELSE {
           level: 'default',
           time: 'eliminate',
           notes: 'No explicit approval found for this team'
         }
       END as approval
