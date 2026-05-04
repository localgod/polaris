# Polaris — Copilot Review Instructions

Focus reviews on **runtime failures and production risks**. Skip style, naming, documentation, and convention reminders — ESLint, `mdlint`, and the PR template handle those.

## Stack context

- Nuxt 4 (Vue 3 + TypeScript, `type: "module"`) + Neo4j 5 Community (Bolt protocol)
- 3-layer server pattern: `server/api` → `server/services` → `server/repositories` → `server/database/queries/*.cypher`
- Auth via `nuxt-auth-utils`; all API routes protected by server middleware in `server/middleware/`
- Idempotent migrations in `schema/`; test isolation via `test_<feature>_` node prefixes

---

## Flag these — runtime failure patterns

### Neo4j / Cypher

**Relationship-safe deletes**
`DELETE n` throws at runtime if the node has relationships. Flag any `DELETE` that isn't `DETACH DELETE` unless the caller explicitly guarantees no relationships exist.

**Unbounded queries**
`MATCH (n:Label)` without `LIMIT` on large collections will exhaust memory or hit the query timeout. Flag in any non-administrative read path.

**Cypher built by string interpolation**
Parameters are safe; template literals or string concatenation that embed values directly into Cypher are injection risks and bypass Neo4j's type system. Flag any Cypher constructed outside of parameterized queries.

**Null node dereference**
`MATCH ... WHERE` returns nothing if no node matches — it doesn't throw. Flag code that accesses properties on a query result without a null/undefined guard.

**Unindexed WHERE clauses**
`MATCH (n:Label) WHERE n.newProp = $val` on a property with no index does a full graph scan. Flag new filter predicates on properties that have no corresponding `CREATE INDEX IF NOT EXISTS` in a migration.

**Missing batching on bulk writes**
`MATCH (n:Label) SET n.x = $val` over an unbounded set will hit memory limits. Flag un-batched bulk mutations; suggest `CALL { … } IN TRANSACTIONS OF 500 ROWS`.

---

### API routes and middleware

**Missing authentication**
Every route in `server/api/` must call `requireUserSession()` (or equivalent) or be explicitly marked public. Flag new handlers that do neither.

**Authentication without authorization**
Confirming identity is not the same as confirming permission. Flag admin-level operations (writes, deletes, role changes) that check `session` but not the user's role or superuser status.

**Unvalidated request input**
Flag routes that spread or pass `event.body` / query params directly to a service or repository without schema validation or explicit type narrowing. Malformed input reaches the DB layer silently.

**Swallowed errors**
`catch (e) {}` or `catch (e) { return null }` hides production failures and makes incidents invisible. Flag silent catch blocks; errors should be re-thrown or surfaced as an appropriate HTTP error.

---

### Service / repository layer

**Multi-step writes outside a transaction**
Operations that write to several nodes or relationships and can partially fail need a single transaction boundary. Flag sequential `await repository.*()` write calls that are not wrapped in a transaction.

**N+1 queries**
A `for…of` loop that calls a repository method per iteration is an N+1. Flag these; suggest a single batched query instead.

**Business logic in repositories**
Repositories translate between the app and Neo4j only. Conditional defaults, fallbacks, or orchestration logic in a repository obscures where bugs originate. Flag it and suggest moving to the service layer.

---

### Migrations

**Non-idempotent scripts**
Migrations are re-run in CI. `CREATE CONSTRAINT` / `CREATE INDEX` without `IF NOT EXISTS` will fail on a second run. `CREATE` instead of `MERGE` on seed-like data will duplicate nodes. Flag both.

**Missing `.down.cypher`**
Every `.up.cypher` needs a matching rollback. Flag missing down scripts.

**Destructive operations without a safety comment**
`DETACH DELETE` or `REMOVE n.property` in a migration will delete production data on re-deploy. Flag these without an explicit `// intentional, irreversible` comment and a preceding count check.

---

### TypeScript / async

**Unawaited async calls**
An `async` function whose returned Promise is not awaited will silently drop errors. Flag unawaited calls, especially inside middleware, event handlers, and `setup()`.

**`as` casts on unverified data**
`someValue as MyType` with no runtime check is a latent crash if the actual shape differs — common with Neo4j query results or external API responses. Flag casts that skip validation.

**Non-nullable access on optional fields**
Accessing `.property` on a value typed as `T | undefined | null` without narrowing first will throw at runtime. Flag these.

---

### Nuxt / SSR

**Unguarded browser API usage**
`window`, `localStorage`, `document`, and other browser globals crash during SSR. Flag any usage in composables, plugins, or middleware that isn't wrapped in `import.meta.client` or `process.client`.

**Composables called outside `setup()`**
`useXxx()` composables called inside event handlers, `setTimeout`, or non-setup async callbacks lose their component instance. Flag these.

---

## Do not flag

- Code style, indentation, or naming (ESLint owns this)
- Missing or outdated comments and documentation
- Test file structure or naming
- Commit message format or PR description content
- Migrations lacking descriptive header comments

Raise a comment only when code can **fail, throw, produce wrong data, or expose a security gap at runtime**.
