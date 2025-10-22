---
title: API Endpoints
description: REST API endpoints for accessing technology catalog data
---

# API Endpoints

Polaris provides REST API endpoints for accessing technology catalog data.

## Base URL

```
http://localhost:3000/api
```

## Endpoints

### Database Status

Check database connectivity.

**Endpoint:** `GET /api/db-status`

**Response:**
```json
{
  "status": "online",
  "message": "Database connection successful"
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

#### List All Teams

Get all teams with technology and system counts.

**Endpoint:** `GET /api/teams`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Frontend Platform",
      "email": "frontend-platform@company.com",
      "responsibilityArea": "frontend",
      "technologyCount": 4,
      "systemCount": 2
    }
  ],
  "count": 5
}
```

#### Get Team Approvals

Get all approvals for a specific team.

**Endpoint:** `GET /api/teams/{name}/approvals`

**Parameters:**
- `name` (path) - Team name (e.g., "Frontend Platform")

**Response:**
```json
{
  "success": true,
  "data": {
    "team": "Frontend Platform",
    "technologyApprovals": [
      {
        "technology": "React",
        "category": "framework",
        "vendor": "Meta",
        "time": "invest",
        "approvedBy": "Frontend Lead",
        "notes": "Primary framework"
      }
    ],
    "versionApprovals": [
      {
        "technology": "React",
        "version": "18.2.0",
        "time": "invest",
        "approvedBy": "Frontend Lead",
        "notes": "Current stable version"
      }
    ]
  }
}
```

### Approvals

#### Check Approval Status

Check approval status for a technology with hierarchy resolution.

**Endpoint:** `GET /api/approvals/check`

**Query Parameters:**
- `team` (required) - Team name
- `technology` (required) - Technology name
- `version` (optional) - Version number

**Example:**
```
GET /api/approvals/check?team=Frontend+Platform&technology=React&version=18.2.0
```

**Response:**
```json
{
  "success": true,
  "data": {
    "team": "Frontend Platform",
    "technology": "React",
    "version": "18.2.0",
    "approval": {
      "level": "version",
      "time": "invest",
      "approvedAt": "2025-10-21T19:23:55.848Z",
      "approvedBy": "Frontend Lead",
      "notes": "Current stable version"
    }
  }
}
```

**Approval Hierarchy:**
1. **Version-specific** (highest priority) - `level: "version"`
2. **Technology-level** - `level: "technology"`
3. **Default** - `level: "default"`, `time: "eliminate"`

### Systems

#### List All Systems

Get all systems with their metadata.

**Endpoint:** `GET /api/systems`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Customer Portal",
      "domain": "customer-experience",
      "ownerTeam": "Frontend Platform",
      "businessCriticality": "high",
      "environment": "production",
      "componentCount": 15,
      "technologyCount": 8
    }
  ],
  "count": 5
}
```

### Components

#### List All Components

Get all components (SBOM entries).

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
      "technology": "React",
      "systems": ["Customer Portal", "Admin Dashboard"]
    }
  ],
  "count": 50
}
```

### Policies

#### List All Policies

Get all governance policies.

**Endpoint:** `GET /api/policies`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "No Deprecated Dependencies",
      "description": "Systems must not use deprecated technology versions",
      "ruleType": "compliance",
      "severity": "error",
      "technologyCount": 5
    }
  ],
  "count": 6
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 404
}
```

**Common Status Codes:**
- `200` - Success
- `400` - Bad Request (missing parameters)
- `404` - Not Found
- `500` - Internal Server Error

## TIME Categories

All approval responses include a `time` field with one of these values:

- `invest` - Strategic technologies worth continued investment
- `migrate` - Technologies to move to newer platforms
- `tolerate` - Keep running but minimize investment
- `eliminate` - Phase out and decommission

## Examples

### Find Technologies to Migrate

```bash
curl http://localhost:3000/api/technologies | \
  jq '.data[] | select(.approvals[].time == "migrate")'
```

### Check if Team Can Use Technology

```bash
curl 'http://localhost:3000/api/approvals/check?team=Backend+Platform&technology=Node.js' | \
  jq '.data.approval.time'
```

### Get All Approvals for Team

```bash
curl 'http://localhost:3000/api/teams/Frontend+Platform/approvals' | \
  jq '.data.technologyApprovals[] | {technology, time}'
```

## Next Steps

- [Graph Model](/architecture/graph-model) - Understand the data model
- [TIME Framework](/features/time-framework) - Learn about TIME categories
- [Team Approvals](/features/team-approvals) - Understand approval policies
