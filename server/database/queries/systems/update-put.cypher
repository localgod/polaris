MATCH (s:System {name: $name})
MATCH (team:Team {name: $ownerTeam})

OPTIONAL MATCH (s)<-[oldOwns:OWNS]-(:Team)
DELETE oldOwns

SET s.domain = $domain,
    s.businessCriticality = $businessCriticality,
    s.environment = $environment,
    s.description = $description

MERGE (team)-[:OWNS]->(s)

RETURN s {
  .*,
  ownerTeam: team.name
} AS system
