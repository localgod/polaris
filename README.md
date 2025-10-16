# Polaris

A Nuxt 4 application with Neo4j graph database support for development.

## Architecture

This project follows a **separation of concerns** architecture:

- **Nuxt Application**: Frontend application with Neo4j connection available via `nuxt-neo4j` module
- **Neo4j Database**: Separate service for data persistence
- **Migration System**: Standalone CLI tools for schema management

The Nuxt application has the `nuxt-neo4j` module configured for database access. Schema management and migrations are handled independently via CLI tools.

## Project Structure

```
polaris/
├── app/                    # Nuxt application
│   ├── pages/             # Vue pages
│   └── app.vue            # Root component
├── schema/
│   ├── migrations/    # Cypher migration files
│   └── scripts/       # Migration CLI tools
├── docs/                  # Documentation
├── .devcontainer/         # Dev container configuration
└── .ona/                  # Gitpod automations
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose (for Neo4j)

### Development Setup

1. **Start the environment** (if using dev container):
   ```bash
   # Dev container will automatically start Neo4j
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run database migrations**:
   ```bash
   npm run migrate:up
   ```

4. **Start Nuxt dev server**:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`.

The home page displays a real-time database status indicator showing whether Neo4j is online or offline.

## Database Management

### Neo4j Service

Neo4j runs as a separate Docker service:
- **Bolt Protocol**: `bolt://localhost:7687`
- **Credentials**: `neo4j` / `devpassword`

### Migration Commands

All database operations are performed via CLI:

```bash
# Check migration status
npm run migrate:status

# Apply pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Create new migration
npm run migrate:create <name>

# Validate migrations
npm run migrate:validate

# Run migration tests
npm run test:migrations
```

### Creating Migrations

Migrations are Cypher files in `src/db/migrations/`:

```bash
npm run migrate:create add_user_nodes
```

This creates:
- `YYYY-MM-DD_HHMMSS_add_user_nodes.up.cypher` - Forward migration
- `YYYY-MM-DD_HHMMSS_add_user_nodes.down.cypher` - Rollback migration

See [Database Migrations Guide](docs/DATABASE_MIGRATIONS.md) for details.

## Nuxt Application

### Available Scripts

```bash
# Development
npm run dev              # Start dev server

# Production
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run postinstall      # Prepare Nuxt
```

### Configuration

Nuxt configuration is in `nuxt.config.ts`. The application includes the `nuxt-neo4j` module for database connectivity:

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

The Neo4j connection is available in your Nuxt application via the `useNeo4j()` composable.

## Development Environment

### Dev Container

The project includes a dev container configuration with:
- Node.js development environment
- Neo4j 5 Community Edition
- APOC plugin enabled
- Persistent volumes for data

### Gitpod Automations

Automations are configured in `.ona/automations.yaml`:

**Services:**
- `nuxt-dev` - Nuxt development server (auto-starts)

**Tasks:**
- `install-deps` - Install npm dependencies
- `wait-neo4j` - Wait for Neo4j to be ready
- `run-migrations` - Apply database migrations

See [Gitpod Automations](.ona/README.md) for details.

## Accessing Neo4j

Neo4j runs as a backend service accessible via the Bolt protocol.

### Connection Details

- **Bolt Protocol**: `bolt://localhost:7687` (or `bolt://172.19.0.2:7687` from within dev container)
- **Username**: `neo4j`
- **Password**: `devpassword`

### Using Neo4j in Your Application

The `nuxt-neo4j` module is configured and available in your Nuxt application:

```typescript
// In any component or composable
const neo4j = useNeo4j()

// Execute queries
const result = await neo4j.run('MATCH (n) RETURN count(n) as count')
```

### Database Status API

A status endpoint is available to check Neo4j connectivity:

```bash
curl http://localhost:3000/api/db-status
```

Returns:
```json
{
  "status": "online",
  "message": "Database connection successful"
}
```

The home page automatically displays the database status.

### Direct Database Access

For direct database access during development, you can use:
- Neo4j Desktop (connect to `bolt://localhost:7687`)
- Cypher Shell CLI
- Any Neo4j client library

## Documentation

### Core Documentation

- [Database Migrations](docs/DATABASE_MIGRATIONS.md) - Migration system guide
- [Migration Runbook](docs/MIGRATION_RUNBOOK.md) - Common migration tasks
- [Database Seeding](docs/SEEDING_GUIDE.md) - How to seed test data
- [Schema Management](docs/SCHEMA.md) - Schema directory overview
- [Tech Catalog Schema](docs/TECH_CATALOG_SCHEMA.md) - Technology catalog data model

### Application Documentation

- [Pages & Routing](docs/PAGES.md) - Nuxt pages and API endpoints
- [Nuxt Neo4j Usage](docs/NUXT_NEO4J_USAGE.md) - Using Neo4j in Nuxt

### Environment Setup

- [Dev Container](.devcontainer/README.md) - Development container setup
- [Gitpod Automations](.ona/README.md) - Automation configuration

### Project Guidelines

- [Contributing Guidelines](CONTRIBUTING.md) - How to contribute
- [Code of Conduct](CODE_OF_CONDUCT.md) - Community guidelines
- [Agent Instructions](AGENTS.md) - AI agent guidelines

## Technology Stack

- **Frontend**: Nuxt 4, Vue 3, TypeScript
- **Database**: Neo4j 5 Community Edition
- **Development**: Docker, Dev Containers, Gitpod

## Key Principles

1. **Separation of Concerns**: Schema management is independent from application code
2. **Standalone Migrations**: Database schema managed via CLI tools
3. **Connection Available**: Neo4j accessible in Nuxt via `nuxt-neo4j` module
4. **Backend Service**: Neo4j runs as a backend service (Bolt protocol only)

## Environment Variables

Create a `.env` file for local development:

```env
# Neo4j connection (used by both Nuxt and migration tools)
NEO4J_URI=bolt://172.19.0.2:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=devpassword
```

**Note**: These variables are used by both the Nuxt application (via `nuxt-neo4j` module) and the migration scripts.

## License

See [LICENSE.md](LICENSE.md) for details.
