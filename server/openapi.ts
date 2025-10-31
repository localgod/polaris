import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'Polaris API',
      version: '2.0.0',
      description: `# Polaris Technology Catalog API

The Polaris API provides programmatic access to the technology catalog, enabling automation, integration, and custom tooling.

## Key Features

- **RESTful Design** - Resource-based URLs with proper HTTP methods
- **Comprehensive Coverage** - Systems, Teams, Technologies, Components, Policies, and more
- **Developer-Friendly** - Clear error messages and consistent response structure

## Authentication

Most endpoints require authentication using session-based authentication integrated with the web application.

**Authorization Levels:**
- **Public** - No authentication required
- **Authenticated** - Valid user session required  
- **Team Member** - User must belong to a team
- **Team Owner** - User must belong to team that owns the resource
- **Superuser** - User must have superuser role

## Response Format

All successful responses follow this structure:
\`\`\`json
{
  "success": true,
  "data": [...],
  "count": 10
}
\`\`\`

All errors follow this structure:
\`\`\`json
{
  "statusCode": 404,
  "message": "Resource 'example' not found"
}
\`\`\`

## Richardson Maturity Model

This API implements **RMM Level 2** with proper use of HTTP methods and status codes.`,
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      },
      contact: {
        name: 'Polaris',
        url: 'https://github.com/localgod/polaris'
      }
    },
    servers: [
      {
        url: '/api',
        description: 'API Server'
      }
    ],
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Systems', description: 'System management endpoints' },
      { name: 'Components', description: 'Component management endpoints' },
      { name: 'Technologies', description: 'Technology catalog endpoints' },
      { name: 'Teams', description: 'Team management endpoints' },
      { name: 'Policies', description: 'Policy and compliance endpoints' },
      { name: 'Repositories', description: 'Repository management endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Approvals', description: 'Technology approval endpoints' },
      { name: 'Admin', description: 'Administrative endpoints' }
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session',
          description: 'Session-based authentication using HTTP cookies'
        }
      },
      schemas: {
        ApiSuccessResponse: {
          type: 'object',
          required: ['success', 'data', 'count'],
          properties: {
            success: {
              type: 'boolean',
              enum: [true]
            },
            data: {
              type: 'array',
              items: {}
            },
            count: {
              type: 'integer',
              minimum: 0
            }
          }
        },
        ApiErrorResponse: {
          type: 'object',
          required: ['success', 'error', 'data'],
          properties: {
            success: {
              type: 'boolean',
              enum: [false]
            },
            error: {
              type: 'string'
            },
            data: {
              type: 'array',
              items: {},
              maxItems: 0
            }
          }
        },
        Component: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            packageManager: { type: 'string', nullable: true },
            license: { type: 'string', nullable: true },
            sourceRepo: { type: 'string', nullable: true },
            importPath: { type: 'string', nullable: true },
            hash: { type: 'string' },
            technologyName: { type: 'string', nullable: true },
            systemCount: { type: 'integer' }
          }
        },
        Technology: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            category: { type: 'string' },
            vendor: { type: 'string', nullable: true },
            approvedVersionRange: { type: 'string', nullable: true },
            ownerTeam: { type: 'string', nullable: true },
            riskLevel: { type: 'string', nullable: true },
            lastReviewed: { type: 'string', nullable: true },
            ownerTeamName: { type: 'string', nullable: true },
            versions: { type: 'array', items: { type: 'string' } },
            approvals: { type: 'array', items: { $ref: '#/components/schemas/TechnologyApproval' } }
          }
        },
        TechnologyApproval: {
          type: 'object',
          properties: {
            team: { type: 'string' },
            time: { type: 'string' },
            approvedAt: { type: 'string' },
            deprecatedAt: { type: 'string' },
            eolDate: { type: 'string' },
            migrationTarget: { type: 'string' },
            notes: { type: 'string' },
            approvedBy: { type: 'string' },
            versionConstraint: { type: 'string' }
          }
        },
        System: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            domain: { type: 'string', nullable: true },
            ownerTeam: { type: 'string', nullable: true },
            businessCriticality: { 
              type: 'string', 
              enum: ['critical', 'high', 'medium', 'low'],
              nullable: true 
            },
            environment: { 
              type: 'string',
              enum: ['dev', 'test', 'staging', 'prod'],
              nullable: true 
            },
            sourceCodeType: { type: 'string', nullable: true },
            hasSourceAccess: { type: 'boolean', nullable: true },
            componentCount: { type: 'integer' },
            repositoryCount: { type: 'integer' }
          }
        },
        Repository: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            scmType: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            isPublic: { type: 'boolean' },
            requiresAuth: { type: 'boolean' },
            defaultBranch: { type: 'string', nullable: true },
            createdAt: { type: 'string', nullable: true },
            lastSyncedAt: { type: 'string', nullable: true },
            systemCount: { type: 'integer' }
          }
        },
        Team: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', nullable: true },
            responsibilityArea: { type: 'string', nullable: true },
            technologyCount: { type: 'integer' },
            systemCount: { type: 'integer' }
          }
        },
        Policy: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            ruleType: { type: 'string' },
            severity: { type: 'string' },
            effectiveDate: { type: 'string', nullable: true },
            expiryDate: { type: 'string', nullable: true },
            enforcedBy: { type: 'string' },
            scope: { type: 'string' },
            status: { type: 'string' },
            enforcerTeam: { type: 'string', nullable: true },
            subjectTeams: { type: 'array', items: { type: 'string' } },
            governedTechnologies: { type: 'array', items: { type: 'string' } },
            technologyCount: { type: 'integer' }
          }
        },
        Violation: {
          type: 'object',
          properties: {
            violationId: { type: 'string' },
            policyName: { type: 'string' },
            systemName: { type: 'string' },
            componentName: { type: 'string' },
            componentVersion: { type: 'string' },
            severity: { type: 'string' },
            detectedAt: { type: 'string' },
            status: { type: 'string' },
            resolvedAt: { type: 'string', nullable: true },
            notes: { type: 'string', nullable: true }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string', nullable: true },
            role: { type: 'string' },
            provider: { type: 'string' },
            avatarUrl: { type: 'string', nullable: true },
            lastLogin: { type: 'string', nullable: true },
            createdAt: { type: 'string', nullable: true },
            teams: { type: 'array', items: { type: 'string' } }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'unhealthy'] },
            database: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            error: { type: 'string' }
          }
        }
      }
    }
  },
  apis: ['./server/api/**/*.ts']
}

export const openapiSpec = swaggerJsdoc(options)
