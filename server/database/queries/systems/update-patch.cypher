MATCH (s:System {name: $name})
SET {{SET_CLAUSES}}
RETURN s {
  .*,
  ownerTeam: [(s)<-[:OWNS]-(t:Team) | t.name][0]
} AS system
