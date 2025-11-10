MATCH (u:User)
OPTIONAL MATCH (u)-[:MEMBER_OF]->(t:Team)
OPTIONAL MATCH (u)-[:CAN_MANAGE]->(mt:Team)
RETURN u {
  .*,
  teams: collect(DISTINCT {name: t.name, email: t.email}),
  canManage: collect(DISTINCT mt.name)
} as user
ORDER BY u.createdAt DESC
