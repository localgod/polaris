# Database Seeding Guide

This guide explains how to use the idempotent database seeding system for the Polaris tech catalog.

## Overview

The seeding system provides a way to:

- **Reset your database** to a known state at any time
- **Load realistic test data** for development and testing
- **Run safely multiple times** without creating duplicates (idempotent)
- **Automate via Gitpod** for consistent environments

## Quick Start

### Option 1: Using npm Scripts

```bash
# Seed the database (idempotent - safe to run multiple times)
npm run seed

# Clear all data and reseed (reset to known state)
npm run seed:clear
```

### Option 2: Using Gitpod Automations

```bash
# Seed the database
gitpod automations task start seed-database

# Reset to known state
gitpod automations task start reset-database
```

## What Gets Seeded?

The fixture data includes:

### 5 Teams

- Frontend Platform
- Backend Platform  
- Data Platform
- DevOps
- Security

### 10 Technologies

- **Approved**: React, Vue, Node.js, PostgreSQL, Neo4j, Express, TypeScript, Docker
- **Deprecated**: Angular
- **Experimental**: MongoDB

### 7 Versions

Specific versions with approval status and EOL dates for major technologies.

### 6 Policies

Governance rules covering:
- Frontend framework approval
- Database version compliance
- Deprecated technology warnings
- High-risk technology reviews
- License compliance
- EOL warnings

### 5 Systems

Example applications with varying criticality:
- customer-portal (high)
- api-gateway (critical)
- analytics-service (medium)
- admin-dashboard (low)
- notification-service (high)

### 7 Components

SBOM entries (npm packages):
- react, react-dom
- vue
- express
- typescript
- neo4j-driver
- pg

### 47 Relationships

Connecting all nodes with realistic ownership and dependency relationships.

## Idempotency Explained

The seed script is **idempotent**, meaning you can run it multiple times safely:

```bash
# First run - creates all data
npm run seed
# Output: Teams: 5, Technologies: 10, Versions: 7...

# Second run - updates existing data, NO duplicates
npm run seed
# Output: Teams: 5, Technologies: 10, Versions: 7...

# Third run - still NO duplicates
npm run seed
# Output: Teams: 5, Technologies: 10, Versions: 7...
```

This works because the script uses `MERGE` instead of `CREATE`:

```cypher
// This creates OR updates - never duplicates
MERGE (t:Technology {name: "React"})
SET t.category = "framework",
    t.status = "approved"
```

## Use Cases

### Development

Keep your local database in a consistent state:

```bash
# Start fresh each day
npm run seed:clear

# Or just update to latest fixtures
npm run seed
```

### Testing

Reset before running tests:

```bash
# In your test setup
npm run seed:clear

# Run your tests
npm test
```

### Demos

Prepare a clean demo environment:

```bash
# Reset to known state
gitpod automations task start reset-database

# Your demo data is now consistent
```

### Onboarding

New team members can quickly get a working database:

```bash
# After cloning the repo
npm install
npm run migrate:up
npm run seed
```

## Customizing Fixture Data

Edit `schema/fixtures/tech-catalog.json` to add or modify data:

### Add a New Team

```json
{
  "teams": [
    {
      "name": "Mobile Platform",
      "email": "mobile@company.com",
      "responsibilityArea": "mobile"
    }
  ]
}
```

### Add a New Technology

```json
{
  "technologies": [
    {
      "name": "Swift",
      "category": "language",
      "vendor": "Apple",
      "status": "approved",
      "approvedVersionRange": ">=5.9.0 <6.0.0",
      "ownerTeam": "Mobile Platform",
      "riskLevel": "low",
      "lastReviewed": "2025-10-01"
    }
  ]
}
```

### Add Relationships

```json
{
  "relationships": {
    "team_technologies": [
      { "team": "Mobile Platform", "technology": "Swift" }
    ]
  }
}
```

Then run:

```bash
npm run seed
```

## Verification

After seeding, verify the data:

### Check Node Counts

```bash
npm run migrate:status
```

Or in Neo4j Browser:

```cypher
MATCH (t:Team) RETURN "Team" as type, count(t) as count
UNION
MATCH (tech:Technology) RETURN "Technology" as type, count(tech) as count
UNION
MATCH (v:Version) RETURN "Version" as type, count(v) as count
UNION
MATCH (p:Policy) RETURN "Policy" as type, count(p) as count
UNION
MATCH (s:System) RETURN "System" as type, count(s) as count
UNION
MATCH (c:Component) RETURN "Component" as type, count(c) as count
```

### Explore Relationships

```cypher
// View a system's dependencies
MATCH (s:System {name: "customer-portal"})-[:USES]->(c:Component)
RETURN s.name, collect(c.name + "@" + c.version) as components

// View team ownership
MATCH (team:Team {name: "Frontend Platform"})-[:OWNS]->(tech:Technology)
RETURN team.name, collect(tech.name) as technologies
```

See `schema/fixtures/example-queries.cypher` for more examples.

## Automation Integration

The seeding system is integrated with Gitpod automations in `.ona/automations.yaml`:

### Seed Database Task

```yaml
seed-database:
  name: Seed Database with Fixtures
  command: |
    echo "🌱 Seeding database with fixture data..."
    npm run seed
    echo "✅ Database seeded successfully"
```

### Reset Database Task

```yaml
reset-database:
  name: Reset Database to Known State
  command: |
    echo "🔄 Resetting database to known state..."
    echo "⚠️  This will clear all non-migration data!"
    npm run seed:clear
    echo "✅ Database reset complete"
```

List available tasks:

```bash
gitpod automations task list
```

## Troubleshooting

### Connection Errors

**Error**: `Could not connect to Neo4j`

**Solution**: Ensure Neo4j is running:

```bash
docker compose -f .devcontainer/docker-compose.yml ps neo4j
```

Check your `.env` file:

```
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=devpassword
```

### Duplicate Nodes

**Problem**: Seeing duplicate nodes after seeding

**Solution**: This shouldn't happen with MERGE. If it does:

1. Check constraints exist: `SHOW CONSTRAINTS`
2. Reset the database: `npm run seed:clear`
3. Verify fixture data has no duplicates

### Missing Relationships

**Problem**: Relationships not created

**Solution**: Ensure both nodes exist in the fixture data. For example:

```json
// This relationship requires both nodes to exist
{ "team": "Mobile Platform", "technology": "Swift" }
```

Both "Mobile Platform" team and "Swift" technology must be in the fixture data.

## Best Practices

1. **Commit fixture changes**: Version control your test data
2. **Test idempotency**: Always verify running seed multiple times is safe
3. **Document custom data**: Add comments explaining non-obvious relationships
4. **Use seed:clear for tests**: Ensure clean state before test runs
5. **Keep fixtures realistic**: Use real-world examples for better testing

## Advanced Usage

### Environment-Specific Fixtures

Create different fixture files for different environments:

```bash
schema/fixtures/
  ├── tech-catalog.json          # Default
  ├── tech-catalog.dev.json      # Development
  ├── tech-catalog.staging.json  # Staging
  └── tech-catalog.prod.json     # Production
```

Modify the seed script to load based on `NODE_ENV`.

### Partial Seeding

Modify `seed.ts` to seed only specific node types:

```typescript
// Seed only teams and technologies
await seedTeams(driver, fixtureData.teams)
await seedTechnologies(driver, fixtureData.technologies)
```

### Data Validation

Add validation before seeding:

```typescript
function validateFixtureData(data: FixtureData) {
  // Check for required fields
  // Validate relationships reference existing nodes
  // Ensure no duplicate keys
}
```

## Related Documentation

- [Schema README](schema/README.md) - Complete schema documentation
- [Fixtures README](schema/fixtures/README.md) - Detailed fixture documentation
- [Tech Catalog Schema](schema/migrations/README_TECH_CATALOG.md) - Schema design
- [Example Queries](schema/fixtures/example-queries.cypher) - Query examples
- [Automation README](.ona/README.md) - Automation documentation

## Summary

The seeding system provides:

✅ **Idempotent seeding** - Safe to run multiple times  
✅ **Realistic test data** - 40 nodes, 47 relationships  
✅ **Easy reset** - Clear and reseed in one command  
✅ **Automation ready** - Integrated with Gitpod  
✅ **Well documented** - Examples and guides  
✅ **Customizable** - Easy to modify fixture data  

Use it to maintain a consistent database state throughout development and testing!
