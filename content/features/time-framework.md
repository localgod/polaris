---
title: TIME Framework
description: Gartner's TIME framework for technology portfolio management
---

# TIME Framework Implementation

## Overview

Polaris uses **Gartner's TIME framework** for technology portfolio management. TIME categorizes technologies based on their strategic value and future direction.

## TIME Categories

### 🟢 Invest
**Strategic technologies worth continued investment and enhancement**

- Technologies that are core to the business
- Modern, well-supported platforms
- Active development and innovation
- Long-term strategic value

**Examples:**
- React (Frontend Platform)
- TypeScript (Backend & Frontend Platforms)
- PostgreSQL (Data Platform)
- Node.js (Backend Platform)

### 🔵 Migrate
**Technologies to move to newer platforms**

- Deprecated technologies with migration paths
- Technologies being replaced
- Clear migration target defined
- Active migration planning

**Examples:**
- Angular → React (Frontend Platform)
  - EOL: 2025-12-31
  - Migration Target: React
  - Notes: "Migrating to React for better ecosystem support"

### 🟡 Tolerate
**Keep running but minimize investment**

- Legacy systems that still work
- No immediate replacement planned
- Minimal maintenance mode
- EOL approaching but no migration target yet

**Examples:**
- Deprecated technologies without migration targets
- Legacy systems awaiting decommissioning decisions

### 🔴 Eliminate
**Phase out and decommission**

- Technologies not approved for use
- Security or compliance risks
- No business value
- Scheduled for removal

**Examples:**
- Technologies with no team approvals
- Restricted technologies
- Technologies marked for decommissioning

## Schema Implementation

### Relationship Property

```cypher
(Team)-[:APPROVES {time: 'invest|migrate|tolerate|eliminate'}]->(Technology|Version)
```

### Additional Properties

- `approvedAt`: When the TIME category was assigned
- `deprecatedAt`: When technology was deprecated (for migrate/tolerate)
- `eolDate`: End-of-life date (for migrate/tolerate)
- `migrationTarget`: Target technology (for migrate)
- `notes`: Additional context
- `approvedBy`: Who made the decision
- `versionConstraint`: Version requirements (e.g., ">=18")

### Indexes

```cypher
CREATE INDEX approves_time FOR ()-[a:APPROVES]-() ON (a.time);
CREATE INDEX approves_eol_date FOR ()-[a:APPROVES]-() ON (a.eolDate);
CREATE INDEX approves_approved_at FOR ()-[a:APPROVES]-() ON (a.approvedAt);
```

## Migration from Status

The previous `status` field has been replaced with `time`:

| Old Status | New TIME | Condition |
|-----------|----------|-----------|
| `approved` | `invest` | Strategic technology |
| `experimental` | `invest` | Evaluating for investment |
| `deprecated` (with migrationTarget) | `migrate` | Active migration |
| `deprecated` (without migrationTarget) | `tolerate` | Legacy maintenance |
| `restricted` | `eliminate` | Not approved |

## API Usage

### Get Technologies with TIME Categories

```bash
curl http://localhost:3000/api/technologies | jq '.data[0].approvals'
```

**Response:**
```json
{
  "team": "Frontend Platform",
  "time": "invest",
  "approvedBy": "Frontend Lead",
  "notes": "Primary framework for customer-facing applications"
}
```

### Check TIME Category for Team

```bash
curl 'http://localhost:3000/api/approvals/check?team=Frontend+Platform&technology=Angular'
```

**Response:**
```json
{
  "approval": {
    "level": "technology",
    "time": "migrate",
    "eolDate": "2025-12-31",
    "migrationTarget": "React",
    "notes": "Migrating to React for better ecosystem support"
  }
}
```

### Get All Approvals for Team

```bash
curl 'http://localhost:3000/api/teams/Frontend+Platform/approvals'
```

## UI Display

### Color Coding

- **Invest**: Green badge (`bg-green-100 text-green-800`)
- **Migrate**: Blue badge (`bg-blue-100 text-blue-800`)
- **Tolerate**: Yellow badge (`bg-yellow-100 text-yellow-800`)
- **Eliminate**: Red badge (`bg-red-100 text-red-800`)

### Technology Card Example

```
┌─────────────────────────────────────────────────┐
│ Angular                                         │
│ Google                                          │
│                                                 │
│ [Frontend Platform: Migrate] 🔵                 │
│                                                 │
│ Category: framework                             │
│ Risk Level: medium                              │
│ EOL: 2025-12-31                                 │
│ Migrate to: React                               │
└─────────────────────────────────────────────────┘
```

## Queries

### Find All Technologies to Migrate

```cypher
MATCH (team:Team)-[a:APPROVES {time: 'migrate'}]->(tech:Technology)
RETURN 
  team.name as team,
  tech.name as technology,
  a.eolDate as eolDate,
  a.migrationTarget as migrationTarget,
  a.notes as notes
ORDER BY a.eolDate
```

### Find Technologies Approaching EOL

```cypher
MATCH (team:Team)-[a:APPROVES]->(tech:Technology)
WHERE a.time IN ['migrate', 'tolerate']
  AND a.eolDate IS NOT NULL
  AND a.eolDate < date() + duration({days: 90})
RETURN 
  team.name as team,
  tech.name as technology,
  a.time as timeCategory,
  a.eolDate as eolDate,
  duration.between(date(), a.eolDate).days as daysUntilEol
ORDER BY a.eolDate
```

### Portfolio Distribution by TIME

```cypher
MATCH (team:Team)-[a:APPROVES]->(tech:Technology)
RETURN 
  a.time as timeCategory,
  count(DISTINCT tech) as technologyCount,
  collect(DISTINCT tech.name) as technologies
ORDER BY timeCategory
```

### Team-Specific TIME Distribution

```cypher
MATCH (team:Team {name: 'Frontend Platform'})-[a:APPROVES]->(tech:Technology)
RETURN 
  a.time as timeCategory,
  count(tech) as count,
  collect(tech.name) as technologies
ORDER BY timeCategory
```

## Benefits

### 1. Strategic Alignment
- Clear categorization of technology investments
- Aligns with business strategy
- Supports portfolio planning

### 2. Migration Planning
- Explicit migration paths
- EOL tracking
- Resource allocation for migrations

### 3. Risk Management
- Identify technologies to eliminate
- Track legacy systems (tolerate)
- Minimize technical debt

### 4. Budget Optimization
- Focus investment on strategic technologies
- Minimize spend on legacy systems
- Plan migration budgets

### 5. Compliance & Governance
- Clear approval policies per team
- Audit trail of decisions
- Standardized categorization

## Best Practices

### 1. Regular Reviews
- Review TIME categories quarterly
- Update EOL dates as needed
- Reassess migration priorities

### 2. Migration Planning
- Always specify `migrationTarget` for migrate category
- Set realistic EOL dates
- Document migration notes

### 3. Investment Decisions
- Invest category should be < 30% of portfolio
- Migrate should have clear timelines
- Tolerate should be temporary

### 4. Team Alignment
- Different teams can have different TIME categories for same technology
- Document reasoning in `notes` field
- Specify `approvedBy` for accountability

### 5. Version-Specific Policies
- Use version-specific approvals for granular control
- Specify `versionConstraint` for invest category
- Track version-specific EOL dates

## Reporting

### Executive Dashboard Metrics

1. **Portfolio Health**
   - % Invest: Target 60-70%
   - % Migrate: Target 10-20%
   - % Tolerate: Target 10-20%
   - % Eliminate: Target < 5%

2. **Migration Pipeline**
   - Technologies in migrate status
   - EOL dates approaching (< 90 days)
   - Migration progress tracking

3. **Risk Indicators**
   - Technologies past EOL
   - Eliminate category not actioned
   - Tolerate without migration plan

## Migration Script

The migration from `status` to `time` is handled by:

**File:** `schema/migrations/common/20251022_101947_replace_status_with_time.up.cypher`

**Rollback:** `schema/migrations/common/20251022_101947_replace_status_with_time.down.cypher`

## References

- [Gartner TIME Framework](https://www.gartner.com/en/information-technology/glossary/time-tolerate-invest-migrate-eliminate)
- [Team Approvals Implementation](./TEAM_APPROVALS_IMPLEMENTATION.md)
- [Schema Enhancement Design](./SCHEMA_ENHANCEMENT_TEAM_SPECIFIC_APPROVALS.md)

## Authors

- Implementation: @system
- Date: 2025-10-22
- Ticket: CATALOG-003
