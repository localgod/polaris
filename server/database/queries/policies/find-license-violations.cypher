// Find license compliance violations
// Returns systems using components with licenses that violate active license policies
//
// Supports two modes:
// - allowlist: Violation if license is NOT in ALLOWS_LICENSE relationships
// - denylist: Violation if license IS in DENIES_LICENSE relationships
//
// Logic:
// 1. Find systems using components with licenses
// 2. Find active license-compliance policies that apply to the system's team
// 3. Check violation based on policy's licenseMode:
//    - allowlist (or null for backward compatibility): license NOT in allowlist
//    - denylist: license IS in denylist
// 4. Return violation details

MATCH (system:System)<-[:OWNS]-(team:Team)
MATCH (system)-[:USES]->(component:Component)-[:HAS_LICENSE]->(license:License)
MATCH (policy:Policy {status: 'active', ruleType: 'license-compliance'})
MATCH (team)-[:SUBJECT_TO]->(policy)
WHERE 
  // Denylist mode: violation if license IS denied
  (policy.licenseMode = 'denylist' AND (policy)-[:DENIES_LICENSE]->(license))
  OR
  // Allowlist mode (default): violation if license is NOT allowed
  ((policy.licenseMode = 'allowlist' OR policy.licenseMode IS NULL) AND NOT (policy)-[:ALLOWS_LICENSE]->(license))
{{AND_CONDITIONS}}
OPTIONAL MATCH (enforcer:Team)-[:ENFORCES]->(policy)
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
