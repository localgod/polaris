# Database Seeds

Seed data for development and testing.

## Purpose

Seeds provide initial data for:
- Development environments
- Testing scenarios
- Demo/showcase instances

## Usage

Seeds are typically run after migrations:

```bash
npm run db:seed
```

## Best Practices

- **Keep seeds idempotent** - Use `MERGE` instead of `CREATE`
- **Separate by environment** - dev, test, demo
- **Don't seed production** - Production data comes from real usage
- **Version control** - Commit seed files with the code

## Example Seed File

```cypher
// seeds/dev/users.cypher

// Create sample users
MERGE (u1:User {id: 'user-1'})
SET u1.name = 'Alice Developer',
    u1.email = 'alice@example.com',
    u1.createdAt = datetime()

MERGE (u2:User {id: 'user-2'})
SET u2.name = 'Bob Tester',
    u2.email = 'bob@example.com',
    u2.createdAt = datetime()
```
