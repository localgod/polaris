# Server Architecture

This directory contains the Nuxt 4 server implementation following a 3-layer architecture pattern.

## Structure

```
server/
├── api/                    # API Layer - HTTP request/response handlers
├── services/               # Service Layer - Business logic
├── repositories/           # Repository Layer - Data access
├── database/
│   └── queries/           # Cypher query files (.cypher)
├── utils/                 # Auto-imported utilities
├── plugins/               # Server plugins (lifecycle hooks)
├── middleware/            # Server middleware
└── types/                 # TypeScript type definitions
```

## Architecture Layers

### 1. API Layer (`/api`)

**Responsibility**: Handle HTTP requests and responses only

- Nuxt convention: File-based routing
- Parse request parameters
- Call service layer methods
- Format responses
- Handle HTTP errors

**Example**:
```typescript
// server/api/technologies.get.ts
import { TechnologyService } from '../services/technology.service'

export default defineEventHandler(async () => {
  const service = new TechnologyService()
  const result = await service.findAll()
  
  return {
    success: true,
    ...result
  }
})
```

**Note**: Use relative imports in server files, not `~/server/` paths.

### 2. Service Layer (`/services`)

**Responsibility**: Business logic and orchestration

- Validate inputs
- Coordinate multiple repositories
- Apply business rules
- Transform data for presentation
- Handle business errors

**Example**:
```typescript
// server/services/technology.service.ts
export class TechnologyService {
  private techRepo: TechnologyRepository

  constructor() {
    this.techRepo = new TechnologyRepository()
  }

  async findAll() {
    const technologies = await this.techRepo.findAll()
    return {
      data: technologies,
      count: technologies.length
    }
  }
}
```

### 3. Repository Layer (`/repositories`)

**Responsibility**: Data access and query execution

- Execute Cypher queries
- Map database records to domain objects
- Handle database errors
- Manage query parameters

**Example**:
```typescript
// server/repositories/technology.repository.ts
export class TechnologyRepository extends BaseRepository {
  async findAll(): Promise<Technology[]> {
    const query = await loadQuery('technologies/find-all.cypher')
    const { records } = await this.executeQuery(query)
    return records.map(record => this.mapToTechnology(record))
  }
}
```

### 4. Query Files (`/database/queries`)

**Responsibility**: Isolated, reusable Cypher queries

- One query per file
- Parameterized queries
- Template placeholders (e.g., `{{WHERE_CONDITIONS}}`)
- Version controlled
- Testable independently

**Example**:
```cypher
// server/database/queries/technologies/find-all.cypher
MATCH (t:Technology)
OPTIONAL MATCH (team:Team)-[:OWNS]->(t)
RETURN t.name as name,
       t.category as category,
       team.name as ownerTeamName
ORDER BY t.category, t.name
```

## Utilities (`/utils`)

Auto-imported utilities available throughout the server:

- `query-loader.ts` - Load and cache .cypher files
- `neo4j.ts` - Neo4j helper functions
- `auth.ts` - Authentication utilities
- `response.ts` - Response formatters

## Plugins (`/plugins`)

Server plugins for initialization and lifecycle management:

- `neo4j.ts` - Initialize Neo4j driver and verify connectivity

## Benefits

✅ **Separation of Concerns** - Each layer has a single responsibility  
✅ **Testability** - Services can be unit tested with mocked repositories  
✅ **Reusability** - Queries and repositories can be shared  
✅ **Maintainability** - Easy to locate and modify specific functionality  
✅ **Type Safety** - TypeScript types flow through all layers  
✅ **Scalability** - Simple to add new entities without touching existing code  
✅ **Query Management** - Centralized in `/database/queries` with caching  
✅ **Connection Pooling** - Managed at repository layer via singleton driver  

## Adding a New Entity

1. **Create query files**:
   ```
   server/database/queries/entities/
   ├── find-all.cypher
   ├── find-by-id.cypher
   ├── create.cypher
   └── update.cypher
   ```

2. **Create repository**:
   ```typescript
   // server/repositories/entity.repository.ts
   export class EntityRepository extends BaseRepository {
     async findAll() { /* ... */ }
   }
   ```

3. **Create service**:
   ```typescript
   // server/services/entity.service.ts
   export class EntityService {
     private repo: EntityRepository
     async findAll() { /* ... */ }
   }
   ```

4. **Create API endpoint**:
   ```typescript
   // server/api/entities.get.ts
   import { EntityService } from '../services/entity.service'
   
   export default defineEventHandler(async () => {
     const service = new EntityService()
     return await service.findAll()
   })
   ```

5. **Export from index files**:
   ```typescript
   // server/repositories/index.ts
   export { EntityRepository } from './entity.repository'
   
   // server/services/index.ts
   export { EntityService } from './entity.service'
   ```

## Testing

### Unit Tests (Services)

Mock repositories to test business logic in isolation:

```typescript
import { vi } from 'vitest'
import { EntityService } from '../server/services/entity.service'
import { EntityRepository } from '../server/repositories/entity.repository'

vi.mock('../server/repositories/entity.repository')

test('service calculates correctly', async () => {
  const mockRepo = new EntityRepository()
  vi.spyOn(mockRepo, 'findAll').mockResolvedValue([...])
  
  const service = new EntityService()
  const result = await service.findAll()
  
  expect(result.count).toBe(2)
})
```

### Integration Tests (Repositories)

Test against real Neo4j database:

```typescript
import { EntityRepository } from '../server/repositories/entity.repository'

test('repository fetches data', async () => {
  const repo = new EntityRepository()
  const entities = await repo.findAll()
  
  expect(entities).toBeInstanceOf(Array)
})
```

### Query Tests

Test Cypher queries independently:

```typescript
import { loadQuery } from '../server/utils/query-loader'

test('query loads correctly', async () => {
  const query = await loadQuery('entities/find-all.cypher')
  expect(query).toContain('MATCH')
})
```

## Nuxt 4 Conventions

This architecture follows Nuxt 4 best practices:

- ✅ `server/api/` - File-based routing (Nuxt convention)
- ✅ `server/utils/` - Auto-imported utilities (Nuxt convention)
- ✅ `server/plugins/` - Server plugins (Nuxt convention)
- ✅ `server/middleware/` - Server middleware (Nuxt convention)
- ✅ `server/services/` - Custom layer (not Nuxt convention, but recommended)
- ✅ `server/repositories/` - Custom layer (not Nuxt convention, but recommended)
- ✅ `server/database/` - Custom layer (not Nuxt convention, but recommended)

## Migration Status

✅ **Complete** - All 25 API endpoints migrated to 3-layer architecture

### Statistics

- **Endpoints**: 25 migrated
- **Services**: 9 service classes
- **Repositories**: 10 repository classes  
- **Query Files**: 34 external Cypher files
- **Code Reduction**: -671 net lines (36% reduction)

See `docs/architecture/service-layer-pattern.md` for detailed patterns and examples.
