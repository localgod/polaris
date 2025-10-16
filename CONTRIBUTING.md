# Contributing to Polaris

Thank you for your interest in contributing to Polaris! This document provides guidelines for contributing to this Nuxt 4 + Neo4j project.

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- Docker and Docker Compose
- Git
- Neo4j

### Setup

1. **Fork the repository** on GitHub

2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/polaris.git
   cd polaris
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the development environment**:
   
   If using Dev Container (recommended):
   - Open in VS Code with Dev Containers extension
   - Reopen in Container when prompted
   - Neo4j will start automatically

   If running locally:
   ```bash
   # Start Neo4j via Docker Compose
   cd .devcontainer
   docker-compose up -d neo4j
   cd ..
   
   # Run migrations
   npm run migrate:up
   
   # Start Nuxt dev server
   npm run dev
   ```

5. **Verify setup**:
   - Nuxt app: http://localhost:3000
   - Database status should show "Online" on home page

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
│   │   ├── common/       # Migrations for all environments
│   │   ├── dev/          # Development-only migrations
│   │   └── prod/         # Production-only migrations
│   ├── scripts/          # Migration CLI tools
│   ├── schema/           # Schema definitions
│   └── seeds/            # Seed data
├── docs/                  # Documentation
├── .devcontainer/         # Dev container configuration
└── .ona/                  # Gitpod automations
```

## Making Changes

### Before You Start

- Check existing issues and PRs to avoid duplicate work
- For major changes, open an issue first to discuss your proposal
- Keep changes focused and atomic
- Ensure you understand the separation between Nuxt app and database management

### Development Workflow

1. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Frontend changes: `app/`, `server/`
   - Database changes: `schema/migrations/`
   - Documentation: `docs/`, `README.md`

3. **Test your changes**:
   ```bash
   # Run Nuxt dev server
   npm run dev
   
   # Test migrations
   npm run migrate:status
   npm run test:migrations
   
   # Build for production
   npm run build
   ```

4. **Lint your code**:
   ```bash
   # ESLint is configured via @nuxt/eslint
   # Linting runs automatically during build
   npm run build
   ```

5. **Commit your changes** with a clear message:
   ```bash
   git commit -m "Add: description of your changes"
   ```

### Commit Message Guidelines

Use clear, descriptive commit messages following this format:

- `Add: new feature or content`
- `Fix: bug fix or correction`
- `Update: changes to existing content`
- `Refactor: code restructuring`
- `Docs: documentation changes`
- `Test: test-related changes`
- `Chore: maintenance tasks`

Examples:
```
Add: database status indicator to home page
Fix: Neo4j connection timeout in dev container
Update: migration documentation with new examples
Refactor: extract database connection logic
Docs: clarify Neo4j setup instructions
```

### Code Style Guidelines

**Vue/TypeScript:**
- Follow existing code patterns in the project
- Use TypeScript for type safety
- Use Composition API (`<script setup>`) for Vue components
- Keep components focused and single-purpose

**Cypher Migrations:**
- One migration per logical change
- Include both `up` and `down` migrations
- Add descriptive metadata comments
- Test migrations before committing

**API Endpoints:**
- Use proper error handling
- Return consistent response formats
- Document expected inputs/outputs
- Close database connections properly

### Database Migrations

When creating database migrations:

1. **Create migration files**:
   ```bash
   npm run migrate:create your_migration_name
   ```

2. **Edit the generated files**:
   - `YYYY-MM-DD_HHMMSS_your_migration_name.up.cypher` - Forward migration
   - `YYYY-MM-DD_HHMMSS_your_migration_name.down.cypher` - Rollback migration

3. **Add metadata** at the top of the file:
   ```cypher
   // Description: Brief description of what this migration does
   // Author: Your Name
   // Date: YYYY-MM-DD
   ```

4. **Test the migration**:
   ```bash
   npm run migrate:up
   npm run migrate:down
   npm run migrate:validate
   ```

5. **Choose the correct directory**:
   - `common/` - Migrations for all environments
   - `dev/` - Development-only (test data, etc.)
   - `prod/` - Production-only (if needed)

See [docs/DATABASE_MIGRATIONS.md](docs/DATABASE_MIGRATIONS.md) for detailed migration guidelines.

## Submitting Changes

**Important:** This repository requires all changes to go through Pull Requests. Direct pushes to the `main` branch are not allowed.

1. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub:
   - Use a clear, descriptive title
   - Reference any related issues (e.g., "Fixes #123")
   - Describe what changes you made and why
   - Include screenshots for visual changes
   - List any breaking changes
   - Note if migrations are included

3. **PR Checklist**:
   - [ ] Code follows project conventions
   - [ ] Tests pass (if applicable)
   - [ ] Documentation updated (if needed)
   - [ ] Migrations tested (if applicable)
   - [ ] No console errors or warnings
   - [ ] Database status indicator works
   - [ ] Commit messages are clear

4. **Wait for review**:
   - Address any feedback from maintainers
   - Make requested changes in new commits
   - Keep the PR focused on a single topic
   - Ensure all checks pass

## Code Review Process

- All submissions require review before merging
- Maintainers may request changes or improvements
- Reviews focus on:
  - Code quality and maintainability
  - Adherence to project conventions
  - Test coverage (when applicable)
  - Documentation completeness
- Once approved, a maintainer will merge your PR

## Testing

### Manual Testing

1. **Frontend changes**:
   - Test in browser at http://localhost:3000
   - Verify database status indicator
   - Check console for errors
   - Test responsive design

2. **Database changes**:
   - Run migrations up and down
   - Verify data integrity
   - Check migration status

3. **API changes**:
   - Test endpoints with curl or Postman
   - Verify error handling
   - Check response formats

### Automated Testing

```bash
# Run migration tests
npm run test:migrations
```

## Reporting Issues

### Bug Reports

When reporting bugs, include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details:
  - Node.js version
  - Operating system
  - Browser (if frontend issue)
  - Neo4j version (if database issue)

### Feature Requests

When requesting features, include:
- Clear description of the feature
- Use case and benefits
- Possible implementation approach
- Any relevant examples or mockups

## Development Environment

### Dev Container

The project includes a dev container configuration:
- Node.js LTS
- Docker-in-Docker
- Neo4j 5 Community Edition
- VS Code extensions:
  - PlantUML
  - Markdown Lint
  - Error Lens
  - Neo4j VS Code

### Gitpod Automations

Automations are configured in `.ona/automations.yaml`:
- Auto-install dependencies
- Auto-start Neo4j
- Auto-run migrations
- Auto-start Nuxt dev server

See `.ona/automations.yaml` for the configuration.

## Architecture Principles

1. **Separation of Concerns**: Schema management is independent from application code
2. **Standalone Migrations**: Database schema managed via CLI tools
3. **Connection Available**: Neo4j accessible in Nuxt via `nuxt-neo4j` module
4. **Backend Service**: Neo4j runs as a backend service (Bolt protocol only)

## Documentation

When contributing, update relevant documentation:
- `README.md` - Project overview and setup
- `docs/DATABASE_MIGRATIONS.md` - Migration system guide
- `docs/MIGRATION_RUNBOOK.md` - Common migration tasks
- `.ona/automations.yaml` - Gitpod automation configuration
- Code comments - For complex logic only

## Questions?

If you have questions:
- Open an issue with the "question" label
- Check existing issues and discussions
- Review the documentation in `docs/`
- Check the README.md for common setup issues

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Polaris! 🚀
