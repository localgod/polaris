// Find version-constraint violations: Team→System→Component→Technology
// Semver range check is applied in the service layer after fetching candidates
MATCH (team:Team)-[:OWNS]->(sys:System)-[:USES]->(comp:Component)-[:IS_VERSION_OF]->(tech:Technology)
MATCH (vc:VersionConstraint {status: 'active'})-[:GOVERNS]->(tech)
MATCH (team)-[:SUBJECT_TO]->(vc)
{{WHERE_CONDITIONS}}
RETURN team.name as teamName,
       sys.name as systemName,
       comp.name as componentName,
       comp.version as componentVersion,
       tech.name as technologyName,
       tech.category as technologyCategory,
       vc.name as constraintName,
       vc.description as constraintDescription,
       vc.severity as severity,
       vc.versionRange as versionRange
ORDER BY
  CASE vc.severity
    WHEN 'critical' THEN 1
    WHEN 'error' THEN 2
    WHEN 'warning' THEN 3
    WHEN 'info' THEN 4
  END,
  team.name,
  sys.name,
  tech.name
