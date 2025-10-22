# Schema Tests

This directory contains tests for database schema functionality, including migrations and approval policies.

## Test Files

### Migration Tests
- **migration-runner.feature** - Gherkin scenarios for database migration functionality
- **migration-runner.spec.ts** - Implementation of migration tests

### Approval Policy Tests (Proposed Features)

These tests define the requirements for team-specific and version-specific technology approval policies. They are currently implemented as placeholder tests that will be fully functional after the schema migration is applied.

#### Team-Specific Technology Approvals
- **team-technology-approvals.feature** - Gherkin scenarios for team-level approval policies
- **team-technology-approvals.spec.ts** - Test implementation

**Key Scenarios:**
- Different teams approve the same technology with different statuses
- Team deprecates technology while another keeps it approved
- Track approval metadata (who, when, why)
- Find technologies with conflicting approvals across teams
- Default to "restricted" when no approval exists

#### Version-Specific Approvals
- **version-specific-approvals.feature** - Gherkin scenarios for version-level approval policies
- **version-specific-approvals.spec.ts** - Test implementation

**Key Scenarios:**
- Team approves specific versions only (e.g., Java 17 approved, Java 8 deprecated)
- Different teams approve different versions of same technology
- Set EOL dates for deprecated versions
- Find systems using deprecated versions
- Version-specific approval overrides technology-level approval
- Track migration paths from deprecated to approved versions

#### Approval Resolution Logic
- **approval-resolution.feature** - Gherkin scenarios for approval resolution algorithm
- **approval-resolution.spec.ts** - Test implementation

**Key Scenarios:**
- Version-specific approval takes precedence over technology-level
- Technology-level approval applies when no version-specific exists
- Default to "restricted" when no approval found
- Version constraint evaluation (>=17, ^18.0.0, etc.)
- Version-specific override of version constraints
- Resolution includes metadata (EOL dates, migration targets, notes)

## Resolution Priority

When checking if a technology/version is approved for a team:

1. **Version-Specific Approval** (highest priority)
   - Check: `(Team)-[:APPROVES]->(Version)`
   - If found, use this status

2. **Technology-Level Approval** (fallback)
   - Check: `(Team)-[:APPROVES]->(Technology)`
   - Evaluate `versionConstraint` if present
   - If constraint satisfied, use this status

3. **Default to "restricted"** (no approval found)
   - No approval relationship exists
   - Return "restricted" status

## Running Tests

```bash
# Run all schema tests
npm test test/schema

# Run specific test file
npm test test/schema/team-technology-approvals.spec.ts

# Run with coverage
npm run test:coverage
```

## Implementation Status

### ✅ Implemented
- Migration runner tests (fully functional)

### 🚧 Pending Schema Migration
- Team-specific technology approvals
- Version-specific approvals
- Approval resolution logic

These tests are currently placeholders that skip when Neo4j is not available. They will become fully functional after applying the schema migration described in:
- `docs/SCHEMA_ENHANCEMENT_TEAM_SPECIFIC_APPROVALS.md`
- `docs/VERSION_SPECIFIC_APPROVALS_SUMMARY.md`

## Example Queries

### Check Team Approval for Technology
```cypher
MATCH (team:Team {name: "Backend Team"})
MATCH (tech:Technology {name: "Java"})
OPTIONAL MATCH (team)-[a:APPROVES]->(tech)
RETURN COALESCE(a.status, "restricted") as effectiveStatus
```

### Check Team Approval for Specific Version
```cypher
MATCH (team:Team {name: "Backend Team"})
MATCH (tech:Technology {name: "Java"})
MATCH (v:Version {version: "17"})-[:OF_TECHNOLOGY]->(tech)
OPTIONAL MATCH (team)-[va:APPROVES]->(v)
OPTIONAL MATCH (team)-[ta:APPROVES]->(tech)
RETURN COALESCE(va.status, ta.status, "restricted") as effectiveStatus
```

### Find Systems Using Deprecated Versions
```cypher
MATCH (team:Team)-[:OWNS]->(sys:System)
MATCH (sys)-[:USES]->(comp:Component)-[:IS_VERSION_OF]->(tech:Technology)
MATCH (v:Version {version: comp.version})-[:OF_TECHNOLOGY]->(tech)
MATCH (team)-[a:APPROVES]->(v)
WHERE a.status = "deprecated"
RETURN team.name, sys.name, tech.name, v.version, a.eolDate, a.migrationTarget
ORDER BY a.eolDate
```

## Contributing

When adding new schema features:

1. Create a `.feature` file with Gherkin scenarios
2. Create a corresponding `.spec.ts` file with test implementation
3. Follow the existing pattern for Neo4j connection and cleanup
4. Add graceful skipping when Neo4j is not available
5. Update this README with the new test information
