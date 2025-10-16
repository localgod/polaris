# Database Migrations

Version-controlled schema evolution for Neo4j.

## Directory Structure

```
migrations/
├── common/          # Migrations applied to all environments
├── dev/             # Development-only migrations (test data, etc.)
├── prod/            # Production-specific migrations
└── README.md
```

## Migration File Naming Convention

```
YYYY-MM-DD_HHmmss_descriptive_name.up.cypher
YYYY-MM-DD_HHmmss_descriptive_name.down.cypher
```

Example:
```
2025-10-15_143022_add_technology_label.up.cypher
2025-10-15_143022_add_technology_label.down.cypher
```

## Migration File Template

```cypher
/*
 * Migration: [Descriptive Title]
 * Version: YYYY.MM.DD.HHmmss
 * Author: @username
 * Ticket: PROJ-XXX
 * 
 * Description:
 * [Detailed description of what this migration does and why]
 *
 * Dependencies:
 * - [List any migrations this depends on]
 *
 * Rollback: See corresponding .down.cypher file
 */

// Your Cypher statements here
```

## Creating a New Migration

```bash
npm run migrate:create add_user_nodes
```

This will generate:
- A timestamped migration file pair (.up and .down)
- Pre-filled template with metadata

## Running Migrations

```bash
# Show migration status
npm run migrate:status

# Apply pending migrations (dry run)
npm run migrate:up -- --dry-run

# Apply pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Rollback to specific version
npm run migrate:down -- --to=2025.10.15.143022
```

## Migration Best Practices

### ✅ DO

- **Write idempotent migrations** - Use `IF NOT EXISTS` / `IF EXISTS`
- **Include rollback scripts** - Always provide a `.down.cypher`
- **Test migrations** - Run against test data before production
- **Keep migrations small** - One logical change per migration
- **Document thoroughly** - Explain the "why" not just the "what"
- **Use transactions** - Wrap related changes together
- **Version everything** - Commit migrations with code changes

### ❌ DON'T

- **Modify applied migrations** - Create a new migration instead
- **Skip rollback scripts** - Always provide a way back
- **Make destructive changes** - Use multi-step migrations for breaking changes
- **Hardcode values** - Use parameters where appropriate
- **Ignore dependencies** - Document migration order requirements

## Multi-Step Migration Pattern

For breaking changes, use a three-step approach:

**Step 1: Add new schema (non-breaking)**
```cypher
// Add new property alongside old one
MATCH (n:User)
WHERE n.fullName IS NULL
SET n.fullName = n.firstName + ' ' + n.lastName
```

**Step 2: Update application code**
- Deploy code that uses `fullName`
- Keep reading `firstName` and `lastName` as fallback

**Step 3: Remove old schema (after validation)**
```cypher
// Remove old properties
MATCH (n:User)
REMOVE n.firstName, n.lastName
```

## Troubleshooting

### Migration fails in production

1. Check migration logs: `npm run migrate:status`
2. Review error in Migration node: `MATCH (m:Migration {status: 'FAILED'}) RETURN m`
3. Fix issue and re-run or rollback
4. Document incident in migration file

### Schema drift detected

1. Run validation: `npm run migrate:validate`
2. Compare environments: `npm run migrate:diff prod dev`
3. Generate corrective migration if needed

### Long-running migration

1. Use batching for large data changes:
```cypher
CALL apoc.periodic.iterate(
  "MATCH (n:OldLabel) RETURN n",
  "SET n:NewLabel REMOVE n:OldLabel",
  {batchSize: 1000, parallel: false}
)
```

1. Consider maintenance window for major changes
2. Monitor execution time in Migration nodes

## Environment-Specific Migrations

### Development

- Seed test data
- Create sample relationships
- Add debugging helpers

### Production

- Real data transformations
- Performance optimizations
- Security constraints

Use environment detection in migration runner to apply appropriate migrations.
