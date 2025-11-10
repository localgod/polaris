MATCH (s:System {name: $name})
DETACH DELETE s
