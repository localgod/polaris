# Schema Management

This directory contains database schema migrations, fixtures, and scripts for the Polaris tech catalog.

## Directory Structure

```
schema/
├── fixtures/              # Test data and seeding
│   ├── tech-catalog.json  # Fixture data
│   ├── example-queries.cypher  # Example queries
│   └── README.md          # Fixtures documentation
├── migrations/            # Database migrations
│   ├── common/            # Migrations for all environments
│   ├── dev/               # Development-only migrations
│   ├── prod/              # Production-only migrations
│   └── README.md          # Migration documentation
└── scripts/               # Migration and seeding scripts
    ├── migrate.ts         # Migration runner
    ├── migrationRunner.ts # Migration logic
    ├── seed.ts            # Database seeding script
    └── types.ts           # TypeScript types
```

## Related Documentation

- [Database Migrations](DATABASE_MIGRATIONS.md) - Complete migration guide
- [Database Seeding](SEEDING_GUIDE.md) - Seeding system guide
- [Tech Catalog Schema](TECH_CATALOG_SCHEMA.md) - Technology catalog data model
- [Migration Runbook](MIGRATION_RUNBOOK.md) - Common migration tasks

## Quick Start

### 1. Run Migrations

Apply all pending migrations:

```bash
npm run migrate:up
```

Check migration status:

```bash
npm run migrate:status
```

### 2. Seed Database

Load fixture data (idempotent):

```bash
npm run seed
```

Reset to known state:

```bash
npm run seed:clear
```

### 3. Explore Data

Use the example queries in `fixtures/example-queries.cypher` to explore the seeded data.

## Available Commands

### Migration Commands

```bash
# Check migration status
npm run migrate:status

# Apply pending migrations
npm run migrate:up

# Validate migrations without applying
npm run migrate:validate

# Create a new migration
npm run migrate:create <name>

# Run migration tests
npm run test:migrations
```

### Seeding Commands

```bash
# Seed database (idempotent)
npm run seed

# Clear and reseed database
npm run seed:clear
```

### Automation Tasks

```bash
# Install dependencies
gitpod automations task start install-deps

# Wait for Neo4j
gitpod automations task start wait-neo4j

# Run migrations
gitpod automations task start run-migrations

# Check migration status
gitpod automations task start migration-status

# Validate migrations
gitpod automations task start validate-migrations

# Seed database
gitpod automations task start seed-database

# Reset database
gitpod automations task start reset-database
```

## Schema Overview

### Node Types

The tech catalog schema includes:

- **Technology**: Approved technologies in the enterprise catalog
- **Version**: Specific versions of technologies
- **Component**: SBOM entries (dependencies)
- **System**: Deployable applications/services
- **Policy**: Governance and compliance rules
- **Team**: Organizational ownership

### Relationships

- `(Technology)-[:HAS_VERSION]->(Version)`
- `(Team)-[:OWNS]->(Technology)`
- `(Team)-[:OWNS]->(System)`
- `(System)-[:USES]->(Component)`
- `(Component)-[:IS_VERSION_OF]->(Technology)`
- `(Policy)-[:APPLIES_TO]->(Technology)`

## Migrations

### Applied Migrations

1. **2025-10-15_000000_init_migration_tracking**
   - Creates migration tracking infrastructure
   - Adds constraints and indexes for Migration nodes

2. **2025-10-16_100000_create_tech_catalog_schema**
   - Creates all tech catalog node types
   - Adds 19 constraints and indexes
   - Enables SBOM and compliance tracking

### Creating New Migrations

```bash
npm run migrate:create add_new_feature
```

This creates two files:
- `YYYYMMDD_HHMMSS_add_new_feature.up.cypher` - Apply changes
- `YYYYMMDD_HHMMSS_add_new_feature.down.cypher` - Rollback changes

Follow the template in existing migrations for consistency.

## Fixtures

### Fixture Data

The `tech-catalog.json` fixture includes:

- 5 teams (Frontend, Backend, Data, DevOps, Security)
- 10 technologies (React, Vue, Node.js, PostgreSQL, etc.)
- 7 versions with approval status and EOL dates
- 6 policies for governance and compliance
- 5 systems with varying criticality levels
- 7 components (npm packages)
- 47 relationships connecting all nodes

### Idempotency

The seeding script uses `MERGE` statements to ensure:

- No duplicate nodes when run multiple times
- Properties are updated if nodes exist
- Relationships are not duplicated
- Safe to run in any environment

### Example Usage

```bash
# First time - creates all data
npm run seed

# Second time - updates existing, no duplicates
npm run seed

# Reset to clean state
npm run seed:clear
```

## Example Queries

See `fixtures/example-queries.cypher` for comprehensive examples:

- Basic node queries
- Relationship traversals
- Compliance and governance checks
- Version and EOL tracking
- SBOM and dependency analysis
- Team ownership mapping
- Cross-cutting analysis
- Graph visualizations

## Best Practices

### Migration Guidelines

1. **Always test migrations** with `migrate:validate` before applying
2. **Write rollback scripts** for every migration
3. **Use IF NOT EXISTS** for constraints and indexes
4. **Document dependencies** in migration headers
5. **Keep migrations atomic** - one logical change per migration

### Seeding

1. **Use seed for development** to maintain consistent state
2. **Reset before testing** to ensure clean test runs
3. **Version fixture data** by committing changes
4. **Test idempotency** by running seed multiple times
5. **Document custom data** with comments

### Schema Design

1. **Use unique constraints** to prevent duplicates
2. **Add indexes** on frequently queried properties
3. **Use composite constraints** for multi-property uniqueness
4. **Follow naming conventions** for consistency
5. **Document relationships** in schema docs

## Troubleshooting

### Migration Issues

**Error: Migration has been modified**
- Migrations are checksummed to detect changes
- Never modify applied migrations
- Create a new migration to fix issues

**Error: No routing servers available**
- Check Neo4j is running: `docker compose ps neo4j`
- Verify connection settings in `.env`
- Use `bolt://` protocol for standalone instances

### Seeding Issues

**Connection errors**
- Ensure Neo4j is running and accessible
- Check `.env` file has correct credentials
- Verify port 7687 is exposed

**Duplicate nodes**
- Shouldn't happen with MERGE-based approach
- Check unique constraints: `SHOW CONSTRAINTS`
- Reset database: `npm run seed:clear`

## Documentation

- [Migration Documentation](migrations/README.md)
- [Tech Catalog Schema](migrations/README_TECH_CATALOG.md)
- [Fixtures Documentation](fixtures/README.md)
- [Automation Documentation](../.ona/README.md)

## Contributing

When adding new schema elements:

1. Create a migration with `npm run migrate:create`
2. Add fixture data to `fixtures/tech-catalog.json`
3. Update the seed script if needed
4. Add example queries to `fixtures/example-queries.cypher`
5. Document the changes in relevant README files
6. Test migrations and seeding thoroughly

## Next Steps

- Add more comprehensive fixture data
- Create environment-specific fixtures
- Add data validation before seeding
- Implement schema versioning
- Add monitoring and alerting
