// Find license compliance violations
// Returns systems using components with licenses not allowed by active license policies
//
// Logic:
// 1. Find systems using components with licenses
// 2. Find active license-compliance policies that apply to the system's team
// 3. Check if the license is NOT in the policy's allowlist
// 4. Return violation details

MATCH (system:System)<-[:OWNS]-(team:Team)
MATCH (system)-[:USES]->(component:Component)-[:HAS_LICENSE]->(license:License)
MATCH (policy:Policy {status: 'active', ruleType: 'license-compliance'})
MATCH (team)-[:SUBJECT_TO]->(policy)
WHERE NOT (policy)-[:ALLOWS_LICENSE]->(license)
OPTIONAL MATCH (enforcer:Team)-[:ENFORCES]->(policy)
{{WHERE_CONDITIONS}}
RETURN team.name as teamName,
       system.name as systemName,
       component.name as componentName,
       component.version as componentVersion,
       component.purl as componentPurl,
       license.id as licenseId,
       license.name as licenseName,
       license.category as licenseCategory,
       license.osiApproved as licenseOsiApproved,
       policy.name as policyName,
       policy.description as policyDescription,
       policy.severity as severity,
       policy.ruleType as ruleType,
       enforcer.name as enforcedBy
ORDER BY 
  CASE policy.severity
    WHEN 'critical' THEN 1
    WHEN 'error' THEN 2
    WHEN 'warning' THEN 3
    WHEN 'info' THEN 4
  END,
  team.name,
  system.name,
  component.name
