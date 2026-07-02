MATCH (t:Technology {name: $name})
// A Technology can have more than one steward team (e.g. shared frontend
// libraries); pin a single deterministic team here rather than returning
// one row per steward, since ownerTeam is a single field, not a list.
OPTIONAL MATCH (team:Team)-[:STEWARDED_BY]->(t)
WITH t, collect(DISTINCT team.name)[0] as ownerTeam
RETURN t.name as name, ownerTeam
