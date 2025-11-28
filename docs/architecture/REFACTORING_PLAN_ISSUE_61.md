# Refactoring Plan: Complete Issue #61 Implementation

## Overview

This document outlines the plan to complete the remaining parts of Issue #61: "Simplify Repository Model and Implement SBOM Storage".

**Status:** Part 1 (Schema Simplification) completed in PR #94. Parts 2 and 3 remain.

## Current State

### ✅ Completed (PR #94)

**Part 1: Schema Simplification**
- ✅ Removed unused Repository properties (scmType, description, isPublic, requiresAuth, defaultBranch)
- ✅ Removed unused System properties (sourceCodeType, hasSourceAccess)
- ✅ Added lastSbomScanAt property to Repository
- ✅ Removed 6 unnecessary indexes
- ✅ Updated TypeScript interfaces
- ✅ Updated all Cypher queries
- ✅ Simplified UI (system creation form)
- ✅ Added SourceRepositoryRepository.findByUrl()
- ✅ Added SourceRepositoryRepository.updateLastScan()
- ✅ SBOMService updates lastSbomScanAt after processing

### ❌ Remaining Work

**Part 2: Repository Registration API**
- ❌ POST /api/systems/{systemId}/repositories - Register repository
- ❌ GET /api/systems/{systemId}/repositories - List repositories
- ❌ SystemService.addRepository() method
- ❌ SystemService.getRepositories() method
- ❌ SourceRepositoryRepository.createWithSystem() method
- ❌ Cypher queries for repository registration

**Part 3: Strict SBOM Storage**
- ❌ Enforce repository must exist before SBOM submission
- ❌ Return 404 if repository not registered
- ❌ Provide helpful error messages with registration hints
- ❌ Update SBOM endpoint documentation

## Refactoring Plan

### Phase 1: Repository Registration API (Backend)

**Estimated Effort:** 4-6 hours

#### 1.1 Create Cypher Queries

**File:** `server/database/queries/systems/add-repository.cypher`
```cypher
// Register a repository for a system
MATCH (s:System {name: $systemName})
MERGE (r:Repository {url: $url})
ON CREATE SET 
  r.name = $name,
  r.createdAt = datetime(),
  r.updatedAt = datetime(),
  r.lastSbomScanAt = null
ON MATCH SET
  r.updatedAt = datetime()
MERGE (s)-[rel:HAS_SOURCE_IN]->(r)
ON CREATE SET rel.addedAt = datetime()
RETURN r.url as url,
       r.name as name,
       r.createdAt as createdAt,
       r.updatedAt as updatedAt,
       r.lastSbomScanAt as lastSbomScanAt
```

**File:** `server/database/queries/systems/get-repositories.cypher`
```cypher
// Get all repositories for a system
MATCH (s:System {name: $systemName})-[:HAS_SOURCE_IN]->(r:Repository)
RETURN r.url as url,
       r.name as name,
       r.createdAt as createdAt,
       r.updatedAt as updatedAt,
       r.lastSbomScanAt as lastSbomScanAt
ORDER BY r.name
```

**File:** `server/database/queries/source-repositories/create-with-system.cypher`
```cypher
// Create repository and link to system
MATCH (s:System {name: $systemName})
CREATE (r:Repository {
  url: $url,
  name: $name,
  createdAt: datetime(),
  updatedAt: datetime(),
  lastSbomScanAt: null
})
CREATE (s)-[:HAS_SOURCE_IN {addedAt: datetime()}]->(r)
RETURN r.url as url,
       r.name as name,
       r.createdAt as createdAt,
       r.updatedAt as updatedAt,
       r.lastSbomScanAt as lastSbomScanAt
```

#### 1.2 Update SourceRepositoryRepository

**File:** `server/repositories/source-repository.repository.ts`

Add method:
```typescript
/**
 * Create a repository and link it to a system
 * 
 * @param data - Repository creation data
 * @returns Created repository
 */
async createWithSystem(data: {
  url: string
  name: string
  systemName: string
}): Promise<Repository> {
  const query = await loadQuery('source-repositories/create-with-system.cypher')
  const { records } = await this.executeQuery(query, data)
  
  if (records.length === 0) {
    throw new Error('Failed to create repository')
  }
  
  return this.mapToRepository(records[0])
}
```

#### 1.3 Update SystemService

**File:** `server/services/system.service.ts`

Add methods:
```typescript
/**
 * Add a repository to a system
 * 
 * @param systemName - System name
 * @param data - Repository data
 * @returns Created/updated repository
 */
async addRepository(systemName: string, data: {
  url: string
  name?: string
}): Promise<Repository> {
  // Validate system exists
  const system = await this.systemRepo.findByName(systemName)
  if (!system) {
    throw createError({
      statusCode: 404,
      message: `System not found: ${systemName}`
    })
  }
  
  // Normalize URL
  const normalizedUrl = normalizeRepoUrl(data.url)
  
  // Extract name if not provided
  const name = data.name || extractRepoName(normalizedUrl)
  
  // Create/update repository
  return await this.sourceRepoRepo.createWithSystem({
    url: normalizedUrl,
    name,
    systemName
  })
}

/**
 * Get all repositories for a system
 * 
 * @param systemName - System name
 * @returns List of repositories
 */
async getRepositories(systemName: string): Promise<{ data: Repository[]; count: number }> {
  const query = await loadQuery('systems/get-repositories.cypher')
  const { records } = await this.systemRepo.executeQuery(query, { systemName })
  
  const repositories = records.map(record => ({
    url: record.get('url'),
    name: record.get('name'),
    createdAt: record.get('createdAt')?.toString() || null,
    updatedAt: record.get('updatedAt')?.toString() || null,
    lastSbomScanAt: record.get('lastSbomScanAt')?.toString() || null,
    systemCount: 1
  }))
  
  return {
    data: repositories,
    count: repositories.length
  }
}
```

#### 1.4 Create API Endpoints

**File:** `server/api/systems/[name]/repositories.post.ts`
```typescript
/**
 * @openapi
 * /api/systems/{name}/repositories:
 *   post:
 *     tags:
 *       - Systems
 *     summary: Register a repository for a system
 *     description: Links a repository to a system for SBOM tracking
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: System name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: Repository URL
 *                 example: "https://github.com/org/repo"
 *               name:
 *                 type: string
 *                 description: Repository name (auto-extracted if not provided)
 *                 example: "repo"
 *     responses:
 *       201:
 *         description: Repository registered successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: System not found
 */
export default defineEventHandler(async (event) => {
  const systemName = getRouterParam(event, 'name')
  const body = await readBody<{ url: string; name?: string }>(event)
  
  // Validate URL
  try {
    new URL(body.url)
  } catch {
    throw createError({
      statusCode: 400,
      message: 'Invalid repository URL'
    })
  }
  
  const systemService = new SystemService()
  const repository = await systemService.addRepository(systemName, body)
  
  setResponseStatus(event, 201)
  return {
    success: true,
    data: repository,
    message: `Repository registered for system ${systemName}`
  }
})
```

**File:** `server/api/systems/[name]/repositories.get.ts`
```typescript
/**
 * @openapi
 * /api/systems/{name}/repositories:
 *   get:
 *     tags:
 *       - Systems
 *     summary: List repositories for a system
 *     description: Returns all repositories linked to a system
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: System name
 *     responses:
 *       200:
 *         description: List of repositories
 *       404:
 *         description: System not found
 */
export default defineEventHandler(async (event) => {
  const systemName = getRouterParam(event, 'name')
  
  const systemService = new SystemService()
  const result = await systemService.getRepositories(systemName)
  
  return {
    success: true,
    ...result
  }
})
```

### Phase 2: Strict SBOM Storage Enforcement

**Estimated Effort:** 2-3 hours

#### 2.1 Update SBOM Service

**File:** `server/services/sbom.service.ts`

Update `processSBOM` method to enforce repository existence:

```typescript
async processSBOM(input: ProcessSBOMInput): Promise<ProcessSBOMResult> {
  // 1. Normalize repository URL
  const normalizedUrl = normalizeRepoUrl(input.repositoryUrl)
  
  // 2. Find repository (STRICT - must exist)
  const repository = await this.sourceRepoRepo.findByUrl(normalizedUrl)
  
  if (!repository) {
    const error = new Error(
      `Repository not registered: ${normalizedUrl}. ` +
      `Please register it first using POST /api/systems/{systemName}/repositories`
    ) as Error & { statusCode: number; hint: string }
    error.statusCode = 404
    error.hint = 'POST /api/systems/{systemName}/repositories'
    throw error
  }
  
  // 3. Find system by repository URL (verify linkage)
  const system = await this.systemRepo.findByRepositoryUrl(normalizedUrl)
  
  if (!system) {
    const error = new Error(
      `Repository ${normalizedUrl} is not linked to any system. ` +
      `Please contact your administrator.`
    ) as Error & { statusCode: number }
    error.statusCode = 409
    throw error
  }
  
  // ... rest of existing implementation
}
```

#### 2.2 Update SBOM Endpoint Error Handling

**File:** `server/api/sboms.post.ts`

Update error handling to provide helpful messages:

```typescript
} catch (error) {
  // Handle specific errors
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const httpError = error as { 
      statusCode: number
      message: string
      hint?: string
    }
    
    setResponseStatus(event, httpError.statusCode)
    
    if (httpError.statusCode === 404) {
      return {
        success: false,
        error: 'repository_not_registered',
        message: httpError.message,
        hint: httpError.hint || 'Register the repository first'
      }
    }
    
    if (httpError.statusCode === 409) {
      return {
        success: false,
        error: 'repository_not_linked',
        message: httpError.message
      }
    }
    
    return {
      success: false,
      error: 'processing_error',
      message: httpError.message
    }
  }
  
  // Internal error
  console.error('SBOM processing error:', error)
  setResponseStatus(event, 500)
  return {
    success: false,
    error: 'internal_error',
    message: error instanceof Error ? error.message : 'Internal server error'
  }
}
```

### Phase 3: Testing

**Estimated Effort:** 3-4 hours

#### 3.1 Unit Tests

**File:** `test/server/services/system.service.spec.ts`

Add tests:
```typescript
describe('addRepository', () => {
  it('should register a repository for a system', async () => {
    // Test implementation
  })
  
  it('should throw 404 if system not found', async () => {
    // Test implementation
  })
  
  it('should normalize repository URL', async () => {
    // Test implementation
  })
  
  it('should extract repository name from URL', async () => {
    // Test implementation
  })
})

describe('getRepositories', () => {
  it('should return all repositories for a system', async () => {
    // Test implementation
  })
  
  it('should return empty list if no repositories', async () => {
    // Test implementation
  })
})
```

**File:** `test/server/services/sbom.service.spec.ts`

Add tests:
```typescript
describe('processSBOM - strict mode', () => {
  it('should throw 404 if repository not registered', async () => {
    // Test implementation
  })
  
  it('should throw 409 if repository not linked to system', async () => {
    // Test implementation
  })
  
  it('should process SBOM if repository exists and is linked', async () => {
    // Test implementation
  })
})
```

#### 3.2 Integration Tests

**File:** `test/server/api/systems/repositories.spec.ts`

Create new test file:
```typescript
describe('POST /api/systems/{name}/repositories', () => {
  it('should register a repository', async () => {
    // Test implementation
  })
  
  it('should return 400 for invalid URL', async () => {
    // Test implementation
  })
  
  it('should return 404 for non-existent system', async () => {
    // Test implementation
  })
  
  it('should handle duplicate registration', async () => {
    // Test implementation
  })
})

describe('GET /api/systems/{name}/repositories', () => {
  it('should list repositories for a system', async () => {
    // Test implementation
  })
  
  it('should return empty list if no repositories', async () => {
    // Test implementation
  })
})
```

**File:** `test/server/api/sboms.spec.ts`

Update existing tests:
```typescript
describe('POST /api/sboms - strict mode', () => {
  it('should return 404 if repository not registered', async () => {
    // Test implementation
  })
  
  it('should return helpful error message with registration hint', async () => {
    // Test implementation
  })
})
```

### Phase 4: Documentation

**Estimated Effort:** 2 hours

#### 4.1 Update API Documentation

**File:** `server/openapi.ts`

Add schemas for repository registration endpoints.

#### 4.2 Update README

**File:** `README.md`

Add section on repository registration workflow:
```markdown
### SBOM Submission Workflow

1. **Register Repository**:
   ```bash
   POST /api/systems/my-system/repositories
   {
     "url": "https://github.com/org/repo"
   }
   ```

2. **Submit SBOM**:
   ```bash
   POST /api/sboms
   {
     "repositoryUrl": "https://github.com/org/repo",
     "sbom": { ... }
   }
   ```
```

#### 4.3 Create Migration Guide

**File:** `docs/MIGRATION_REPOSITORY_REGISTRATION.md`

Document how existing users should register their repositories.

### Phase 5: UI Updates (Optional)

**Estimated Effort:** 4-6 hours

#### 5.1 System Detail Page

Add "Repositories" tab to system detail page showing:
- List of registered repositories
- Last SBOM scan timestamp
- Button to register new repository

#### 5.2 Repository Registration Form

Create modal/page for registering repositories:
- URL input with validation
- Name input (auto-filled from URL)
- Submit button

## Implementation Order

1. **Phase 1** (Backend API) - Required
2. **Phase 2** (Strict Enforcement) - Required
3. **Phase 3** (Testing) - Required
4. **Phase 4** (Documentation) - Required
5. **Phase 5** (UI) - Optional (can be done later)

## Total Estimated Effort

- **Required Work**: 11-15 hours
- **Optional UI**: 4-6 hours
- **Total**: 15-21 hours

## Dependencies

- None - all work builds on completed PR #94

## Risks and Mitigation

### Risk 1: Breaking Change for Existing SBOM Submissions

**Impact:** Existing CI/CD pipelines will fail if repositories not registered

**Mitigation:**
1. Create migration script to auto-register existing repositories
2. Provide clear error messages with registration instructions
3. Document migration process
4. Consider grace period with warnings before enforcement

### Risk 2: Orphaned Repositories

**Impact:** Repositories registered but never used

**Mitigation:**
1. Add cleanup script to identify unused repositories
2. Add lastSbomScanAt tracking (already done in PR #94)
3. Consider adding DELETE endpoint for repository cleanup

### Risk 3: URL Normalization Issues

**Impact:** Same repository registered with different URLs

**Mitigation:**
1. Use existing normalizeRepoUrl() utility
2. Add validation to prevent duplicates
3. Document URL format requirements

## Success Criteria

- ✅ Repository registration API works correctly
- ✅ SBOM endpoint enforces repository registration
- ✅ Clear error messages guide users
- ✅ All tests passing
- ✅ Documentation updated
- ✅ No breaking changes for properly registered repositories

## References

- Issue #61: https://github.com/localgod/polaris/issues/61
- PR #94: https://github.com/localgod/polaris/pull/94
- Migration: `20251128_100000_simplify_repository_schema.up.cypher`
