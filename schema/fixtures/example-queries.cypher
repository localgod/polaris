/*
 * Example Queries for Tech Catalog
 * 
 * These queries demonstrate how to work with the seeded fixture data.
 * Run these in Neo4j Browser or via the neo4j-driver.
 */

// ============================================================================
// BASIC NODE QUERIES
// ============================================================================

// List all teams
MATCH (t:Team)
RETURN t.name, t.email, t.responsibilityArea
ORDER BY t.name;

// List all technologies with their owner teams
MATCH (tech:Technology)
OPTIONAL MATCH (team:Team)-[:OWNS]->(tech)
RETURN tech.name, tech.category, team.name as ownerTeam
ORDER BY tech.category, tech.name;

// List all systems by criticality
MATCH (s:System)
RETURN s.name, s.domain, s.businessCriticality, s.environment
ORDER BY 
  CASE s.businessCriticality
    WHEN "critical" THEN 1
    WHEN "high" THEN 2
    WHEN "medium" THEN 3
    WHEN "low" THEN 4
  END,
  s.name;

// ============================================================================
// RELATIONSHIP QUERIES
// ============================================================================

// Show what technologies each team owns
MATCH (team:Team)-[:OWNS]->(tech:Technology)
RETURN team.name as Team, 
       collect(tech.name) as Technologies
ORDER BY team.name;

// Show what systems each team owns
MATCH (team:Team)-[:OWNS]->(sys:System)
RETURN team.name as Team,
       collect(sys.name) as Systems
ORDER BY team.name;

// Show components used by each system
MATCH (sys:System)-[:USES]->(comp:Component)
RETURN sys.name as System,
       sys.businessCriticality as Criticality,
       collect(comp.name + "@" + comp.version) as Components
ORDER BY sys.businessCriticality DESC, sys.name;

// Show which technologies are used in which systems (via components)
MATCH (sys:System)-[:USES]->(comp:Component)-[:IS_VERSION_OF]->(tech:Technology)
RETURN sys.name as System,
       collect(DISTINCT tech.name) as Technologies
ORDER BY sys.name;

// ============================================================================
// COMPLIANCE AND GOVERNANCE QUERIES
// ============================================================================

// Show policies and the technologies they apply to
MATCH (pol:Policy)-[:APPLIES_TO]->(tech:Technology)
RETURN pol.name as Policy,
       pol.severity as Severity,
       pol.ruleType as Type,
       collect(tech.name) as AppliesTo
ORDER BY 
  CASE pol.severity
    WHEN "critical" THEN 1
    WHEN "error" THEN 2
    WHEN "warning" THEN 3
    WHEN "info" THEN 4
  END,
  pol.name;

// Find systems using deprecated technologies
MATCH (sys:System)-[:USES]->(comp:Component)-[:IS_VERSION_OF]->(tech:Technology {status: "deprecated"})
RETURN sys.name as System,
       sys.businessCriticality as Criticality,
       tech.name as DeprecatedTechnology,
       comp.version as Version
ORDER BY sys.businessCriticality DESC;

// Find technologies with 'eliminate' TIME status and where they're used
MATCH (team:Team)-[a:APPROVES]->(tech:Technology)
WHERE a.time = 'eliminate'
OPTIONAL MATCH (sys:System)-[:USES]->(comp:Component)-[:IS_VERSION_OF]->(tech)
RETURN tech.name as Technology,
       team.name as Team,
       collect(DISTINCT sys.name) as UsedInSystems
ORDER BY tech.name;

// ============================================================================
// VERSION AND EOL QUERIES
// ============================================================================

// Show all versions with their approval status
MATCH (tech:Technology)-[:HAS_VERSION]->(v:Version)
RETURN tech.name as Technology,
       v.version as Version,
       v.approved as Approved,
       v.releaseDate as Released,
       v.eolDate as EOL
ORDER BY tech.name, v.releaseDate DESC;

// Find versions approaching EOL (within 6 months)
MATCH (tech:Technology)-[:HAS_VERSION]->(v:Version)
WHERE v.eolDate < date() + duration({months: 6})
  AND v.eolDate > date()
RETURN tech.name as Technology,
       v.version as Version,
       v.eolDate as EOL,
       duration.between(date(), v.eolDate).months as MonthsUntilEOL
ORDER BY v.eolDate;

// ============================================================================
// SBOM AND DEPENDENCY ANALYSIS
// ============================================================================

// Show complete SBOM for a system
MATCH (sys:System {name: "customer-portal"})-[:USES]->(comp:Component)
OPTIONAL MATCH (comp)-[:IS_VERSION_OF]->(tech:Technology)
RETURN sys.name as System,
       comp.name as Component,
       comp.version as Version,
       comp.packageManager as PackageManager,
       comp.license as License,
       tech.name as Technology
ORDER BY comp.name;

// Find all systems using a specific component
MATCH (sys:System)-[:USES]->(comp:Component {name: "typescript"})
RETURN sys.name as System,
       sys.businessCriticality as Criticality,
       comp.version as TypeScriptVersion
ORDER BY sys.businessCriticality DESC;

// Find components by license type
MATCH (comp:Component)
RETURN comp.license as License,
       count(comp) as ComponentCount,
       collect(comp.name) as Components
ORDER BY ComponentCount DESC;

// ============================================================================
// TEAM OWNERSHIP AND RESPONSIBILITY
// ============================================================================

// Show complete ownership map for a team
MATCH (team:Team {name: "Frontend Platform"})
OPTIONAL MATCH (team)-[:OWNS]->(tech:Technology)
OPTIONAL MATCH (team)-[:OWNS]->(sys:System)
RETURN team.name as Team,
       team.responsibilityArea as Area,
       collect(DISTINCT tech.name) as Technologies,
       collect(DISTINCT sys.name) as Systems;

// Find technologies without an owner team
MATCH (tech:Technology)
WHERE NOT EXISTS {
  MATCH (team:Team)-[:OWNS]->(tech)
}
RETURN tech.name as Technology,
       tech.category as Category;

// ============================================================================
// CROSS-CUTTING ANALYSIS
// ============================================================================

// Technology adoption across systems
MATCH (tech:Technology)<-[:IS_VERSION_OF]-(comp:Component)<-[:USES]-(sys:System)
RETURN tech.name as Technology,
       tech.category as Category,
       count(DISTINCT sys) as SystemCount,
       collect(DISTINCT sys.name) as Systems
ORDER BY SystemCount DESC, tech.name;

// Find systems with the most dependencies
MATCH (sys:System)-[:USES]->(comp:Component)
RETURN sys.name as System,
       sys.businessCriticality as Criticality,
       count(comp) as DependencyCount
ORDER BY DependencyCount DESC;

// Technology stack by business criticality
MATCH (sys:System)-[:USES]->(comp:Component)-[:IS_VERSION_OF]->(tech:Technology)
WHERE sys.businessCriticality IN ["critical", "high"]
RETURN sys.businessCriticality as Criticality,
       count(DISTINCT sys) as SystemCount,
       count(DISTINCT tech) as TechnologyCount,
       collect(DISTINCT tech.name) as Technologies
ORDER BY Criticality;

// ============================================================================
// GRAPH VISUALIZATION QUERIES
// ============================================================================

// Visualize a system's complete dependency graph
MATCH path = (sys:System {name: "customer-portal"})-[:USES]->(comp:Component)-[:IS_VERSION_OF]->(tech:Technology)
OPTIONAL MATCH (team:Team)-[:OWNS]->(sys)
OPTIONAL MATCH (pol:Policy)-[:APPLIES_TO]->(tech)
RETURN path;

// Visualize team ownership
MATCH path = (team:Team)-[:OWNS]->(node)
WHERE node:Technology OR node:System
RETURN path;

// Visualize policy coverage
MATCH path = (pol:Policy)-[:APPLIES_TO]->(tech:Technology)
OPTIONAL MATCH (tech)-[:HAS_VERSION]->(v:Version)
RETURN path;
