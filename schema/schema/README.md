# Database Schema

There is no hand-maintained declarative schema file in this repository — a
prior attempt at one (`schema.cypher`/`constraints.cypher`/`indexes.cypher`)
was removed because it silently went stale (it covered 4 of the 20+ node
labels in the live schema and had a "Last Updated" date that predated
several of the migrations it claimed to include). A file like that is only
trustworthy if something regenerates it automatically; nothing did.

The current schema is always the sum of every migration in
`schema/migrations/common/*.up.cypher`, applied in order. To see it:

- **Read the migration history** — each file's header comment explains
  what it changes and why.
- **Query the live database directly** — `SHOW CONSTRAINTS`, `SHOW INDEXES`,
  `CALL db.labels()`, `CALL db.relationshipTypes()`, or
  `CALL apoc.meta.schema()` via the `neo4j` MCP server or `npm run
  schema:dump` (writes `apoc.meta.schema()` output to `.data/schema.json`).
- **`.claude/mcp/graph-schema.md`** — a hand-maintained summary of node
  labels, relationships, and key invariants, kept in sync manually. Update
  it whenever a migration changes the shape it describes.

## Schema Evolution

All changes to the schema must be accompanied by a migration script in
`schema/migrations/common/` (see `README_AUDIT_TRAIL.md` in this directory
for the AuditLog property/vocabulary reference specifically).

Never modify the database schema directly in production. Always use migrations.
