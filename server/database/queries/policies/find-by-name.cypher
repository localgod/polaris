MATCH (p:Policy {name: $name})
OPTIONAL MATCH (enforcer:Team)-[:ENFORCES]->(p)
OPTIONAL MATCH (subject:Team)-[:SUBJECT_TO]->(p)
OPTIONAL MATCH (p)-[:GOVERNS]->(tech:Technology)
OPTIONAL MATCH (p)-[:GOVERNS]->(v:Version)
WITH p, enforcer,
     collect(DISTINCT subject.name) as subjectTeams,
     collect(DISTINCT tech.name) as governedTechnologies,
     collect(DISTINCT {technology: v.technologyName, version: v.version}) as governedVersions
RETURN p.name as name,
       p.description as description,
       p.ruleType as ruleType,
       p.severity as severity,
       p.effectiveDate as effectiveDate,
       p.expiryDate as expiryDate,
       p.enforcedBy as enforcedBy,
       p.scope as scope,
       p.status as status,
       enforcer.name as enforcerTeam,
       subjectTeams,
       governedTechnologies,
       governedVersions
