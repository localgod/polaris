MATCH (u:User {id: $userId})-[:HAS_API_TOKEN]->(t:ApiToken {revoked: false})
RETURN count(t) AS total
