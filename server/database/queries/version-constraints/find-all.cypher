MATCH (vc:VersionConstraint)
{{WHERE_CONDITIONS}}
OPTIONAL MATCH (subject:Team)-[:SUBJECT_TO]->(vc)
OPTIONAL MATCH (vc)-[:GOVERNS]->(tech:Technology)
WITH vc,
     collect(DISTINCT subject.name) AS subjectTeams,
     collect(DISTINCT tech.name) AS governedTechnologies
WITH collect({vc: vc, subjectTeams: subjectTeams, governedTechnologies: governedTechnologies}) AS allRows, count(vc) AS total
UNWIND allRows AS row
WITH row.vc AS vc, row.subjectTeams AS subjectTeams, row.governedTechnologies AS governedTechnologies, total
RETURN vc.name AS name,
       vc.description AS description,
       vc.severity AS severity,
       vc.scope AS scope,
       vc.subjectTeam AS subjectTeam,
       vc.versionRange AS versionRange,
       vc.status AS status,
       subjectTeams,
       governedTechnologies,
       size(governedTechnologies) AS technologyCount,
       total
ORDER BY {{ORDER_BY}}
SKIP toInteger($offset)
LIMIT toInteger($limit)
