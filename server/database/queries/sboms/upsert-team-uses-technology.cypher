// Upsert (Team)-[:USES]->(Technology) edges derived from a single system.
//
// Called after each SBOM ingestion to keep team→technology usage current.
// Scoped to $systemName so only the affected system's ownership chain is
// re-evaluated — avoids a full-graph scan on every SBOM submission.
//
// WITH DISTINCT collapses the intermediate row set from O(components) to
// O(distinct technologies) before the MERGE. count(DISTINCT sys) was always
// 1 here (query is scoped to a single system), so it is replaced with a literal.
MATCH (team:Team)-[:OWNS]->(sys:System {name: $systemName})
MATCH (sys)-[:USES]->(:Component)-[:IS_VERSION_OF]->(tech:Technology)
WITH DISTINCT team, tech
WITH team, tech, 1 AS systemCount, datetime() AS now
MERGE (team)-[u:USES]->(tech)
ON CREATE SET
  u.firstUsed    = now,
  u.lastVerified = now,
  u.systemCount  = systemCount
ON MATCH SET
  u.lastVerified = now,
  u.systemCount  = systemCount
