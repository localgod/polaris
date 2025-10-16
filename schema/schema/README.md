# Database Schema

This directory contains the declarative schema definitions for the Neo4j database.

## Files

- `schema.cypher` - Node labels, relationship types, and their properties
- `constraints.cypher` - Unique, existence, and node key constraints
- `indexes.cypher` - Performance indexes

## Schema Evolution

All changes to the schema must be accompanied by a migration script in `/src/db/migrations/`.

Never modify the database schema directly in production. Always use migrations.
