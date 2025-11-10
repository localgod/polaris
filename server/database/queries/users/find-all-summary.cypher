MATCH (u:User)
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
       teamCount
ORDER BY u.createdAt DESC
