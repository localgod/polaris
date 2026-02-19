// Find policy violations by traversing Team→System→Component→Technology
// Detects: unapproved usage, eliminated technologies, and version constraint violations
MATCH (team:Team)-[:OWNS]->(sys:System)-[:USES]->(comp:Component)-[:IS_VERSION_OF]->(tech:Technology)
MATCH (policy:Policy {status: 'active'})-[:GOVERNS]->(tech)
MATCH (team)-[:SUBJECT_TO]->(policy)
OPTIONAL MATCH (team)-[approval:APPROVES]->(tech)
OPTIONAL MATCH (enforcer:Team)-[:ENFORCES]->(policy)
WITH team, sys, comp, tech, policy, approval, enforcer,
     CASE
       WHEN policy.ruleType = 'version-constraint' THEN 'version-out-of-range'
       WHEN approval IS NULL THEN 'unapproved'
       WHEN approval.time = 'eliminate' THEN 'eliminated'
       ELSE null
     END as violationType
WHERE violationType IS NOT NULL
{{WHERE_CONDITIONS}}
RETURN team.name as teamName,
       sys.name as systemName,
       comp.name as componentName,
       comp.version as componentVersion,
       tech.name as technologyName,
       tech.category as technologyCategory,
       policy.name as policyName,
       policy.description as policyDescription,
       policy.severity as severity,
       policy.ruleType as ruleType,
       policy.versionRange as versionRange,
       enforcer.name as enforcedBy,
       violationType
ORDER BY
  CASE policy.severity
    WHEN 'critical' THEN 1
    WHEN 'error' THEN 2
    WHEN 'warning' THEN 3
    WHEN 'info' THEN 4
  END,
  team.name,
  sys.name,
  tech.name
