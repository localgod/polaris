MATCH (t:ApiToken {tokenHash: $tokenHash, revoked: false})<-[:HAS_API_TOKEN]-(u:User)
OPTIONAL MATCH (u)-[:MEMBER_OF]->(team:Team)
WITH t, u, collect(team {.name, .email}) as teams
RETURN t {
  .id,
  .tokenHash,
  createdAt: toString(t.createdAt),
  expiresAt: toString(t.expiresAt),
  .revoked,
  .createdBy,
  .description,
  type: coalesce(t.type, 'user')
} as token,
u {
  .id,
  .email,
  .role,
  orgAdmin: coalesce(u.orgAdmin, false),
  teams: teams
} as user
