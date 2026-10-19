#!/bin/bash
set -e

echo "🚀 Running post-create setup..."

# uv installs its tools into ~/.local/bin, which a non-login shell may not have on
# PATH yet — export it so the graph build at the end can find code-review-graph.
export PATH="$HOME/.local/bin:$PATH"

# ── Environment ──────────────────────────────────────────────────────────────
if [ ! -f /workspaces/polaris/.env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp /workspaces/polaris/.env.example /workspaces/polaris/.env
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

# ── git safe.directory ───────────────────────────────────────────────────────
# Docker Desktop's file sharing intermittently reports the bind-mounted workspace
# as root-owned, and git then refuses it ("dubious ownership"), which surfaces as
# random "not a git repository" failures in git, lefthook and code-review-graph.
git config --global --get-all safe.directory | grep -qx /workspaces/polaris \
    || git config --global --add safe.directory /workspaces/polaris

# ── Neo4j data directories (persistent bind mounts) ─────────────────────────
mkdir -p /workspaces/polaris/.data/neo4j/{data,logs,import,plugins}

# ── Claude Code config volume ────────────────────────────────────────────────
# devcontainer.json mounts a named volume at /home/node/.claude so login and
# memory survive rebuilds. Docker creates an empty volume root-owned, which would
# make every later write by Claude Code fail, so take ownership up front.
if [ -d /home/node/.claude ] && [ "$(stat -c %U /home/node/.claude)" != "node" ]; then
    echo "🔑 Taking ownership of /home/node/.claude..."
    sudo chown -R node:node /home/node/.claude
fi

# ── npm dependencies ─────────────────────────────────────────────────────────
# `npm ci` (not `npm install`) so the container matches package-lock.json exactly —
# node_modules is bind-mounted from the host and otherwise drifts behind the lockfile.
# .claude/mcp is a separate package: without its install the local-model MCP server
# cannot load @modelcontextprotocol/sdk and fails to start.
echo "📦 Installing npm dependencies..."
(cd /workspaces/polaris && npm ci)
(cd /workspaces/polaris/.claude/mcp && npm ci)
echo "✅ npm dependencies installed"

# ── Playwright ───────────────────────────────────────────────────────────────
# Chromium only — it is the only browser the e2e tests, Lighthouse and the
# chrome-devtools MCP server use. Firefox/WebKit would add ~1GB for nothing.
echo "📥 Installing Playwright Chromium (with system dependencies)..."
(cd /workspaces/polaris && npx playwright install --with-deps chromium) \
    || echo "⚠️  playwright install failed, continuing..."

# ── Python tools (via uv) ────────────────────────────────────────────────────
# code-review-graph: codebase knowledge graph with MCP server
# sentence-transformers: local semantic embeddings for natural-language code search
# uv installs both into an isolated tool venv instead of the system Python, so no
# get-pip bootstrap or --break-system-packages is needed. The PyTorch CPU index
# keeps torch at ~200MB instead of the multi-GB CUDA build nobody here can use.
UV_VERSION="0.12.21"
if ! command -v uv >/dev/null 2>&1; then
    echo "📦 Installing uv ${UV_VERSION}..."
    curl -LsSf "https://astral.sh/uv/${UV_VERSION}/install.sh" | env UV_NO_MODIFY_PATH=1 sh \
        || echo "⚠️  uv install failed, continuing..."
fi
if command -v uv >/dev/null 2>&1; then
    echo "📦 Installing Python tools (code-review-graph, sentence-transformers)..."
    uv tool install --force code-review-graph \
        --with sentence-transformers \
        --index https://download.pytorch.org/whl/cpu \
        && echo "✅ Python tools installed" \
        || echo "⚠️  Python tool install failed — code-review-graph MCP server will be unavailable"
else
    echo "⚠️  uv unavailable; skipping Python tools (code-review-graph MCP server will be unavailable)"
fi

# ── npm global tools ─────────────────────────────────────────────────────────
# mcp-neo4j: MCP server for direct Neo4j Cypher queries from Claude Code.
# The Claude Code CLI itself comes from the claude-code devcontainer feature.
# MCP servers are registered in the project's .mcp.json, not here.
echo "📦 Installing npm global tools..."
npm install -g @alanse/mcp-neo4j-server --quiet
echo "✅ npm global tools installed"

# ── code-review-graph knowledge graph ────────────────────────────────────────
# The graph DB lives in .code-review-graph/graph.db which is bind-mounted from
# the host, so it survives container rebuilds. Only do a full build + embed on
# first run; subsequent rebuilds just run a fast incremental update.
if command -v code-review-graph >/dev/null 2>&1; then
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
fi

echo "🎉 Post-create setup complete!"
