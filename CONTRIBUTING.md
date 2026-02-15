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
     - Yes Neo4j service
     - Yes Environment variables (`.env` created)
     - Yes Dependencies installed

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
├── server/                # Server-side code (3-layer architecture)
│   ├── api/               # API endpoints (HTTP layer)
│   ├── services/          # Business logic layer
│   ├── repositories/      # Data access layer
│   └── database/queries/  # Cypher query files
├── schema/                # Database management (standalone)
│   ├── migrations/        # Cypher migration files
│   ├── scripts/          # Migration CLI tools
│   └── fixtures/         # Test data
├── test/                  # Test files (Gherkin-style BDD)
│   ├── api/              # API endpoint tests
│   ├── schema/           # Database migration tests
│   ├── app/              # Frontend/application tests
│   └── helpers/          # Test utilities
├── docs/                  # Documentation
│   └── architecture/     # Architecture decision records
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

Available test scripts are defined in `package.json`. Run `npm run` to list available scripts and execute the desired script by name. For example:

```bash
# List scripts
npm run

# Run the test script shown in package.json, e.g.:
# npm run <script-name>
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

Polaris uses a **three-layer testing strategy** that mirrors the service layer architecture:

```
API Layer Tests → Service Layer Tests → Repository Layer Tests
   (Mock Service)    (Mock Repository)    (Use Test Database)
```

### Quick Reference

| Layer      | Location                    | Mocks      | Database | Speed      | Focus           |
|------------|-----------------------------|-----------|---------|-----------|--------------------|
| API        | `test/server/api/`          | Service   | No       | ~10ms     | HTTP contracts     |
| Service    | `test/server/services/`     | Repository| No       | ~10ms     | Business logic     |
| Repository | `test/server/repositories/` | None      | Yes       | ~50-100ms | Data queries       |

### Complete Testing Documentation

**For comprehensive testing information, see:**

- **[Testing Documentation](test/README.md)** ⭐ - Start here
  - Complete testing guide
  - Three-layer strategy explained
  - Quick start and examples
  
- **[Backend Testing Guide](test/server/README.md)** - Detailed guide
  - Layer-by-layer examples
  - Best practices
  - Common patterns
  
- **[API Tests](test/server/api/README.md)** - API layer guide
- **[Service Tests](test/server/services/README.md)** - Service layer guide
- **[Repository Tests](test/server/repositories/README.md)** - Repository layer guide

### Test Structure

Each backend test layer follows a specific pattern:

```
test/server/
├── api/              # API endpoint tests (mock service)
│   ├── README.md     # API testing guide
│   └── *.spec.ts     # Test files
├── services/         # Service layer tests (mock repository)
│   ├── README.md     # Service testing guide
│   └── *.spec.ts     # Test files
└── repositories/     # Repository layer tests (use database)
    ├── README.md     # Repository testing guide
    └── *.spec.ts     # Test files
```

### Running Tests

Available test scripts are defined in `package.json`. Run `npm run` to list available scripts and run the desired test script by name.

```bash
# List scripts
npm run

# Run the script from package.json, e.g.:
# npm run <script-name>
```

### Writing Tests

When adding new tests, follow the three-layer pattern:

**1. API Layer Tests** - Mock service, test HTTP contracts
```typescript
import { vi } from 'vitest'
import { ComponentService } from '../../../server/services/component.service'

vi.mock('../../../server/services/component.service')
// Test API response structure
```

**2. Service Layer Tests** - Mock repository, test business logic
```typescript
import { vi } from 'vitest'
import { ComponentRepository } from '../../../server/repositories/component.repository'

vi.mock('../../../server/repositories/component.repository')
// Test business rules and data transformation
```

**3. Repository Layer Tests** - Use test database, test queries
```typescript
import neo4j from 'neo4j-driver'
import { cleanupTestData } from '../../fixtures/db-cleanup'

const TEST_PREFIX = 'test_component_repo_'
// Test database queries with proper isolation
```

**For complete examples and patterns, see:**
- [API Testing Guide](test/server/api/README.md)
- [Service Testing Guide](test/server/services/README.md)
- [Repository Testing Guide](test/server/repositories/README.md)

### Test Data Isolation

All test data must use the `test_` prefix:

```typescript
const TEST_PREFIX = 'test_myfeature_'

// Create test data
await session.run(`
  CREATE (n:Node {name: $name})
`, { name: `${TEST_PREFIX}node1` })

// Clean up after tests
await cleanupTestData(driver, { prefix: TEST_PREFIX })
```

See the [Test Data Isolation](test/README.md#test-data-isolation) section for details.

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
Migration/test scripts are declared in `package.json`. Run `npm run` to list available scripts and execute the migration test script by name.
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

### Creating Technical Users

For CI/CD pipelines, testing or maintenance tasks, create technical users that don't require OAuth:

```bash
# Create a regular technical user
npx tsx schema/scripts/create-technical-user.ts ci@example.com "CI Bot"

# Create a technical user with superuser privileges
npx tsx schema/scripts/create-technical-user.ts admin@example.com "Admin Bot" --superuser

# Using npm script (note the -- separator)
npm run createuser -- ci@example.com "CI Bot"
```

**Technical users:**
- Use the `technical` provider (not OAuth)
- Require API tokens for authentication
- Can be assigned to teams via the admin UI or API
- Support both regular user and superuser roles

**After creating a technical user, generate an API token:**

```bash
npx tsx schema/scripts/seed-api-token.ts ci@example.com
```

The token will be displayed once and should be stored securely. Use it with the `Authorization: Bearer <token>` header for API requests.

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
# See `package.json` for test-related script names (run `npm run` to list available scripts)

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
- Coverage status indicators (informational — no thresholds are currently enforced)
- File-level coverage details

## Development Environment

### Dev Container Features

The dev container automatically provides:
- Yes Node.js LTS
- Yes Docker-in-Docker
- Yes Neo4j 5 Community Edition (auto-starts)
- Yes Environment variables (`.env` auto-created)
- Yes Dependencies (auto-installed)
- Yes VS Code extensions:
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

**Coverage notes:**
- If coverage is low for a component, consider adding targeted unit or integration tests to improve confidence.
- Coverage is collected and reported for information only; no thresholds are currently enforced. If you want to experiment with enforcing thresholds locally or in a feature branch, you can adjust `vitest.config.ts`, but this is not required for PRs.

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

- Before submitting your PR, ensure:
- [ ] Code follows project conventions
- [ ] All tests pass (run the repository's test script listed in `package.json`)
- [ ] Coverage reviewed (coverage is reported for information; no thresholds are enforced)
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

## Architecture Decision Records (ADRs)

We use Architecture Decision Records (ADRs) to document significant architectural decisions.

### When to Create an ADR

Create an ADR when making decisions about:
- Database schema changes
- Technology choices (frameworks, libraries, tools)
- Architectural patterns (service layer, repository pattern, etc.)
- API design decisions
- Security or compliance approaches
- Performance optimization strategies

### How to Create an ADR

1. **Copy the template**:
   ```bash
   cp docs/architecture/decisions/0000-template.md \
      docs/architecture/decisions/NNNN-your-decision.md
   ```

2. **Use the next sequential number** (check existing ADRs)

3. **Fill in all sections**:
   - **Status**: Start with "Proposed"
   - **Context**: Explain the problem and constraints
   - **Decision**: Describe the solution and why
   - **Consequences**: List positive, negative, and neutral impacts

4. **Submit with your PR**: Include the ADR in the same PR as the implementation

5. **Update the index**: Add your ADR to the list in `docs/architecture/decisions/README.md`

### ADR Lifecycle

- **Proposed**: Under discussion (use in PR for review)
- **Accepted**: Approved and implemented
- **Deprecated**: No longer recommended but still in use
- **Superseded**: Replaced by a newer ADR (link to it)

### Example ADRs

See `docs/architecture/decisions/` for examples:
- ADR-0001: Use Neo4j for Graph Database
- ADR-0002: Implement Service Layer Pattern

### Benefits

- **Knowledge Sharing**: New team members understand why decisions were made
- **Historical Context**: Preserve reasoning for future reference
- **Prevent Rehashing**: Avoid revisiting settled discussions
- **Transparency**: Make decision-making process visible

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
