# ADR-0006: Governance Signals Apply to Direct Dependencies Only

## Status

**Accepted**

Date: 2026-07-27

## Context

Polaris ingests SBOMs that describe two categories of dependency:

- **Direct dependencies** — packages explicitly declared by a team in their own manifest (e.g. `package.json`, `pom.xml`, `requirements.txt`). The team chose to use this package and can upgrade or replace it independently.
- **Transitive dependencies** — packages pulled in automatically because a direct dependency requires them. A team cannot directly change which version of a transitive dependency is used without first upgrading the direct dependency that pulls it in.

Both categories are stored as `Component` nodes in the graph. The `USES` relationship edge from `System` to `Component` carries an `isDirect` boolean property that distinguishes them.

### The prompting question

When Polaris warns a team that a component has a disallowed license, violates a version constraint, is approaching EOL, or carries a known vulnerability — should that warning appear for *every* component in the dependency tree, or only for the components the team explicitly declared?

### Why transitive-only alerts create noise without accountability

A team cannot act on a warning about a transitive dependency without understanding which direct dependency pulls it in, updating that direct dependency (which may be non-trivial), and accepting whatever indirect consequences come with that upgrade. Surfacing raw transitive violations:

1. **Inflates violation counts** — a single vulnerable transitive package pulled in by ten different direct dependencies appears as ten separate violations, masking the actual blast radius.
2. **Obscures ownership** — the team that owns the direct dependency pulling in a vulnerable transitive is the one who must act, but Polaris currently has no way to encode "fix this indirectly via that."
3. **Creates alert fatigue** — teams see hundreds of warnings they cannot directly address, reducing trust in the signals that do require action.
4. **Makes metrics misleading** — a dashboard showing "47 license violations" when 43 of them are transitive gives a false picture of actionable risk.

### What transitive visibility is still needed

Transitive dependencies are not irrelevant — a team may legitimately want to understand their full dependency tree for audit or risk-mapping purposes. Polaris must preserve the ability to drill into transitive dependencies. The principle is: **govern on direct, inform on transitive**.

### Constraints

- The `USES` relationship already carries `isDirect` on every edge written by the SBOM ingestor (`SBOMService`/`SBOMRepository`). The data to filter correctly already exists.
- Several existing Cypher queries do correctly restrict to `isDirect = true` (advisory hotspots, vulnerability-affected systems, version sprawl, link suggestions). The constraint is not universal yet.
- The violations query files for licenses, version constraints, and compliance already support an optional `$directOnly` parameter — they just are not called with it by default from the UI and key API callers.

### Alternatives considered

1. **Show all dependencies, let users filter.** Rejected — the default experience is what most users see. Transitive-inclusive defaults undermine trust in the numbers. Users who want the full picture can opt in via a "show transitive" toggle.

2. **Show all dependencies and label them as direct vs transitive.** Partially valid for the detailed violations list view, but does not solve the dashboard/summary count problem. Aggregate numbers on a dashboard cannot be filtered by the viewer after the fact.

3. **Govern only on direct, inform on transitive (chosen).** Matches how modern dependency audit tools (npm audit, OWASP Dependency-Check, Renovate) treat actionability. It is consistent with how Polaris already works on the system issues page (direct-only default, opt-in toggle for transitive).

## Decision

1. **All governance signals default to direct dependencies only.** License violation counts, version constraint violation counts, compliance violation counts, EOL exposure counts, and any other health or policy alerts shown to users — whether in dashboards, summary widgets, or violation list pages — must reflect only components where `u.isDirect = true` on the `USES` edge connecting the system to that component.

2. **Transitive drill-down is preserved but opt-in.** List views (violations pages, component browsers) may expose a "Include transitive dependencies" toggle or filter parameter, defaulting to off. Aggregate numbers on dashboards do not expose this toggle — the headline numbers are always direct-only.

3. **The `isDirect` filter must be applied at the query layer, not the application layer.** Filtering after fetching all results is prohibited for governance signals because it silently inflates query cost and makes pagination counts incorrect.

4. **New queries that traverse `USES` edges for governance purposes must include `u.isDirect = true`.** The code-review checklist for any new Cypher query touching `[:USES]` in the context of a violation, warning, health signal, or policy check must verify the `isDirect` predicate is present.

5. **The following specific defects must be remediated:**

   | Defect | File | Fix |
   |--------|------|-----|
   | Dashboard license-violation count includes transitive deps | `server/database/queries/dashboard/license-violations.cypher` | Add `AND u.isDirect = true` to the WHERE clause |
   | Dashboard EOL system count includes systems with transitive EOL deps | `server/database/queries/dashboard/lifecycle-summary.cypher` | Change `OPTIONAL MATCH (sys:System)-[:USES]->(c)` to `OPTIONAL MATCH (sys:System)-[u:USES]->(c) WHERE u.isDirect = true` |
   | EOL approaching/expired pages include transitive EOL components | `server/database/queries/components/find-eol-candidates.cypher` | Add `WHERE u.isDirect = true` to the `MATCH (sys:System)-[u:USES]->(c)` |
   | License violations list shows transitive by default | `app/pages/violations/licenses.vue` | Pass `direct: 'true'` in the `useFetch` query params by default; add toggle to opt into transitive view |
   | Version constraint violations list shows transitive by default | `app/pages/violations/index.vue` | Pass `direct: 'true'` in the `useFetch` query params by default; add toggle to opt into transitive view |
   | Dashboard attention panel violation counts include transitive | `server/api/dashboard/attention.get.ts` | Pass `directOnly: true` to `complianceService.findViolations()` and `versionConstraintService.getViolations()` |
   | Main dashboard violation count widget includes transitive | `server/api/dashboard.get.ts` | Pass `{ directOnly: true }` to `versionConstraintService.getViolations()` |

## Consequences

### Positive

- Dashboard and violation-list numbers accurately reflect what teams can actually act on, reducing alert fatigue and improving trust in the metrics.
- Violation counts across license, version, and compliance surfaces become consistent with each other and with the already-correct system-issues page.
- Compliance conversations become productive: "you have 12 violations" means "12 things you can change in your manifest," not "12 things in your entire dependency tree."

### Negative

- Headline violation counts will drop when the fixes are deployed. This is expected and correct, but must be communicated to stakeholders who may be tracking trend lines, since the decrease is an artifact of the scope change, not a real improvement in compliance posture.
- Some transitive-only violations that were previously visible in list views will be hidden by default. Teams who were tracking those will need to use the opt-in transitive view.

### Neutral

- The `$directOnly` parameter already exists on all three violation query files (licenses, version-constraints, compliance). Remediation is primarily a matter of wiring up the parameter at the call site; no new query infrastructure is required.
- The `USES` edge's `isDirect` property is authoritative — it is written by the SBOM ingestor and is never modified after ingestion. Filtering on it at query time is the correct and efficient approach.

## References

- `server/database/queries/systems/issues.cypher` — the existing system-issues query that correctly defaults to direct-only with an opt-in toggle; the pattern this ADR generalises
- `server/database/queries/components/detect-version-sprawl.cypher` — comment on line 1 explicitly justifies the direct-only restriction: "a team can only change the version it declares in its own manifest"
- `server/database/queries/health-refresh/get-advisory-hotspots.cypher` — already correct: `WHERE u.isDirect = true`
- ADR-0004 (Technology Requires a Component) — note in Consequences section: "Components that are only ever seen as transitive (non-direct) dependencies never appear in the `/admin/component-links` queue and so can never seed a new Technology" — this is a deliberate feature of the same principle: governance is anchored to direct, observable usage
