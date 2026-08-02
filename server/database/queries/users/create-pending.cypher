CREATE (u:User {
  id: $id,
  email: $email,
  name: $name,
  provider: 'github',
  role: 'user',
  avatarUrl: $avatarUrl,
  githubUsername: $githubUsername,
  status: 'pending',
  inviteToken: $inviteToken,
  inviteExpiresAt: CASE WHEN $expiryDays IS NOT NULL THEN datetime() + duration({days: $expiryDays}) ELSE null END,
  createdAt: datetime(),
  lastLogin: null
})
RETURN u {
  .id, .email, .name, .provider, .role, .avatarUrl,
  .githubUsername, .status, .inviteToken, .inviteExpiresAt,
  .createdAt, .lastLogin
} AS user
