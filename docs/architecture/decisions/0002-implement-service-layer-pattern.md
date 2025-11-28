# ADR-0002: Implement Service Layer Pattern

## Status

**Accepted**

Date: 2025-10-16 (retroactive)

## Context

As the Polaris API grew, we needed a consistent pattern for organizing business logic and data access. Without clear separation, we risked:
- Business logic scattered across endpoints
- Direct database access from HTTP handlers
- Difficulty testing business rules
- Inconsistent response formats
- Code duplication

### Requirements

1. **Separation of Concerns**: Clear boundaries between layers
2. **Testability**: Easy to unit test business logic
3. **Consistency**: Uniform patterns across all endpoints
4. **Maintainability**: Easy to understand and modify
5. **Reusability**: Share logic across multiple endpoints

### Alternatives Considered

1. **Fat Controllers**: All logic in endpoint handlers (rejected - hard to test)
2. **Direct Repository Access**: Endpoints call repositories directly (rejected - no business logic layer)
3. **Domain-Driven Design**: Full DDD with aggregates and entities (rejected - too complex for current needs)
4. **Service Layer Pattern**: Thin controllers, business logic in services, data access in repositories (chosen)

## Decision

We will implement a 3-layer architecture pattern:

```
Endpoint (HTTP) → Service (Business Logic) → Repository (Data Access)
```

### Layer Responsibilities

**Endpoints** (`server/api/`):
- HTTP request/response handling
- Input validation
- Authentication/authorization
- Error handling and status codes
- OpenAPI documentation

**Services** (`server/services/`):
- Business logic and rules
- Data transformation
- Orchestration of multiple repositories
- Consistent response formatting (`{ data, count }`)

**Repositories** (`server/repositories/`):
- Database queries (Cypher)
- Data mapping (Neo4j → TypeScript)
- Transaction management
- No business logic

### Conventions

1. **One service per domain entity** (TeamService, SystemService, etc.)
2. **Services return `{ data, count }`** for consistency
3. **Repositories return domain objects** (not Neo4j records)
4. **Queries stored as `.cypher` files** for reusability
5. **Services are stateless** (no instance variables)

## Consequences

### Positive

1. **Clear Separation**: Each layer has a single responsibility
2. **Testability**: Services can be unit tested with mocked repositories
3. **Consistency**: All endpoints follow the same pattern
4. **Reusability**: Services can be used by multiple endpoints
5. **Maintainability**: Easy to find and modify business logic
6. **Documentation**: Pattern is self-documenting

### Negative

1. **More Files**: Three files per feature (endpoint, service, repository)
2. **Boilerplate**: Some repetitive code in simple CRUD operations
3. **Learning Curve**: New contributors need to understand the pattern
4. **Indirection**: More layers to navigate when debugging

### Neutral

1. **Testing Strategy**: Requires both unit tests (services) and integration tests (endpoints)
2. **Error Handling**: Errors must be properly propagated through layers
3. **Transaction Management**: Handled at repository layer

## References

- `docs/architecture/service-layer-pattern.md`: Detailed documentation
- `server/services/`: Service implementations
- `server/repositories/`: Repository implementations
- Martin Fowler's "Patterns of Enterprise Application Architecture"
