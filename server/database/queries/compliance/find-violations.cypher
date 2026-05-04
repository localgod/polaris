// Find teams using technologies without approval or with eliminate status,
// resolving environment-specific approvals per system.
//
// For each (team, technology) pair, collect the systems that use the technology
// and determine the most specific approval for each system's environment.
// A violation exists when every system's resolved approval is absent or 'eliminate'.
MATCH (team:Team)-[u:USES]->(tech:Technology)
// Collect systems with their environments
WITH team, tech, u,
     [(team)-[:OWNS]->(sys:System)-[:USES]->(:Component)-[:IS_VERSION_OF]->(tech) | {name: sys.name, environment: sys.environment}] as systemInfos
// For each system, resolve the most specific approval:
//   environment-specific approval takes precedence over blanket (environment IS NULL)
WITH team, tech, u, systemInfos,
     [si IN systemInfos |
       {
         name: si.name,
         environment: si.environment,
         resolvedTime: coalesce(
           // environment-specific approval for this system's environment
           head([(team)-[envA:APPROVES]->(tech) WHERE si.environment IS NOT NULL AND envA.environment = si.environment | envA.time]),
           // blanket approval (environment IS NULL or property absent)
           head([(team)-[blankA:APPROVES]->(tech) WHERE blankA.environment IS NULL | blankA.time])
         )
       }
     ] as systemApprovals
// A violation exists when at least one system has no approval or an 'eliminate' approval
WITH team, tech, u, systemInfos, systemApprovals,
     [sa IN systemApprovals WHERE sa.resolvedTime IS NULL OR sa.resolvedTime = 'eliminate' | sa] as violatingSystems
WHERE size(violatingSystems) > 0
// Use the blanket approval for top-level notes/migrationTarget display (best-effort)
OPTIONAL MATCH (team)-[blanket:APPROVES]->(tech)
  WHERE blanket.environment IS NULL
WITH team, tech, u, systemInfos, violatingSystems, blanket,
     [si IN systemInfos | si.name] as systems
RETURN
  team.name as team,
  tech.name as technology,
  tech.type as type,
  u.systemCount as systemCount,
  systems,
  CASE
    WHEN blanket IS NULL AND all(sa IN violatingSystems WHERE sa.resolvedTime IS NULL) THEN 'unapproved'
    WHEN blanket.time = 'eliminate' OR any(sa IN violatingSystems WHERE sa.resolvedTime = 'eliminate') THEN 'eliminated'
    ELSE 'unapproved'
  END as violationType,
  blanket.notes as notes,
  blanket.migrationTarget as migrationTarget
ORDER BY u.systemCount DESC, team.name, tech.name
