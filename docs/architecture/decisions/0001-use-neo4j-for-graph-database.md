# ADR-0001: Use Neo4j for Graph Database

## Status

**Accepted**

Date: 2025-10-15 (retroactive)

## Context

The Polaris project needed a database solution to model complex relationships between:
- Technologies and their versions
- Systems and their components
- Teams and their governance responsibilities
- Policies and their enforcement rules
- SBOM data with nested component relationships

Traditional relational databases would require complex join tables and make traversal queries difficult. Document databases would struggle with relationship queries.

### Requirements

1. **Complex Relationships**: Model many-to-many relationships with properties
2. **Graph Traversals**: Efficiently query "which systems use deprecated technologies"
3. **Flexible Schema**: Evolve schema as requirements change
4. **SBOM Support**: Handle nested component hierarchies
5. **Query Language**: Expressive language for relationship queries

### Alternatives Considered

1. **PostgreSQL with JSONB**: Good for flexibility but poor for relationship queries
2. **MongoDB**: Good for documents but weak for graph traversals
3. **ArangoDB**: Multi-model database but less mature ecosystem
4. **Neo4j**: Purpose-built graph database with mature tooling

## Decision

We will use Neo4j as the primary database for Polaris.

### Key Factors

1. **Native Graph Storage**: Optimized for relationship traversals
2. **Cypher Query Language**: Intuitive pattern-matching syntax
3. **Mature Ecosystem**: Strong community, documentation, and tooling
4. **APOC Library**: Rich set of procedures for complex operations
5. **Docker Support**: Easy to run in development and production
6. **Bolt Protocol**: Efficient binary protocol for Node.js integration

### Implementation

- Use official Neo4j Docker image
- Connect via `neo4j-driver` npm package
- Manage schema via migration scripts
- Use Cypher for all queries
- Store queries as `.cypher` files for reusability

## Consequences

### Positive

1. **Natural Modeling**: Graph structure matches domain model
2. **Efficient Queries**: Relationship traversals are O(1) operations
3. **Flexible Schema**: Easy to add new node types and relationships
4. **Rich Queries**: Cypher makes complex queries readable
5. **Visualization**: Built-in browser for exploring data
6. **SBOM Support**: Nested components map naturally to graph structure

### Negative

1. **Learning Curve**: Team needs to learn Cypher and graph concepts
2. **Hosting Complexity**: Requires Neo4j-specific hosting (not just any SQL database)
3. **Backup Strategy**: Different from traditional SQL backups
4. **Limited ORMs**: Fewer abstraction layers compared to SQL databases
5. **Cost**: Enterprise features require licensing (though Community Edition is free)

### Neutral

1. **Migration Management**: Custom migration system needed (no Prisma/TypeORM equivalent)
2. **Testing**: Requires Neo4j instance for integration tests
3. **Type Safety**: Manual TypeScript interfaces (no automatic schema generation)

## References

- Neo4j Documentation: https://neo4j.com/docs/
- Cypher Manual: https://neo4j.com/docs/cypher-manual/
- `schema/` directory: Migration and query management
- `nuxt-neo4j` module: Nuxt integration
