MATCH (u:User {id: $pendingId, status: 'pending'})
SET u.id               = $realId,
    u.email            = $email,
    u.name             = $name,
    u.avatarUrl        = $avatarUrl,
    u.status           = 'active',
    u.lastLogin        = datetime(),
    u.inviteToken      = null,
    u.inviteExpiresAt  = null,
    u.role             = CASE
                           WHEN $isSuperuser THEN 'superuser'
                           WHEN u.role = 'superuser' THEN 'superuser'
                           ELSE u.role
                         END
RETURN u.githubUsername as githubUsername
