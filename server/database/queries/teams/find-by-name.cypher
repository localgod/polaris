MATCH (t:Team {name: $name})
OPTIONAL MATCH (t)-[:STEWARDED_BY]->(tech:Technology)
OPTIONAL MATCH (t)-[:OWNS]->(sys:System)
OPTIONAL MATCH (t)-[:OWNS]->(sys2:System)-[:USES]->(:Component)-[:IS_VERSION_OF]->(usedTech:Technology)
OPTIONAL MATCH (u:User)-[:MEMBER_OF]->(t)
WITH t,
  count(DISTINCT tech) as technologyCount,
  count(DISTINCT sys) as systemCount,
  count(DISTINCT usedTech) as usedTechnologyCount,
  count(DISTINCT u) as memberCount
RETURN {
  name: t.name,
  email: t.email,
  responsibilityArea: t.responsibilityArea,
  technologyCount: toInteger(technologyCount),
  systemCount: toInteger(systemCount),
  usedTechnologyCount: toInteger(usedTechnologyCount),
  memberCount: toInteger(memberCount)
} as team
