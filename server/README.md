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
├── schemas/               # JSON schemas for SBOM validation
├── scripts/               # Server-side scripts (e.g., OpenAPI generation)
├── types/                 # TypeScript type definitions
└── openapi.ts             # OpenAPI/Swagger specification
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

- `query-loader.ts` - Load, cache, and inject placeholders in .cypher files
- `neo4j.ts` - Neo4j helper functions (e.g., `getFirstRecordOrThrow()`)
- `auth.ts` - Authentication and authorization (`requireAuth()`, `requireSuperuser()`, `requireTeamAccess()`, etc.)
- `response.ts` - Response formatters (`sendSuccess()`, `sendNotFound()`, `sendBadRequest()`, etc.)
- `repository.ts` - Repository URL utilities (`normalizeRepoUrl()`, `detectScmType()`)
- `sorting.ts` - Server-side sort utilities (`buildOrderByClause()`, `parseSortParams()`)
- `sbom-validator.ts` - SBOM schema validation (CycloneDX, SPDX)
- `sbom-request-validator.ts` - SBOM request input validation

## Import Guide

### Import Patterns

Server files are bundled separately by Nitro and don't use the same module resolution as client code. Always use relative imports for server-to-server references.

#### API Routes (`server/api/**/*.ts`)

```typescript
import { TechnologyService } from '../services/technology.service'
import { PolicyService } from '../../services/policy.service'
import type { Technology } from '~~/types/api'
```

#### Services (`server/services/*.ts`)

```typescript
import { TechnologyRepository } from '../repositories/technology.repository'
import type { Technology } from '~~/types/api'
```

#### Repositories (`server/repositories/*.ts`)

```typescript
import { BaseRepository } from './base.repository'
import type { Technology } from '~~/types/api'
import type { Record as Neo4jRecord } from 'neo4j-driver'
```

#### Utils (`server/utils/*.ts`)

Files in `server/utils/` are auto-imported throughout the server — no import statement needed:

```typescript
// server/repositories/technology.repository.ts
async findAll() {
  const query = await loadQuery('technologies/find-all.cypher') // auto-imported
}
```

Auto-imported utilities include `loadQuery()`, `injectWhereConditions()`, `getFirstRecordOrThrow()`, `requireAuth()`, `sendSuccess()`, `sendNotFound()`, `buildOrderByClause()`, and `createError()`.

### Incorrect Patterns

```typescript
// DON'T use ~/server/ — causes ENOENT in Nitro's bundled context
import { TechnologyService } from '~/server/services/technology.service'

// DON'T use @ alias — reserved for client-side code
import { TechnologyService } from '@/server/services/technology.service'

// DON'T use absolute paths
import { TechnologyService } from '/server/services/technology.service'
```

### Quick Reference

| From | To | Pattern | Example |
| --- | --- | --- | --- |
| API route | Service | Relative | `'../services/tech.service'` |
| API route (nested) | Service | Relative | `'../../services/tech.service'` |
| Service | Repository | Relative | `'../repositories/tech.repository'` |
| Repository | Base | Relative | `'./base.repository'` |
| Any | Types | `~~` alias | `'~~/types/api'` |
| Any | Utils | Auto-imported | No import needed |
| Any | Neo4j types | Package | `'neo4j-driver'` |

### Troubleshooting

**"Cannot find module '~/server/...'"** or **"ENOENT: no such file or directory, open '/app//server/...'"**: Change to a relative import.

**"loadQuery is not defined"**: Ensure the file is in `server/utils/` — it should be auto-imported.

## Plugins (`/plugins`)

Server plugins for initialization and lifecycle management:

- `neo4j.ts` - Initialize Neo4j driver and verify connectivity
- `sbom-validator.ts` - Compile SBOM JSON schemas at startup

## Benefits

Yes **Separation of Concerns** - Each layer has a single responsibility  
Yes **Testability** - Services can be unit tested with mocked repositories  
Yes **Reusability** - Queries and repositories can be shared  
Yes **Maintainability** - Easy to locate and modify specific functionality  
Yes **Type Safety** - TypeScript types flow through all layers  
Yes **Scalability** - Simple to add new entities without touching existing code  
Yes **Query Management** - Centralized in `/database/queries` with caching  
Yes **Connection Pooling** - Managed at repository layer via singleton driver  

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

- Yes `server/api/` - File-based routing (Nuxt convention)
- Yes `server/utils/` - Auto-imported utilities (Nuxt convention)
- Yes `server/plugins/` - Server plugins (Nuxt convention)
- Yes `server/services/` - Custom layer (not Nuxt convention, but recommended)
- Yes `server/repositories/` - Custom layer (not Nuxt convention, but recommended)
- Yes `server/database/` - Custom layer (not Nuxt convention, but recommended)
- Yes `server/schemas/` - Custom layer for JSON schema files
- Yes `server/scripts/` - Custom layer for server-side scripts

## Migration Status

Yes **Complete** - All 25 API endpoints migrated to 3-layer architecture

### Statistics

- **Endpoints**: 51 API route handlers
- **Services**: 12 service classes
- **Repositories**: 12 repository classes (+ BaseRepository)
- **Query Files**: 51 external Cypher files

## API Authentication

### Session-based Authentication

The API supports session-based authentication using NextAuth.js:

```typescript
// Authenticated endpoint example
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event) // Throws 401 if not authenticated
  // ... handle request
})
```

### API Token Authentication

API tokens provide an alternative authentication method for programmatic access.

#### Token Features

- **SHA-256 Hashing**: Only token hashes are stored in the database
- **One-time Display**: Plaintext tokens are shown only once on creation
- **Expiration**: Tokens can have optional expiration dates
- **Revocation**: Tokens can be revoked at any time
- **Bearer Authentication**: Use `Authorization: Bearer <token>` header

#### Creating API Tokens

API tokens are managed via the UI or API by superusers:

- **UI**: Navigate to `/users`, select a technical user, click "Generate API Token"
- **API**: `POST /api/admin/users/<userId>/tokens` with a superuser bearer token

The token plaintext is displayed once on creation and cannot be retrieved again.

#### Using API Tokens

Include the token in the `Authorization` header:

```bash
# Example: Submit an SBOM
curl -X POST https://api.example.com/api/sboms \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "repositoryUrl": "https://github.com/org/repo",
    "sbom": { ... }
  }'
```

#### Token Management

**List Tokens** (programmatically):
```typescript
import { TokenService } from '../server/services/token.service'

const tokenService = new TokenService()
const tokens = await tokenService.listTokens(userId)
```

**Revoke Token**:
```typescript
const tokenService = new TokenService()
await tokenService.revokeToken(tokenId)
```

#### Security Best Practices

- Yes Store tokens securely (e.g., environment variables, secrets managers)
- Yes Use HTTPS in production
- Yes Rotate tokens regularly
- Yes Revoke tokens when no longer needed
- Yes Never commit tokens to source control
- Yes Use different tokens for different environments

## SBOM Validation Endpoint

### POST /api/sboms

Validates and accepts Software Bill of Materials (SBOM) documents.

#### Authentication

Requires authentication via:
- Session cookie (web UI), OR
- API token (programmatic access)

#### Request Format

```json
POST /api/sboms
Content-Type: application/json
Authorization: Bearer <token>

{
  "repositoryUrl": "https://github.com/org/repo",
  "sbom": {
    // CycloneDX or SPDX SBOM document
  }
}
```

#### Supported SBOM Formats

- **CycloneDX 1.6**: Industry standard SBOM format
- **SPDX 2.3**: Linux Foundation standard SBOM format

Format is auto-detected from the document structure.

#### Response Codes

- **200 OK**: SBOM is valid
  ```json
  {
    "success": true,
    "format": "cyclonedx",
    "message": "Valid SBOM"
  }
  ```

- **400 Bad Request**: Invalid request body
  ```json
  {
    "success": false,
    "error": "invalid_request",
    "message": "repositoryUrl is required"
  }
  ```

- **401 Unauthorized**: Authentication required
  ```json
  {
    "success": false,
    "error": "unauthenticated",
    "message": "Authentication required"
  }
  ```

- **415 Unsupported Media Type**: Content-Type must be application/json
  ```json
  {
    "success": false,
    "error": "unsupported_media_type",
    "required": "application/json"
  }
  ```

- **422 Unprocessable Entity**: SBOM validation failed
  ```json
  {
    "success": false,
    "error": "invalid_sbom",
    "format": "cyclonedx",
    "validationErrors": [
      {
        "instancePath": "/specVersion",
        "message": "must be string"
      }
    ]
  }
  ```

- **500 Internal Server Error**: Server error during validation
  ```json
  {
    "success": false,
    "error": "internal_error",
    "message": "Error details..."
  }
  ```

#### Example: Valid CycloneDX SBOM

```json
{
  "repositoryUrl": "https://github.com/myorg/myapp",
  "sbom": {
    "bomFormat": "CycloneDX",
    "specVersion": "1.6",
    "version": 1,
    "metadata": {
      "timestamp": "2024-01-01T00:00:00Z",
      "component": {
        "type": "application",
        "name": "my-app",
        "version": "1.0.0"
      }
    },
    "components": [
      {
        "type": "library",
        "name": "lodash",
        "version": "4.17.21",
        "purl": "pkg:npm/lodash@4.17.21"
      }
    ]
  }
}
```

#### Example: Valid SPDX SBOM

```json
{
  "repositoryUrl": "https://github.com/myorg/myapp",
  "sbom": {
    "spdxVersion": "SPDX-2.3",
    "dataLicense": "CC0-1.0",
    "SPDXID": "SPDXRef-DOCUMENT",
    "name": "my-app-sbom",
    "documentNamespace": "https://example.com/sbom-1234",
    "creationInfo": {
      "created": "2024-01-01T00:00:00Z",
      "creators": ["Tool: my-sbom-tool"]
    },
    "packages": [
      {
        "SPDXID": "SPDXRef-Package",
        "name": "lodash",
        "versionInfo": "4.17.21",
        "downloadLocation": "NOASSERTION",
        "filesAnalyzed": false
      }
    ]
  }
}
```

#### Implementation Details

- **Schema Validation**: Uses Ajv JSON Schema validator
- **Schema Compilation**: Schemas are compiled at server startup for performance
- **Error Reporting**: Detailed validation errors with instance paths
- **Security**: Authentication is checked before validation (performance optimization)

#### SBOM Validator Initialization

The SBOM validator is initialized at server startup via a Nitro plugin:

```typescript
// server/plugins/sbom-validator.ts
export default defineNitroPlugin(async () => {
  await initializeSbomValidator()
})
```

Schemas are located in `server/schemas/`:
- `cyclonedx-1.6.schema.json`
- `spdx-2.3.schema.json`
- `spdx.schema.json` (referenced by CycloneDX)
- `jsf-0.82.schema.json` (referenced by CycloneDX)
