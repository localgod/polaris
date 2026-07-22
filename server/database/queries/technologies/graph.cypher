// Impact/blast-radius graph: for every system using this technology, resolve
// the system's owning team and that team's own TIME approval for the
// technology (never an unrelated approving team's).
//
// Returns zero rows when the technology does not exist. Returns a single
// row with systemName = null when the technology exists but no system uses
// it (same not-found-vs-empty sentinel convention as systems/graph.cypher).
MATCH (tech:Technology {name: $name})
OPTIONAL MATCH (sys:System)-[:USES]->(comp:Component)-[:IS_VERSION_OF]->(tech)
WITH tech, sys, collect(DISTINCT comp.version) AS versions

// Pin exactly one owning team per system deterministically, same trick
// find-by-name.cypher uses to pin the steward team (ORDER BY immediately
// before collect() -- Cypher's collect() has no guaranteed order otherwise).
OPTIONAL MATCH (owningTeam:Team)-[:OWNS]->(sys)
WITH tech, sys, versions, owningTeam
ORDER BY owningTeam.name
WITH tech, sys, versions, collect(owningTeam)[0] AS team

// Resolve the OWNING team's own APPROVES edge to this technology.
// Environment-specific approval takes precedence over a blanket
// (environment IS NULL) approval -- mirrors the precedence already
// established in compliance/find-violations.cypher, so this graph agrees
// with the violations page about which systems are "approved".
OPTIONAL MATCH (team)-[envA:APPROVES]->(tech)
  WHERE sys.environment IS NOT NULL AND envA.environment = sys.environment
OPTIONAL MATCH (team)-[blankA:APPROVES]->(tech)
  WHERE blankA.environment IS NULL
WITH tech, sys, versions, team,
     head(collect(DISTINCT envA)) AS envApproval,
     head(collect(DISTINCT blankA)) AS blankApproval
WITH tech, sys, versions, team, coalesce(envApproval, blankApproval) AS approval

RETURN
  sys.name AS systemName,
  team.name AS ownerTeamName,
  sys.environment AS environment,
  approval IS NOT NULL AS approved,
  approval.time AS time,
  [v IN versions WHERE v IS NOT NULL | v] AS versions
ORDER BY sys.name
