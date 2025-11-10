MATCH (team:Team {name: $teamName})-[:ENFORCES]->(p:Policy)
OPTIONAL MATCH (p)-[:GOVERNS]->(tech:Technology)
WITH p, collect(DISTINCT tech.name) as governedTechnologies
RETURN p.name as name,
       p.description as description,
       p.ruleType as ruleType,
       p.severity as severity,
       p.effectiveDate as effectiveDate,
       p.expiryDate as expiryDate,
       p.scope as scope,
       p.status as status,
       governedTechnologies
ORDER BY p.effectiveDate DESC
