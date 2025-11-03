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

### Authentication Setup (Optional)

Authentication is optional for development. All data is publicly readable without authentication.

**To enable authentication:**

1. **Create GitHub OAuth App:**
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Create new OAuth App
   - Set callback URL: `http://localhost:3000/api/auth/callback/github`
   - Copy Client ID and Client Secret

2. **Configure environment variables:**
   ```bash
   # Generate auth secret
   AUTH_SECRET=$(openssl rand -base64 32)
   
   # Add to .env
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   SUPERUSER_EMAILS=your.email@example.com
   ```

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

4. **Sign in:**
   - Visit http://localhost:3000
   - Click "Sign In" and authenticate with GitHub
   - Your email (if in SUPERUSER_EMAILS) grants full access

**Authentication features:**
- Public read access (no auth required)
- OAuth-based write access (GitHub)
- Team-scoped permissions
- Superuser role for full access

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

### Test Architecture

Polaris uses a **three-layer testing strategy** for comprehensive coverage:

```
test/
├── model/         # Layer 1: Database schema and data integrity
│   ├── features/  # Gherkin feature files
│   └── *.spec.ts  # Test implementations
├── api/           # Layer 2: Business logic and API endpoints
│   ├── *.feature  # Gherkin feature files
│   └── *.spec.ts  # Test implementations
├── ui/            # Layer 3: End-to-end user workflows
│   ├── *.feature  # Gherkin feature files
│   ├── *.spec.ts  # Test implementations
│   └── setup.ts   # Playwright configuration
└── helpers/       # Shared test utilities
```

**Test Layers:**

1. **Model Layer** (41 tests) - Database schema, constraints, relationships
   - Neo4j schema validation
   - Data integrity checks
   - Migration testing
   - Policy enforcement

2. **API Layer** (18 tests) - Business logic and endpoints
   - API endpoint functionality
   - Request/response validation
   - Error handling
   - Integration with database

3. **UI Layer** (1 test) - End-to-end user workflows
   - Browser automation with Playwright
   - User interaction flows
   - Visual validation
   - Cross-browser testing

Each test includes:
- `.feature` file - Gherkin feature description in plain language
- `.spec.ts` file - Test implementation with Vitest

### Running Tests

```bash
# Run all tests (60 tests across all layers)
npm test

# Run by layer
npm run test:model    # Model layer (41 tests)
npm run test:api      # API layer (18 tests)
npm run test:ui       # UI layer (1 test)

# Run smoke tests (6 critical tests across all layers)
npm run test:smoke

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui

# View coverage report
open coverage/index.html
```

### CI/CD Testing

Tests run in **parallel** in GitHub Actions for faster feedback:

- **4 parallel jobs**: model, api, ui, smoke
- **~60% faster** than sequential execution
- **Layer-specific failures** for better debugging
- **Coverage reporting** per layer with merged results

See [Phase 5 Migration](PHASE5_MIGRATION_COMPLETE.md) for CI/CD details.

### Writing Tests

**All tests MUST use Gherkin-style BDD syntax** for consistency and readability.

#### Test Structure

Every test consists of two files:

1. **`.feature` file** - Human-readable specification in Gherkin syntax
2. **`.spec.ts` file** - Test implementation using the Gherkin helper

#### Example: Basic Test

**File: `test/api/my-feature.feature`**
```gherkin
Feature: My Feature
  As a user
  I want to perform an action
  So that I can achieve a goal

  Scenario: Successful action
    Given a precondition exists
    When I perform an action
    Then I should see the expected result
    And the system should be in the correct state
```

**File: `test/api/my-feature.spec.ts`**
```typescript
import { expect } from 'vitest'
import { Feature } from '../helpers/gherkin'

Feature('My Feature', ({ Scenario }) => {
  Scenario('Successful action', ({ Given, When, Then, And }) => {
    let result: any

    Given('a precondition exists', () => {
      // Setup code
    })

    When('I perform an action', () => {
      result = performAction()
    })

    Then('I should see the expected result', () => {
      expect(result).toBe(expected)
    })

    And('the system should be in the correct state', () => {
      expect(something).toBeDefined()
    })
  })
})
```

#### Why Gherkin?

- **Readable** - Non-technical stakeholders can understand tests
- **Consistent** - All tests follow the same structure
- **Traceable** - Feature files serve as living documentation
- **Maintainable** - Clear separation between specification and implementation

### Testing Model Layer

Model layer tests validate database schema, constraints, and data integrity using Neo4j directly.

#### Pattern: Model Test

**File: `test/model/features/my-model.feature`**
```gherkin
Feature: My Model
  As a developer
  I want to validate the data model
  So that I can ensure data integrity

  Scenario: Create entity with required properties
    Given test data has been created
    When I create an entity with all properties
    Then the entity should exist in the database
    And all properties should be set correctly
```

**File: `test/model/my-model.spec.ts`**
```typescript
import { expect, beforeAll, afterAll } from 'vitest'
import { Feature } from '../helpers/gherkin'
import neo4j, { type Driver } from 'neo4j-driver'

Feature('My Model @model @schema', ({ Scenario }) => {
  let driver: Driver
  const testPrefix = 'test_'

  beforeAll(async () => {
    driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USERNAME || 'neo4j',
        process.env.NEO4J_PASSWORD || 'devpassword'
      )
    )
  })

  afterAll(async () => {
    const session = driver.session()
    try {
      await session.run(`
        MATCH (n) WHERE n.name STARTS WITH $prefix
        DETACH DELETE n
      `, { prefix: testPrefix })
    } finally {
      await session.close()
      await driver.close()
    }
  })

  Scenario('Create entity with required properties', ({ Given, When, Then, And }) => {
    let result: any

    Given('test data has been created', () => {
      expect(driver).toBeDefined()
    })

    When('I create an entity with all properties', async () => {
      const session = driver.session()
      try {
        await session.run(`
          CREATE (e:Entity {
            name: $name,
            status: $status
          })
        `, {
          name: `${testPrefix}Entity`,
          status: 'active'
        })
      } finally {
        await session.close()
      }
    })

    Then('the entity should exist in the database', async () => {
      const session = driver.session()
      try {
        result = await session.run(`
          MATCH (e:Entity {name: $name})
          RETURN e
        `, { name: `${testPrefix}Entity` })
        
        expect(result.records).toHaveLength(1)
      } finally {
        await session.close()
      }
    })

    And('all properties should be set correctly', () => {
      const entity = result.records[0].get('e')
      expect(entity.properties.name).toBe(`${testPrefix}Entity`)
      expect(entity.properties.status).toBe('active')
    })
  })
})
```

### Testing API Endpoints

API tests use Gherkin BDD with custom API client helpers that work with a running dev server.

#### Pattern: API Endpoint Test

**File: `test/api/my-endpoint.feature`**
```gherkin
Feature: My API Endpoint
  As an API consumer
  I want to retrieve data
  So that I can use it in my application

  Scenario: Successful data retrieval
    Given the API server is running
    When I request the endpoint
    Then I should receive a successful response
    And the response should contain valid data
```

**File: `test/api/my-endpoint.spec.ts`**
```typescript
import { expect, beforeAll } from 'vitest'
import { Feature } from '../helpers/gherkin'
import { apiGet, apiPost, checkServerHealth } from '../helpers/api-client'

Feature('My API Endpoint', ({ Scenario }) => {
  let serverRunning = false

  beforeAll(async () => {
    serverRunning = await checkServerHealth()
    if (!serverRunning) {
      console.warn('\n⚠️  Nuxt dev server not running. Start with: npm run dev')
      console.warn('   These tests will be skipped.\n')
    }
  })

  Scenario('Successful data retrieval', ({ Given, When, Then, And }) => {
    let response: any

    Given('the API server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    When('I request the endpoint', async () => {
      if (!serverRunning) return
      response = await apiGet('/api/my-endpoint')
    })

    Then('I should receive a successful response', () => {
      if (!serverRunning) return
      expect(response.success).toBe(true)
    })

    And('the response should contain valid data', () => {
      if (!serverRunning) return
      expect(response.data).toBeDefined()
      expect(response.count).toBeGreaterThanOrEqual(0)
    })
  })
})
```

#### Key Points

- **Use custom API helpers** - `apiGet()`, `apiPost()` from `test/helpers/api-client`
- **Check server health** - Use `checkServerHealth()` in `beforeAll()`
- **Graceful skipping** - Tests skip when dev server isn't running
- **Manual server start** - Run `npm run dev` before running tests
- **Guard all steps** - Check `serverRunning` in each step to skip gracefully

### Testing UI Layer

UI tests use Playwright for end-to-end browser automation and user workflow testing.

#### Pattern: UI Test

**File: `test/ui/my-feature.feature`**
```gherkin
Feature: My Feature UI
  As a user
  I want to interact with the application
  So that I can accomplish my goal

  Scenario: User completes workflow
    Given the application server is running
    When I navigate to the feature page
    Then the page should load successfully
    And I should see the expected content
```

**File: `test/ui/my-feature.spec.ts`**
```typescript
import { expect, beforeAll } from 'vitest'
import { Feature } from '../helpers/gherkin'
import { chromium, type Browser, type Page } from '@playwright/test'
import { checkServerHealth } from '../helpers/api-client'

Feature('My Feature UI @ui @e2e', ({ Scenario }) => {
  let browser: Browser
  let page: Page
  let serverRunning = false
  const appURL = process.env.NUXT_TEST_BASE_URL || 'http://localhost:3000'

  beforeAll(async () => {
    serverRunning = await checkServerHealth()
    
    if (!serverRunning) {
      console.warn('\n⚠️  Nuxt dev server not running. Start with: npm run dev')
      console.warn('   UI tests will be skipped.\n')
    }
  })

  Scenario('User completes workflow', ({ Given, When, Then, And }) => {
    Given('the application server is running', () => {
      if (!serverRunning) {
        console.log('   ⏭️  Skipping - server not available')
        return
      }
      expect(serverRunning).toBe(true)
    })

    When('I navigate to the feature page', async () => {
      if (!serverRunning) return
      
      if (!browser) {
        browser = await chromium.launch({ headless: true })
      }
      
      page = await browser.newPage()
      await page.goto(`${appURL}/feature`, { waitUntil: 'domcontentloaded' })
    })

    Then('the page should load successfully', async () => {
      if (!serverRunning) return
      expect(page).toBeDefined()
      expect(page.url()).toContain('/feature')
    })

    And('I should see the expected content', async () => {
      if (!serverRunning) return
      const heading = await page.textContent('h1')
      expect(heading).toBeTruthy()
      
      if (page) await page.close()
      if (browser) await browser.close()
    })
  })
})
```

**Key Points:**
- **Playwright** - Browser automation for E2E testing
- **Graceful skipping** - Tests skip when dev server isn't running
- **Manual server start** - Run `npm run dev` before running UI tests
- **Cleanup** - Always close browser and page in final step

### Testing with Neo4j

Tests run against a real Neo4j instance:
- **Dev Container**: Neo4j starts automatically
- **CI**: Neo4j service container with health checks
- **Credentials**: `neo4j/devpassword` (dev) or `neo4j/testpassword` (CI)

The test environment automatically configures Neo4j connection via environment variables.

### Coverage Requirements

**Current Thresholds:**
- **Lines**: 5%
- **Branches**: 5%
- **Functions**: 5%
- **Statements**: 5%

**Target Thresholds (Roadmap):**
- **Lines**: 80%
- **Branches**: 70%
- **Functions**: 80%
- **Statements**: 80%

**Note:** Thresholds are intentionally low while building out the test suite. We're working toward comprehensive coverage across all layers.

**Current Coverage:**
- **Total Tests**: 60 tests across 11 files
- **Model Layer**: 41 tests (schema, relationships, policies)
- **API Layer**: 18 tests (endpoints, business logic)
- **UI Layer**: 1 test (E2E smoke test)
- **Smoke Tests**: 6 critical path tests

Coverage is automatically reported in pull requests with:
- Overall coverage summary
- Per-layer coverage breakdown
- File-level coverage for changed files
- Links to uncovered lines
- Threshold status indicators

See [Recommended Future Work](RECOMMENDED_FUTURE_WORK.md) for coverage improvement roadmap.

### Test File Requirements

Every test MUST include:

1. **`.feature` file** - Gherkin specification
   - Clear feature description with user story
   - One or more scenarios
   - Given/When/Then/And steps

2. **`.spec.ts` file** - Test implementation
   - Import Gherkin helper: `import { Feature } from '../helpers/gherkin'`
   - Match scenario names exactly
   - Implement all steps from feature file

3. **Proper cleanup** - Clean up test data in `afterAll()` or final `And()` step

4. **Meaningful assertions** - No placeholder tests like `expect(true).toBe(true)`

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
- 5 Teams (Frontend Platform, Backend Platform, Data Platform, DevOps, Security)
- 10 Technologies (React, Vue, Node.js, PostgreSQL, Neo4j, etc.)
- 7 Versions with approval status and EOL dates
- 6 Policies (governance rules)
- 5 Systems (Customer Portal, API Gateway, Analytics Dashboard, etc.)
- 9 Components with SBOM data (react@18.2.0, vue@3.3.4, etc.)
  - Package URLs (purl) for universal identification
  - Multiple cryptographic hashes (SHA-256, SHA-512)
  - SPDX license identifiers
  - External references (source code, docs, issues)
  - Supplier and provenance information
- 1 Repository (github.com/company/monorepo)

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

# Database
npm run migrate:up       # Apply migrations
npm run migrate:down     # Rollback last migration
npm run migrate:status   # Check migration status
npm run migrate:create   # Create new migration
npm run seed             # Seed database with test data
npm run seed:clear       # Clear and reseed database

# Testing
npm test                 # Run all tests
npm run test:run         # Run tests once (CI mode)
npm run test:coverage    # Run with coverage
npm run test:ui          # Run with UI
npm run test:migrations  # Run migration tests only

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

**Architecture Documentation:**
- `content/architecture/graph-model.md` - Complete graph model and concepts
- `docs/sbom-schema-design.md` - SBOM schema design and standards
- `docs/sbom-schema-migration-summary.md` - SBOM migration details

**Development Documentation:**
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

## Authentication & Authorization

Polaris uses OAuth-based authentication with team-scoped authorization.

### Access Model

**Public Read Access:**
- All data is publicly viewable without authentication
- No login required for browsing technologies, teams, systems

**Authenticated Write Access:**
- Users authenticate via GitHub OAuth
- Write access requires team membership
- Users can only modify resources owned by their teams

**Superuser Access:**
- Designated users (via SUPERUSER_EMAILS) have full access
- Can manage user permissions and team assignments

### User Roles

**Anonymous (Unauthenticated):**
- Read all data
- No write access

**Authenticated User (No Team):**
- Read all data
- No write access until assigned to a team

**Authorized User (Team Member):**
- Read all data
- Write access to resources owned by their team(s)
- Cannot modify other teams' resources

**Superuser:**
- Full read/write access
- Can manage users and team assignments
- Can grant team management permissions

### Configuration

**Environment Variables:**
```bash
# Required for authentication
AUTH_SECRET=<generate with: openssl rand -base64 32>
GITHUB_CLIENT_ID=<from GitHub OAuth app>
GITHUB_CLIENT_SECRET=<from GitHub OAuth app>

# Superuser configuration
SUPERUSER_EMAILS=admin@company.com,lead@company.com

# Optional (auto-detected in Gitpod)
AUTH_ORIGIN=https://your-domain.com/api/auth
```

### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create new OAuth App
3. Set Authorization callback URL:
   - Local: `http://localhost:3000/api/auth/callback/github`
   - Gitpod: `https://3000-yourworkspace.ws-region.gitpod.io/api/auth/callback/github`
4. Copy Client ID and Client Secret to `.env`

### Protected API Endpoints

Use server-side utilities to protect endpoints:

```typescript
// Require authentication
const user = await requireAuth(event)

// Require authorization (auth + team membership)
const user = await requireAuthorization(event)

// Require superuser access
const user = await requireSuperuser(event)

// Require access to specific team
const user = await requireTeamAccess(event, 'Frontend Platform')

// Validate team ownership of resource
await validateTeamOwnership(event, 'System', 'Customer Portal')
```

**Example protected endpoint:**
```typescript
// server/api/systems/[name]/update.post.ts
export default defineEventHandler(async (event) => {
  const systemName = getRouterParam(event, 'name')
  
  // Require authorization
  await requireAuthorization(event)
  
  // Validate team ownership
  await validateTeamOwnership(event, 'System', systemName)
  
  // Proceed with update...
})
```

### Client-Side Usage

**Check authentication status:**
```vue
<script setup>
const { status, data: session } = useAuth()
</script>

<template>
  <div v-if="status === 'authenticated'">
    <p>Welcome, {{ session.user.name }}!</p>
    <p>Teams: {{ session.user.teams.map(t => t.name).join(', ') }}</p>
  </div>
</template>
```

**Sign in/out:**
```vue
<script setup>
const { signIn, signOut } = useAuth()
</script>

<template>
  <button @click="signIn('github')">Sign In with GitHub</button>
  <button @click="signOut()">Sign Out</button>
</template>
```

### User Management (Superuser Only)

**List all users:**
```bash
GET /api/admin/users
```

**Assign user to teams:**
```bash
POST /api/admin/users/{userId}/teams
Content-Type: application/json

{
  "teams": ["Frontend Platform", "Backend Platform"],
  "canManage": ["Frontend Platform"]
}
```

### Troubleshooting

**"Team membership required" error:**
- User is authenticated but not assigned to any team
- Superuser must assign user to a team via `/api/admin/users/{userId}/teams`

**"Access denied" error:**
- User trying to modify resource owned by another team
- Verify resource ownership or assign user to correct team

**User not showing as superuser:**
- Check email is in SUPERUSER_EMAILS (case-insensitive)
- Restart server after changing .env
- User must sign out and sign in again

## Data Model

The project implements a Technology Catalog with SBOM support.

### Core Entities

**Technology** - Governed software entities requiring approval
- Strategic architectural decisions
- Subject to policies and TIME framework
- Examples: React, Node.js, PostgreSQL

**Version** - Specific versions with approval status
- Version numbers and release dates
- End-of-life tracking
- Security vulnerability scores (CVSS)

**Team** - Engineering teams with governance responsibilities
- Stewardship (technical governance)
- Ownership (operational responsibility)
- Approval (usage decisions)

**Policy** - Governance rules and compliance checks
- Severity levels (info, warning, error, critical)
- Effective date ranges
- Scoped enforcement (organization, domain, team)

**System** - Deployable applications and services
- Business domain and criticality
- Source code location
- Owned by teams

**Component** - Software artifacts discovered via SBOM scanning
- Concrete dependencies (npm packages, Maven artifacts)
- Package URLs (purl) for universal identification
- Multiple hashes, licenses, vulnerabilities
- May or may not map to governed Technologies

**Repository** - Source code repositories
- Links to multiple systems (monorepo support)
- SBOM ingestion updates all systems in repository

**User** - Authenticated users
- OAuth provider integration (GitHub)
- Team memberships
- Role-based access (user, superuser)

### SBOM-Related Entities

**Hash** - Cryptographic hashes for integrity verification
- Multiple algorithms per component (SHA-256, SHA-512)

**License** - Software licenses with SPDX identifiers
- License compliance tracking
- Multiple licenses per component (dual-licensed)

**External Reference** - External resources
- Source code, documentation, issue trackers
- Quick navigation to component information

**Vulnerability** - Known security vulnerabilities
- CVE, GHSA, OSV identifiers
- Severity ratings and CVSS scores
- Analysis state tracking

### Key Relationships

**Governance:**
- `(Team)-[:STEWARDED_BY]->(Technology)` - Technical governance
- `(Team)-[:OWNS]->(System)` - Operational ownership
- `(Team)-[:APPROVES]->(Technology|Version)` - Usage approval with TIME category
- `(Team)-[:USES]->(Technology)` - Actual usage (auto-inferred)
- `(Policy)-[:APPLIES_TO]->(Technology)` - Policy enforcement

**Structure:**
- `(Technology)-[:HAS_VERSION]->(Version)` - Version tracking
- `(Component)-[:IS_VERSION_OF]->(Technology)` - Component to Technology mapping
- `(System)-[:USES]->(Component)` - System dependencies
- `(System)-[:HAS_SOURCE_IN]->(Repository)` - Source code location

**SBOM:**
- `(Component)-[:HAS_HASH]->(Hash)` - Integrity verification
- `(Component)-[:HAS_LICENSE]->(License)` - License tracking
- `(Component)-[:HAS_REFERENCE]->(ExternalReference)` - External resources
- `(Component)-[:HAS_VULNERABILITY]->(Vulnerability)` - Security tracking

**Authorization:**
- `(User)-[:MEMBER_OF]->(Team)` - Team membership
- `(User)-[:CAN_MANAGE]->(Team)` - Team management permission

### Documentation

- `content/architecture/graph-model.md` - Complete graph model documentation
- `docs/sbom-schema-design.md` - SBOM schema design
- `schema/fixtures/example-queries.cypher` - Query examples

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
