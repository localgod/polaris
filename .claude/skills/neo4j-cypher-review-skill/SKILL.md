---
name: neo4j-cypher-review-skill
description: Review Neo4j Cypher queries for best practices, maintainability, correctness risks, and speed/performance tuning opportunities.
---

# Neo4j Cypher Query Reviewer

## Purpose
Use this skill when asked to review, improve, or assess Neo4j Cypher queries. Focus on:

1. **General Cypher best practice**
2. **Maintainability and readability**
3. **Performance and speed**
4. **Correctness and production risk**
5. **Actionable rewrite suggestions**

The review must be practical, neutral, and evidence-based. Do not assume a query is wrong only because it is complex; explain the trade-offs.

## Required inputs to request if missing
If the user provides only a query, review it based on what is visible, but state assumptions. If possible, ask for the following context only when it is needed for a reliable review:

- Neo4j version, if version-specific syntax or planner behavior matters
- Relevant labels, relationship types, and property names
- Existing indexes and uniqueness constraints
- Expected result cardinality and data volume
- Whether the query is read-only, write-heavy, batch/import, or interactive/API-facing
- Output of `EXPLAIN` or `PROFILE`, especially if performance is the main concern

Do **not** block the review if this information is missing. Provide a first-pass review and list what additional evidence would improve confidence.

## Review workflow
Follow this step-by-step workflow for every Cypher review:

### 1. Classify the query intent
Identify whether the query is primarily:

- Lookup/read query
- Traversal/path query
- Aggregation/reporting query
- Write/update/delete query
- Import/batch query
- Recommendation/search query
- Administrative/schema query

Explain why this matters for review criteria.

### 2. Summarize the query in plain language
Provide a short summary of what the query appears to do. This confirms understanding and helps detect accidental Cartesian products, unintended optional matches, or broad traversals.

### 3. Check correctness and semantic risk
Look for:

- Ambiguous relationship direction
- Missing labels on starting nodes
- Unbounded or overly broad variable-length paths
- Unintended Cartesian products from disconnected patterns
- `OPTIONAL MATCH` followed by `WHERE` that may turn it into an effective mandatory match
- Incorrect `MERGE` granularity causing duplicate or over-merged data
- Write queries without stable keys or constraints
- Deletes without tight scoping
- Aggregations that mix grouped and non-grouped values unintentionally

### 4. Check maintainability
Assess whether the query is easy to understand, safely modify, and operate over time:

- Meaningful variable names such as `customer`, `shipment`, `order`, not only `a`, `b`, `n`, `m`
- Clear clause ordering: anchor, traverse, filter, aggregate, return/write
- Avoiding overly long single queries when subqueries would clarify intent
- Use of comments for non-obvious domain rules
- Avoiding repeated expressions by using `WITH` or `LET` where appropriate
- Consistent casing and formatting
- Returning explicit projection maps instead of whole graph entities when used by APIs

### 5. Check performance and speed
Focus on reducing work early and avoiding unnecessary graph expansion:

- Start from selective anchor nodes using labels and indexed properties
- Filter as early as possible
- Return only required data, not entire nodes/relationships unless explicitly needed
- Bound variable-length traversals
- Avoid accidental Cartesian products
- Avoid eager operations when possible; look for `DISTINCT`, large `collect()`, broad `ORDER BY`, or write/read interleaving that may force materialization
- Use parameters instead of query literals in application code to improve plan reuse
- Consider index-backed lookups for equality/range/text/prefix search where appropriate
- Be cautious with `SKIP` pagination on large offsets; prefer keyset/seek pagination where feasible
- For write/batch operations, consider chunking with `CALL { ... } IN TRANSACTIONS` or an application-side batching strategy

### 6. Ask for or interpret `EXPLAIN` / `PROFILE` when speed matters
If the user provides a plan, inspect:

- Starting operator: node index seek/scan vs label/all-node scan
- Estimated vs actual rows
- Row explosion points
- High DB hits/page cache misses
- CartesianProduct, Eager, NodeByLabelScan, AllNodesScan, Expand(All), large Sort/Distinct/Aggregation
- Whether indexes are being used as intended

If no plan is provided, recommend running:

```cypher
EXPLAIN <query>
```

or for safe non-mutating queries:

```cypher
PROFILE <query>
```

For mutating queries, warn that `PROFILE` executes the query and should only be used in a safe environment or transaction that can be rolled back.

## Output format
Use this format unless the user asks for something else:

```markdown
## Cypher Review

### 1. Executive Assessment
- Overall rating: Good / Acceptable / Needs attention / High risk
- Main concern: <one sentence>
- Expected impact: <maintainability, speed, correctness, or operational risk>

### 2. What the Query Appears to Do
<plain-language summary>

### 3. Findings
#### Critical
- <finding, impact, recommendation>

#### Important
- <finding, impact, recommendation>

#### Minor / Maintainability
- <finding, impact, recommendation>

### 4. Suggested Rewrite
```cypher
<improved query, if applicable>
```

### 5. Performance Notes
- Index/constraint recommendations
- Expected planner improvements
- What to validate with EXPLAIN/PROFILE

### 6. Assumptions and Open Questions
- <items that would improve confidence>
```

Use severity carefully:

- **Critical**: likely incorrect result, production safety issue, data corruption risk, or severe unbounded performance risk
- **Important**: likely performance/maintainability issue with material impact
- **Minor**: style/readability or low-risk improvement

## Rewrite principles
When proposing rewrites:

- Preserve the user’s apparent intent.
- Prefer explicit labels and relationship directions.
- Use parameters such as `$customerId` rather than string literals for application queries.
- Keep query structure readable; do not over-optimize into obscure syntax.
- Explain why the rewrite is better.
- If there are multiple valid options, provide pros and cons.

## Index and constraint guidance
Recommend indexes or constraints only when supported by the query pattern and likely workload. Prefer:

```cypher
CREATE INDEX entity_property_idx IF NOT EXISTS
FOR (n:Label) ON (n.property);
```

For stable unique identifiers:

```cypher
CREATE CONSTRAINT label_property_unique IF NOT EXISTS
FOR (n:Label) REQUIRE n.property IS UNIQUE;
```

Explain that indexes improve lookup/selectivity but add write overhead and storage cost.

## Common Cypher review heuristics
Use the detailed checklist in `references/review-checklist.md` when a deeper review is needed.
Use `references/examples.md` for typical before/after examples.
Use `references/output-template.md` if a consistent review template is needed.
