# ADR-0004 Technology Requires a Component

## Status

**Accepted**

Date: 2026-07-02

## Context

Prior to this decision, `Technology` was a fully independent, freely-creatable entity. Any authenticated user could create one via `/technologies/new` by supplying only a name and a type — no evidence that the technology was actually in use anywhere was required. Linking a `Technology` to the `Component` nodes discovered by SBOM scanning (`IS_VERSION_OF`) was always a separate, optional, after-the-fact step.

In practice this meant the Technology catalog — and everything built on top of it (TIME-framework approvals, the technology radar, version constraints) — could contain entries with no relationship to what was actually running in any scanned system. The catalog could not be trusted as a record of real usage; it was equally a record of real usage and of whatever anyone had typed into a form.

### The prompting question

Should it be possible to create a `Technology` node for something a SBOM scan can never observe — for example, typing in "MongoDB" by hand — the same way it's possible to create one for something a SBOM scan *did* observe, like Vue showing up as a real `package.json` dependency?

### Constraints discovered during design

- Neo4j Community Edition has no relationship-existence or cardinality constraints. Any "Technology must have a Component" rule can only be enforced in application code, never as a database constraint.
- SBOM ingestion (`SBOMService`/`SBOMRepository`) never creates `Technology` nodes or `IS_VERSION_OF` edges — it only ever creates `Component`/`System` nodes and `USES`/`DEPENDS_ON` edges. The link to `Technology` has always been a separate, human-curated step (originally ad hoc; PR #727 added a proper triage queue at `/admin/component-links`).
- A real, immediate need exists to govern infrastructure and services that a source-manifest SBOM scan can *never* surface — databases, cloud services, container runtimes. `npm run seed`'s default fixtures (Angular, Node.js, PostgreSQL, Neo4j, MongoDB, Docker, MySQL, Redis) were entirely made up of this pattern: eight technologies, zero components, by construction (nothing in the seed pipeline could attach a real component before `seed:github` runs).
- Existing schema vocabulary already anticipated the infrastructure/application split: `Technology.type` already included `platform`, `operating-system`, `container`; `Technology.domain` already included `infrastructure`, `data-platform`.

### Alternatives considered

1. **Enforce the rule but provide no escape valve.**
   Rejected — this would make it impossible to govern real, deliberate infrastructure decisions ("we're standardizing on Postgres over MySQL") that legitimately deserve a TIME stance, ownership, and an audit trail, even though no SBOM scan will ever produce evidence for them.

2. **Add a `provenance` flag (`discovered` vs. `declared`) to the same `Technology` node**, gating the hard requirement only for `discovered` entries.
   Rejected — this reopens exactly the guarantee this ADR exists to create. Once any code path can produce a componentless `Technology`, the catalog's meaning degrades from "every Technology is evidence-backed" to "most Technologies are evidence-backed, check the flag" — a weaker, easier-to-erode invariant, and one where a UI bug or a missed check silently reintroduces exactly the problem this decision is meant to close.

3. **A separate `Platform` node type for non-SBOM-observable technology** (chosen).
   Keeps `Technology` a strict, always-evidence-backed catalog with no exceptions, while giving infrastructure governance a real, explicitly-labeled home rather than deleting the need for it. Mirrors ThoughtWorks' own Tech Radar, which separates "Platforms" from "Languages & Frameworks" for the same underlying reason: infrastructure and dependencies are discovered differently and should be governed as visibly distinct categories, not conflated into one list.

## Decision

1. **`Technology` can only be created by claiming an existing, currently-unlinked `Component`.** `TechnologyService.createFromComponent()` requires a `componentName` that resolves to at least one `Component` with no `IS_VERSION_OF` edge to any `Technology`; the Technology node and its `IS_VERSION_OF` edge(s) are created atomically in one Cypher statement (`technologies/create-from-component.cypher`). Zero matching unlinked components → the request is rejected (404), not silently satisfied by creating an orphan.

2. **The `/admin/component-links` queue is the only creation surface.** The standalone `/technologies/new` form is removed. "Create a Technology" is now "confirm/promote an unlinked, directly-used Component" — the same guided-matching workflow already used to *link* components to existing technologies now also handles *creating* new ones.

3. **`Platform` is the explicit, narrow exception.** A sibling node type for manually-declared, non-SBOM-observable technology (databases, cloud services, container runtimes). It carries the same stewardship (`STEWARDED_BY`) and TIME-approval (`APPROVES`) shape as `Technology`, reuses the same `type`/`domain` vocabulary (the taxonomy is orthogonal to provenance — a Technology can legitimately be `type: operating-system` too, if a container-image scan genuinely surfaced one as a Component), but has no Component relationship and no version tracking. Creating one is superuser-only, so the "no evidence required" path stays deliberate and rare rather than becoming an ambient escape hatch.

4. **Existing componentless Technology nodes were cut over, not grandfathered.** A one-time migration (`20260702_180000_cutover_componentless_technologies`) converted the infra-flavored ones (by `type`/`domain`) to `Platform`, preserving their stewardship and approval history, and deleted the rest — recording full pre-migration node data in `AuditLog` entries for traceability, since the migration itself cannot be reversed with full fidelity.

5. **Attaching an additional Component to an already-existing Technology carries the same two-tier auth split as the queue itself.** `POST /api/technologies/{name}/components` accepts either `componentName` + `componentVersion` (legacy, exact-match, gated by `requireAuth` — any authenticated user) or `purl` (gated by `requireSuperuser`). This is not an inconsistency: the `purl` path is the same guided-matching mechanism `/admin/component-links` uses (point 2), it can match more loosely than an explicit name+version pair, and it additionally refreshes `Team→Technology` `USES` edges for every affected `System` — a wider blast radius than the legacy path's single link. The legacy path predates the component-links queue and remains available as a narrower, lower-privilege escape hatch for the exact-match case. Both branches live behind the same route, which makes the split easy to miss when reading the endpoint in isolation — see `linkComponent()`/`linkComponentByPurl()`/`linkComponentByName()` in `TechnologyService`.

## Consequences

### Positive

- The `Technology` catalog, the TIME-framework approvals built on it, and the technology radar can now be trusted to reflect real, observed usage — not aspirational or manually-typed entries.
- Governance of genuinely non-SBOM-observable infrastructure is still possible, and is now clearly, visibly distinguished from evidence-backed technology rather than silently mixed into the same list.
- The invariant is structurally hard to violate by accident: because nothing in the application can currently remove a `Component`'s `IS_VERSION_OF` edge once set, enforcing the rule at creation time is sufficient — there is no code path that can re-orphan a `Technology` after the fact.

### Negative

- The rule can only be enforced in application code, on every write path that creates a `Technology` node (`TechnologyService`, `schema/scripts/seed.ts`, `schema/scripts/seed-github.ts`, and any future migration). A new code path that does a raw `CREATE (:Technology {...})` and skips the service layer would silently reintroduce a componentless Technology; nothing at the database level prevents this.
- `Technology` and `Platform` share the `type`/`domain` vocabulary but are different node labels, so the same name could in principle exist as both a `Technology` and a `Platform` simultaneously (e.g. a `Platform` named "Node.js" created today, and a real `Technology` named "Node.js" created later once a genuine Component surfaces it). This is not prevented and would need a human to notice and reconcile.
- Components with no `purl`, or that are only ever seen as transitive (non-direct) dependencies, never appear in the `/admin/component-links` queue and so can never seed a new Technology under this model — arguably a feature (only deliberate, direct dependencies become governed technologies) but a real limitation worth knowing about.
- Platform has no version/EOL tracking in this iteration — a known, deliberately deferred gap, not an oversight.

### Neutral

- `POST /api/technologies` is a breaking API change for any existing Bearer-token consumers relying on the old `{name, type}`-only creation shape.
- The migration is one-directional. Its `.down.cypher` is intentionally a no-op beyond pointing at the `AuditLog` trail — Cypher migrations are not a backup mechanism.

## References

- Migration: `schema/migrations/common/20260702_150000_create_platform_node.up.cypher`
- Migration: `schema/migrations/common/20260702_180000_cutover_componentless_technologies.up.cypher`
- PR #727: guided PURL-to-Technology matching queue for SBOM governance (the precursor this decision builds on)
- `server/api/technologies/[name]/components.post.ts`: the two-tier `componentName`+`componentVersion` vs `purl` linking endpoint described in Decision point 5
- `test/server/api/technology-component-link.spec.ts`: contract coverage for both linking paths and their respective auth guards
- Related: [ThoughtWorks Technology Radar](https://www.thoughtworks.com/radar) — the "Platforms" vs. "Languages & Frameworks" quadrant split this ADR's `Platform`/`Technology` split mirrors
