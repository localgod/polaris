# Service Layer Architecture Pattern

## Overview

The Polaris API follows a **3-layer architecture** pattern for all endpoints:

```
Endpoint (HTTP) → Service (Business Logic) → Repository (Data Access)
```

## Layer Responsibilities

### 1. **Endpoints** (`server/api/`)

- HTTP request/response handling
- Input validation (query params, body)
- Authentication/authorization checks
- Error handling and status codes
- OpenAPI documentation

**Example:**
```typescript
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const name = query.name as string
  
  if (!name) {
    throw createError({ statusCode: 400, message: 'Name is required' })
  }
  
  const service = new TeamService()
  const result = await service.findByName(name)
  
  return { success: true, data: result }
})
```

### 2. **Services** (`server/services/`)

- Business logic and rules
- Data transformation
- Orchestration of multiple repositories
- Consistent response formatting (data + count)

**Example:**
```typescript
export class TeamService {
  async findAll(): Promise<{ data: Team[]; count: number }> {
    const teams = await this.teamRepo.findAll()
    
    return {
      data: teams,
      count: teams.length
    }
  }
  
  async delete(name: string): Promise<void> {
    // Business rule: check if team exists
    const exists = await this.teamRepo.exists(name)
    if (!exists) {
      throw createError({ statusCode: 404, message: `Team '${name}' not found` })
    }
    
    // Business rule: check if team owns systems
    const systemCount = await this.teamRepo.countOwnedSystems(name)
    if (systemCount > 0) {
      throw createError({ 
        statusCode: 409, 
        message: `Cannot delete team - owns ${systemCount} systems` 
      })
    }
    
    await this.teamRepo.delete(name)
  }
}
```

### 3. **Repositories** (`server/repositories/`)

- Database queries (Cypher)
- Data mapping (Neo4j records → domain objects)
- No business logic
- All queries stored in external `.cypher` files

**Example:**
```typescript
export class TeamRepository extends BaseRepository {
  async findAll(): Promise<Team[]> {
    const query = await loadQuery('teams/find-all.cypher')
    const { records } = await this.executeQuery(query)
    
    return records.map(record => this.mapToTeam(record))
  }
  
  private mapToTeam(record: Neo4jRecord): Team {
    return {
      name: record.get('name'),
      email: record.get('email'),
      systemCount: record.get('systemCount').toNumber()
    }
  }
}
```

## Query Storage

All Cypher queries are stored in external files under `server/database/queries/`:

```
server/database/queries/
├── teams/
│   ├── find-all.cypher
│   ├── find-by-name.cypher
│   ├── check-exists.cypher
│   └── delete.cypher
├── systems/
│   ├── find-all.cypher
│   └── create.cypher
└── users/
    ├── find-all.cypher
    └── get-auth-data.cypher
```

**Benefits:**
- Easier to read and maintain complex queries
- Syntax highlighting in editors
- Can be tested independently
- Reusable across multiple methods

## When to Use Each Layer

### Use Service Layer When

- ✅ Adding business logic (validation, rules)
- ✅ Orchestrating multiple repositories
- ✅ Transforming data for API responses
- ✅ Maintaining consistent response format

### Skip Service Layer When

- ❌ Simple health checks (direct driver access is fine)
- ❌ Static configuration endpoints
- ❌ Truly trivial pass-through operations

## Naming Conventions

### Repositories

- Named after the domain entity: `TeamRepository`, `SystemRepository`
- Methods: `findAll()`, `findById()`, `create()`, `update()`, `delete()`
- Avoid confusion: `SourceRepositoryRepository` (for source code repos)

### Services

- Named after the domain entity: `TeamService`, `SystemService`
- Methods match repository methods but may add business logic
- Return consistent format: `{ data: T[], count: number }`

### Query Files

- Named after the operation: `find-all.cypher`, `find-by-name.cypher`
- Organized by entity: `teams/`, `systems/`, `users/`
- Use kebab-case for multi-word operations: `find-unmapped-components.cypher`

## Architecture Statistics

- **Endpoints**: 25 migrated to 3-layer pattern
- **Services**: 9 service classes
- **Repositories**: 10 repository classes
- **Query Files**: 34 external Cypher files
- **Code Reduction**: -692 net lines (36% reduction)

## Benefits Achieved

1. **Separation of Concerns**: Clear boundaries between HTTP, business logic, and data access
2. **Testability**: Each layer can be unit tested independently
3. **Maintainability**: Changes to one layer don't affect others
4. **Consistency**: All endpoints follow the same pattern
5. **Reusability**: Services and repositories can be used by multiple endpoints
6. **Type Safety**: Strong TypeScript interfaces throughout

## Migration Checklist

When migrating a new endpoint:

- [ ] Create repository class extending `BaseRepository`
- [ ] Extract Cypher queries to `.cypher` files
- [ ] Create service class with business logic
- [ ] Update endpoint to use service
- [ ] Add proper error handling
- [ ] Update exports in `index.ts` files
- [ ] Run tests to verify functionality
- [ ] Update OpenAPI documentation

## Examples

See the following files for reference implementations:

- **Simple CRUD**: `server/api/teams.get.ts`
- **With Business Logic**: `server/api/teams/[name].delete.ts`
- **Complex Query**: `server/api/systems/[name]/unmapped-components.get.ts`
- **Authentication**: `server/api/auth/[...].ts`

## Last Updated

2025-11-10 - Completed 3-layer architecture migration
