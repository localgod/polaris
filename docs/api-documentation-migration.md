# API Documentation Migration Plan

## Overview

This document outlines the plan to migrate content from `/content/api/` markdown files into OpenAPI annotations, allowing us to maintain a single source of truth for API documentation.

## Current State

### Documented in OpenAPI (11 endpoints)

- ✅ `GET /health`
- ✅ `GET /systems`
- ✅ `POST /systems`
- ✅ `GET /systems/{name}`
- ✅ `DELETE /systems/{name}`
- ✅ `GET /components`
- ✅ `GET /technologies`
- ✅ `GET /teams`
- ✅ `GET /policies`
- ✅ `GET /repositories`
- ✅ `GET /users`

### Not Yet Documented (18 endpoints)

- ⏳ `GET /technologies/{name}`
- ⏳ `GET /teams/{name}`
- ⏳ `DELETE /teams/{name}`
- ⏳ `GET /teams/{name}/usage`
- ⏳ `GET /teams/{name}/approvals`
- ⏳ `GET /teams/{name}/policies`
- ⏳ `GET /approvals`
- ⏳ `PATCH /systems/{name}`
- ⏳ `PUT /systems/{name}`
- ⏳ `GET /systems/{name}/unmapped-components`
- ⏳ `GET /components/unmapped`
- ⏳ `GET /policies/{name}`
- ⏳ `DELETE /policies/{name}`
- ⏳ `GET /policies/violations`
- ⏳ `GET /compliance/violations`
- ⏳ `POST /admin/users/{userId}/teams`
- ⏳ `GET /admin/users`
- ⏳ `GET /auth/[...]`

## Content to Migrate

### From `/content/api/overview.md`

**Already Incorporated:**
- ✅ API version (2.0.0)
- ✅ Richardson Maturity Model level
- ✅ Authentication description
- ✅ Authorization levels
- ✅ Response format patterns
- ✅ Security schemes

**To Add:**
- HTTP method descriptions (in endpoint annotations)
- Use case examples (as x-code-samples)
- Rate limiting info (when implemented)

### From `/content/api/endpoints.md`

**To Incorporate Per Endpoint:**
- Detailed descriptions
- Request body examples
- Response examples (success and error)
- Query parameter descriptions
- Authorization requirements
- Business logic explanations

## Migration Strategy

### Phase 1: Enhanced Base Spec ✅

- [x] Update API version to 2.0.0
- [x] Add comprehensive API description
- [x] Add security schemes
- [x] Document authentication/authorization

### Phase 2: Core Endpoints (Priority)

Document the most-used endpoints with full details:

1. **Systems** (CRUD operations)
   - Add examples from endpoints.md
   - Document business criticality values
   - Document environment values
   - Add repository structure examples

2. **Technologies** 
   - Add approval workflow documentation
   - Document TIME framework values
   - Add version-specific approval examples

3. **Teams**
   - Document team operations
   - Add usage statistics examples
   - Document approval queries

4. **Approvals**
   - Document approval hierarchy
   - Add query parameter examples
   - Document TIME values

### Phase 3: Remaining Endpoints

- Policies (detail, delete, violations)
- Components (unmapped)
- Admin endpoints
- Auth endpoints

### Phase 4: Enhanced Documentation

- Add x-code-samples for curl examples
- Add more response examples
- Document error scenarios
- Add validation rules

## Implementation Approach

### For Each Endpoint

1. **Read the markdown content** for that endpoint
2. **Extract key information:**
   - Description
   - Parameters
   - Request body structure
   - Response examples
   - Authorization requirements
   - Error scenarios

3. **Add OpenAPI annotation** to the endpoint file:
```typescript
/**
 * @openapi
 * /endpoint:
 *   method:
 *     tags: [Tag]
 *     summary: Brief description
 *     description: |
 *       Detailed description from markdown
 *       
 *       **Authorization:** Team Owner
 *       
 *       **Business Logic:**
 *       - Point 1
 *       - Point 2
 *     parameters: [...]
 *     requestBody: {...}
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema: {...}
 *             examples:
 *               success:
 *                 value: {...}
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             examples:
 *               missingField:
 *                 value: {...}
 */
```

1. **Regenerate static spec:**

   ```bash
   node -e "import('./server/openapi.ts').then(m => require('fs').writeFileSync('public/openapi.json', JSON.stringify(m.openapiSpec, null, 2)))"
   ```

1. **Verify in Scalar UI** at `/api-reference`

## Benefits of Migration

1. **Single Source of Truth** - API documentation lives with the code
2. **Always Up-to-Date** - Changes to endpoints require updating annotations
3. **Interactive Testing** - Scalar UI allows trying requests
4. **Better DX** - Developers see docs while coding
5. **Auto-generated Clients** - Can generate SDKs from OpenAPI spec
6. **Reduced Maintenance** - No need to keep markdown files in sync

## After Migration

### Files to Remove/Update

- `/content/api/endpoints.md` - Can be removed or converted to overview
- `/content/api/overview.md` - Can be simplified to link to `/api-reference`
- Update navigation in `app/layouts/default.vue` to remove old links

### Files to Keep

- `/docs/api-documentation.md` - Implementation guide
- `server/openapi.ts` - OpenAPI spec generator
- `public/openapi.json` - Generated spec
- `public/api-docs.html` - Standalone viewer
- `app/pages/api-reference.vue` - Integrated viewer

## Example: Fully Documented Endpoint

See `server/api/systems.post.ts` for an example of a well-documented endpoint with:
- Comprehensive description
- All parameters documented
- Request body schema
- Multiple response codes
- Error scenarios

## Next Steps

1. ✅ Update base OpenAPI spec with API overview content
2. ⏳ Document remaining 18 endpoints
3. ⏳ Add more examples to existing endpoints
4. ⏳ Remove/update markdown files
5. ⏳ Update navigation links

## Timeline

- **Phase 1:** ✅ Complete
- **Phase 2:** 2-3 hours (4 core endpoint groups)
- **Phase 3:** 2-3 hours (remaining endpoints)
- **Phase 4:** 1-2 hours (enhancements)
- **Total:** ~6-8 hours of work

## Notes

- The OpenAPI spec is already being served at `/api/openapi.json`
- The Scalar UI at `/api-reference` automatically updates when spec changes
- No need to restart the server - just regenerate the static spec
- Consider adding this to a pre-commit hook or CI/CD pipeline
