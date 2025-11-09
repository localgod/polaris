# Server Import Guide

## Import Patterns for Nuxt 4 Server

### ✅ Correct Import Patterns

#### In API Routes (`server/api/**/*.ts`)

```typescript
// Use relative imports for services
import { TechnologyService } from '../services/technology.service'
import { PolicyService } from '../../services/policy.service'

// Use ~~ for types (works everywhere)
import type { Technology } from '~~/types/api'
```

#### In Services (`server/services/*.ts`)

```typescript
// Use relative imports for repositories
import { TechnologyRepository } from '../repositories/technology.repository'

// Use ~~ for types
import type { Technology } from '~~/types/api'
```

#### In Repositories (`server/repositories/*.ts`)

```typescript
// Use relative imports for base repository
import { BaseRepository } from './base.repository'

// Use ~~ for types
import type { Technology } from '~~/types/api'
import type { Record as Neo4jRecord } from 'neo4j-driver'
```

#### In Utils (`server/utils/*.ts`)

```typescript
// Utils are auto-imported, no need to import them elsewhere
// But if you need to import from other utils:
import { someHelper } from './other-util'
```

### ❌ Incorrect Import Patterns

```typescript
// ❌ DON'T use ~/server/ in server files
import { TechnologyService } from '~/server/services/technology.service'
// This causes: ENOENT: no such file or directory, open '/app//server/...'

// ❌ DON'T use @ alias in server files
import { TechnologyService } from '@/server/services/technology.service'
// @ alias is for client-side code

// ❌ DON'T use absolute paths
import { TechnologyService } from '/server/services/technology.service'
```

## Why Relative Imports?

Nuxt's server engine (Nitro) processes server files differently than client files:

1. **Server files are bundled separately** - They don't use the same module resolution as client code
2. **The `~/` alias points to the app root** - In server context, this can cause path resolution issues
3. **Relative imports are explicit** - They work consistently across all environments

## Auto-Imported Utilities

Files in `server/utils/` are **automatically imported** everywhere in the server:

```typescript
// server/utils/query-loader.ts
export async function loadQuery(path: string) { /* ... */ }

// server/repositories/technology.repository.ts
// ✅ No import needed! loadQuery is auto-imported
async findAll() {
  const query = await loadQuery('technologies/find-all.cypher')
  // ...
}
```

Auto-imported utilities:
- `loadQuery()` - Load .cypher files
- `injectWhereConditions()` - Inject WHERE clauses
- `useDriver()` - Get Neo4j driver (from nuxt-neo4j)
- `getFirstRecordOrThrow()` - Get first record or throw 404
- `createError()` - Create HTTP errors (from Nuxt)

## Import Summary Table

| From | To | Pattern | Example |
|------|-----|---------|---------|
| API route | Service | Relative | `'../services/tech.service'` |
| API route (nested) | Service | Relative | `'../../services/tech.service'` |
| Service | Repository | Relative | `'../repositories/tech.repository'` |
| Repository | Base | Relative | `'./base.repository'` |
| Any | Types | `~~` alias | `'~~/types/api'` |
| Any | Utils | Auto-imported | No import needed |
| Any | Neo4j types | Package | `'neo4j-driver'` |

## Quick Reference

### API Route Template

```typescript
// server/api/entities.get.ts
import { EntityService } from '../services/entity.service'
import type { ApiResponse, Entity } from '~~/types/api'

export default defineEventHandler(async () => {
  const service = new EntityService()
  const result = await service.findAll()
  return { success: true, ...result }
})
```

### Service Template

```typescript
// server/services/entity.service.ts
import { EntityRepository } from '../repositories/entity.repository'
import type { Entity } from '~~/types/api'

export class EntityService {
  private repo: EntityRepository
  
  constructor() {
    this.repo = new EntityRepository()
  }
  
  async findAll() {
    const entities = await this.repo.findAll()
    return { data: entities, count: entities.length }
  }
}
```

### Repository Template

```typescript
// server/repositories/entity.repository.ts
import { BaseRepository } from './base.repository'
import type { Record as Neo4jRecord } from 'neo4j-driver'
import type { Entity } from '~~/types/api'

export class EntityRepository extends BaseRepository {
  async findAll(): Promise<Entity[]> {
    const query = await loadQuery('entities/find-all.cypher') // Auto-imported!
    const { records } = await this.executeQuery(query)
    return records.map(r => this.mapToEntity(r))
  }
  
  private mapToEntity(record: Neo4jRecord): Entity {
    return {
      name: record.get('name'),
      // ...
    }
  }
}
```

## Troubleshooting

### Error: "Cannot find module '~/server/...'"

**Solution**: Change to relative import
```typescript
// ❌ Before
import { Service } from '~/server/services/service'

// ✅ After
import { Service } from '../services/service'
```

### Error: "ENOENT: no such file or directory, open '/app//server/...'"

**Solution**: This is caused by `~/server/` imports. Use relative imports instead.

### Error: "loadQuery is not defined"

**Solution**: Make sure the file is in `server/utils/` - it should be auto-imported. If not, check your Nuxt version and configuration.

## Best Practices

1. ✅ **Always use relative imports** for server-to-server imports
2. ✅ **Use `~~` for types** - Works everywhere consistently
3. ✅ **Leverage auto-imports** - Put utilities in `server/utils/`
4. ✅ **Be consistent** - Follow the same pattern across all files
5. ✅ **Test imports** - Run `npm run lint` to catch import issues early
