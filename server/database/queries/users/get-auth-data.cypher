MATCH (u:User {id: $userId})
OPTIONAL MATCH (u)-[:MEMBER_OF]->(t:Team)
RETURN u.role as role, 
       u.email as email,
       collect({
         name: t.name,
         email: t.email
       }) as teams
