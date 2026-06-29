// Upsert (Team)-[:USES]->(Technology) edges derived from a single system.
//
// Called after each SBOM ingestion to keep team→technology usage current.
// Scoped to $systemName so only the affected system's ownership chain is
// re-evaluated — avoids a full-graph scan on every SBOM submission.
//
// systemCount reflects the true number of systems in the team currently using
// the technology, computed by traversing all team-owned systems after narrowing
// to the distinct (team, tech) pairs touched by this SBOM.
MATCH (team:Team)-[:OWNS]->(sys:System {name: $systemName})
MATCH (sys)-[:USES]->(:Component)-[:IS_VERSION_OF]->(tech:Technology)
WITH DISTINCT team, tech

MATCH (team)-[:OWNS]->(allSys:System)-[:USES]->(:Component)-[:IS_VERSION_OF]->(tech)
WITH team, tech, count(DISTINCT allSys) AS systemCount, datetime() AS now

MERGE (team)-[u:USES]->(tech)
ON CREATE SET
  u.firstUsed    = now,
  u.lastVerified = now,
  u.systemCount  = systemCount
ON MATCH SET
  u.lastVerified = now,
  u.systemCount  = systemCount
