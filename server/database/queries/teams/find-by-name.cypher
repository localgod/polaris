MATCH (t:Team {name: $name})
OPTIONAL MATCH (t)-[:STEWARDED_BY]->(tech:Technology)
OPTIONAL MATCH (t)-[stewardApproval:APPROVES]->(tech)
OPTIONAL MATCH (t)-[:OWNS]->(sys:System)
OPTIONAL MATCH (t)-[:OWNS]->(sys2:System)-[:USES]->(:Component)-[:IS_VERSION_OF]->(usedTech:Technology)
OPTIONAL MATCH (u:User)-[:MEMBER_OF]->(t)
OPTIONAL MATCH (u)-[canManage:CAN_MANAGE]->(t)
WITH t,
  count(DISTINCT tech) as technologyCount,
  count(DISTINCT sys) as systemCount,
  count(DISTINCT usedTech) as usedTechnologyCount,
  count(DISTINCT u) as memberCount,
  collect(DISTINCT {
    name: tech.name,
    type: tech.type,
    timeCategory: stewardApproval.time
  }) as stewardedTechnologies,
  collect(DISTINCT {
    name: sys.name,
    businessCriticality: sys.businessCriticality,
    environment: sys.environment
  }) as systems,
  collect(DISTINCT {
    name: u.name,
    email: u.email,
    isManager: canManage IS NOT NULL
  }) as members
RETURN {
  name: t.name,
  email: t.email,
  responsibilityArea: t.responsibilityArea,
  technologyCount: toInteger(technologyCount),
  systemCount: toInteger(systemCount),
  usedTechnologyCount: toInteger(usedTechnologyCount),
  memberCount: toInteger(memberCount),
  stewardedTechnologies: stewardedTechnologies,
  systems: systems,
  members: members
} as team
