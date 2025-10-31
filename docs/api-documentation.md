# API Documentation Setup

This document describes the OpenAPI/Swagger documentation implementation for the Polaris API.

## Overview

Polaris now includes comprehensive OpenAPI 3.1 documentation for all REST API endpoints, providing:
- Interactive API reference UI powered by Scalar
- Machine-readable OpenAPI specification
- Auto-generated documentation from code annotations
- Type-safe schemas matching TypeScript definitions

## Implementation Details

### Architecture

The implementation follows a **code-first approach** using JSDoc annotations:

1. **OpenAPI Spec Generator** (`server/openapi.ts`)
   - Uses `swagger-jsdoc` to parse JSDoc comments
   - Defines base OpenAPI 3.1 specification
   - Includes all schema definitions from TypeScript types
   - Scans all API endpoint files for annotations

2. **API Endpoint** (`server/api/openapi.json.get.ts`)
   - Serves the generated OpenAPI spec at `/api/openapi.json`
   - Dynamically generates spec on each request

3. **Static Files** (`public/`)
   - `openapi.json` - Pre-generated static spec
   - `api-docs.html` - Standalone HTML documentation viewer

4. **Scalar Integration** (`nuxt.config.ts`)
   - Configured `@scalar/nuxt` module
   - Provides interactive UI at `/api-docs` (when server is healthy)

### Documented Endpoints

Currently documented endpoints (9 total):

- `GET /health` - Health check
- `GET /systems` - List all systems
- `POST /systems` - Create a new system
- `GET /systems/{name}` - Get system by name
- `DELETE /systems/{name}` - Delete a system
- `GET /components` - List all components
- `GET /technologies` - List all technologies
- `GET /teams` - List all teams
- `GET /policies` - List all policies (with filtering)
- `GET /repositories` - List all repositories
- `GET /users` - List all users (superuser only)

### Schema Definitions

All TypeScript types from `types/api.d.ts` are included as OpenAPI schemas:
- `Component`
- `Technology`
- `TechnologyApproval`
- `System`
- `Repository`
- `Team`
- `Policy`
- `Violation`
- `User`
- `ApiSuccessResponse`
- `ApiErrorResponse`
- `HealthResponse`

## Usage

### Viewing Documentation

**Option 1: Integrated App Page (Recommended)**
```
http://localhost:3000/api-reference
```
Fully integrated into the Polaris app with navigation and layout. Accessible from the Documentation menu in the sidebar.

**Option 2: Standalone HTML**
```
http://localhost:3000/api-docs.html
```
Standalone page without app navigation.

**Option 3: Raw OpenAPI Spec**
```
http://localhost:3000/openapi.json
```
Download or view the raw OpenAPI specification JSON.

### Adding Documentation to New Endpoints

When creating a new API endpoint, add JSDoc comments with OpenAPI annotations:

```typescript
/**
 * @openapi
 * /your-endpoint:
 *   get:
 *     tags:
 *       - YourTag
 *     summary: Brief description
 *     description: Detailed description
 *     parameters:
 *       - in: query
 *         name: paramName
 *         schema:
 *           type: string
 *         description: Parameter description
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/YourSchema'
 *       400:
 *         description: Bad request
 */
export default defineEventHandler(async (event) => {
  // Your handler code
})
```

### Regenerating Static Documentation

After adding or modifying endpoint documentation:

```bash
node -e "import('./server/openapi.ts').then(m => require('fs').writeFileSync('public/openapi.json', JSON.stringify(m.openapiSpec, null, 2)))"
```

This updates the static `public/openapi.json` file.

## Dependencies

- `@scalar/nuxt` (^0.5.21) - Nuxt module for Scalar API reference
- `swagger-jsdoc` (^6.x) - Generates OpenAPI spec from JSDoc comments
- `@types/swagger-jsdoc` - TypeScript definitions

## Configuration

### Nuxt Config (`nuxt.config.ts`)

```typescript
modules: [
  // ... other modules
  '@scalar/nuxt'
],

scalar: {
  url: '/api/openapi.json',
  pathRouting: {
    basePath: '/api-docs'
  },
  darkMode: true,
  metaData: {
    title: 'Polaris API Documentation'
  }
}
```

### OpenAPI Spec (`server/openapi.ts`)

- OpenAPI version: 3.1.0
- Base path: `/api`
- Scans: `./server/api/**/*.ts`

## Known Issues

1. **Next-Auth Compatibility**: There's a pre-existing issue with `next-auth` that causes 500 errors on all API routes in development. This is unrelated to the OpenAPI implementation. Use the static HTML documentation (`/api-docs.html`) as a workaround.

2. **Remaining Endpoints**: Not all 29 API endpoints are documented yet. The following still need annotations:
   - Systems sub-endpoints (PATCH, PUT, unmapped-components)
   - Technology detail endpoints
   - Team detail endpoints
   - Policy detail endpoints
   - Admin endpoints
   - Approval endpoints
   - Compliance/violation endpoints
   - Auth endpoints

## Future Improvements

1. **Complete Documentation**: Add OpenAPI annotations to all 29 endpoints
2. **Schema Validation**: Add runtime validation using Zod or Valibot
3. **Auto-generation**: Set up build-time generation of static spec
4. **CI/CD Integration**: Validate OpenAPI spec in CI pipeline
5. **Client SDK Generation**: Generate TypeScript/JavaScript client SDKs
6. **API Versioning**: Add version management to the API
7. **Authentication Docs**: Document authentication flows in detail

## Resources

- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [Scalar Documentation](https://guides.scalar.com/)
- [swagger-jsdoc Documentation](https://github.com/Surnet/swagger-jsdoc)
- [Nuxt Scalar Module](https://guides.scalar.com/scalar/scalar-api-references/integrations/nuxt)
