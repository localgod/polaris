# ADR-0008: Centralize TIME Governance at Organization Level

## Status

**Accepted**

Date: 2026-08-17

## Context

TIME (Tolerate / Invest / Migrate / Eliminate) is currently recorded as per-team
`APPROVES` relationships between `Team` and `Technology` nodes. The Radar derives
a canonical value by majority vote across team approvals, with severity-based
tie-breaking when teams disagree.

This model creates four structural problems:

1. **No authoritative decision.** A Technology has no single lifecycle verdict.
   The Radar value is an aggregate of independent team opinions, not an
   organization decision. It can change any time a team adds or removes an
   approval without any governance act taking place.

2. **Ambiguous compliance.** A minority `eliminate` approval still produces
   compliance violations for the teams that hold it, even when the majority says
   `invest`. There is no way to distinguish "this team disagrees with the
   consensus" from "this team is out of compliance with an agreed standard".

3. **Concepts conflated on one relationship.** Policy (what the org has decided),
   approval (this team's stance), exception (deliberate, temporary deviation), and
   applicability (which teams are in scope) are all encoded on the same
   `APPROVES` edge. No single relationship property cleanly represents any one of
   them.

4. **Scope coverage gaps.** Organization-scoped `VersionConstraint` nodes are
   applied by materializing `SUBJECT_TO` relationships to every team that exists
   at creation time. Teams created later are not automatically covered.

### Alternatives considered

1. **Weighted voting** (e.g. steward team's vote counts double). Rejected —
   still no single authoritative decision; adds complexity without fixing the
   conceptual conflation.

2. **Require unanimous agreement for the Radar.** Rejected — creates a veto
   mechanic that punishes disagreement with paralysis rather than surfacing it
   explicitly.

3. **Keep team voting; add an optional override field on Technology.** Rejected —
   two conflicting sources of truth with no clear resolution rule.

## Decision

Introduce one organization-level `TechnologyPolicy` per Technology, owned by the
organization, as the sole authoritative TIME decision. Team approvals become
read-only historical data and are eventually removed after a migration
compatibility period.

**Graph model:**

```
(Organization {name:'default'})
  -[:SETS]->
(TechnologyPolicy {
  id, time, rationale?, migrationTarget?, status:'draft|active|archived',
  effectiveDate?, expiryDate?, createdBy, createdAt, updatedAt
})
  -[:GOVERNS]->
(Technology)
```

**Exceptions** (`PolicyException`) record deliberate, temporary, scoped
deviations. They must carry reason, approver, effective date, and expiry. They
override the org policy for a specific `Team` or `System` context and are
visibly distinct from the policy itself. Exception specificity: System > Team;
environment is a qualifier on either scope.

```
(PolicyException {
  id, time, reason, approver, scope:'team|system', scopeName,
  environment?, effectiveDate, expiresAt, createdAt, revokedAt?
})
  -[:OVERRIDES]->(TechnologyPolicy)
  -[:APPLIES_TO]->(Team|System)
```

**Policy resolution** (deterministic, no voting):

1. Find the single active `TechnologyPolicy` for the Technology.
2. Apply a valid (unrevoked, unexpired) `PolicyException` matching the context;
   specificity System > Team.
3. If no active policy → `unclassified` (treated as non-compliant).
4. `invest`/`tolerate` → compliant; `migrate` → migration-needed;
   `eliminate`/`unclassified` → violation.

**Authorization:**

- Any authenticated user may view policies and exceptions.
- A team's **steward** may propose changes (create/update a draft policy for
  their stewarded Technology).
- An **org-admin** (a new `orgAdmin: boolean` flag on User, distinct from the
  existing `superuser` role) may activate, archive, and create/revoke
  exceptions. Superusers can also do all of these.

**VersionConstraint org-scope:** `scope = 'organization'` constraints are
evaluated dynamically at query time rather than by materializing `SUBJECT_TO`
relationships to all current teams. New teams automatically inherit them.

**Migration:** For each Technology, if all existing team approvals have the
same TIME value, automatically create a draft policy with that value (labelled
`migrated-unanimous`). Conflicting values go to a `PolicyReviewQueue` for
manual resolution. Legacy `APPROVES` relationships are kept read-only; approval
mutation endpoints return `410 Gone` pointing to the policy API.

## Consequences

### Positive

- Every Technology has zero or one authoritative TIME decision. The Radar reads
  a fact, not a computed aggregate.
- Compliance is deterministic: the same context always resolves the same
  effective TIME value.
- Teams, stewardship, waivers, scorecards, and remediation accountability are
  unchanged — this change narrows TIME to one place, it does not diminish team
  governance.
- New teams automatically inherit organization-scoped policies and version
  constraints without any migration step.
- Exceptions are explicit, temporary, audited, and visibly distinct from policy.

### Negative

- A team can no longer unilaterally set its TIME opinion for a technology it
  uses — it can only propose a draft or request an exception.
- Technologies with no active policy are `unclassified` (non-compliant), which
  may produce a large wave of violations immediately after migration if many
  technologies currently have conflicting team approvals that must go to manual
  review.
- The Radar no longer shows per-team TIME variation; that information is
  accessible via exception records if needed.

### Neutral

- Legacy `APPROVES` data is preserved read-only during the compatibility period.
- `PolicyReviewQueue` nodes flag technologies needing human attention during
  migration; they are removed once reviewed.
- Issue #829 (the originating request) is closed as implemented.

## References

- Issue #829: `feat: centralize TIME governance at organization level`
- [ADR-0005](0005-default-deny-for-unreviewed-state.md) — established
  `unclassified` as non-compliant; this ADR extends that to cover the absence
  of an org-level policy, not just a team-level approval.
- [ADR-0006](0006-governance-applies-to-direct-dependencies-only.md) —
  direct-dependency-only governance scope is unchanged by this ADR.
- [ADR-0007](0007-remove-platform-concept.md) — removed `Platform`; this ADR
  governs `Technology` only, consistent with that decision.
