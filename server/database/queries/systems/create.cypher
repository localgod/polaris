MERGE (team:Team {name: $ownerTeam})
CREATE (s:System {
  name: $name,
  domain: $domain,
  businessCriticality: $businessCriticality,
  environment: $environment,
  sourceCodeType: $sourceCodeType,
  hasSourceAccess: $hasSourceAccess
})
CREATE (team)-[:OWNS]->(s)

WITH s, team, $repositories AS repos
FOREACH (repo IN CASE WHEN size(repos) > 0 THEN repos ELSE [] END |
  MERGE (r:Repository {url: repo.url})
  SET r.scmType = repo.scmType,
      r.name = repo.name,
      r.isPublic = repo.isPublic,
      r.requiresAuth = repo.requiresAuth,
      r.createdAt = COALESCE(r.createdAt, datetime()),
      r.lastSyncedAt = datetime()
  MERGE (s)-[rel1:HAS_SOURCE_IN]->(r)
    SET rel1.addedAt = COALESCE(rel1.addedAt, datetime())
  MERGE (team)-[rel2:MAINTAINS]->(r)
    SET rel2.since = COALESCE(rel2.since, datetime())
)

RETURN s.name as name
