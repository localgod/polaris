MATCH (p:Policy {name: $name})
DETACH DELETE p
