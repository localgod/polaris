// Resolves the owning team for a System, used to authorize a waiver
// request for license/version-constraint violations (which are keyed by
// System, not Team directly — compliance violations carry teamName in
// their natural key already and need no lookup).
MATCH (t:Team)-[:OWNS]->(s:System {name: $systemName})
RETURN t.name as teamName
