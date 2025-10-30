---
title: API Overview
description: REST API for accessing and managing technology catalog data
---

The Polaris API provides programmatic access to the technology catalog, enabling automation, integration, and custom tooling.

## API Version

**Current Version:** 2.0  
**RMM Level:** 2 (Richardson Maturity Model)  
**Base URL:** `/api`

## Key Features

### RESTful Design

- Resource-based URLs
- Proper HTTP methods (GET, POST, PATCH, PUT, DELETE)
- Semantic HTTP status codes
- Consistent response formats

### Comprehensive Coverage

- **Systems** - Manage deployable applications
- **Teams** - Manage development teams
- **Technologies** - Access technology catalog
- **Components** - Query software components (SBOM)
- **Policies** - Governance and compliance
- **Approvals** - Technology approval workflows
- **Health** - System monitoring

### Developer-Friendly

- Clear error messages
- Consistent response structure
- Comprehensive documentation
- Example code snippets

## Quick Start

### Check System Health

```bash
curl http://localhost:3000/api/health
```

### List All Systems

```bash
curl http://localhost:3000/api/systems
```

### Create a System

```bash
curl -X POST http://localhost:3000/api/systems \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-app",
    "domain": "customer-experience",
    "ownerTeam": "frontend-team",
    "businessCriticality": "high",
    "environment": "prod"
  }'
```

### Check Technology Approval

```bash
curl "http://localhost:3000/api/approvals?team=frontend-team&technology=react"
```

## Authentication

Most endpoints require authentication. The API uses session-based authentication integrated with the web application.

**Authorization Levels:**
- **Public** - No authentication required
- **Authenticated** - Valid user session required
- **Team Member** - User must belong to a team
- **Team Owner** - User must belong to team that owns the resource
- **Superuser** - User must have superuser role

## HTTP Methods

| Method | Purpose | Idempotent |
|--------|---------|------------|
| GET | Retrieve resources | Yes |
| POST | Create resources | No |
| PATCH | Partially update | Yes |
| PUT | Fully replace | Yes |
| DELETE | Remove resources | Yes |

## HTTP Status Codes

### Success (2xx)

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `204 No Content` - Resource deleted successfully

### Client Errors (4xx)

- `400 Bad Request` - Missing required parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `422 Unprocessable Entity` - Validation error

### Server Errors (5xx)

- `500 Internal Server Error` - Unexpected error
- `503 Service Unavailable` - Service temporarily unavailable

## Response Format

All successful responses follow this structure:

```json
{
  "success": true,
  "data": [...],
  "count": 10
}
```

All errors follow this structure:

```json
{
  "statusCode": 404,
  "message": "Resource 'example' not found"
}
```

## Common Patterns

### Pagination

Currently not implemented. All endpoints return complete result sets.

### Filtering

Some endpoints support query parameters for filtering:
- `GET /api/policies?status=active`
- `GET /api/approvals?team=X&technology=Y`

### Sorting

Results are sorted by default (typically by name or creation date).

## Rate Limiting

Currently not implemented. No rate limits are enforced.

## Use Cases

### CI/CD Integration

Check technology approvals during build process:

```bash
#!/bin/bash
TEAM="frontend-team"
TECH="react"

RESPONSE=$(curl -s "http://localhost:3000/api/approvals?team=$TEAM&technology=$TECH")
TIME=$(echo $RESPONSE | jq -r '.data.approval.time')

if [ "$TIME" == "eliminate" ]; then
  echo "ERROR: $TECH is not approved"
  exit 1
fi
```

### Monitoring

Monitor system health:

```bash
#!/bin/bash
HEALTH=$(curl -s http://localhost:3000/api/health)
STATUS=$(echo $HEALTH | jq -r '.status')

if [ "$STATUS" != "healthy" ]; then
  echo "ALERT: System unhealthy"
  # Send alert
fi
```

### Automation

Automate system registration:

```bash
#!/bin/bash
for system in $(cat systems.json | jq -c '.[]'); do
  curl -X POST http://localhost:3000/api/systems \
    -H "Content-Type: application/json" \
    -d "$system"
done
```

## Documentation

- [API Endpoints](/api/endpoints) - Complete endpoint reference
- [Graph Model](/architecture/graph-model) - Data model
- [Team Approvals](/features/team-approvals) - Approval workflows

## Support

For API support:
1. Check the [API Endpoints](/api/endpoints) documentation
2. Review example code snippets
3. Open an issue on GitHub

## Changelog

### Version 2.0 (2025-10-30)

- Implemented RMM Level 2 compliance
- Added proper HTTP status codes
- Added PATCH/PUT/DELETE methods
- Removed action verbs from URLs
- Enhanced error handling

### Version 1.0 (Initial)

- Initial API implementation
- Basic CRUD operations
- Technology catalog access
