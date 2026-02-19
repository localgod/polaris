MATCH (p:Policy {name: $name})
OPTIONAL MATCH (enforcer:Team)-[:ENFORCES]->(p)
OPTIONAL MATCH (subject:Team)-[:SUBJECT_TO]->(p)
OPTIONAL MATCH (p)-[:GOVERNS]->(tech:Technology)
OPTIONAL MATCH (p)-[:GOVERNS]->(v:Version)
OPTIONAL MATCH (p)-[:ALLOWS_LICENSE]->(allowedLicense:License)
OPTIONAL MATCH (p)-[:DENIES_LICENSE]->(deniedLicense:License)
WITH p, enforcer,
     collect(DISTINCT subject.name) as subjectTeams,
     collect(DISTINCT tech.name) as governedTechnologies,
     collect(DISTINCT {technology: v.technologyName, version: v.version}) as governedVersions,
     collect(DISTINCT allowedLicense.id) as allowedLicenses,
     collect(DISTINCT deniedLicense.id) as deniedLicenses
RETURN p.name as name,
       p.description as description,
       p.ruleType as ruleType,
       p.severity as severity,
       p.effectiveDate as effectiveDate,
       p.expiryDate as expiryDate,
       p.enforcedBy as enforcedBy,
       p.scope as scope,
       p.subjectTeam as subjectTeam,
       p.versionRange as versionRange,
       p.status as status,
       p.licenseMode as licenseMode,
       enforcer.name as enforcerTeam,
       subjectTeams,
       governedTechnologies,
       governedVersions,
       [l IN allowedLicenses WHERE l IS NOT NULL] as allowedLicenses,
       [l IN deniedLicenses WHERE l IS NOT NULL] as deniedLicenses
