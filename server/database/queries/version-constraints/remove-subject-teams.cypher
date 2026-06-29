MATCH (t:Team)-[r:SUBJECT_TO]->(vc:VersionConstraint {name: $name})
DELETE r
