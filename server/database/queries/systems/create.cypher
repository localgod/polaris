MERGE (team:Team {name: $ownerTeam})
CREATE (s:System {
  name: $name,
  domain: $domain,
  businessCriticality: $businessCriticality,
  environment: $environment
})
CREATE (team)-[:OWNS]->(s)

WITH s, team, $repositories AS repos
FOREACH (repo IN CASE WHEN size(repos) > 0 THEN repos ELSE [] END |
  MERGE (r:Repository {url: repo.url})
  SET r.name = repo.name,
      r.createdAt = COALESCE(r.createdAt, datetime()),
      r.updatedAt = datetime(),
      r.lastSbomScanAt = null
  MERGE (s)-[rel1:HAS_SOURCE_IN]->(r)
    SET rel1.addedAt = COALESCE(rel1.addedAt, datetime())
  MERGE (team)-[rel2:MAINTAINS]->(r)
    SET rel2.since = COALESCE(rel2.since, datetime())
)

WITH s
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'CREATE',
  entityType: 'System',
  entityId: s.name,
  entityLabel: s.name,
  changedFields: ['name', 'domain', 'businessCriticality', 'environment'],
  source: 'API',
  userId: $userId
})
CREATE (a)-[:AUDITS]->(s)

RETURN s.name as name
