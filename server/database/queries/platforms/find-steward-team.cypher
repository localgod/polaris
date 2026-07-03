MATCH (p:Platform {name: $name})
// A Platform can have more than one steward team; pin a single,
// deterministic team (alphabetically first) since stewardTeam is a single
// field, not a list. The ORDER BY before collect() is required -- Cypher's
// collect() has no guaranteed order otherwise, so picking [0] without it
// can return a different team on every execution (and, since this feeds
// authorization checks, a different allow/deny decision).
OPTIONAL MATCH (team:Team)-[:STEWARDED_BY]->(p)
WITH p, team
ORDER BY team.name
WITH p, collect(team.name)[0] as stewardTeam
RETURN p.name as name, stewardTeam
