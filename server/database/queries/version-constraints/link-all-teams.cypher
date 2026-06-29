MATCH (vc:VersionConstraint {name: $name})
MATCH (team:Team)
MERGE (team)-[:SUBJECT_TO]->(vc)
RETURN count(*) AS count
