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

The graph model supports a hierarchical approval system for determining if a team can use a technology:

1. **Version-Specific Approval** (highest priority)
   - Team has approved this specific version
   - Example: React 18.2.0 approved by Frontend Platform

2. **Technology-Level Approval**
   - Team has approved the technology
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

## Querying Approvals

The graph model enables various queries to understand team approvals:

### Finding All Approvals for a Team

The model supports retrieving all technologies and versions a team has approved, including:
- Target type (Technology or Version)
- Technology name and version (if applicable)
- TIME category
- Notes and context

### Finding Technologies to Migrate

The model enables identification of:
- All teams with technologies in "migrate" status
- EOL dates for migration planning
- Migration targets
- Sorted by urgency (EOL date)

### Checking Approval Hierarchy

The model supports hierarchical approval checking:
1. First check for version-specific approval
2. Fall back to technology-level approval
3. Default to "eliminate" if no approval exists

**Example Result:**
- Level: version-specific
- TIME: invest
- Notes: "Current stable version"

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

For technologies with migrate or tolerate TIME categories, always set EOL dates:

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
