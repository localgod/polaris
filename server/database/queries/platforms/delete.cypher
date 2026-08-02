MATCH (p:Platform {name: $name})
DETACH DELETE p
