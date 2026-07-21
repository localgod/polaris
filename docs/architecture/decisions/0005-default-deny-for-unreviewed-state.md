# ADR-0005: Default-Deny for Unreviewed Governance State

## Status

**Accepted**

Date: 2026-07-20

## Context

Two independent parts of Polaris already implement the same posture without ever having agreed
to it in writing:

- `TeamRepository.checkApproval()` — when a team has never recorded a TIME stance on a
  technology or platform, the check doesn't return "unknown" or "pending" — it returns
  `eliminate`, the same value as if the team had actively voted to eliminate it.
- `LicenseRepository.isAllowed()` — when a license has no explicit `allowed` property set at
  all, it's treated as **not allowed**, the same outcome as a license someone reviewed and
  denied.

These landed on the same rule independently, in unrelated layers of the codebase, with no
cross-reference between them. Neither was ever written down as a decision — both were only
discoverable by reading the test suite (see `docs/testing/undocumented-contract-rules.md`, where
this pattern was first surfaced during a broader test-classification audit).

### The prompting question

Should "nobody has reviewed this yet" be indistinguishable from "this was reviewed and
rejected"? Or does the system need a third state — unreviewed/pending — that's excluded from
violation reporting until someone actively decides?

### Constraints discovered during review

- Both compliance surfaces (TIME approval, license allow-list) exist specifically to force teams
  to make an explicit governance call. A component or license that silently passes because
  nobody got around to reviewing it defeats that purpose.
- A "pending" third state was never implemented for either feature, and nothing in either data
  model tracks a review-in-progress status distinct from "no record exists."
- The two implementations already agree with each other. Whatever gets decided here should apply
  to both rather than let them drift apart the next time either is touched.

### Alternatives considered

1. **Default-allow** — treat unreviewed state as compliant until someone objects.
   Rejected — this would let ungoverned technologies and licenses pass silently, which
   undermines the entire reason these compliance checks exist. A catalog that defaults to "fine
   until proven otherwise" isn't exerting any governance pressure at all.

2. **A distinct "pending" state**, excluded from violation counts until resolved.
   Rejected for now — more accurate in principle, but it requires new state tracking and UI on
   both features, and risks becoming a bucket nothing ever forces anyone to empty: unlike a
   violation, a "pending" item creates no discomfort and nothing depends on resolving it. If this
   is revisited later, it should be its own decision with its own tracking design, not an
   incidental side effect of this one.

3. **Default-deny — unreviewed treated identically to actively rejected** (chosen).
   Matches what both existing implementations already do. Fail-safe: nothing is ungoverned by
   omission. The discomfort of showing up as a violation creates pressure to make and record an
   actual decision, rather than let something sit unreviewed indefinitely.

## Decision

**Default-deny is the standing rule for any governance check where a "reviewed" state can be
absent.** Concretely:

1. `TeamRepository.checkApproval()` continues to return `eliminate` when no explicit TIME
   approval exists for a team/technology (or team/platform) pair. This is now a documented
   rule, not an implementation accident.
2. `LicenseRepository.isAllowed()` continues to return `false` when a license has no explicit
   `allowed` value recorded. Same status change: documented, not incidental.
3. **Any future governance-decision surface** — anything asking "has this been approved /
   allowed / reviewed?" — should default to the most restrictive outcome when no explicit record
   exists, not to a neutral or pending state, unless a future ADR makes a specific, deliberate
   case for that feature to behave differently.

This does not change any existing behavior. It codifies behavior that was already shipped and
tested, so the next person who touches either code path — or builds a third governance
check — knows it was a decision, not a bug.

## Consequences

### Positive

- Nothing is ungoverned by omission: a component with zero team decisions, or a license with no
  recorded review, shows up as a violation instead of silently passing.
- Consistent behavior across TIME approvals and license allow-listing — understanding one
  teaches the other.
- Organizational pressure: an unreviewed item being visible as a "violation" nudges teams toward
  making an explicit approve/deny call instead of leaving things indefinitely unresolved.
- Future features inherit a clear precedent instead of each one re-deriving the same answer
  independently (as TIME approval and license allow-list already did, by coincidence).

### Negative

- No distinction between "actively rejected" and "never looked at" in violation views. A system
  that just onboarded, with a burst of newly-discovered components nobody's had a chance to
  review yet, will show the same violation signal as one full of components a team deliberately
  voted to eliminate. This can make violation counts noisy immediately after onboarding a new
  system or importing a large SBOM.
- If a genuine need for a "pending, not yet reviewed" state emerges later, this ADR will need to
  be revisited or superseded — default-deny and "pending" are not compatible in the same field.

### Neutral

- No code or schema changes — this ADR documents and commits to existing behavior.
- `concepts.vue`'s Team Approvals section describes the observable outcome ("violations are
  detected when a component appears without a corresponding approval, or when the assigned
  category is Eliminate") without stating that these two cases are implemented as the literal
  same value. A follow-up doc update could make that explicit for readers of the in-app docs.

## References

- `test/server/repositories/team.repository.spec.ts` — `describe('checkApproval()')`
- `test/server/repositories/license.repository.spec.ts` — `describe('isAllowed()')`
- `docs/testing/undocumented-contract-rules.md` — where this pattern was first identified as an
  undocumented rule shared by two unrelated files
- Related: [ADR-0004: Technology Requires a Component](0004-technology-requires-component.md) —
  similar philosophy of closing an implicit gap with an explicit, narrow rule rather than an
  ambient exception
