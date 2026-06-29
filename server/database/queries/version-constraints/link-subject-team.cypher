MATCH (vc:VersionConstraint {name: $name})
MATCH (team:Team {name: $subjectTeam})
MERGE (team)-[:SUBJECT_TO]->(vc)
RETURN count(*) AS count
