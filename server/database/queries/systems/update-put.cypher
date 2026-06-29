MATCH (s:System {name: $name})
MATCH (team:Team {name: $ownerTeam})

OPTIONAL MATCH (s)<-[oldOwns:OWNS]-(:Team)
DELETE oldOwns

SET s.domain = $domain,
    s.businessCriticality = $businessCriticality,
    s.environment = $environment,
    s.description = $description

MERGE (team)-[:OWNS]->(s)

WITH s, team
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'UPDATE',
  entityType: 'System',
  entityId: s.name,
  entityLabel: s.name,
  changedFields: ['domain', 'ownerTeam', 'businessCriticality', 'environment', 'description'],
  changes: $changes,
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
})
CREATE (a)-[:AUDITS]->(s)

RETURN s {
  .*,
  ownerTeam: team.name
} AS system
