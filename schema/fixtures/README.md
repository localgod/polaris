# Database Fixtures and Seeding

This directory contains fixture data and scripts for seeding the Neo4j database with test data.

## Overview

The seeding system provides:

- **Idempotent seeding**: Running the seed script multiple times produces the same result
- **Fixture data**: Realistic test data covering all node types
- **Relationship creation**: Automatically creates relationships between nodes
- **Reset capability**: Clear and reseed the database to a known state

## Files

- `tech-catalog.json` - Fixture data for the tech catalog schema
- `../scripts/seed.ts` - Idempotent seeding script

## Usage

### Seed the Database

Add fixture data to the database (idempotent - safe to run multiple times):

```bash
npm run seed
```

Or via automation:

```bash
gitpod automations task start seed-database
```

### Reset Database to Known State

Clear all non-migration data and reseed with fixtures:

```bash
npm run seed:clear
```

Or via automation:

```bash
gitpod automations task start reset-database
```

## Fixture Data Structure

The `tech-catalog.json` file contains:

### Teams (5 teams)

- Frontend Platform
- Backend Platform
- Data Platform
- DevOps
- Security

### Technologies (10 technologies)

- **Approved**: React, Vue, Node.js, PostgreSQL, Neo4j, Express, TypeScript, Docker
- **Deprecated**: Angular
- **Experimental**: MongoDB

### Versions (7 versions)

Specific versions for major technologies with approval status and EOL dates.

### Policies (6 policies)

Governance and compliance rules covering:

- Frontend framework approval
- Database version policy
- Deprecated technology warnings
- High-risk technology reviews
- License compliance
- EOL warnings

### Systems (5 systems)

Example applications:

- customer-portal (high criticality)
- api-gateway (critical)
- analytics-service (medium)
- admin-dashboard (low)
- notification-service (high)

### Components (7 components)

SBOM entries for npm packages:

- react, react-dom
- vue
- express
- typescript
- neo4j-driver
- pg (PostgreSQL driver)

### Relationships

The seed script automatically creates relationships:

- `(Technology)-[:HAS_VERSION]->(Version)`
- `(Team)-[:OWNS]->(Technology)`
- `(Team)-[:OWNS]->(System)`
- `(System)-[:USES]->(Component)`
- `(Component)-[:IS_VERSION_OF]->(Technology)`
- `(Policy)-[:APPLIES_TO]->(Technology)`

## Idempotency

The seed script uses `MERGE` statements instead of `CREATE`, ensuring:

1. **No duplicates**: Running multiple times won't create duplicate nodes
2. **Updates properties**: If a node exists, its properties are updated
3. **Safe relationships**: Relationships are also merged, not duplicated

Example:

```bash
# First run - creates all data
npm run seed

# Second run - updates existing data, no duplicates
npm run seed

# Third run - still no duplicates
npm run seed
```

## Customizing Fixture Data

To add or modify fixture data:

1. Edit `tech-catalog.json`
2. Follow the existing structure
3. Run `npm run seed` to apply changes

### Adding a New Team

```json
{
  "teams": [
    {
      "name": "Mobile Platform",
      "email": "mobile-platform@company.com",
      "responsibilityArea": "mobile"
    }
  ]
}
```

### Adding a New Technology

```json
{
  "technologies": [
    {
      "name": "Kotlin",
      "category": "language",
      "vendor": "JetBrains",
      "status": "approved",
      "approvedVersionRange": ">=1.9.0 <2.0.0",
      "ownerTeam": "Mobile Platform",
      "riskLevel": "low",
      "lastReviewed": "2025-10-01"
    }
  ]
}
```

### Adding Relationships

Add to the appropriate relationship array:

```json
{
  "relationships": {
    "team_technologies": [
      { "team": "Mobile Platform", "technology": "Kotlin" }
    ]
  }
}
```

## Verification Queries

After seeding, verify the data:

### Count all nodes

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

### View a system with its components

```cypher
MATCH (s:System {name: "customer-portal"})-[:USES]->(c:Component)
RETURN s.name, collect(c.name + "@" + c.version) as components
```

### View technologies owned by a team

```cypher
MATCH (team:Team {name: "Frontend Platform"})-[:OWNS]->(tech:Technology)
RETURN team.name, collect(tech.name) as technologies
```

### View policies and their applicable technologies

```cypher
MATCH (p:Policy)-[:APPLIES_TO]->(tech:Technology)
RETURN p.name, p.severity, collect(tech.name) as technologies
ORDER BY p.severity
```

## Integration with Automations

The seeding system is integrated with Gitpod automations:

### Seed Database Task

```yaml
seed-database:
  name: Seed Database with Fixtures
  command: |
    echo "🌱 Seeding database with fixture data..."
    npm run seed
    echo "Yes Database seeded successfully"
```

### Reset Database Task

```yaml
reset-database:
  name: Reset Database to Known State
  command: |
    echo "🔄 Resetting database to known state..."
    echo "⚠️  This will clear all non-migration data!"
    npm run seed:clear
    echo "Yes Database reset complete"
```

## Best Practices

1. **Use seed for development**: Keep your dev database in a known state
2. **Reset before testing**: Use `seed:clear` to ensure clean test runs
3. **Version fixture data**: Commit changes to `tech-catalog.json`
4. **Document custom data**: Add comments explaining non-obvious relationships
5. **Test idempotency**: Always verify that running seed multiple times is safe

## Troubleshooting

### Seed script fails with connection error

Ensure Neo4j is running:

```bash
docker compose -f .devcontainer/docker-compose.yml ps neo4j
```

Check your `.env` file has correct connection settings:

```
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=devpassword
```

### Duplicate nodes appearing

This shouldn't happen with the MERGE-based approach. If it does:

1. Check that unique constraints are in place: `SHOW CONSTRAINTS`
2. Verify the fixture data doesn't have duplicates
3. Reset the database: `npm run seed:clear`

### Relationships not created

Ensure the referenced nodes exist in the fixture data. For example, a relationship:

```json
{ "team": "Mobile Platform", "technology": "Kotlin" }
```

Requires both nodes to exist in the `teams` and `technologies` arrays.

## Next Steps

- Add more realistic fixture data
- Create environment-specific fixtures (dev, staging, prod)
- Add data validation before seeding
- Create fixtures for additional schemas
