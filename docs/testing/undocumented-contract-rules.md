# Rules Encoded in Tests but Not Written Down

This is a follow-up to [test-classification.md](test-classification.md). Every rule below was
tagged `[contract]` during that audit — meaning a test enforces it as a real requirement, not
incidental behavior — but a search of `docs/` and `app/pages/docs/` (the ADRs, the architecture
docs, and the in-app Concepts/Access Model/Graph Model pages) turned up no mention of it.

That doesn't mean any of these are wrong. It means the only record of the decision is the test
assertion itself — nobody wrote the "why" down anywhere a future reader would find it without
already knowing to look at the test. For each one, the question worth asking is: *was this
actually decided, or did it fall out of the first implementation and nobody's revisited it since?*

Each entry names the source test(s), states the rule in plain prose, and — where relevant — notes
what the closest existing doc says instead, so you can judge the gap for yourself.

> Most of the original findings from this audit have since been written up: governance/TIME
> approval defaults and audit-trail behavior in `app/pages/docs/concepts.vue`, several access
> rules in `app/pages/docs/access-model.vue`, the `SUBJECT_TO` relationship in
> `app/pages/docs/architecture/graph-model.vue`, the component-linking auth split in
> [ADR-0004](../architecture/decisions/0004-technology-requires-component.md), and the
> default-deny posture itself in
> [ADR-0005](../architecture/decisions/0005-default-deny-for-unreviewed-state.md). What's left
> below is genuinely unresolved — behavior with no natural home in the architecture-level docs,
> not yet judged worth writing up anywhere.

---

## Open items

### Component detail enrichment degrades per-source, not all-or-nothing

**Source:** `test/server/api/component-detail.spec.ts`

If the security-scorecard lookup fails for a component, package-metadata and vulnerability data
still render — each enrichment source independently reports `unavailable` rather than one
failure blanking the whole page. This is good behavior, but it's not documented anywhere, so
there's no written record that partial rendering is the intended UX versus a side effect nobody
decided on.

### Component dependency-tree traversal silently truncates via server-side depth/count limits

**Source:** `test/server/api/component-dependencies.spec.ts`

`maxDepth` and `limit` query params are clamped server-side to bound how much of the dependency
graph a single request can traverse. Reasonable as a resource guardrail, but nothing tells a
caller their requested depth/limit was silently reduced rather than honored — worth confirming
the API should clamp silently versus reject an out-of-range request outright.

---

## Suggested next step

Both remaining items are page-level API/UX behavior rather than architectural or governance
decisions, so they don't fit naturally into Concepts, Access Model, or Graph Model the way the
rest of this audit's findings did. If they're worth recording at all, the more likely home is
inline OpenAPI documentation on the two endpoints themselves (`server/api/components/[key].get.ts`
and `server/api/components/[key]/dependencies.get.ts`) rather than a new section in the in-app
docs.
