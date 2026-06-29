# Neo4j Cypher Query Reviewer Claude Skill

This folder contains a Claude skill for reviewing Neo4j Cypher queries with emphasis on:

- General best practices
- Maintainability
- Query speed/performance
- Correctness and production risk

## Installation
Upload or copy the folder `neo4j-cypher-review-skill` into your Claude skills area, depending on whether you use Claude.ai, Claude Code, or an API-based setup.

At minimum, Claude needs the `SKILL.md` file. The `references/` folder provides deeper checklists and examples for more consistent reviews.

## Suggested test prompt

```text
Use the Neo4j Cypher Query Reviewer skill to review this query for maintainability and speed:

MATCH (n {id: '123'})--(m)
RETURN n, m
```
