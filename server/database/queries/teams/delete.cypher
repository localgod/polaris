MATCH (t:Team {name: $name})
DETACH DELETE t
