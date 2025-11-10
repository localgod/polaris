# Polaris

[![CI](https://github.com/localgod/polaris/actions/workflows/ci.yml/badge.svg)](https://github.com/localgod/polaris/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

An enterprise technology catalog built with Nuxt 4 and Neo4j graph database. Track technologies, versions, systems, teams, and policies in your organization with a graph-based data model.

## What is Polaris?

Polaris helps organizations manage their technology landscape by:
- **Technology Catalog**: Track approved technologies and their versions
- **Team-Specific Approvals**: Different approval policies per team with version-specific controls
- **System Inventory**: Map systems and their technology dependencies
- **Team Ownership**: Link technologies and systems to responsible teams
- **Policy Compliance**: Define and track governance policies
- **Dependency Visualization**: Understand relationships through graph queries
- **Audit Trail**: Comprehensive tracking of all data changes for compliance and security

## Architecture

This project follows a **3-layer architecture** pattern:

- **Nuxt 4 Frontend**: Modern Vue 3 application with server-side rendering
- **Neo4j Graph Database**: Stores relationships between technologies, systems, teams, and policies
- **Standalone Migrations**: Database schema managed via CLI tools
- **3-Layer API**: Endpoints → Services → Repositories for clean separation of concerns

The server uses a consistent pattern across all 25 endpoints:
- **Endpoints** (`server/api/`) - HTTP request/response handling
- **Services** (`server/services/`) - Business logic and orchestration
- **Repositories** (`server/repositories/`) - Data access and query execution
- **Queries** (`server/database/queries/`) - Reusable Cypher query files

See `docs/architecture/service-layer-pattern.md` for detailed patterns.

## Project Structure

```
polaris/
├── app/                    # Nuxt application
│   ├── pages/             # Vue pages
│   └── app.vue            # Root component
├── server/                # Server-side code (3-layer architecture)
│   ├── api/               # API endpoints (HTTP layer)
│   ├── services/          # Business logic layer
│   ├── repositories/      # Data access layer
│   └── database/queries/  # Cypher query files
├── schema/                # Database management
│   ├── migrations/        # Cypher migration files
│   ├── scripts/           # Migration CLI tools
│   └── fixtures/          # Test data
├── test/                  # Test files (Gherkin-style BDD)
│   ├── api/               # API endpoint tests
│   ├── schema/            # Database migration tests
│   ├── app/               # Frontend/application tests
│   └── helpers/           # Test utilities
├── docs/                  # Documentation
│   └── architecture/      # Architecture decision records
├── .devcontainer/         # Dev container configuration
└── .ona/                  # Gitpod automations
```

## Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- Docker and Docker Compose

### Setup

```bash
# Clone the repository
git clone https://github.com/localgod/polaris.git
cd polaris

# Install dependencies
npm install

# Start Neo4j (if not using dev container)
cd .devcontainer && docker compose up -d neo4j && cd ..

# Run database migrations
npm run migrate:up

# Start development server
npm run dev
```

Visit `http://localhost:3000` - the home page displays a real-time database status indicator.

**For detailed setup instructions**, see the [Contributing Guide](CONTRIBUTING.md#quick-start).

## Database Management

The project uses Neo4j 5 Community Edition with a standalone migration system.

### Common Commands

```bash
# Check migration status
npm run migrate:status

# Apply pending migrations
npm run migrate:up

# Create new migration
npm run migrate:create <name>

# Seed database with sample data
npm run seed
```

**For detailed database documentation**, see the [Contributing Guide](CONTRIBUTING.md#database-management).

## API Documentation

Polaris provides comprehensive OpenAPI 3.1 documentation for all REST API endpoints.

### Viewing the Documentation

- **Integrated UI**: Visit `/api-reference` in the app for a fully integrated API reference
- **Standalone UI**: Visit `/api-docs.html` for a standalone interactive API reference powered by [Scalar](https://scalar.com)
- **OpenAPI Spec**: Download the raw OpenAPI specification at `/openapi.json`

### Documented Endpoints

The API documentation includes:
- **Health**: Health check and status endpoints
- **Systems**: System management and CRUD operations
- **Components**: Component catalog and dependency tracking
- **Technologies**: Technology catalog with version management
- **Teams**: Team management and ownership
- **Policies**: Policy and compliance management
- **Repositories**: Source code repository tracking
- **Users**: User management (admin only)

All endpoints include:
- Request/response schemas
- Parameter descriptions
- Example payloads
- Authentication requirements
- Error responses

### Generating Updated Documentation

When you add or modify API endpoints, regenerate the OpenAPI spec:

```bash
# Generate static OpenAPI spec
node -e "import('./server/openapi.ts').then(m => require('fs').writeFileSync('public/openapi.json', JSON.stringify(m.openapiSpec, null, 2)))"
```

The spec is automatically generated from JSDoc comments in the API endpoint files.

## Development

### Available Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Database
npm run migrate:up       # Apply migrations
npm run seed             # Seed sample data

# Testing
npm test                 # Run all tests (60 tests)
npm run test:model       # Model layer tests (41 tests)
npm run test:api         # API layer tests (18 tests)
npm run test:ui          # UI layer tests (1 test)
npm run test:smoke       # Smoke tests (6 tests)
npm run test:coverage    # Run with coverage

# Code Quality
npm run lint             # Run linter
npm run lint:fix         # Fix linting issues
```

### Development Environment

The project supports multiple development environments:
- **Dev Containers**: Fully configured environment with Neo4j
- **Gitpod**: Cloud-based development with automations
- **Local**: Manual setup with Docker Compose

See [Dev Container README](.devcontainer/README.md) and [Gitpod Automations](.ona/README.md) for details.

## Testing

This project uses [Vitest](https://vitest.dev/) with Gherkin-style BDD syntax and a **three-layer testing strategy**.

### Test Data Isolation

Tests use **namespace-based isolation** to prevent corrupting development data:

- All test data is prefixed with `test_` or `test-` (both patterns supported)
- Automatic cleanup in test hooks
- Global setup clears test data before runs

**Note**: The Neo4j Community Edition instance doesn't support multiple databases. Tests share the same database as development but use prefixed data for isolation.

See [Test Isolation Guide](docs/testing/test-isolation.md) for detailed information.

### Test Architecture

**75 tests across 3 layers:**

1. **Model Layer** (41 tests) - Database schema and data integrity
   - Neo4j schema validation
   - Relationship constraints
   - Policy enforcement
   - Migration testing

2. **API Layer** (18 tests) - Business logic and endpoints
   - API endpoint functionality
   - Request/response validation
   - Error handling
   - Integration testing

3. **UI Layer** (1 test) - End-to-end user workflows
   - Browser automation with Playwright
   - User interaction flows
   - Visual validation

### Test Organization

```
test/
├── model/         # Layer 1: Database schema (41 tests)
│   ├── features/  # Gherkin feature files
│   └── *.spec.ts  # Test implementations
├── api/           # Layer 2: API endpoints (18 tests)
│   ├── *.feature  # Gherkin feature files
│   └── *.spec.ts  # Test implementations
├── ui/            # Layer 3: E2E workflows (1 test)
│   ├── *.feature  # Gherkin feature files
│   ├── *.spec.ts  # Test implementations
│   └── setup.ts   # Playwright configuration
└── helpers/       # Shared test utilities
```

Each test includes a `.feature` file (Gherkin scenarios) and `.spec.ts` file (implementation).

## Features

### Team-Specific Technology Approvals with TIME Framework

Polaris uses **Gartner's TIME framework** for technology portfolio management with team-specific policies:

- **TIME Categories**: Tolerate, Invest, Migrate, Eliminate
- **Per-Team Policies**: Each team can have different TIME categories for the same technology
- **Version-Specific Approvals**: Categorize specific versions independently
- **Approval Hierarchy**: Version-specific > Technology-level > Default (eliminate)
- **Rich Metadata**: EOL dates, migration targets, version constraints, approval history

**TIME Categories:**
- 🟢 **Invest**: Strategic technologies worth continued investment
- 🔵 **Migrate**: Technologies to move to newer platforms
- 🟡 **Tolerate**: Keep running but minimize investment
- 🔴 **Eliminate**: Phase out and decommission

**Example Use Case:** Angular marked as "Migrate" for Frontend Team (EOL: 2025-12-31, target: React), while React is "Invest".

**Documentation:**
- [TIME Framework Guide](docs/TIME_FRAMEWORK.md)
- [Implementation Summary](docs/TEAM_APPROVALS_IMPLEMENTATION.md)
- [Schema Design](docs/SCHEMA_ENHANCEMENT_TEAM_SPECIFIC_APPROVALS.md)

**API Endpoints:**
- `GET /api/technologies` - List technologies with TIME categories
- `GET /api/technologies/{name}` - Technology details with approvals
- `GET /api/teams/{name}/approvals` - All approvals for a team
- `GET /api/approvals/check` - Check TIME category with hierarchy resolution

### Comprehensive Audit Trail

Polaris tracks all data changes with complete context for compliance, security, and debugging:

- **Complete History**: Every create, update, delete, and approval operation is logged
- **User Accountability**: Know who made each change and when
- **Field-Level Tracking**: See exactly what changed with before/after values
- **Compliance Ready**: Support for SOC 2, GDPR, HIPAA, PCI DSS requirements
- **Security Monitoring**: Detect unauthorized access and suspicious activities
- **Rich Context**: Capture IP address, session, reason, and metadata

**What Gets Audited:**
- CRUD operations on all entities (Technology, System, Team, Policy, Component, User)
- Approval operations with TIME framework decisions
- SBOM uploads and vulnerability detection
- Relationship changes (ownership, stewardship)
- User activities (login, role changes)

**Example Use Case:** Track who approved React for the Frontend Team on 2025-11-05, why it was changed from "tolerate" to "invest", and what the previous approval settings were.

**Documentation:**
- [Audit Trail Guide](/content/features/audit-trail.md)
- [Schema Documentation](/schema/schema/README_AUDIT_TRAIL.md)
- [Example Queries](/schema/fixtures/audit-trail-examples.cypher)

**API Endpoints:**
- `GET /api/audit/entity/{type}/{id}` - Get audit trail for specific entity
- `GET /api/audit/user/{userId}` - Get all actions by a user
- `GET /api/audit` - Query audit logs with filters (operation, date range, source)

### Running Tests

```bash
# Run all tests (60 tests)
npm test

# Run by layer
npm run test:model       # Model layer (41 tests)
npm run test:api         # API layer (18 tests)
npm run test:ui          # UI layer (1 test)

# Run smoke tests (6 critical tests)
npm run test:smoke

# Run with coverage
npm run test:coverage
```

### CI/CD Testing

Tests run in **parallel** in GitHub Actions:
- **4 parallel jobs**: model, api, ui, smoke
- **~60% faster** than sequential execution
- **Layer-specific failures** for better debugging
- **Coverage reporting** per layer with merged results

**For testing guidelines and examples**, see the [Contributing Guide](CONTRIBUTING.md#testing).

## Documentation

### Project Documentation

- **[Contributing Guide](CONTRIBUTING.md)** - Complete guide for contributors including setup, workflow, testing, and database management
- **[Dev Container Setup](.devcontainer/README.md)** - Development container configuration
- **[Gitpod Automations](.ona/README.md)** - Automation configuration for cloud development
- **[Code of Conduct](CODE_OF_CONDUCT.md)** - Community guidelines
- **[Agent Instructions](AGENTS.md)** - Guidelines for AI agents working on this project

### In-App Documentation

Polaris includes comprehensive in-app documentation powered by @nuxt/content:

- **Getting Started**: Installation and setup guides
- **Features**: TIME Framework, Team Approvals
- **Architecture**: Graph Model, Schema Design
- **API**: Endpoint documentation with examples

Access the documentation at `/docs` when running the application, or browse the `content/` directory.

## Technology Stack

- **Frontend**: Nuxt 4, Vue 3, TypeScript, Tailwind CSS
- **Database**: Neo4j 5 Community Edition (graph database)
- **Documentation**: @nuxt/content with Markdown
- **Testing**: Vitest with Gherkin-style BDD
- **Development**: Docker, Dev Containers, Gitpod
- **CI/CD**: GitHub Actions with automated testing and coverage

## Key Features

- **Graph-Based Data Model**: Leverage Neo4j's native graph capabilities for complex relationships
- **Type-Safe**: Full TypeScript support throughout the stack
- **Modern Frontend**: Nuxt 4 with Vue 3 Composition API
- **In-App Documentation**: Comprehensive guides powered by @nuxt/content
- **Standalone Migrations**: Database schema managed independently via CLI
- **Comprehensive Testing**: Gherkin-style tests for better documentation
- **Developer Experience**: Dev containers and automations for quick setup

## License

See [LICENSE.md](LICENSE.md) for details.
