MATCH (u:User {id: $userId})
OPTIONAL MATCH (u)-[:HAS_API_TOKEN]->(t:ApiToken)
WITH u, collect(t) AS tokens
DETACH DELETE u
FOREACH (t IN tokens | DETACH DELETE t)
RETURN count(u) AS deleted
