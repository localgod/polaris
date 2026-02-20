MATCH (vc:VersionConstraint {name: $name})
OPTIONAL MATCH (subject:Team)-[:SUBJECT_TO]->(vc)
OPTIONAL MATCH (vc)-[:GOVERNS]->(tech:Technology)
WITH vc,
     collect(DISTINCT subject.name) as subjectTeams,
     collect(DISTINCT tech.name) as governedTechnologies
RETURN vc.name as name,
       vc.description as description,
       vc.severity as severity,
       vc.scope as scope,
       vc.subjectTeam as subjectTeam,
       vc.versionRange as versionRange,
       vc.status as status,
       subjectTeams,
       governedTechnologies
