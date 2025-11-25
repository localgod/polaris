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

- Yes Adding business logic (validation, rules)
- Yes Orchestrating multiple repositories
- Yes Transforming data for API responses
- Yes Maintaining consistent response format

### Skip Service Layer When

- No Simple health checks (direct driver access is fine)
- No Static configuration endpoints
- No Truly trivial pass-through operations

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

## Testing Strategy

The 3-layer architecture enables **isolated testing** at each layer:

### API Layer Tests (`test/server/api/`)

**Mock the service layer** to test API contracts:

```typescript
import { vi } from 'vitest'
import { ComponentService } from '../../../server/services/component.service'

// Mock the service
vi.mock('../../../server/services/component.service')

vi.mocked(ComponentService.prototype.findAll).mockResolvedValue({
  data: mockComponents,
  count: 2
})

// Test API response structure
const responseData = {
  success: true,
  data: result.data,
  count: result.count
}

expect(responseData.success).toBe(true)
expect(responseData.data).toHaveLength(2)
```

**What to test:**
- Yes Response structure (success, data, count, error)
- Yes Required fields and types
- Yes Error handling (service failures)
- No Business logic (tested in service layer)
- No Database queries (tested in repository layer)

### Service Layer Tests (`test/server/services/`)

**Mock the repository layer** to test business logic:

```typescript
import { vi } from 'vitest'
import { ComponentRepository } from '../../../server/repositories/component.repository'

// Mock the repository
vi.mock('../../../server/repositories/component.repository')

vi.mocked(ComponentRepository.prototype.findAll).mockResolvedValue(mockComponents)

// Test service logic
const result = await componentService.findAll()

expect(result.count).toBe(mockComponents.length)
expect(result.data).toEqual(mockComponents)
```

**What to test:**
- Yes Business rules and validation
- Yes Data transformation
- Yes Count calculation
- Yes Error propagation
- No HTTP concerns (tested in API layer)
- No Database queries (tested in repository layer)

### Repository Layer Tests (`test/server/repositories/`)

**Use test database** with proper isolation:

```typescript
import neo4j from 'neo4j-driver'
import { cleanupTestData } from '../../fixtures/db-cleanup'

const TEST_PREFIX = 'test_component_repo_'
let driver: Driver

beforeEach(async () => {
  componentRepo = new ComponentRepository(driver)
  await cleanupTestData(driver, { prefix: TEST_PREFIX })
})

// Create test data
await session.run(`
  CREATE (c:Component {
    name: $name,
    version: $version
  })
`, { name: `${TEST_PREFIX}react`, version: '18.2.0' })

// Test repository
const result = await componentRepo.findAll()
const testComponent = result.find(c => c.name === `${TEST_PREFIX}react`)

expect(testComponent).toBeDefined()
expect(testComponent.version).toBe('18.2.0')
```

**What to test:**
- Yes Database queries execute correctly
- Yes Data mapping from Neo4j records
- Yes Query results match expectations
- Yes Edge cases (empty results, null values)
- No Business logic (tested in service layer)
- No HTTP concerns (tested in API layer)

### Testing Principles

1. **Test in Isolation** - Each layer tests independently
2. **Mock Dependencies** - Always mock the layer below
3. **Fast Execution** - API/Service tests run in ~10ms, Repository tests in ~50-100ms
4. **Clear Focus** - Each test layer has specific responsibilities

### Test Execution Speed

| Layer      | Mocks      | Database | Typical Speed | Focus          |
|------------|-----------|----------|---------------|----------------|
| API        | Service   | No        | ~10ms         | HTTP contracts |
| Service    | Repository| No        | ~10ms         | Business logic |
| Repository | None      | Yes        | ~50-100ms     | Data queries   |

### Related Documentation

- [Test Documentation](../../test/README.md) - Complete testing guide
- [API Testing Guide](../../test/server/api/README.md) - API test patterns
- [Test Isolation](../testing/test-isolation.md) - Database isolation strategy

## Last Updated

2025-11-24 - Added testing strategy documentation
