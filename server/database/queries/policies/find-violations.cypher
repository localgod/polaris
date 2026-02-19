// Find version-constraint policy violations by traversing Team→System→Component→Technology
// The semver range check is applied in the service layer after fetching candidates
MATCH (team:Team)-[:OWNS]->(sys:System)-[:USES]->(comp:Component)-[:IS_VERSION_OF]->(tech:Technology)
MATCH (policy:Policy {status: 'active', ruleType: 'version-constraint'})-[:GOVERNS]->(tech)
MATCH (team)-[:SUBJECT_TO]->(policy)
OPTIONAL MATCH (enforcer:Team)-[:ENFORCES]->(policy)
WITH team, sys, comp, tech, policy, enforcer,
     'version-out-of-range' as violationType
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
