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
│   ├── components/        # Vue components
│   └── app.vue            # Root component
├── server/                # Server-side code (3-layer architecture)
│   ├── api/               # API endpoints (HTTP layer)
│   ├── services/          # Business logic layer
│   ├── repositories/      # Data access layer
│   ├── utils/             # Server utilities and validators
│   └── database/queries/  # Cypher query files
├── schema/                # Database management
│   ├── migrations/        # Cypher migration files
│   ├── scripts/           # Migration CLI tools
│   └── fixtures/          # Test data
├── test/                  # Test files (layered testing strategy)
│   ├── server/            # Backend unit tests
│   │   ├── api/           # API endpoint tests (mock services)
│   │   ├── services/      # Service layer tests (mock repositories)
│   │   ├── repositories/  # Repository tests (real database)
│   │   └── utils/         # Utility unit tests
│   ├── app/               # Frontend tests
│   │   ├── e2e/           # End-to-end UI tests (Playwright)
│   │   ├── components/    # Component tests
│   │   ├── composables/   # Composable tests
│   │   └── pages/         # Page tests
│   ├── integration/       # Backend integration tests (cross-layer)
│   ├── schema/            # Database schema tests
│   ├── fixtures/          # Shared test helpers
│   └── setup/             # Global test setup/teardown
├── content/               # In-app documentation (Markdown)
│   ├── features/          # Feature documentation
│   ├── architecture/      # Architecture guides
│   └── api/               # API documentation
├── docs/                  # Project documentation
│   ├── architecture/      # Architecture decision records
│   └── testing/           # Testing guides
├── public/                # Static assets
├── .github/               # GitHub Actions workflows
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

# Seed database from GitHub repositories (generates real SBOMs)
npm run seed:github

# Technical users and API tokens are managed via the UI (/users) by superusers
```

**For detailed database documentation**, see the [Contributing Guide](CONTRIBUTING.md#database-management).

**For GitHub seeding**, see [Seeding from GitHub Repositories](docs/seeding-from-github.md).

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

All runnable scripts are defined in `package.json`. To see the full list of available scripts, run:

```bash
# List available npm scripts
npm run
```

Run the specific script name shown in `package.json` to execute a task (for example, the repository includes scripts for development, database, testing, and linting).

### Development Environment

The project supports multiple development environments:
- **Dev Containers**: Fully configured environment with Neo4j
- **Gitpod**: Cloud-based development with automations
- **Local**: Manual setup with Docker Compose

See [Dev Container README](.devcontainer/README.md) and [Gitpod Automations](.ona/README.md) for details.

## Testing

This project uses [Vitest](https://vitest.dev/) with a three-layer testing strategy. Available test scripts are defined in `package.json`; run `npm run` to list scripts and execute the desired script by name.

**For detailed testing information, see:**
- **[Testing Documentation](test/README.md)** - Complete testing guide
- **[Contributing Guide](CONTRIBUTING.md#testing)** - How to write tests

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

### SBOM Submission Workflow

Polaris collects and tracks Software Bill of Materials (SBOM) from your CI/CD pipelines:

**Workflow:**
1. **Register Repository**: Link repository to a system
   ```bash
   POST /api/systems/my-system/repositories
   {
     "url": "https://github.com/org/repo"
   }
   ```

2. **Submit SBOM**: CI/CD submits SBOM after build
   ```bash
   POST /api/sboms
   {
     "repositoryUrl": "https://github.com/org/repo",
     "sbom": { /* CycloneDX or SPDX */ }
   }
   ```

**Features:**
- ✅ Supports CycloneDX and SPDX formats
- ✅ Automatic component extraction and deduplication
- ✅ Links components to systems for governance
- ✅ Tracks last SBOM scan timestamp
- ✅ Strict enforcement: repository must be registered first

**Note:** Polaris focuses on SBOM collection and component tracking. For vulnerability scanning, use complementary tools like GitHub Dependabot, Trivy, or Grype alongside Polaris.

#### GitHub Actions Integration

For projects hosted on GitHub, Polaris ships a ready-to-use push script and workflow template that automate SBOM generation and submission on every push to the default branch.

**Quick setup (3 steps):**

1. Copy the workflow template into your repository:
   ```bash
   cp .github/workflows/polaris-sbom.yml /path/to/your-repo/.github/workflows/
   ```

2. Add two secrets to your repository (**Settings → Secrets and variables → Actions**):

   | Secret | Value |
   |---|---|
   | `POLARIS_URL` | Base URL of your Polaris instance, e.g. `https://polaris.example.com` |
   | `POLARIS_TOKEN` | API token — generate one in Polaris under **Profile → API Tokens** |

3. Edit the workflow file and set `POLARIS_SYSTEM` to the name of the system in Polaris that owns the repository.

The workflow runs `scripts/polaris-push.mjs`, which uses [cdxgen](https://github.com/CycloneDX/cdxgen) to generate a CycloneDX SBOM from the project's dependency manifests and submits it to `POST /api/sboms`. Failures in the Polaris push never block your CI pipeline (`continue-on-error: true`).

**Optional: auto-register the repository**

Set `POLARIS_AUTO_REGISTER: 'true'` in the workflow env block to have the script automatically register the repository with the system in Polaris before pushing the SBOM. This is idempotent — safe to leave enabled on every run.

**Environment variables reference:**

| Variable | Required | Default | Description |
|---|---|---|---|
| `POLARIS_URL` | Yes | — | Base URL of the Polaris instance |
| `POLARIS_TOKEN` | Yes | — | Bearer token for a Polaris user |
| `POLARIS_SYSTEM` | Yes | — | System name in Polaris |
| `POLARIS_REPO_URL` | No | `https://github.com/$GITHUB_REPOSITORY` | Repository URL sent to Polaris |
| `POLARIS_AUTO_REGISTER` | No | `false` | Register repo with system before pushing |
| `POLARIS_DOMAIN` | No | `Development` | Domain used when auto-registering |

**Documentation:**
- [SBOM Schema Design](docs/sbom-schema-design.md)
- [ADR-0004: Exclude CVE Management](docs/architecture/decisions/0004-exclude-cve-vulnerability-management.md)

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
- SBOM uploads and component tracking
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

Available test scripts (by name) are defined in `package.json`. Run `npm run` to list scripts and then run the desired script by name. For example:

```bash
# List scripts
npm run

# Run the script shown in package.json, e.g.:
# npm run <script-name>
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
