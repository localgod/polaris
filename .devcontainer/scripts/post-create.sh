#!/bin/bash
set -e

echo "🚀 Running post-create setup..."

# ── Environment ──────────────────────────────────────────────────────────────
if [ ! -f /workspaces/polaris/.env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp /workspaces/polaris/.env.example /workspaces/polaris/.env
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

# ── Neo4j data directories (persistent bind mounts) ─────────────────────────
mkdir -p /workspaces/polaris/.data/neo4j/{data,logs,import,plugins}

# ── Playwright ───────────────────────────────────────────────────────────────
if command -v npx >/dev/null 2>&1; then
    echo "📦 Installing Playwright system dependencies..."
    (cd /workspaces/polaris && npx playwright install-deps) || echo "⚠️  playwright install-deps failed, continuing..."
    echo "📥 Installing Playwright browsers..."
    (cd /workspaces/polaris && npx playwright install) || echo "⚠️  playwright install failed, continuing..."
else
    echo "⚠️  npx not found; skipping Playwright installation"
fi

# ── pip ──────────────────────────────────────────────────────────────────────
if ! command -v pip >/dev/null 2>&1; then
    echo "📦 Installing pip..."
    curl -sS https://bootstrap.pypa.io/get-pip.py | python3 - --break-system-packages --quiet
    echo "✅ pip installed"
else
    echo "✅ pip already available"
fi

# ── Python tools ─────────────────────────────────────────────────────────────
# code-review-graph: codebase knowledge graph with MCP server (30 tools)
# sentence-transformers: local semantic embeddings for natural-language code search
# Note: sentence-transformers pulls PyTorch (~1.5GB) — slow on first install
echo "📦 Installing Python tools (code-review-graph, sentence-transformers)..."
pip install code-review-graph sentence-transformers --break-system-packages --quiet
echo "✅ Python tools installed"

# ── npm global tools ─────────────────────────────────────────────────────────
# mcp-neo4j: MCP server for direct Neo4j Cypher queries from Claude Code
echo "📦 Installing npm global tools..."
npm install -g @alanse/mcp-neo4j-server --quiet
echo "✅ npm global tools installed"

# ── Claude Code user-level settings ─────────────────────────────────────────
# Registers MCP servers: local-model, code-review-graph, mcp-neo4j-server
# Only written if missing — avoids overwriting permissions accumulated during sessions.
CLAUDE_SETTINGS="/home/node/.claude/settings.json"
if [ ! -f "$CLAUDE_SETTINGS" ]; then
    echo "⚙️  Writing Claude Code user settings..."
    mkdir -p /home/node/.claude
    cat > "$CLAUDE_SETTINGS" << 'EOF'
{
  "theme": "dark",
  "mcpServers": {
    "local-model": {
      "command": "node",
      "args": ["/workspaces/polaris/.claude/mcp/local-model-server.js"]
    },
    "code-review-graph": {
      "command": "code-review-graph",
      "args": ["mcp"]
    },
    "mcp-neo4j-server": {
      "command": "mcp-neo4j-server"
    }
  }
}
EOF
    echo "✅ Claude Code user settings written"
else
    echo "✅ Claude Code user settings already exist"
    # Ensure MCP servers are registered (merge with existing settings)
    echo "⚙️  Updating MCP server registrations..."
    python3 << 'PYEOF'
import json
import os

settings_path = "/home/node/.claude/settings.json"
with open(settings_path, 'r') as f:
    settings = json.load(f)

mcp_servers = {
    "local-model": {
        "command": "node",
        "args": ["/workspaces/polaris/.claude/mcp/local-model-server.js"]
    },
    "code-review-graph": {
        "command": "code-review-graph",
        "args": ["mcp"]
    },
    "mcp-neo4j-server": {
        "command": "mcp-neo4j-server"
    }
}

if "mcpServers" not in settings:
    settings["mcpServers"] = {}

settings["mcpServers"].update(mcp_servers)

with open(settings_path, 'w') as f:
    json.dump(settings, f, indent=2)

print("✅ MCP servers registered")
PYEOF
fi

# ── code-review-graph knowledge graph ────────────────────────────────────────
# The graph DB lives in .code-review-graph/graph.db which is bind-mounted from
# the host, so it survives container rebuilds. Only do a full build + embed on
# first run; subsequent rebuilds just run a fast incremental update.
GRAPH_DB="/workspaces/polaris/.code-review-graph/graph.db"
if [ ! -f "$GRAPH_DB" ]; then
    echo "🔍 Building code knowledge graph (first run)..."
    (cd /workspaces/polaris && code-review-graph build) || echo "⚠️  graph build failed, continuing..."

    echo "🧠 Generating semantic embeddings for natural-language search..."
    # Downloads all-MiniLM-L6-v2 (~90MB) to ~/.cache/huggingface on first run
    (cd /workspaces/polaris && code-review-graph embed --provider local) || echo "⚠️  embed failed, continuing..."
    echo "✅ Knowledge graph built and embedded"
else
    echo "🔄 Knowledge graph exists — running incremental update..."
    (cd /workspaces/polaris && code-review-graph update --skip-flows) || echo "⚠️  graph update failed, continuing..."
    echo "✅ Knowledge graph updated"
fi

echo "🎉 Post-create setup complete!"
