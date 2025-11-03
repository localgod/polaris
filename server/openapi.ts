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
      { name: 'Compliance', description: 'Compliance violation and audit endpoints' },
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
        ApiSingleResourceResponse: {
          type: 'object',
          required: ['success', 'data'],
          properties: {
            success: {
              type: 'boolean',
              enum: [true]
            },
            data: {
              type: 'object',
              description: 'Single resource object'
            }
          }
        },
        ApiErrorResponse: {
          type: 'object',
          required: ['statusCode', 'statusMessage', 'message'],
          properties: {
            statusCode: {
              type: 'integer',
              description: 'HTTP status code'
            },
            statusMessage: {
              type: 'string',
              description: 'HTTP status message'
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            url: {
              type: 'string',
              description: 'Request URL'
            },
            stack: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Error stack trace (development only)'
            }
          }
        },
        Hash: {
          type: 'object',
          required: ['algorithm', 'value'],
          properties: {
            algorithm: { 
              type: 'string',
              description: 'Hash algorithm (SHA256, SHA512, BLAKE3, etc.)',
              example: 'SHA-256'
            },
            value: { 
              type: 'string',
              description: 'Hash value',
              example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
            }
          }
        },
        License: {
          type: 'object',
          properties: {
            id: { 
              type: 'string',
              nullable: true,
              description: 'SPDX license ID',
              example: 'MIT'
            },
            name: { 
              type: 'string',
              nullable: true,
              description: 'License name',
              example: 'MIT License'
            },
            url: { 
              type: 'string',
              nullable: true,
              description: 'License URL',
              example: 'https://opensource.org/licenses/MIT'
            },
            text: { 
              type: 'string',
              nullable: true,
              description: 'Full license text'
            }
          }
        },
        ExternalReference: {
          type: 'object',
          required: ['type', 'url'],
          properties: {
            type: { 
              type: 'string',
              description: 'Reference type (vcs, website, documentation, issue-tracker, etc.)',
              example: 'vcs'
            },
            url: { 
              type: 'string',
              description: 'Reference URL',
              example: 'https://github.com/facebook/react'
            }
          }
        },
        Component: {
          type: 'object',
          required: ['name', 'version'],
          properties: {
            name: { 
              type: 'string',
              description: 'Component name'
            },
            version: { 
              type: 'string',
              description: 'Component version'
            },
            packageManager: { 
              type: 'string',
              nullable: true,
              description: 'Package manager (npm, maven, pypi, cargo, etc.)',
              example: 'npm'
            },
            purl: { 
              type: 'string',
              nullable: true,
              description: 'Package URL',
              example: 'pkg:npm/react@18.2.0'
            },
            cpe: { 
              type: 'string',
              nullable: true,
              description: 'Common Platform Enumeration'
            },
            bomRef: { 
              type: 'string',
              nullable: true,
              description: 'Unique identifier within SBOM'
            },
            type: { 
              type: 'string',
              nullable: true,
              enum: ['application', 'framework', 'library', 'container', 'platform', 'operating-system', 'device', 'device-driver', 'firmware', 'file', 'machine-learning-model', 'data'],
              description: 'Component type'
            },
            group: { 
              type: 'string',
              nullable: true,
              description: 'Maven groupId, npm scope, etc.',
              example: '@facebook'
            },
            scope: { 
              type: 'string',
              nullable: true,
              enum: ['required', 'optional', 'excluded', 'dev', 'test', 'runtime', 'provided'],
              description: 'Dependency scope'
            },
            hashes: { 
              type: 'array',
              items: { $ref: '#/components/schemas/Hash' },
              description: 'Component hashes'
            },
            licenses: { 
              type: 'array',
              items: { $ref: '#/components/schemas/License' },
              description: 'Component licenses'
            },
            copyright: { 
              type: 'string',
              nullable: true,
              description: 'Copyright text'
            },
            supplier: { 
              type: 'string',
              nullable: true,
              description: 'Organization/person who supplied the component'
            },
            author: { 
              type: 'string',
              nullable: true,
              description: 'Original author'
            },
            publisher: { 
              type: 'string',
              nullable: true,
              description: 'Publisher'
            },
            description: { 
              type: 'string',
              nullable: true,
              description: 'Component description'
            },
            homepage: { 
              type: 'string',
              nullable: true,
              description: 'Project homepage URL'
            },
            externalReferences: { 
              type: 'array',
              items: { $ref: '#/components/schemas/ExternalReference' },
              description: 'External references (VCS, docs, issues, etc.)'
            },
            releaseDate: { 
              type: 'string',
              nullable: true,
              format: 'date-time',
              description: 'Release date'
            },
            publishedDate: { 
              type: 'string',
              nullable: true,
              format: 'date-time',
              description: 'When published to registry'
            },
            modifiedDate: { 
              type: 'string',
              nullable: true,
              format: 'date-time',
              description: 'Last modification date'
            },
            technologyName: { 
              type: 'string',
              nullable: true,
              description: 'Linked Technology name'
            },
            systemCount: { 
              type: 'integer',
              description: 'Number of systems using this component'
            },
            vulnerabilityCount: { 
              type: 'integer',
              nullable: true,
              description: 'Number of known vulnerabilities'
            }
          }
        },
        UnmappedComponent: {
          type: 'object',
          required: ['name', 'version'],
          properties: {
            name: { 
              type: 'string',
              description: 'Component name'
            },
            version: { 
              type: 'string',
              description: 'Component version'
            },
            packageManager: { 
              type: 'string',
              nullable: true,
              description: 'Package manager (npm, maven, pypi, cargo, etc.)'
            },
            purl: { 
              type: 'string',
              nullable: true,
              description: 'Package URL'
            },
            cpe: { 
              type: 'string',
              nullable: true,
              description: 'Common Platform Enumeration'
            },
            type: { 
              type: 'string',
              nullable: true,
              enum: ['application', 'framework', 'library', 'container', 'platform', 'operating-system', 'device', 'device-driver', 'firmware', 'file', 'machine-learning-model', 'data'],
              description: 'Component type'
            },
            group: { 
              type: 'string',
              nullable: true,
              description: 'Maven groupId, npm scope, etc.'
            },
            hashes: { 
              type: 'array',
              items: { $ref: '#/components/schemas/Hash' },
              description: 'Component hashes'
            },
            licenses: { 
              type: 'array',
              items: { $ref: '#/components/schemas/License' },
              description: 'Component licenses'
            },
            systems: { 
              type: 'array',
              items: { type: 'string' },
              description: 'Systems using this component'
            },
            systemCount: { 
              type: 'integer',
              description: 'Number of systems using this component'
            }
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
