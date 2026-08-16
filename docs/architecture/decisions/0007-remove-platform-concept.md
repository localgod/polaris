# ADR-0007 Remove the Platform Concept

## Status

**Accepted** (amends [ADR-0004](0004-technology-requires-component.md))

Date: 2026-08-15

## Context

[ADR-0004](0004-technology-requires-component.md) made `Technology` a strict, always-evidence-backed catalog: it can only be created by claiming an existing, SBOM-observed `Component`. That ADR also introduced `Platform` as the deliberate, narrow exception — a sibling node for infrastructure and services a source-manifest SBOM scan can never observe (databases, cloud services, container runtimes), manually declared by a superuser, carrying the same `STEWARDED_BY`/`APPROVES` governance shape as `Technology` but with no Component relationship and, explicitly, no version/EOL tracking ("a known, deliberately deferred gap, not an oversight" — ADR-0004 Consequences).

Issue #814 proposed closing that gap: add a manually-maintained "current version" field to `Platform`, and run the existing `HealthSnapshot`/`Advisory` pipeline against it. Investigating that proposal against the current codebase surfaced the structural problem it was actually exposing, not solving:

- `Platform` is the only entity in the catalog with no evidence trail. Every other governed thing in Polaris — `Technology` via `Component`, `Component` via SBOM scan — is backed by something Polaris itself observed. `Platform` is backed by whatever a superuser typed into a form.
- Because it looks like a Technology (same governance shape) but lacks a Technology's evidence guarantee, it invites exactly the feature-parity pressure #814 represents: once stewardship and TIME approval exist for a Platform, "why doesn't it have version/EOL tracking like Technology does" is a reasonable question to keep asking, indefinitely.
- Answering #814 as proposed would mean building parallel, manually-fed infrastructure alongside the SBOM-fed pipeline: a hand-edited version field, staleness tracking for that field, a new audit pattern for successful edits (which doesn't exist yet for any Platform mutation — see investigation below), and a branch through `HealthSnapshot`/`EOLService` for data with no automated provenance. None of that makes the SBOM-evidence pipeline better; it just duplicates it for a smaller, manually-curated set of entries.

### The prompting question

Does Polaris govern infrastructure that SBOM scanning cannot see, or does it govern exactly what SBOM evidence shows was actually used? Keeping both means an ever-widening manual-data surface (#814 is the first instance, not the last). Choosing only the second keeps the tool doing one thing.

### Alternatives considered

1. **Keep `Platform` frozen as-is** (approval/stewardship registry only, no version data ever). Rejected as a permanent stance — the registry still requires the app to carry an evidence-free entity type indefinitely, and the pressure to widen it (as #814 demonstrates) recurs every time infrastructure governance comes up. Freezing it by decree doesn't remove the underlying inconsistency, it just declines to fix it.
2. **Implement #814 as proposed** (manual version field + reused EOL pipeline). Rejected — trades a small, contained inconsistency for a second, parallel manual-data pipeline that has to be maintained forever, undermining the SBOM-evidence-only principle across a wider surface than it does today.
3. **Feed `Platform` from an external evidence source** (e.g. a CMDB import), making it symmetric with `Technology requires Component` — facts from an external system of record, judgments (stewardship, TIME approval) made in Polaris. A genuinely cleaner design, but it's new integration surface (ingestion contract, identity matching, sync freshness) most deployments of Polaris have no CMDB to feed it from. Deferred, not rejected outright — see Consequences.
4. **Remove `Platform` entirely** (chosen). Polaris governs what SBOM evidence shows. Infrastructure and services with no source-manifest footprint are out of scope. This keeps a single invariant — every catalog entry is evidence-backed — with no exception to special-case, maintain, or explain.

## Decision

1. **The `Platform` node, and everything built on it, is removed**: the `server/api/platforms*` endpoints, `PlatformService`, `PlatformRepository`, the `platforms/` Cypher query directory, the `/platforms` pages, the dashboard's stewardship-gap reporting for Platforms, and the seed fixtures that created the 7 default Platforms (Node.js, PostgreSQL, Neo4j, MongoDB, Docker, MySQL, Redis).
2. **A migration deletes existing `Platform` nodes and their relationships** (`DETACH DELETE`) and drops the `platform_name_unique` constraint. This is a plain delete with no audit-log capture of the deleted stewardship/approval data — a deliberate choice given `Platform` was never evidence-backed to begin with, unlike the componentless-Technology cutover in ADR-0004 which preserved full pre-migration data in `AuditLog` because those entries *did* have real governance history worth keeping.
3. **`Technology` still requires a `Component`; that invariant is unchanged.** This ADR removes the exception ADR-0004 carved out for it, not the rule itself.
4. **Infrastructure/service governance is out of scope for Polaris**, not deferred to a future design. If a genuine need for it resurfaces, alternative 3 above (external evidence source, e.g. CMDB-fed) is the shape a future ADR should evaluate — not a return to manually-typed entries.
5. **The `type`/`domain` vocabulary Platform shared with Technology stays.** `type: platform`, `domain: infrastructure`/`data-platform`/`integration-platform` remain valid Technology classifications — they predate the `Platform` node and describe real, SBOM-observed technologies (e.g. a container-scanned OS image) just as validly as application code.

## Consequences

### Positive

- One invariant across the whole catalog: every entry is evidence-backed. No exception to explain, maintain, or extend.
- Removes the entire class of problem #814 represents — there is no manually-fed data path left to ask for version/EOL tracking on.
- Smaller surface: 6 API endpoints, 2 service/repository files, 10 Cypher query files, 3 pages, and their tests are deleted outright rather than grown.

### Negative

- Questions like "who approved our use of Postgres" or "which team owns Redis in production" are no longer answerable inside Polaris. That governance need doesn't disappear — it's just explicitly not this tool's job anymore.
- Stewardship and TIME-approval history recorded against the 7 seeded/dev Platforms (and any created in real deployments) is deleted, not archived — the migration performs a plain delete.
- `GET /api/dashboard/attention` loses `unstewardedPlatforms`/`samplePlatforms` from its response shape — a breaking change for any external Bearer-token consumer of that endpoint.
- Two `[contract]` tests are deleted as part of this change (`platform.service.spec.ts`: "create() — no Component required, unlike Technology" and "setApproval()"; `platform.repository.spec.ts`: "create()"). This is a deliberate contract removal, not an oversight — flagged here per this repo's testing convention for removing, not weakening, a `[contract]` test.

### Neutral

- Issue #814 is closed as not-planned, citing this ADR.
- Issues #815 ("replacement technology" field) and #829 (org-level TIME governance) both referenced `Platform` in their scope and are updated to drop it.
- If infrastructure governance is revisited later, alternative 3 (CMDB-fed evidence) is the recommended starting point over reintroducing manual entry.

## References

- [ADR-0004: Technology Requires a Component](0004-technology-requires-component.md) — introduces `Platform`; amended by this ADR (Decision point 3, "Platform is the explicit, narrow exception," and the associated Consequences, are superseded)
- Migration: `schema/migrations/common/20260815_remove_platform_node.up.cypher`
- Issue #814: `feat: Platform version/EOL tracking` — closed not-planned
- Issues #815, #829 — scope updated to remove Platform references
