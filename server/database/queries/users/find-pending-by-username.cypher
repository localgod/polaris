MATCH (u:User {githubUsername: $githubUsername, status: 'pending'})
WHERE u.inviteExpiresAt IS NULL OR u.inviteExpiresAt > datetime()
RETURN u {
  .id, .email, .name, .provider, .role, .avatarUrl,
  .githubUsername, .status, .inviteToken
} AS user
