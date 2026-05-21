MATCH (u:User {githubUsername: $githubUsername, status: 'pending'})
RETURN u {
  .id, .email, .name, .provider, .role, .avatarUrl,
  .githubUsername, .status, .inviteToken
} AS user
