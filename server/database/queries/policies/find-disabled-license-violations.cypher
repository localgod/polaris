// Find components using disabled (non-whitelisted) licenses
// A license with whitelisted=false is considered disabled and any usage is a violation

MATCH (system:System)<-[:OWNS]-(team:Team)
MATCH (system)-[:USES]->(component:Component)-[:HAS_LICENSE]->(license:License)
WHERE license.whitelisted = false
{{AND_CONDITIONS}}
RETURN team.name as teamName,
       system.name as systemName,
       component.name as componentName,
       component.version as componentVersion,
       component.purl as componentPurl,
       license.id as licenseId,
       license.name as licenseName,
       license.category as licenseCategory,
       license.osiApproved as licenseOsiApproved,
       'Disabled License' as policyName,
       'License has been disabled by an administrator' as policyDescription,
       'error' as severity,
       'license-disabled' as ruleType,
       null as enforcedBy
ORDER BY
  team.name,
  system.name,
  component.name
