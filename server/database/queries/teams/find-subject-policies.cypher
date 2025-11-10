MATCH (team:Team {name: $teamName})-[:SUBJECT_TO]->(p:Policy)
OPTIONAL MATCH (enforcer:Team)-[:ENFORCES]->(p)
OPTIONAL MATCH (p)-[:GOVERNS]->(tech:Technology)
WITH p, enforcer, collect(DISTINCT tech.name) as governedTechnologies
RETURN p.name as name,
       p.description as description,
       p.ruleType as ruleType,
       p.severity as severity,
       p.effectiveDate as effectiveDate,
       p.expiryDate as expiryDate,
       p.scope as scope,
       p.status as status,
       enforcer.name as enforcedBy,
       governedTechnologies
ORDER BY p.effectiveDate DESC
