/*
 * Example Queries and Data for SCM Repository Model
 * 
 * This file contains example data creation and queries for working with
 * the SCM repository model.
 * 
 * NOTE: Updated for simplified schema (removed scmType, description, isPublic, 
 * requiresAuth, defaultBranch, sourceCodeType, hasSourceAccess)
 */

// ============================================================================
// EXAMPLE DATA CREATION
// ============================================================================

// Create example repositories
CREATE (r1:Repository {
  url: "https://github.com/company/customer-portal",
  name: "customer-portal",
  createdAt: datetime(),
  updatedAt: datetime(),
  lastSbomScanAt: null
});

CREATE (r2:Repository {
  url: "https://github.com/company/customer-portal-api",
  name: "customer-portal-api",
  createdAt: datetime(),
  updatedAt: datetime(),
  lastSbomScanAt: null
});

CREATE (r3:Repository {
  url: "https://svn.company.com/legacy/billing-system",
  name: "billing-system",
  createdAt: datetime(),
  updatedAt: datetime(),
  lastSbomScanAt: null
});

CREATE (r4:Repository {
  url: "https://github.com/company/ui-components",
  name: "ui-components",
  createdAt: datetime(),
  updatedAt: datetime(),
  lastSbomScanAt: null
});

// Create HAS_SOURCE_IN relationships
MATCH (s:System {name: "customer-portal"})
MATCH (r:Repository {url: "https://github.com/company/customer-portal"})
CREATE (s)-[:HAS_SOURCE_IN {
  addedAt: datetime()
}]->(r);

MATCH (s:System {name: "customer-portal"})
MATCH (r:Repository {url: "https://github.com/company/customer-portal-api"})
CREATE (s)-[:HAS_SOURCE_IN {
  addedAt: datetime()
}]->(r);

// Create MAINTAINS relationships
MATCH (t:Team {name: "Frontend Platform"})
MATCH (r:Repository {url: "https://github.com/company/customer-portal"})
CREATE (t)-[:MAINTAINS {
  since: datetime()
}]->(r);

MATCH (t:Team {name: "Backend Platform"})
MATCH (r:Repository {url: "https://github.com/company/customer-portal-api"})
CREATE (t)-[:MAINTAINS {
  since: datetime()
}]->(r);

// ============================================================================
// EXAMPLE QUERIES
// ============================================================================

// Find all repositories for a system
MATCH (s:System {name: "customer-portal"})-[rel:HAS_SOURCE_IN]->(r:Repository)
RETURN r.url, r.name, r.lastSbomScanAt, rel.addedAt
ORDER BY r.name;

// Find all repositories with their system counts
MATCH (r:Repository)
OPTIONAL MATCH (s:System)-[:HAS_SOURCE_IN]->(r)
RETURN r.url, r.name, count(s) as systemCount
ORDER BY systemCount DESC;

// Find repositories that have never been scanned
MATCH (r:Repository)
WHERE r.lastSbomScanAt IS NULL
OPTIONAL MATCH (s:System)-[:HAS_SOURCE_IN]->(r)
RETURN r.url, r.name, collect(s.name) as systems
ORDER BY r.name;

// Find repositories with recent SBOM scans
MATCH (r:Repository)
WHERE r.lastSbomScanAt IS NOT NULL
OPTIONAL MATCH (s:System)-[:HAS_SOURCE_IN]->(r)
RETURN r.url, r.name, r.lastSbomScanAt, collect(s.name) as systems
ORDER BY r.lastSbomScanAt DESC;

// Find systems with multiple repositories
MATCH (s:System)-[:HAS_SOURCE_IN]->(r:Repository)
WITH s, count(r) as repoCount, collect(r.url) as repos
WHERE repoCount > 1
RETURN s.name, s.domain, repoCount, repos
ORDER BY repoCount DESC;

// Find all repositories maintained by a team
MATCH (t:Team {name: "Frontend Platform"})-[rel:MAINTAINS]->(r:Repository)
OPTIONAL MATCH (s:System)-[:HAS_SOURCE_IN]->(r)
RETURN r.url, r.name, collect(DISTINCT s.name) as systems
ORDER BY r.name;

// Find orphaned repositories (no system association)
MATCH (r:Repository)
WHERE NOT (r)<-[:HAS_SOURCE_IN]-(:System)
RETURN r.url, r.name
ORDER BY r.name;

// Find systems and their repositories with team ownership
MATCH (team:Team)-[:OWNS]->(s:System)
OPTIONAL MATCH (s)-[:HAS_SOURCE_IN]->(r:Repository)
OPTIONAL MATCH (team)-[:MAINTAINS]->(r)
RETURN team.name as team,
       s.name as system,
       collect({
         url: r.url,
         name: r.name,
         lastSbomScanAt: r.lastSbomScanAt,
         teamMaintains: team.name IS NOT NULL
       }) as repositories
ORDER BY team.name, s.name;

// Find all repositories with their systems and maintainers
MATCH (r:Repository)
OPTIONAL MATCH (s:System)-[:HAS_SOURCE_IN]->(r)
OPTIONAL MATCH (t:Team)-[:MAINTAINS]->(r)
RETURN r.url,
       r.name,
       r.lastSbomScanAt,
       collect(DISTINCT s.name) as systems,
       collect(DISTINCT t.name) as maintainers
ORDER BY r.name;

// Find repositories with no maintainer
MATCH (r:Repository)
WHERE NOT (r)<-[:MAINTAINS]-(:Team)
RETURN r.url, r.name
ORDER BY r.name;
