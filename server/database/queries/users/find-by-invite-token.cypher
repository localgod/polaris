MATCH (u:User {inviteToken: $token, status: 'pending'})
RETURN u {
  .id, .email, .name, .provider, .role, .avatarUrl,
  .githubUsername, .status, .inviteToken, .inviteExpiresAt,
  .createdAt
} AS user
