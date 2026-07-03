MATCH (t:Technology {name: $name})
// A Technology can have more than one steward team (e.g. shared frontend
// libraries); pin a single, deterministic team (alphabetically first)
// rather than returning one row per steward, since ownerTeam is a single
// field, not a list. The ORDER BY before collect() is required -- Cypher's
// collect() has no guaranteed order otherwise, so picking [0] without it
// can return a different team on every execution.
OPTIONAL MATCH (team:Team)-[:STEWARDED_BY]->(t)
WITH t, team
ORDER BY team.name
WITH t, collect(team.name)[0] as ownerTeam
RETURN t.name as name, ownerTeam
