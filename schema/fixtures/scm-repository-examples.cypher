/*
 * Example Queries and Data for SCM Repository Model
 * 
 * This file contains example data creation and queries for working with
 * the SCM repository model.
 */

// ============================================================================
// EXAMPLE DATA CREATION
// ============================================================================

// Create example repositories
CREATE (r1:Repository {
  url: "https://github.com/company/customer-portal",
  scmType: "git",
  name: "customer-portal",
  description: "Customer-facing web portal",
  isPublic: false,
  requiresAuth: true,
  defaultBranch: "main",
  createdAt: datetime(),
  lastSyncedAt: datetime()
});

CREATE (r2:Repository {
  url: "https://github.com/company/customer-portal-api",
  scmType: "git",
  name: "customer-portal-api",
  description: "Backend API for customer portal",
  isPublic: false,
  requiresAuth: true,
  defaultBranch: "main",
  createdAt: datetime(),
  lastSyncedAt: datetime()
});

CREATE (r3:Repository {
  url: "https://svn.company.com/legacy/billing-system",
  scmType: "svn",
  name: "billing-system",
  description: "Legacy billing system",
  isPublic: false,
  requiresAuth: true,
  defaultBranch: "trunk",
  createdAt: datetime(),
  lastSyncedAt: datetime()
});

CREATE (r4:Repository {
  url: "https://github.com/company/ui-components",
  scmType: "git",
  name: "ui-components",
  description: "Shared UI component library",
  isPublic: true,
  requiresAuth: false,
  defaultBranch: "main",
  createdAt: datetime(),
  lastSyncedAt: datetime()
});

// Update existing systems with source code properties
MATCH (s:System {name: "customer-portal"})
SET s.sourceCodeType = "proprietary",
    s.hasSourceAccess = true;

MATCH (s:System {name: "analytics-service"})
SET s.sourceCodeType = "open-source",
    s.hasSourceAccess = true;

MATCH (s:System {name: "payment-gateway"})
SET s.sourceCodeType = "proprietary",
    s.hasSourceAccess = false;

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
RETURN r.url, r.scmType, r.isPublic, rel.addedAt
ORDER BY r.name;

// Find systems with accessible source code
MATCH (s:System {hasSourceAccess: true})-[:HAS_SOURCE_IN]->(r:Repository)
RETURN s.name, s.sourceCodeType, count(r) as repoCount
ORDER BY s.name;

// Find all proprietary systems without source access
MATCH (s:System)
WHERE s.sourceCodeType = "proprietary" AND s.hasSourceAccess = false
RETURN s.name, s.domain, s.businessCriticality
ORDER BY s.businessCriticality DESC;

// Find repositories by SCM type
MATCH (r:Repository {scmType: "git"})
OPTIONAL MATCH (s:System)-[:HAS_SOURCE_IN]->(r)
RETURN r.url, r.name, count(s) as systemCount
ORDER BY systemCount DESC;

// Find public repositories
MATCH (r:Repository {isPublic: true})
OPTIONAL MATCH (s:System)-[:HAS_SOURCE_IN]->(r)
RETURN r.url, r.name, collect(s.name) as systems
ORDER BY r.name;

// Find systems with multiple repositories
MATCH (s:System)-[:HAS_SOURCE_IN]->(r:Repository)
WITH s, count(r) as repoCount, collect(r.url) as repos
WHERE repoCount > 1
RETURN s.name, s.domain, repoCount, repos
ORDER BY repoCount DESC;

// Find repositories requiring authentication
MATCH (r:Repository {requiresAuth: true})
OPTIONAL MATCH (s:System)-[:HAS_SOURCE_IN]->(r)
RETURN r.url, r.scmType, collect(s.name) as systems
ORDER BY r.url;

// Find all repositories maintained by a team
MATCH (t:Team {name: "Frontend Platform"})-[rel:MAINTAINS]->(r:Repository)
OPTIONAL MATCH (s:System)-[:HAS_SOURCE_IN]->(r)
RETURN r.url, r.name, rel.role, collect(DISTINCT s.name) as systems
ORDER BY r.name;

// Find systems with hybrid source code (proprietary + open source)
MATCH (s:System {sourceCodeType: "hybrid"})-[:HAS_SOURCE_IN]->(r:Repository)
RETURN s.name, 
       collect({url: r.url, isPublic: r.isPublic}) as repositories
ORDER BY s.name;

// Find orphaned repositories (no system association)
MATCH (r:Repository)
WHERE NOT (r)<-[:HAS_SOURCE_IN]-(:System)
RETURN r.url, r.name, r.scmType
ORDER BY r.name;

// Find systems and their repositories with team ownership
MATCH (team:Team)-[:OWNS]->(s:System)
OPTIONAL MATCH (s)-[:HAS_SOURCE_IN]->(r:Repository)
OPTIONAL MATCH (team)-[:MAINTAINS]->(r)
RETURN team.name as team,
       s.name as system,
       s.sourceCodeType as sourceType,
       s.hasSourceAccess as hasAccess,
       collect({
         url: r.url,
         scmType: r.scmType,
         teamMaintains: team.name IS NOT NULL
       }) as repositories
ORDER BY team.name, s.name;

// Find all Git repositories with their systems and maintainers
MATCH (r:Repository {scmType: "git"})
OPTIONAL MATCH (s:System)-[:HAS_SOURCE_IN]->(r)
OPTIONAL MATCH (t:Team)-[:MAINTAINS]->(r)
RETURN r.url,
       r.name,
       r.isPublic,
       collect(DISTINCT s.name) as systems,
       collect(DISTINCT t.name) as maintainers
ORDER BY r.name;

// Find systems by source code accessibility
MATCH (s:System)
OPTIONAL MATCH (s)-[:HAS_SOURCE_IN]->(r:Repository)
RETURN s.sourceCodeType as type,
       s.hasSourceAccess as hasAccess,
       count(DISTINCT s) as systemCount,
       count(DISTINCT r) as repoCount
ORDER BY type, hasAccess;

// Find repositories that need authentication but have no maintainer
MATCH (r:Repository {requiresAuth: true})
WHERE NOT (r)<-[:MAINTAINS]-(:Team)
RETURN r.url, r.name, r.scmType
ORDER BY r.name;
