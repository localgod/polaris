# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for the Polaris project.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences.

## Why ADRs?

- **Document decisions**: Capture the reasoning behind architectural choices
- **Knowledge sharing**: Help new team members understand why things are the way they are
- **Historical context**: Preserve the context that led to decisions
- **Prevent revisiting**: Avoid rehashing old discussions
- **Accountability**: Make decision-making transparent

## ADR Format

We use the format proposed by Michael Nygard with the following sections:

1. **Title**: Short noun phrase describing the decision
2. **Status**: Proposed, Accepted, Deprecated, Superseded
3. **Context**: What is the issue we're seeing that motivates this decision?
4. **Decision**: What is the change we're proposing and/or doing?
5. **Consequences**: What becomes easier or more difficult to do because of this change?

## Naming Convention

ADRs are numbered sequentially and formatted as:

```
NNNN-title-with-dashes.md
```

Examples:
- `0001-use-neo4j-for-graph-database.md`
- `0002-implement-service-layer-pattern.md`

## Creating a New ADR

1. Copy the template: `cp 0000-template.md NNNN-your-decision.md`
2. Update the number (use the next sequential number)
3. Fill in all sections
4. Submit as part of your PR
5. Update the status as the decision evolves

## ADR Lifecycle

- **Proposed**: Decision is under discussion
- **Accepted**: Decision has been approved and implemented
- **Deprecated**: Decision is no longer recommended but still in use
- **Superseded**: Decision has been replaced (link to new ADR)

## Index

<!-- Keep this list updated as ADRs are added -->

- [ADR-0001: Use Neo4j for Graph Database](0001-use-neo4j-for-graph-database.md) - Accepted
- [ADR-0002: Implement Service Layer Pattern](0002-implement-service-layer-pattern.md) - Accepted
- [ADR-0003: Exclude CVE and Vulnerability Management](0003-exclude-cve-vulnerability-management.md) - Accepted

## References

- [Architecture Decision Records (Joel Parker Henderson)](https://github.com/joelparkerhenderson/architecture-decision-record)
- [Documenting Architecture Decisions (Michael Nygard)](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
