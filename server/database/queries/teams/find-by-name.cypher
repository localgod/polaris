MATCH (t:Team {name: $name})
OPTIONAL MATCH (t)-[:STEWARDED_BY]->(tech:Technology)
OPTIONAL MATCH (t)-[:OWNS]->(sys:System)
OPTIONAL MATCH (t)-[:USES]->(usedTech:Technology)
OPTIONAL MATCH (u:User)-[:MEMBER_OF]->(t)
RETURN t {
  .*,
  technologyCount: count(DISTINCT tech),
  systemCount: count(DISTINCT sys),
  usedTechnologyCount: count(DISTINCT usedTech),
  memberCount: count(DISTINCT u)
} as team
