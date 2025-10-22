---
title: Team Approvals
description: Team-specific technology approval policies
---

Polaris supports flexible, team-specific technology approval policies using Gartner's TIME framework.

## Overview

Each team can independently decide which technologies to use, with different TIME categories for the same technology.

### Key Features

- **Per-Team Policies**: Each team has independent approval decisions
- **Version-Specific Approvals**: Approve or restrict specific versions
- **Approval Hierarchy**: Version-specific > Technology-level > Default (eliminate)
- **Rich Metadata**: EOL dates, migration targets, version constraints, approval history

## Ownership vs Approval

### Ownership (Governance)

**One team owns each technology** and is responsible for:
- Setting approved version ranges
- Evaluating security vulnerabilities
- Maintaining documentation and best practices
- Assessing risk levels
- Reviewing and updating technology standards

**Example:**
- Frontend Platform **owns** TypeScript
- Sets `approvedVersionRange: ">=5.0.0 <6.0.0"`
- Maintains TypeScript coding standards

### Approval (Usage)

**Multiple teams can approve the same technology** for their use:
- Each team independently decides whether to use the technology
- Teams can have different TIME categories for the same technology
- Teams can set additional version constraints
- Teams can have different migration timelines

**Example:**
- Frontend Platform **approves** TypeScript (time: invest)
- Backend Platform **approves** TypeScript (time: invest)
- Data Platform might **not approve** TypeScript (no approval = eliminate)

## Real-World Scenario

### Technology: Java

**Ownership:**
- Backend Platform **owns** Java
- Sets `approvedVersionRange: ">=17 <22"`
- Maintains Java coding standards
- Evaluates security patches

**Approvals:**
- Backend Platform **approves** Java (time: invest, versionConstraint: ">=17")
- Data Platform **approves** Java (time: tolerate, versionConstraint: ">=11", notes: "Legacy batch jobs only")
- Frontend Platform **does not approve** Java (no relationship = eliminate, use TypeScript instead)

## Approval Properties

Each approval includes:

- `time` - TIME category (invest, migrate, tolerate, eliminate)
- `approvedAt` - Approval timestamp
- `deprecatedAt` - Deprecation timestamp (for migrate/tolerate)
- `eolDate` - End-of-life date (for migrate/tolerate)
- `migrationTarget` - Target technology for migration
- `notes` - Additional context
- `approvedBy` - Approver name
- `versionConstraint` - Version constraint (e.g., ">=18")

## Approval Hierarchy

When checking if a team can use a technology, the system follows this hierarchy:

1. **Version-Specific Approval** (highest priority)
   - Check if team has approved this specific version
   - Example: React 18.2.0 approved by Frontend Platform

2. **Technology-Level Approval**
   - Check if team has approved the technology
   - May include version constraint
   - Example: Node.js approved with constraint ">=18"

3. **Default (Eliminate)**
   - No approval found
   - Technology is not approved for use by this team

## Examples

### Example 1: Multiple Teams, Same Technology

**TypeScript:**
- **Owner**: Frontend Platform (governance)
- **Approvals**:
  - Frontend Platform: time=invest, notes="Required for all new frontend projects"
  - Backend Platform: time=invest, notes="Required for all backend services"

### Example 2: Migration Planning

**Angular:**
- **Owner**: Frontend Platform
- **Approval**:
  - Frontend Platform: time=migrate, eolDate="2025-12-31", migrationTarget="React", notes="Migrating to React for better ecosystem support"

### Example 3: Version-Specific Approval

**React:**
- **Technology-Level**: Frontend Platform approves React (time=invest)
- **Version-Specific**: Frontend Platform approves React 18.2.0 (time=invest, notes="Current stable version")

When checking React 18.2.0:
- Returns version-specific approval (highest priority)

When checking React 18.3.1:
- Returns technology-level approval (no version-specific approval)

## API Usage

### Check Approval Status

```bash
# Check technology-level approval
curl 'http://localhost:3000/api/approvals/check?team=Frontend+Platform&technology=React'

# Check version-specific approval
curl 'http://localhost:3000/api/approvals/check?team=Frontend+Platform&technology=React&version=18.2.0'
```

### Get All Team Approvals

```bash
curl 'http://localhost:3000/api/teams/Frontend+Platform/approvals'
```

### Get Technology with All Approvals

```bash
curl 'http://localhost:3000/api/technologies/TypeScript'
```

## Cypher Queries

### Find All Approvals for a Team

```cypher
MATCH (team:Team {name: "Frontend Platform"})-[a:APPROVES]->(target)
RETURN 
  labels(target)[0] as targetType,
  target.name as name,
  CASE WHEN 'Version' IN labels(target) THEN target.version ELSE null END as version,
  a.time as timeCategory,
  a.notes as notes
ORDER BY a.time, name
```

### Find Technologies to Migrate

```cypher
MATCH (team:Team)-[a:APPROVES {time: "migrate"}]->(tech:Technology)
RETURN 
  team.name as team,
  tech.name as technology,
  a.eolDate as eolDate,
  a.migrationTarget as migrationTarget
ORDER BY a.eolDate
```

### Check Approval Hierarchy

```cypher
MATCH (team:Team {name: "Frontend Platform"})
MATCH (tech:Technology {name: "React"})
OPTIONAL MATCH (tech)-[:HAS_VERSION]->(v:Version {version: "18.2.0"})
OPTIONAL MATCH (team)-[va:APPROVES]->(v)
OPTIONAL MATCH (team)-[ta:APPROVES]->(tech)
RETURN 
  CASE 
    WHEN va IS NOT NULL THEN {level: 'version', time: va.time, notes: va.notes}
    WHEN ta IS NOT NULL THEN {level: 'technology', time: ta.time, notes: ta.notes}
    ELSE {level: 'default', time: 'eliminate', notes: 'No approval found'}
  END as approval
```

## Best Practices

### 1. Document Decisions

Always include meaningful notes explaining why a technology is approved or restricted:

```json
{
  "time": "migrate",
  "notes": "Migrating to React for better ecosystem support and team expertise",
  "approvedBy": "Frontend Lead"
}
```

### 2. Set EOL Dates

For technologies in migrate or tolerate status, always set EOL dates:

```json
{
  "time": "migrate",
  "eolDate": "2025-12-31",
  "migrationTarget": "React"
}
```

### 3. Use Version Constraints

For invest category, specify version constraints to ensure teams use supported versions:

```json
{
  "time": "invest",
  "versionConstraint": ">=18",
  "notes": "LTS versions only"
}
```

### 4. Regular Reviews

Review approvals quarterly to ensure they align with current strategy:
- Update TIME categories as needed
- Adjust EOL dates
- Update migration targets

## Next Steps

- [TIME Framework](/features/time-framework) - Learn about TIME categories
- [Graph Model](/architecture/graph-model) - Understand the data model
- [API Endpoints](/api/endpoints) - Use the API to query approvals
