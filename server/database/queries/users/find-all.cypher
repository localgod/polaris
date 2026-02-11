MATCH (u:User)
OPTIONAL MATCH (u)-[:MEMBER_OF]->(t:Team)
OPTIONAL MATCH (u)-[:CAN_MANAGE]->(mt:Team)
WITH u,
     collect(DISTINCT {name: t.name, email: t.email}) AS teams,
     collect(DISTINCT mt.name) AS canManage
RETURN u {
  .*,
  teams: teams,
  canManage: canManage
} as user
ORDER BY u.createdAt DESC
