#!/bin/bash
set -e

echo "🚀 Running post-create setup..."

# Ensure Neo4j service is running
echo "📦 Starting Neo4j service..."
cd /workspaces/polaris/.devcontainer
docker compose up -d neo4j

# Wait for Neo4j to be ready
echo "⏳ Waiting for Neo4j to be ready..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker exec devcontainer-neo4j-1 cypher-shell -u neo4j -p devpassword "RETURN 1" > /dev/null 2>&1; then
        echo "✅ Neo4j is ready!"
        break
    fi
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        echo "⚠️  Neo4j did not become ready in time, but continuing..."
        break
    fi
    sleep 2
done

# Create .env file if it doesn't exist
if [ ! -f /workspaces/polaris/.env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp /workspaces/polaris/.env.example /workspaces/polaris/.env
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

# Install npm dependencies if needed
if [ ! -d /workspaces/polaris/node_modules ]; then
    echo "📦 Installing npm dependencies..."
    cd /workspaces/polaris
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Run migrations and clear seeds
echo "⚙️ Running database migrations..."
(cd /workspaces/polaris && npm run migrate:up) || echo "⚠️ npm run migrate:up failed, continuing..."
echo "⚙️ Clearing seeds..."
(cd /workspaces/polaris && npm run seed:clear) || echo "⚠️ npm run seed:clear failed, continuing..."

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
