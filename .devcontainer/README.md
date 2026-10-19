# Dev Container Setup

This project uses a dev container with a local Neo4j instance for development.

## Automatic Setup

Neo4j is a service in the same compose project as the dev container, so opening
the container starts it — `postCreateCommand` does not.

`postCreateCommand` (`scripts/post-create.sh`) then:
1. Marks `/workspaces/polaris` as a git `safe.directory`
2. Creates `.env` from `.env.example` if it doesn't exist
3. Creates the `.data/neo4j` bind-mount directories
4. Runs `npm ci` in the repo root and in `.claude/mcp` (local-model MCP server)
5. Installs Playwright Chromium with its system dependencies
6. Installs `uv`, then `code-review-graph` + `sentence-transformers` (CPU-only torch) as an isolated uv tool
7. Installs the `mcp-neo4j` CLI globally
8. Builds (first run) or incrementally updates the code knowledge graph

The Claude Code CLI comes from the `claude-code` devcontainer feature. MCP servers
are registered in the project's `.mcp.json`, not by the script.

This ensures Neo4j is always running when you start working.

## Services

### Neo4j Database

- **Version**: 5.26 Community Edition (pinned in `docker-compose.yml`)
- **HTTP Port**: 7474 (Neo4j Browser)
- **Bolt Port**: 7687 (Database connection)
- **Default Credentials**:
  - Username: `neo4j`
  - Password: `devpassword`

## Accessing Neo4j

### Neo4j Browser

Once the dev container is running, access the Neo4j Browser at:
- Local: `http://localhost:7474`

### Connection Details

The application connects to Neo4j using these environment variables (from `.env`):
```
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=devpassword
```

## Compose file

`docker-compose.yml` defines both services and is used by `devcontainer.json`. The
`app` service uses `network_mode: host`; Neo4j publishes ports `7474`/`7687`. The
Neo4j container is named `polaris-neo4j`, so Docker refuses to start a second copy
against the same `../.data/neo4j` directory.

## Data Persistence

Neo4j state is bind-mounted from the repo (not named Docker volumes), so it
survives container rebuilds and is shared by both compose files:
- `../.data/neo4j/data`: Database files
- `../.data/neo4j/logs`: Log files
- `../.data/neo4j/import`: Import directory
- `../.data/neo4j/plugins`: Plugin directory (includes APOC)

## Plugins

The following plugins are pre-installed:
- **APOC**: Awesome Procedures on Cypher - utility functions and procedures

## Rebuilding the Container

If you need to rebuild the dev container:
1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Select "Dev Containers: Rebuild Container"

Note: the `app` service uses `network_mode: host` and Neo4j publishes ports `7474`/`7687`, so the app connects to Neo4j via `bolt://localhost:7687`.

### Host Browser Access (Linux)

When using this devcontainer on Linux with `network_mode: host`:
- Prefer `http://127.0.0.1:3000` for the Nuxt dev server from the host browser.
- VS Code may also forward port `3000` for host browser access, depending on your environment.

If `http://localhost:3000` hangs while `http://127.0.0.1:3000` works, the host machine is likely resolving `localhost` to IPv6 loopback (`::1`) while the reachable forwarded endpoint is bound on IPv4 (`127.0.0.1`). In that case, use `http://127.0.0.1:3000`.

## Manual Service Management

If you need to manually manage the Neo4j service:

**Start Neo4j:**
```bash
docker compose -f .devcontainer/docker-compose.yml up -d neo4j
```

**Stop Neo4j:**
```bash
docker compose -f .devcontainer/docker-compose.yml stop neo4j
```

**Restart Neo4j:**
```bash
docker compose -f .devcontainer/docker-compose.yml restart neo4j
```

## Troubleshooting

### Neo4j not starting automatically

Opening the dev container should start Neo4j, since it is a service in the same
compose project. If it didn't, start it by hand:
```bash
docker compose -f .devcontainer/docker-compose.yml up -d neo4j
```

### Neo4j not responding

Check the logs:
```bash
docker logs --tail 100 polaris-neo4j
```

### Connection refused

Ensure Neo4j is fully started (can take 10-20 seconds on first start):
```bash
docker compose -f .devcontainer/docker-compose.yml ps
```

### Neo4j restart-looping

A container that logs only these three lines every ~60s, never reaching
`Starting Neo4j`, is dying before database bootstrap:

```
Logging config in use: File '/var/lib/neo4j/conf/user-logs.xml'
Neo4j Server shutdown initiated by request
Stopped.
```

The ~60s cadence is Docker's `restart: unless-stopped` backoff hitting its cap.
First check for a duplicate container from the other compose file:

```bash
docker ps -a --filter ancestor=neo4j:5.26-community --filter ancestor=neo4j:5-community
```

If more than one exists, remove the extras and keep `polaris-neo4j`. Interleaved
or out-of-order timestamps in `.data/neo4j/logs/neo4j.log` are a reliable symptom
of two containers writing that file at once.

### Reset database

To start fresh, delete the bind-mounted state (`down -v` will not clear it, since
the data lives in `../.data/neo4j`, not in named volumes):
```bash
docker compose -f .devcontainer/docker-compose.yml down
rm -rf .data/neo4j/data
```
Then rebuild the container or run the post-create script.
