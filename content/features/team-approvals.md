---
title: Team Approvals
description: Team-specific technology approval policies
---

## Overview

Polaris enables teams to independently approve technologies for their use, with each team assigning TIME categories based on their specific needs and strategy. Multiple teams can have different approval policies for the same technology.

## Ownership vs Approval

### Ownership

One team owns each technology and is responsible for governance:
- Setting approved version ranges
- Evaluating security vulnerabilities
- Maintaining documentation and best practices
- Assessing risk levels

### Approval

Multiple teams can approve the same technology for their use:
- Each team independently decides whether to use the technology
- Teams assign TIME categories based on their strategy
- Teams can set additional version constraints
- Teams can have different migration timelines

Technologies without team approval default to **Eliminate**.

## Approval Properties

Each approval relationship includes:

- `time` - TIME category (invest, migrate, tolerate, eliminate)
- `approvedAt` - Approval timestamp
- `approvedBy` - Approver name
- `notes` - Context and reasoning
- `versionConstraint` - Version constraint (e.g., ">=18.0.0")
- `deprecatedAt` - Deprecation timestamp (for migrate/tolerate)
- `eolDate` - End-of-life date (for migrate/tolerate)
- `migrationTarget` - Target technology (for migrate)

## Approval Hierarchy

Polaris uses a hierarchical approval system to determine if a team can use a technology:

1. **Version-Specific Approval** (highest priority) - Team has approved this specific version
2. **Technology-Level Approval** - Team has approved the technology with optional version constraint
3. **Default (Eliminate)** - No approval found, technology is not approved for use

This hierarchy enables granular control where teams can approve a technology generally while restricting or promoting specific versions.

## Application in Polaris

### Independent Team Decisions

Teams make approval decisions based on their context. The same technology can have different TIME categories across teams, reflecting different strategic priorities and migration timelines.

### Version Constraints

Teams can specify version constraints to enforce approved version ranges. Constraints use semantic versioning syntax (e.g., ">=18.0.0 <19.0.0") and are validated against actual usage.

### Migration Planning

Teams using technologies marked as **Migrate** must specify:
- Migration target technology
- EOL date for planning purposes
- Notes documenting migration reasoning

### Compliance Detection

The graph model compares actual technology usage against team approvals to detect:
- Usage of unapproved technologies (defaults to Eliminate)
- Usage of deprecated technologies (Migrate or Tolerate)
- Version mismatches against constraints

### Query Capabilities

The graph model enables queries for:
- All technologies approved by a team
- Teams using a specific technology
- Technologies approaching EOL
- Compliance status by team or technology
- Approval hierarchy resolution

## Learn More

- [TIME Framework](/docs/features/time-framework) - Understanding TIME categories
- [Graph Model](/docs/architecture/graph-model) - Data model and relationships
