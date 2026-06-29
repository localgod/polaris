MATCH (s:System {name: $name})
RETURN s {
  .domain, .businessCriticality, .environment, .description,
  ownerTeam: [(s)<-[:OWNS]-(t:Team) | t.name][0]
} AS props
