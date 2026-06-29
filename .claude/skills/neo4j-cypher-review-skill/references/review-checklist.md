# Neo4j Cypher Review Checklist

## Correctness and safety
- Does every node pattern that should be constrained have a label?
- Are relationship directions intentional?
- Are disconnected patterns intentional, or do they create a Cartesian product?
- Are variable-length patterns bounded, e.g. `*1..3` rather than `*`?
- Are `OPTIONAL MATCH` and `WHERE` combined correctly?
- Does `MERGE` use an appropriate business key rather than mutable/descriptive properties?
- Are destructive operations tightly scoped?
- Could null values alter the result in an unexpected way?

## Maintainability
- Are variable names meaningful and domain-oriented?
- Is the query structured in clear phases?
- Are repeated expressions factored into `WITH` or `LET`?
- Would a subquery improve readability or control cardinality?
- Are return structures explicit and stable for API consumers?
- Is formatting consistent and readable?

## Performance
- Does the query start from the most selective anchor?
- Are filters applied before expansions where possible?
- Are required indexes/constraints present?
- Are entire nodes/relationships returned unnecessarily?
- Are large collections, sorts, distincts, or aggregations avoidable?
- Is pagination implemented safely for large result sets?
- Are parameters used instead of literals in application code?
- Does the query risk row explosion?
- For batch writes, is work chunked into safe transaction sizes?

## Query plan review
Inspect `EXPLAIN` or `PROFILE` for:
- `AllNodesScan`
- Unexpected `NodeByLabelScan`
- `CartesianProduct`
- `Eager`
- Large `Sort`, `Distinct`, or aggregation steps
- High actual rows compared with estimates
- High DB hits or page cache misses
- Missing index seeks on selective lookups
