#!/bin/bash
set -e

echo "🚀 Running post-create setup..."

# Create .env file if it doesn't exist
if [ ! -f /workspaces/polaris/.env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp /workspaces/polaris/.env.example /workspaces/polaris/.env
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

# Create Neo4j data directories (for persistent bind mounts)
mkdir -p /workspaces/polaris/.data/neo4j/{data,logs,import,plugins}

# Install Playwright system dependencies and browsers (if npx is available)
if command -v npx >/dev/null 2>&1; then
    echo "📦 Installing Playwright system dependencies..."
    (cd /workspaces/polaris && npx playwright install-deps) || echo "⚠️ playwright install-deps failed, continuing..."
    echo "📥 Installing Playwright browsers..."
    (cd /workspaces/polaris && npx playwright install) || echo "⚠️ playwright install failed, continuing..."
else
    echo "⚠️ npx not found; skipping Playwright installation"
fi

echo "🎉 Post-create setup complete!"
