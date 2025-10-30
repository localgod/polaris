---
title: API Endpoints
description: REST API endpoints for accessing technology catalog data
---

Polaris provides REST API endpoints for accessing technology catalog data programmatically.

## Base URL

The API is available at:
```
/api
```

Note: The actual host and port depend on your deployment configuration.

## API Version

**Current Version:** 2.0  
**RMM Level:** 2 (Richardson Maturity Model)

## Quick Links

- [Systems](#systems) - Manage deployable applications
- [Teams](#teams) - Manage development teams
- [Technologies](#technologies) - Technology catalog
- [Components](#components) - Software components (SBOM)
- [Policies](#policies) - Governance policies
- [Approvals](#approvals) - Technology approvals
- [Repositories](#repositories) - Source code repositories
- [Health](#health) - System health monitoring

## HTTP Methods

- **GET** - Retrieve resources
- **POST** - Create resources (returns `201 Created`)
- **PATCH** - Partially update resources
- **PUT** - Fully replace resources
- **DELETE** - Remove resources (returns `204 No Content`)

## HTTP Status Codes

### Success (2xx)

- `200 OK` - Request successful
- `201 Created` - Resource created
- `204 No Content` - Resource deleted

### Client Errors (4xx)

- `400 Bad Request` - Missing required parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `422 Unprocessable Entity` - Validation error

### Server Errors (5xx)

- `500 Internal Server Error` - Unexpected error
- `503 Service Unavailable` - Service down

## Endpoints

### Health

Check system health and database connectivity.

**Endpoint:** `GET /api/health`

**Response (Healthy):**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-30T12:00:00.000Z"
}
```

**Response (Unhealthy):** `503 Service Unavailable`
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Connection timeout",
  "timestamp": "2025-10-30T12:00:00.000Z"
}
```

### Technologies

#### List All Technologies

Get all technologies with approval information.

**Endpoint:** `GET /api/technologies`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "React",
      "category": "framework",
      "vendor": "Meta",
      "approvedVersionRange": ">=18.0.0 <19.0.0",
      "ownerTeam": "Frontend Platform",
      "riskLevel": "low",
      "lastReviewed": "2025-10-01",
      "ownerTeamName": "Frontend Platform",
      "versions": ["18.2.0", "18.3.1"],
      "approvals": [
        {
          "team": "Frontend Platform",
          "time": "invest",
          "approvedAt": "2025-10-21T19:23:55.763Z",
          "approvedBy": "Frontend Lead",
          "notes": "Primary framework for customer-facing applications"
        }
      ]
    }
  ],
  "count": 10
}
```

#### Get Technology Details

Get detailed information about a specific technology.

**Endpoint:** `GET /api/technologies/{name}`

**Parameters:**
- `name` (path) - Technology name (e.g., "React")

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "React",
    "category": "framework",
    "vendor": "Meta",
    "approvedVersionRange": ">=18.0.0 <19.0.0",
    "ownerTeam": "Frontend Platform",
    "riskLevel": "low",
    "lastReviewed": "2025-10-01",
    "ownerTeamName": "Frontend Platform",
    "ownerTeamEmail": "frontend-platform@company.com",
    "versions": [...],
    "components": [...],
    "systems": [...],
    "policies": [...],
    "technologyApprovals": [
      {
        "team": "Frontend Platform",
        "time": "invest",
        "approvedAt": "2025-10-21T19:23:55.763Z",
        "approvedBy": "Frontend Lead",
        "notes": "Primary framework"
      }
    ],
    "versionApprovals": [
      {
        "team": "Frontend Platform",
        "version": "18.2.0",
        "time": "invest",
        "approvedAt": "2025-10-21T19:23:55.848Z",
        "approvedBy": "Frontend Lead",
        "notes": "Current stable version"
      }
    ]
  }
}
```

### Teams

Teams represent development teams or organizational units.

#### List All Teams

**Endpoint:** `GET /api/teams`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "frontend-team",
      "email": "frontend@example.com",
      "responsibilityArea": "Web Applications",
      "technologyCount": 15,
      "systemCount": 8
    }
  ],
  "count": 1
}
```

#### Get Team

**Endpoint:** `GET /api/teams/{name}`

**Response:** `200 OK` | `404 Not Found`

```json
{
  "success": true,
  "data": {
    "name": "frontend-team",
    "email": "frontend@example.com",
    "responsibilityArea": "Web Applications",
    "technologyCount": 15,
    "systemCount": 8,
    "usedTechnologyCount": 20,
    "memberCount": 5
  }
}
```

#### Delete Team

**Endpoint:** `DELETE /api/teams/{name}`

**Authorization:** Superuser

**Response:** `204 No Content` | `404 Not Found` | `409 Conflict`

#### Get Team Usage

**Endpoint:** `GET /api/teams/{name}/usage`

**Response:** Technology usage statistics for the team

#### Get Team Approvals

**Endpoint:** `GET /api/teams/{name}/approvals`

**Response:**
```json
{
  "success": true,
  "data": {
    "team": "frontend-team",
    "approvals": [
      {
        "technology": "react",
        "category": "framework",
        "time": "adopt",
        "approvedAt": "2024-01-15T10:00:00Z",
        "approvedBy": "architecture-team",
        "notes": "Approved for all new projects"
      }
    ]
  }
}
```

#### Get Team Policies

**Endpoint:** `GET /api/teams/{name}/policies`

**Response:** Policies that apply to the team

### Approvals

Check technology approval status for teams.

#### Check Approval Status

**Endpoint:** `GET /api/approvals`

**Query Parameters:**
- `team` (required) - Team name
- `technology` (required) - Technology name
- `version` (optional) - Specific version

**Example Request:**
```
GET /api/approvals?team=frontend-team&technology=react&version=18.2.0
```

**Response:**
```json
{
  "success": true,
  "data": {
    "team": "frontend-team",
    "technology": "react",
    "category": "framework",
    "vendor": "Meta",
    "version": "18.2.0",
    "approval": {
      "level": "version",
      "time": "adopt",
      "approvedAt": "2024-01-15T10:00:00Z",
      "approvedBy": "architecture-team",
      "notes": "Approved for production use"
    }
  }
}
```

**Approval Hierarchy:**
1. **Version-specific** (highest priority) - `level: "version"`
2. **Technology-level** - `level: "technology"`
3. **Default** - `level: "default"`, `time: "eliminate"`

**Approval Time Values:**
- `adopt` - Recommended for use
- `trial` - Experimental use allowed
- `assess` - Under evaluation
- `hold` - Do not use for new projects
- `eliminate` - Must be removed

### Systems

Systems represent deployable applications or services.

#### List All Systems

**Endpoint:** `GET /api/systems`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "customer-portal",
      "domain": "customer-experience",
      "ownerTeam": "frontend-team",
      "businessCriticality": "high",
      "environment": "prod",
      "sourceCodeType": "proprietary",
      "hasSourceAccess": true,
      "componentCount": 42,
      "repositoryCount": 2
    }
  ],
  "count": 1
}
```

#### Get System

**Endpoint:** `GET /api/systems/{name}`

**Response:** `200 OK` | `404 Not Found`

#### Create System

**Endpoint:** `POST /api/systems`

**Request Body:**
```json
{
  "name": "customer-portal",
  "domain": "customer-experience",
  "ownerTeam": "frontend-team",
  "businessCriticality": "high",
  "environment": "prod",
  "repositories": [
    {
      "url": "https://github.com/org/customer-portal",
      "scmType": "git",
      "name": "customer-portal",
      "isPublic": false,
      "requiresAuth": true
    }
  ]
}
```

**Response:** `201 Created` | `409 Conflict` | `422 Unprocessable Entity`

**Required Fields:**
- `name` - System name (lowercase, alphanumeric, hyphens)
- `domain` - Business domain
- `ownerTeam` - Team that owns this system
- `businessCriticality` - One of: `critical`, `high`, `medium`, `low`
- `environment` - One of: `dev`, `test`, `staging`, `prod`

#### Update System (Partial)

**Endpoint:** `PATCH /api/systems/{name}`

**Authorization:** Team Owner

**Request Body:** (all fields optional)
```json
{
  "description": "Customer-facing web portal",
  "businessCriticality": "critical",
  "environment": "prod"
}
```

**Response:** `200 OK` | `404 Not Found` | `422 Unprocessable Entity`

#### Update System (Full)

**Endpoint:** `PUT /api/systems/{name}`

**Authorization:** Team Owner

**Request Body:** (all required fields must be provided)
```json
{
  "domain": "customer-experience",
  "ownerTeam": "frontend-team",
  "businessCriticality": "critical",
  "environment": "prod",
  "description": "Customer-facing web portal"
}
```

**Response:** `200 OK` | `404 Not Found` | `422 Unprocessable Entity`

#### Delete System

**Endpoint:** `DELETE /api/systems/{name}`

**Authorization:** Team Owner

**Response:** `204 No Content` | `404 Not Found`

#### Get Unmapped Components

**Endpoint:** `GET /api/systems/{name}/unmapped-components`

**Response:**
```json
{
  "success": true,
  "data": {
    "system": "customer-portal",
    "components": [
      {
        "name": "lodash",
        "version": "4.17.21",
        "packageManager": "npm",
        "license": "MIT"
      }
    ],
    "count": 1
  }
}
```

### Repositories

Source code repositories.

#### List All Repositories

**Endpoint:** `GET /api/repositories`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "url": "https://github.com/org/customer-portal",
      "scmType": "git",
      "name": "customer-portal",
      "isPublic": false,
      "requiresAuth": true,
      "systemCount": 1
    }
  ],
  "count": 1
}
```

### Components

Software components (SBOM entries).

#### List All Components

**Endpoint:** `GET /api/components`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "react",
      "version": "18.2.0",
      "packageManager": "npm",
      "license": "MIT",
      "sourceRepo": "https://github.com/facebook/react",
      "technologyName": "React",
      "systemCount": 5
    }
  ],
  "count": 50
}
```

#### Get Unmapped Components

**Endpoint:** `GET /api/components/unmapped`

**Response:** Components not mapped to technologies

### Policies

Governance policies that define rules and constraints.

#### List All Policies

**Endpoint:** `GET /api/policies`

**Query Parameters:**
- `scope` (optional) - Filter by scope
- `status` (optional) - Filter by status
- `enforcedBy` (optional) - Filter by enforcement method

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "security-updates",
      "description": "All dependencies must be updated within 30 days of security release",
      "ruleType": "security",
      "severity": "critical",
      "status": "active",
      "technologyCount": 2
    }
  ],
  "count": 1
}
```

#### Get Policy

**Endpoint:** `GET /api/policies/{name}`

**Response:** `200 OK` | `404 Not Found`

#### Delete Policy

**Endpoint:** `DELETE /api/policies/{name}`

**Authorization:** Superuser

**Response:** `204 No Content` | `404 Not Found`

#### Get Policy Violations

**Endpoint:** `GET /api/policies/violations`

**Response:**
```json
{
  "success": true,
  "data": {
    "violations": [
      {
        "team": "frontend-team",
        "technology": "angular",
        "category": "framework",
        "systemCount": 3,
        "systems": ["legacy-app", "admin-portal"],
        "violationType": "eliminated",
        "notes": "Migrate to React by end of year",
        "migrationTarget": "react"
      }
    ],
    "summary": {
      "totalViolations": 1,
      "teamsAffected": 1
    }
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "statusCode": 404,
  "message": "Resource 'example' not found"
}
```

## Response Format

Successful responses follow this structure:

```json
{
  "success": true,
  "data": [...],
  "count": 10
}
```

## Authorization Levels

- **Public** - No authentication required
- **Authenticated** - Valid user session required
- **Team Member** - User must belong to a team
- **Team Owner** - User must belong to team that owns the resource
- **Superuser** - User must have superuser role

## Approval Time Values

Technology approvals use these values:

- `adopt` - Recommended for use
- `trial` - Experimental use allowed
- `assess` - Under evaluation
- `hold` - Do not use for new projects
- `eliminate` - Must be removed

## Usage Examples

### Check System Health

```bash
curl http://localhost:3000/api/health
```

### Create a System

```bash
curl -X POST http://localhost:3000/api/systems \
  -H "Content-Type: application/json" \
  -d '{
    "name": "customer-portal",
    "domain": "customer-experience",
    "ownerTeam": "frontend-team",
    "businessCriticality": "high",
    "environment": "prod"
  }'
```

### Update System (Partial)

```bash
curl -X PATCH http://localhost:3000/api/systems/customer-portal \
  -H "Content-Type: application/json" \
  -d '{
    "businessCriticality": "critical",
    "description": "Updated description"
  }'
```

### Check Technology Approval

```bash
curl "http://localhost:3000/api/approvals?team=frontend-team&technology=react&version=18.2.0"
```

### Delete a System

```bash
curl -X DELETE http://localhost:3000/api/systems/customer-portal
```

## Changelog

### Version 2.0 (2025-10-30)

- ✨ Added proper HTTP status codes (201, 204, 409, 422)
- ✨ Added GET endpoints for individual resources
- ✨ Added DELETE endpoints for resources
- ✨ Added PATCH endpoints for partial updates
- ✨ Added PUT endpoints for full updates
- ✨ Refactored URLs to remove action verbs
- 🗑️ Removed deprecated endpoints
- 🔄 Changed health endpoint response format

### Version 1.0 (Initial)

- Initial API implementation

## Next Steps

- [Graph Model](/architecture/graph-model) - Understand the data model
- [Team Approvals](/features/team-approvals) - Understand approval policies
- [Concepts](/concepts) - Learn about core concepts
