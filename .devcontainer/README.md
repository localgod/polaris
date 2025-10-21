# Dev Container Setup

This project uses a dev container with a local Neo4j instance for development.

## Automatic Setup

When the dev container is created, the `postCreateCommand` automatically:
1. ✅ Starts the Neo4j service
2. ✅ Waits for Neo4j to be ready
3. ✅ Creates `.env` file from `.env.example` if it doesn't exist
4. ✅ Installs npm dependencies if needed

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
NEO4J_URI=neo4j://neo4j:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=devpassword
```

## Data Persistence

Neo4j data is persisted in Docker volumes:
- `neo4j-data`: Database files
- `neo4j-logs`: Log files
- `neo4j-import`: Import directory
- `neo4j-plugins`: Plugin directory (includes APOC)

## Plugins

The following plugins are pre-installed:
- **APOC**: Awesome Procedures on Cypher - utility functions and procedures

## Rebuilding the Container

If you need to rebuild the dev container:
1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Select "Dev Containers: Rebuild Container"

Note: The container uses `network_mode: service:neo4j` which means the app container shares the Neo4j network. This allows the app to connect to Neo4j using `neo4j://neo4j:7687` as the hostname.

## Switching Between Local and Cloud Neo4j

Edit `.env` to switch between local and cloud instances:

**Local (default):**
```env
NEO4J_URI=neo4j://neo4j:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=devpassword
```

**Cloud:**
```env
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-cloud-password
```

## Manual Service Management

If you need to manually manage the Neo4j service:

**Start Neo4j:**
```bash
cd .devcontainer && docker compose up -d neo4j
```

**Stop Neo4j:**
```bash
cd .devcontainer && docker compose stop neo4j
```

**Restart Neo4j:**
```bash
cd .devcontainer && docker compose restart neo4j
```

## Troubleshooting

### Neo4j not starting automatically
The `postCreateCommand` should start Neo4j automatically. If it doesn't:
```bash
bash .devcontainer/scripts/post-create.sh
```

### Neo4j not responding
Check the logs:
```bash
docker compose -f .devcontainer/docker-compose.yml logs neo4j
```

### Connection refused
Ensure Neo4j is fully started (can take 10-20 seconds on first start):
```bash
docker compose -f .devcontainer/docker-compose.yml ps
```

### Reset database
To start fresh, remove the volumes:
```bash
docker compose -f .devcontainer/docker-compose.yml down -v
```
Then rebuild the container or run the post-create script.
