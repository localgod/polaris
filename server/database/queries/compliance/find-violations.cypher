// Find teams using technologies without approval or with eliminate status,
// resolving environment-specific approvals per system.
//
// For each (team, technology) pair, collect the systems that use the technology
// and determine the most specific approval for each system's environment.
// A violation exists when at least one system's resolved approval is absent or 'eliminate'.
// Optional filters:
//   $directOnly (boolean) — restrict to systems that use the technology via a direct dep
//   $depScope   (string)  — restrict to systems that use the technology via a dep with this scope
MATCH (team:Team)-[u:USES]->(tech:Technology)

// Collect systems that use this technology via this team's ownership
OPTIONAL MATCH (team)-[:OWNS]->(sys:System)-[cu:USES]->(comp:Component)-[:IS_VERSION_OF]->(tech)
  WHERE ($directOnly IS NULL OR $directOnly = false OR cu.isDirect = true)
    AND ($depScope IS NULL OR cu.scope = $depScope)
WITH team, tech, u,
     collect(DISTINCT CASE WHEN sys IS NOT NULL THEN {name: sys.name, environment: sys.environment} END) AS systemInfos
WHERE size(systemInfos) > 0

// Resolve approval per system via explicit OPTIONAL MATCH so the planner can inspect costs.
// UNWIND to one row per system, look up approvals, then re-collect.
UNWIND systemInfos AS si

// Environment-specific approval takes precedence
OPTIONAL MATCH (team)-[envA:APPROVES]->(tech)
  WHERE si.environment IS NOT NULL AND envA.environment = si.environment
// Blanket approval (no environment set) as fallback
OPTIONAL MATCH (team)-[blankA:APPROVES]->(tech)
  WHERE blankA.environment IS NULL
WITH team, tech, u, si,
     head(collect(DISTINCT envA.time)) AS envTime,
     head(collect(DISTINCT blankA.time)) AS blankTime
WITH team, tech, u,
     collect({
       name: si.name,
       environment: si.environment,
       resolvedTime: coalesce(envTime, blankTime)
     }) AS systemApprovals

// A violation exists when at least one system has no approval or an 'eliminate' approval
WITH team, tech, u, systemApprovals,
     [sa IN systemApprovals WHERE sa.resolvedTime IS NULL OR sa.resolvedTime = 'eliminate' | sa] AS violatingSystems
WHERE size(violatingSystems) > 0

// Use the blanket approval for top-level notes/migrationTarget display (best-effort)
OPTIONAL MATCH (team)-[blanket:APPROVES]->(tech)
  WHERE blanket.environment IS NULL
WITH team, tech, u, systemApprovals, violatingSystems, blanket,
     [sa IN systemApprovals | sa.name] AS systems

RETURN
  team.name AS team,
  tech.name AS technology,
  tech.type AS type,
  u.systemCount AS systemCount,
  systems,
  CASE
    WHEN blanket IS NULL AND all(sa IN violatingSystems WHERE sa.resolvedTime IS NULL) THEN 'unapproved'
    WHEN blanket.time = 'eliminate' OR any(sa IN violatingSystems WHERE sa.resolvedTime = 'eliminate') THEN 'eliminated'
    ELSE 'unapproved'
  END AS violationType,
  blanket.notes AS notes,
  blanket.migrationTarget AS migrationTarget
ORDER BY u.systemCount DESC, team.name, tech.name
