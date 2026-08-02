MATCH (t:Technology {name: $name})
DETACH DELETE t
