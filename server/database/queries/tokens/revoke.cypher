MATCH (u:User {id: $userId})-[:HAS_API_TOKEN]->(t:ApiToken {id: $tokenId})
SET t.revoked = true
RETURN t
