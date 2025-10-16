# Tech Catalog Schema

This document describes the technology catalog schema created by migration `2025-10-16_100000_create_tech_catalog_schema`.

## Related Documentation

- [Database Seeding](SEEDING_GUIDE.md) - Load sample catalog data
- [Pages & Routing](PAGES.md) - UI pages that display this data
- [Schema Management](SCHEMA.md) - Schema directory overview

## Node Types

### Technology

Represents an approved technology in the enterprise tech catalog.

**Properties:**

- `name` (string, unique) - Technology name (e.g., "React", "PostgreSQL")
- `category` (string, indexed) - Type of technology (framework, DB, library, runtime, etc.)
- `vendor` (string) - Technology vendor or maintainer
- `status` (string, indexed) - Approval status (approved/deprecated/experimental)
- `approvedVersionRange` (string) - Approved version range (e.g., ">=16.0.0 <19.0.0")
- `ownerTeam` (string, indexed) - Team responsible for this technology
- `riskLevel` (string, indexed) - Risk assessment (low/medium/high/critical)
- `lastReviewed` (date) - Last review date

**Example:**

```cypher
CREATE (t:Technology {
  name: "React",
  category: "framework",
  vendor: "Meta",
  status: "approved",
  approvedVersionRange: ">=18.0.0 <19.0.0",
  ownerTeam: "Frontend Platform",
  riskLevel: "low",
  lastReviewed: datetime()
})
```

### Version

Represents a specific version of a Technology. Useful for version-specific policies and SBOM matching.

**Properties:**

- `technologyName` (string, composite unique with version) - Reference to Technology name
- `version` (string, composite unique with technologyName) - Specific version number
- `releaseDate` (date, indexed) - When this version was released
- `eolDate` (date, indexed) - End-of-life date
- `approved` (boolean, indexed) - Whether this specific version is approved
- `cvssScore` (float) - Security score if applicable
- `notes` (string) - Additional notes about this version

**Example:**

```cypher
CREATE (v:Version {
  technologyName: "React",
  version: "18.2.0",
  releaseDate: date("2023-06-14"),
  eolDate: date("2025-12-31"),
  approved: true,
  cvssScore: 0.0,
  notes: "Stable LTS version"
})
```

### Component

Represents an SBOM entry (a dependency actually used in a system).

**Properties:**

- `name` (string, composite unique) - Component name
- `version` (string, composite unique) - Component version
- `packageManager` (string, composite unique, indexed) - Package manager (npm/maven/pip/etc.)
- `license` (string, indexed) - Software license
- `sourceRepo` (string) - Source repository URL
- `importPath` (string) - Import path or package identifier
- `hash` (string, indexed) - Package hash for integrity verification

**Example:**

```cypher
CREATE (c:Component {
  name: "react",
  version: "18.2.0",
  packageManager: "npm",
  license: "MIT",
  sourceRepo: "https://github.com/facebook/react",
  importPath: "react",
  hash: "sha256:abc123..."
})
```

### System

Represents a deployable unit, service, or application whose SBOM you're checking.

**Properties:**

- `name` (string, unique) - System/application name
- `domain` (string, indexed) - Business domain
- `ownerTeam` (string, indexed) - Team responsible for this system
- `businessCriticality` (string, indexed) - Business impact level (low/medium/high/critical)
- `environment` (string, indexed) - Deployment environment (dev/test/prod)

**Example:**

```cypher
CREATE (s:System {
  name: "customer-portal",
  domain: "customer-experience",
  ownerTeam: "Customer Platform",
  businessCriticality: "high",
  environment: "prod"
})
```

### Policy

Represents governance or compliance rules.

**Properties:**

- `name` (string, unique) - Policy name
- `description` (string) - Detailed policy description
- `ruleType` (string, indexed) - Type of rule (approval/security/compliance/etc.)
- `severity` (string, indexed) - Severity level (info/warning/error/critical)

**Example:**

```cypher
CREATE (p:Policy {
  name: "Frontend Framework Approval",
  description: "All frontend frameworks must be approved by the Frontend Platform team",
  ruleType: "approval",
  severity: "error"
})
```

### Team

Represents organizational ownership of technologies and systems.

**Properties:**

- `name` (string, unique) - Team name
- `email` (string, indexed) - Team contact email
- `responsibilityArea` (string, indexed) - Area of responsibility

**Example:**

```cypher
CREATE (t:Team {
  name: "Frontend Platform",
  email: "frontend-platform@company.com",
  responsibilityArea: "frontend"
})
```

## Common Relationships

While this migration only creates the node types, here are recommended relationships:

```cypher
// Technology has Versions
(t:Technology)-[:HAS_VERSION]->(v:Version)

// System uses Components
(s:System)-[:USES]->(c:Component)

// Component is a Version of Technology
(c:Component)-[:IS_VERSION_OF]->(t:Technology)

// Team owns Technology
(team:Team)-[:OWNS]->(t:Technology)

// Team owns System
(team:Team)-[:OWNS]->(s:System)

// Policy applies to Technology
(p:Policy)-[:APPLIES_TO]->(t:Technology)

// Policy applies to System
(p:Policy)-[:APPLIES_TO]->(s:System)
```

## Example Queries

### Find all approved technologies

```cypher
MATCH (t:Technology {status: "approved"})
RETURN t.name, t.category, t.ownerTeam
ORDER BY t.category, t.name
```

### Find technologies by risk level

```cypher
MATCH (t:Technology)
WHERE t.riskLevel IN ["high", "critical"]
RETURN t.name, t.riskLevel, t.ownerTeam, t.lastReviewed
ORDER BY t.riskLevel DESC, t.name
```

### Find deprecated technologies

```cypher
MATCH (t:Technology {status: "deprecated"})
RETURN t.name, t.category, t.ownerTeam
```

### Find versions approaching EOL

```cypher
MATCH (v:Version)
WHERE v.eolDate < date() + duration({months: 6})
  AND v.eolDate > date()
RETURN v.technologyName, v.version, v.eolDate
ORDER BY v.eolDate
```

### Find components by package manager

```cypher
MATCH (c:Component {packageManager: "npm"})
RETURN c.name, c.version, c.license
ORDER BY c.name
```

### Find systems by criticality

```cypher
MATCH (s:System)
WHERE s.businessCriticality IN ["high", "critical"]
RETURN s.name, s.domain, s.ownerTeam, s.environment
ORDER BY s.businessCriticality DESC, s.name
```

### Find all policies by severity

```cypher
MATCH (p:Policy)
RETURN p.name, p.ruleType, p.severity
ORDER BY 
  CASE p.severity
    WHEN "critical" THEN 1
    WHEN "error" THEN 2
    WHEN "warning" THEN 3
    WHEN "info" THEN 4
  END,
  p.name
```

### Find teams and their responsibilities

```cypher
MATCH (t:Team)
RETURN t.name, t.email, t.responsibilityArea
ORDER BY t.name
```

## Schema Verification

To verify the schema was created correctly:

```cypher
// List all constraints
SHOW CONSTRAINTS

// List all indexes
SHOW INDEXES

// Count nodes by type
MATCH (t:Technology) RETURN "Technology" as type, count(t) as count
UNION
MATCH (v:Version) RETURN "Version" as type, count(v) as count
UNION
MATCH (c:Component) RETURN "Component" as type, count(c) as count
UNION
MATCH (s:System) RETURN "System" as type, count(s) as count
UNION
MATCH (p:Policy) RETURN "Policy" as type, count(p) as count
UNION
MATCH (t:Team) RETURN "Team" as type, count(t) as count
```

## Next Steps

1. Create a migration for common relationships between these node types
2. Add sample data for testing
3. Create queries for SBOM analysis and compliance checking
4. Implement policy validation logic
5. Add monitoring and alerting for deprecated technologies
