MERGE (u:User {id: $id})
ON CREATE SET u.createdAt = datetime(),
             u.role = $role
SET u.email = $email,
    u.name = $name,
    u.provider = $provider,
    u.lastLogin = datetime(),
    u.avatarUrl = $avatarUrl,
    u.role = CASE 
      WHEN $isSuperuser THEN 'superuser'
      WHEN u.role = 'superuser' THEN 'superuser'
      ELSE u.role
    END
RETURN u
