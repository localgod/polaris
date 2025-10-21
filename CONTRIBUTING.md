# Contributing to Polaris

Thank you for your interest in contributing to Polaris! This document provides guidelines for contributing to this Nuxt 4 + Neo4j project.

## Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- Docker and Docker Compose
- Git

### Setup

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/polaris.git
   cd polaris
   ```

2. **Open in Dev Container** (recommended):
   - Open in VS Code with Dev Containers extension
   - Reopen in Container when prompted
   - Everything starts automatically:
     - ✅ Neo4j service
     - ✅ Environment variables (`.env` created)
     - ✅ Dependencies installed

3. **Verify setup**:
   ```bash
   # Start Nuxt dev server
   npm run dev
   
   # Visit http://localhost:3000
   # Database status should show "Online"
   ```

### Manual Setup (without Dev Container)

```bash
# Start Neo4j
cd .devcontainer && docker compose up -d neo4j && cd ..

# Create .env file
cp .env.example .env

# Install dependencies
npm install

# Run migrations
npm run migrate:up

# Start dev server
npm run dev
```

## Project Structure

```
polaris/
├── app/                    # Nuxt application
│   ├── pages/             # Vue pages
│   └── app.vue            # Root component
├── server/                # Server-side code
│   └── api/               # API endpoints
├── schema/                # Database management (standalone)
│   ├── migrations/        # Cypher migration files
│   ├── scripts/          # Migration CLI tools
│   └── fixtures/         # Test data
├── test/                  # Test files (Gherkin-style BDD)
│   ├── api/              # API endpoint tests
│   ├── schema/           # Database migration tests
│   ├── app/              # Frontend/application tests
│   └── helpers/          # Test utilities
└── .devcontainer/         # Dev container configuration
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

**Frontend/API changes**: Edit files in `app/` or `server/`

**Database changes**: Create migrations in `schema/migrations/`
```bash
npm run migrate:create your_migration_name
```

**Tests**: Add tests in `tests/features/`

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Test migrations
npm run test:migrations

# Lint code
npm run lint

# Build for production
npm run build
```

### 4. Commit Changes

Use clear, descriptive commit messages:

```bash
git commit -m "Add: description of your changes"
```

**Commit prefixes:**
- `Add:` - New feature or content
- `Fix:` - Bug fix or correction
- `Update:` - Changes to existing content
- `Refactor:` - Code restructuring
- `Docs:` - Documentation changes
- `Test:` - Test-related changes

### 5. Submit Pull Request

**Important:** This repository requires all changes to go through Pull Requests. Direct pushes to `main` are blocked.

```bash
# Push to your fork
git push origin feature/your-feature-name

# Open PR on GitHub with:
# - Clear, descriptive title
# - Description of changes
# - Reference to related issues
# - Screenshots for visual changes
```

## Testing

### Test Structure

Tests are organized by domain in the `test/` directory:

```
test/
├── api/           # API endpoint tests
├── schema/        # Database migration tests
├── app/           # Frontend/application tests
└── helpers/       # Shared test utilities
```

Each test includes:
- `.feature` file - Gherkin feature description in plain language
- `.spec.ts` file - Test implementation with Vitest

### Running Tests

```bash
# Run all tests
npm test

# Run tests once (CI mode)
npm run test:run

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui

# Run migration tests only
npm run test:migrations

# View coverage report
open coverage/index.html
```

### Writing Tests

Tests use Gherkin-style BDD syntax for better readability:

```typescript
import { expect } from 'vitest'
import { Feature } from '../helpers/gherkin'

Feature('My Feature', ({ Scenario }) => {
  Scenario('My scenario', ({ Given, When, Then, And }) => {
    Given('a precondition', () => {
      // Setup code
    })

    When('an action occurs', () => {
      // Action code
    })

    Then('an expected result', () => {
      expect(result).toBe(expected)
    })

    And('another assertion', () => {
      expect(something).toBeDefined()
    })
  })
})
```

### Testing API Endpoints

For API tests that require the Nuxt dev server:

```typescript
import { expect, beforeAll } from 'vitest'
import { Feature } from '../helpers/gherkin'
import { apiGet, checkServerHealth } from '../helpers/api-client'

Feature('API Health Check', ({ Scenario }) => {
  let serverRunning = false

  beforeAll(async () => {
    serverRunning = await checkServerHealth()
  })

  Scenario('Database status check', ({ Given, When, Then }) => {
    let response: any

    Given('the API server is running', () => {
      if (!serverRunning) return // Skip gracefully
      expect(serverRunning).toBe(true)
    })

    When('I request the database status', async () => {
      if (!serverRunning) return
      response = await apiGet('/api/db-status')
    })

    Then('I should receive a valid response', () => {
      if (!serverRunning) return
      expect(response).toHaveProperty('status')
    })
  })
})
```

API tests skip gracefully when the dev server isn't running.

### Testing with Neo4j

Tests run against a real Neo4j instance:
- **Dev Container**: Neo4j starts automatically
- **CI**: Neo4j service container with health checks
- **Credentials**: `neo4j/devpassword` (dev) or `neo4j/testpassword` (CI)

The test environment automatically configures Neo4j connection via environment variables.

### Coverage Requirements

Tests must meet these coverage thresholds:
- **Lines**: 50%
- **Branches**: 50%
- **Functions**: 45%
- **Statements**: 50%

Coverage is automatically reported in pull requests with:
- Overall coverage summary
- File-level coverage for changed files
- Links to uncovered lines
- Threshold status indicators

## Database Management

### Schema Overview

The `schema/` directory contains:
- **migrations/** - Version-controlled schema changes
- **scripts/** - Migration and seeding tools
- **fixtures/** - Test data for seeding

### Migrations

**Creating Migrations:**

```bash
# Create new migration
npm run migrate:create your_migration_name

# This creates two files:
# - YYYY-MM-DD_HHMMSS_your_migration_name.up.cypher (forward)
# - YYYY-MM-DD_HHMMSS_your_migration_name.down.cypher (rollback)
```

**Migration Structure:**

```cypher
/*
 * Migration: Brief description
 * Version: YYYY.MM.DD.HHMMSS
 * Author: Your Name
 * 
 * Description:
 * Detailed description of what this migration does
 */

// Your Cypher statements here
CREATE CONSTRAINT ...;
CREATE INDEX ...;
```

**Testing Migrations:**

```bash
# Check status
npm run migrate:status

# Apply migrations
npm run migrate:up

# Validate without applying
npm run migrate:validate

# Rollback last migration
npm run migrate:down

# Run migration tests
npm run test:migrations
```

**Migration Directories:**
- `common/` - Applied to all environments
- `dev/` - Development-only (test data, etc.)
- `prod/` - Production-only (if needed)

### Database Seeding

Load realistic test data for development:

```bash
# Seed database (idempotent - safe to run multiple times)
npm run seed

# Clear all data and reseed (reset to known state)
npm run seed:clear
```

**What Gets Seeded:**
- 5 Teams (Frontend, Backend, Data, DevOps, Security)
- 10 Technologies (React, Vue, Node.js, PostgreSQL, Neo4j, etc.)
- 7 Versions with approval status and EOL dates
- 6 Policies (governance rules)
- 5 Systems (example applications)
- 7 Components (SBOM entries)

The seeding system is idempotent - you can run it multiple times without creating duplicates.

## API Development

### Nuxt Configuration

The application uses the `nuxt-neo4j` module for database connectivity. Configuration is in `nuxt.config.ts`:

```typescript
neo4j: {
  uri: process.env.NEO4J_URI || 'bolt://172.19.0.2:7687',
  auth: {
    type: 'basic',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'devpassword'
  }
}
```

The Neo4j connection is available throughout your Nuxt application via the `useNeo4j()` composable.

### Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run mdlint           # Lint markdown files
```

### Using Neo4j in API Routes

The project uses `nuxt-neo4j` module for database access:

```typescript
// server/api/example.get.ts
export default defineEventHandler(async () => {
  const driver = useDriver()
  
  try {
    const { records } = await driver.executeQuery(`
      MATCH (t:Technology)
      RETURN t.name as name, t.status as status
      ORDER BY t.name
    `)
    
    return records.map(record => ({
      name: record.get('name'),
      status: record.get('status')
    }))
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch technologies'
    })
  }
})
```

**Best Practices:**
- Use `useDriver()` composable (no need to close connections)
- Always use try-catch for error handling
- Return consistent response formats
- Use parameterized queries to prevent injection
- Keep queries focused and efficient

### Example Queries

See `schema/fixtures/example-queries.cypher` for common query patterns:
- Finding technologies by status
- Getting team ownership
- Checking policy compliance
- Querying system dependencies

## Code Style

### Vue/TypeScript

- Use TypeScript for type safety
- Use Composition API (`<script setup>`) for Vue components
- Follow existing code patterns
- Keep components focused and single-purpose

### API Endpoints

- Use proper error handling with try-catch
- Return consistent response formats
- Use `useDriver()` for Neo4j access
- Document expected inputs/outputs
- Use parameterized queries

### Cypher Migrations

- One migration per logical change
- Include both `up` and `down` migrations
- Add descriptive metadata comments
- Test migrations before committing
- Use constraints and indexes appropriately

## CI/CD Pipeline

### Automated Checks

Every pull request runs:

1. **Lint** - ESLint and Markdown linting
2. **Test** - All tests with coverage reporting
3. **Build** - Production build verification

### Neo4j in CI

Tests run against a real Neo4j instance in GitHub Actions:
- Neo4j 5 Community Edition
- APOC plugin included
- Health checks ensure service is ready
- Credentials: `neo4j/testpassword`

### Coverage Reports

Pull requests automatically receive:
- Coverage report as PR comment
- Coverage in GitHub Actions step summary
- Threshold status indicators
- File-level coverage details

## Development Environment

### Dev Container Features

The dev container automatically provides:
- ✅ Node.js LTS
- ✅ Docker-in-Docker
- ✅ Neo4j 5 Community Edition (auto-starts)
- ✅ Environment variables (`.env` auto-created)
- ✅ Dependencies (auto-installed)
- ✅ VS Code extensions:
  - PlantUML
  - Markdown Lint
  - Error Lens
  - Neo4j VS Code
  - Vue Volar

### Neo4j Access

**Neo4j Browser**: http://localhost:7474
- Username: `neo4j`
- Password: `devpassword`

**Bolt Connection**: `bolt://localhost:7687`

### Manual Service Management

If needed, manually control Neo4j:

```bash
# Start Neo4j
cd .devcontainer && docker compose up -d neo4j

# Stop Neo4j
cd .devcontainer && docker compose stop neo4j

# Restart Neo4j
cd .devcontainer && docker compose restart neo4j

# View logs
docker compose -f .devcontainer/docker-compose.yml logs neo4j
```

## Troubleshooting

### Neo4j Not Starting

**Check status:**
```bash
docker ps --filter "name=neo4j"
```

**View logs:**
```bash
docker compose -f .devcontainer/docker-compose.yml logs neo4j
```

**Restart:**
```bash
bash .devcontainer/scripts/post-create.sh
```

### Tests Failing

**Neo4j not ready:**
- Wait 10-20 seconds after starting Neo4j
- Check Neo4j logs for errors

**Coverage below thresholds:**
- Add more tests to increase coverage
- Or adjust thresholds in `vitest.config.ts`

**API tests skipping:**
- Expected behavior when Nuxt dev server isn't running
- Start dev server: `npm run dev`

### Build Errors

**Missing dependencies:**
```bash
npm install
```

**Stale build artifacts:**
```bash
rm -rf .nuxt .output node_modules
npm install
npm run build
```

## Documentation

When contributing, update relevant documentation:

**Project Documentation:**
- `README.md` - Project overview and quick start
- `CONTRIBUTING.md` - This file (contribution guidelines)

**Database Documentation:**
- `schema/README.md` - Schema management overview
- `docs/DATABASE_MIGRATIONS.md` - Detailed migration guide
- `docs/MIGRATION_RUNBOOK.md` - Operational procedures
- `docs/SEEDING_GUIDE.md` - Database seeding guide
- `docs/TECH_CATALOG_SCHEMA.md` - Data model documentation

**Development Documentation:**
- `tests/README.md` - Testing guide
- `docs/NUXT_NEO4J_USAGE.md` - Using Neo4j in Nuxt
- `docs/PAGES.md` - Pages and routing
- `.devcontainer/README.md` - Dev container setup

**Code Comments:**
- Add comments only for complex logic
- Document "why" not "what"
- Keep comments up-to-date with code changes

## Pull Request Checklist

Before submitting your PR, ensure:

- [ ] Code follows project conventions
- [ ] All tests pass (`npm test`)
- [ ] Coverage meets thresholds
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Migrations tested (if applicable)
- [ ] Documentation updated (if needed)
- [ ] Commit messages are clear
- [ ] No console errors or warnings

## Data Model

The project implements a Technology Catalog with the following entities:

**Core Entities:**
- **Technology** - Software technologies (React, Node.js, PostgreSQL, etc.)
- **Version** - Specific versions with approval status and EOL dates
- **Team** - Engineering teams that own technologies
- **Policy** - Governance rules and compliance checks
- **System** - Applications and services
- **Component** - SBOM entries (npm packages, dependencies)

**Relationships:**
- `OWNS` - Team owns Technology
- `HAS_VERSION` - Technology has Version
- `USES` - System uses Technology/Component
- `DEPENDS_ON` - Component depends on Component
- `ENFORCES` - Policy enforces rules on Technology

See `docs/TECH_CATALOG_SCHEMA.md` for detailed data model documentation and `schema/fixtures/example-queries.cypher` for query examples.

## Architecture Principles

1. **Separation of Concerns** - Schema management is independent from application code
2. **Standalone Migrations** - Database schema managed via CLI tools
3. **Connection Available** - Neo4j accessible in Nuxt via `nuxt-neo4j` module
4. **Backend Service** - Neo4j runs as a backend service (Bolt protocol only)
5. **Idempotent Operations** - Migrations and seeding can run multiple times safely

## Getting Help

If you have questions:
- Open an issue with the "question" label
- Check existing issues and discussions
- Review documentation in `docs/`
- Check the README.md for setup issues

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Polaris! 🚀
