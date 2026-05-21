// Upsert (Team)-[:USES]->(Technology) edges derived from a single system.
//
// Called after each SBOM ingestion to keep team→technology usage current.
// Scoped to $systemName so only the affected system's ownership chain is
// re-evaluated — avoids a full-graph scan on every SBOM submission.
MATCH (team:Team)-[:OWNS]->(sys:System {name: $systemName})
MATCH (sys)-[:USES]->(comp:Component)-[:IS_VERSION_OF]->(tech:Technology)
WITH team, tech,
     count(DISTINCT sys) AS systemCount,
     datetime() AS now
MERGE (team)-[u:USES]->(tech)
ON CREATE SET
  u.firstUsed    = now,
  u.lastVerified = now,
  u.systemCount  = systemCount
ON MATCH SET
  u.lastVerified = now,
  u.systemCount  = systemCount
