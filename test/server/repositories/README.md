# Repository Layer Tests

This directory contains tests for the repository layer, which handles database queries and data mapping.

## Purpose

Test database queries, data mapping from Neo4j records, and ensure queries return correct results **using the test database**.

## Approach

**Use test database** with proper isolation using test prefixes (`test_`).

## What to Test

- Yes Database queries execute correctly
- Yes Data mapping from Neo4j records to domain objects
- Yes Query results match expectations
- Yes Edge cases (empty results, null values, relationships)
- Yes Filtering and sorting logic
- No Business logic (tested in service layer)
- No HTTP concerns (tested in API layer)

## Test Pattern

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { ComponentRepository } from '../../../server/repositories/component.repository'
import neo4j, { type Driver, type Session } from 'neo4j-driver'
import { cleanupTestData } from '../../fixtures/db-cleanup'
```markdown
# Repository tests (Neo4j)

Repository tests exercise database queries and data mapping using Neo4j. They require either the devcontainer or a local Neo4j instance. Tests use a prefix-based isolation pattern (`test_<feature>_`) because Neo4j Community Edition does not support multiple databases.

Key points:

- Use `test_<feature>_` prefixes for all test data and clean up before/after tests using helpers in `test/setup`.
- Mock Nuxt utilities (for example `loadQuery`) when running tests in Node.
- Skip tests gracefully when Neo4j isn't available (see examples in existing specs).

Example runner:

```bash
# from repository root (Windows bash)
npm run test:server:repositories
```

See the canonical server testing overview at `../README.md` and the schema/migration notes at `../../../schema/README.md` for related context.

For full examples, inspect the spec files in this directory: `component.repository.spec.ts`, `team.repository.spec.ts`, `system.repository.spec.ts`.

``` 
        technologyName,
