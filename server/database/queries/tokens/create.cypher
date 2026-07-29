MATCH (u:User {id: $createdBy})
CREATE (t:ApiToken {
  id: $id,
  tokenHash: $tokenHash,
  createdAt: datetime($createdAt),
  expiresAt: datetime($expiresAt),
  revoked: false,
  createdBy: $createdBy,
  description: $description,
  type: $type
})
CREATE (u)-[:HAS_API_TOKEN]->(t)
RETURN t {
  .id,
  .tokenHash,
  createdAt: toString(t.createdAt),
  expiresAt: toString(t.expiresAt),
  .revoked,
  .createdBy,
  .description,
  type: coalesce(t.type, 'user')
} as token
