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

## Architecture

This project follows a **separation of concerns** architecture:

- **Nuxt 4 Frontend**: Modern Vue 3 application with server-side rendering
- **Neo4j Graph Database**: Stores relationships between technologies, systems, teams, and policies
- **Standalone Migrations**: Database schema managed via CLI tools
- **API Layer**: Server endpoints for data access with Neo4j integration

The application uses the `nuxt-neo4j` module for seamless database connectivity.

## Project Structure

```
polaris/
├── app/                    # Nuxt application
│   ├── pages/             # Vue pages
│   └── app.vue            # Root component
├── server/                # Server-side code
│   └── api/               # API endpoints
├── schema/                # Database management
│   ├── migrations/        # Cypher migration files
│   ├── scripts/           # Migration CLI tools
│   └── fixtures/          # Test data
├── test/                  # Test files (Gherkin-style BDD)
│   ├── api/               # API endpoint tests
│   ├── schema/            # Database migration tests
│   ├── app/               # Frontend/application tests
│   └── helpers/           # Test utilities
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
npm test                 # Run tests
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

This project uses [Vitest](https://vitest.dev/) with Gherkin-style BDD syntax.

### Test Organization

```
test/
├── api/           # API endpoint tests
├── schema/        # Database migration tests
├── app/           # Frontend tests
└── helpers/       # Test utilities
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

### Running Tests

```bash
npm test                 # Run all tests (watch mode)
npm run test:run         # Run once (CI mode)
npm run test:coverage    # Run with coverage
npm run test:migrations  # Run migration tests only
```

**For testing guidelines and examples**, see the [Contributing Guide](CONTRIBUTING.md#testing).

## Documentation

- **[Contributing Guide](CONTRIBUTING.md)** - Complete guide for contributors including setup, workflow, testing, and database management
- **[Dev Container Setup](.devcontainer/README.md)** - Development container configuration
- **[Gitpod Automations](.ona/README.md)** - Automation configuration for cloud development
- **[Code of Conduct](CODE_OF_CONDUCT.md)** - Community guidelines
- **[Agent Instructions](AGENTS.md)** - Guidelines for AI agents working on this project

## Documentation

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
