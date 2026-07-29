MATCH (u:User {id: $userId})-[:HAS_API_TOKEN]->(t:ApiToken)
RETURN t {
  .id,
  createdAt: toString(t.createdAt),
  expiresAt: toString(t.expiresAt),
  .revoked,
  .createdBy,
  .description,
  type: coalesce(t.type, 'user')
} as token
ORDER BY t.createdAt DESC
