MATCH (u:User)
WHERE $search IS NULL OR toLower(u.email) CONTAINS toLower($search) OR toLower(u.name) CONTAINS toLower($search)
OPTIONAL MATCH (u)-[:MEMBER_OF]->(t:Team)
WITH u, count(t) as teamCount
RETURN u.id as id,
       u.email as email,
       u.name as name,
       u.provider as provider,
       u.role as role,
       u.avatarUrl as avatarUrl,
       u.lastLogin as lastLogin,
       u.createdAt as createdAt,
       coalesce(u.status, 'active') as status,
       u.githubUsername as githubUsername,
       u.inviteToken as inviteToken,
       teamCount
ORDER BY u.createdAt DESC
