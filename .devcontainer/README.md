# Dev Container Setup

This project uses a dev container with a local Neo4j instance for development.

## Automatic Setup

Neo4j is a service in the same compose project as the dev container, so opening
the container starts it — `postCreateCommand` does not.

`postCreateCommand` (`scripts/post-create.sh`) then:
1. Creates the `.data/neo4j` bind-mount directories
2. Creates `.env` from `.env.example` if it doesn't exist
3. Installs npm dependencies if needed
4. Registers the MCP servers

This ensures Neo4j is always running when you start working.

## Services

### Neo4j Database

- **Version**: 5 Community Edition
- **HTTP Port**: 7474 (Neo4j Browser)
- **Bolt Port**: 7687 (Database connection)
- **Default Credentials**:
  - Username: `neo4j`
  - Password: `devpassword`

## Accessing Neo4j

### Neo4j Browser

Once the dev container is running, access the Neo4j Browser at:
- Local: `http://localhost:7474`
- Gitpod: Check the "Ports" tab for the forwarded URL

### Connection Details

The application connects to Neo4j using these environment variables (from `.env`):
```
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=devpassword
```

## Compose files

There are two compose files, one per environment. **Always pass `-f` explicitly** —
a bare `docker compose` in `.devcontainer/` resolves to `docker-compose.yml`, which
is the Ona file, and starting it on macOS gives you a second Neo4j fighting the
first for the store lock and ports 7474/7687.

| File | Used by | Neo4j networking |
| ---- | ------- | ---------------- |
| `docker-compose-local.yml` | `devcontainer.json` — local Docker Desktop | bridge, ports `7474`/`7687` published |
| `docker-compose.yml` | `devcontainer-ona.json` — Ona (Linux) | `network_mode: host` |

Both define the Neo4j service as `container_name: polaris-neo4j`. That shared name
is a deliberate guard: Docker refuses to start a second container under a name
already in use, so the two projects cannot both run a database against the same
`../.data/neo4j` directory. The guard matters on a local Docker Desktop daemon,
where both files target the same daemon; on Ona, docker-in-docker gives each
workspace an isolated daemon, so the name is simply inert there.

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

Note: in `docker-compose.yml` (Ona) all services use `network_mode: host`, so the app connects to Neo4j via `bolt://localhost:7687`. Host networking requires a Linux host — it is not supported on Docker Desktop for macOS or Windows, which is why `docker-compose-local.yml` publishes ports instead. The app reaches Neo4j at the same `bolt://localhost:7687` either way, so `.env` needs no per-environment change.

### Host Browser Access (Linux)

When using this devcontainer on Linux with `network_mode: host`:
- Prefer `http://127.0.0.1:3000` for the Nuxt dev server from the host browser.
- VS Code may also forward port `3000` for host browser access, depending on your environment.

If `http://localhost:3000` hangs while `http://127.0.0.1:3000` works, the host machine is likely resolving `localhost` to IPv6 loopback (`::1`) while the reachable forwarded endpoint is bound on IPv4 (`127.0.0.1`). In that case, use `http://127.0.0.1:3000`.

## Manual Service Management

If you need to manually manage the Neo4j service, substitute the compose file for
your environment (`docker-compose-local.yml` locally, `docker-compose.yml` on Ona):

**Start Neo4j:**
```bash
docker compose -f .devcontainer/docker-compose-local.yml up -d neo4j
```

**Stop Neo4j:**
```bash
docker compose -f .devcontainer/docker-compose-local.yml stop neo4j
```

**Restart Neo4j:**
```bash
docker compose -f .devcontainer/docker-compose-local.yml restart neo4j
```

## Troubleshooting

### Neo4j not starting automatically

Opening the dev container should start Neo4j, since it is a service in the same
compose project. If it didn't, start it by hand:
```bash
docker compose -f .devcontainer/docker-compose-local.yml up -d neo4j
```

### Neo4j not responding

Check the logs:
```bash
docker logs --tail 100 polaris-neo4j
```

### Connection refused

Ensure Neo4j is fully started (can take 10-20 seconds on first start):
```bash
docker compose -f .devcontainer/docker-compose-local.yml ps
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
docker ps -a --filter ancestor=neo4j:5-community
```

If more than one exists, remove the extras and keep `polaris-neo4j`. Interleaved
or out-of-order timestamps in `.data/neo4j/logs/neo4j.log` are a reliable symptom
of two containers writing that file at once.

### Reset database

To start fresh, delete the bind-mounted state (`down -v` will not clear it, since
the data lives in `../.data/neo4j`, not in named volumes):
```bash
docker compose -f .devcontainer/docker-compose-local.yml down
rm -rf .data/neo4j/data
```
Then rebuild the container or run the post-create script.
