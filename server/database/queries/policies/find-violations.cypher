MATCH (team:Team)-[:USES]->(tech:Technology)
WHERE NOT (team)-[:APPROVES]->(tech)
MATCH (policy:Policy {status: 'active'})-[:GOVERNS]->(tech)
MATCH (team)-[:SUBJECT_TO]->(policy)
OPTIONAL MATCH (enforcer:Team)-[:ENFORCES]->(policy)
{{WHERE_CONDITIONS}}
RETURN team.name as teamName,
       tech.name as technologyName,
       tech.category as technologyCategory,
       tech.riskLevel as riskLevel,
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
  tech.name
