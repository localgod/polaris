#!/bin/sh
# Launches the chrome-devtools MCP server against Playwright's Chromium.
# The browser path is resolved at launch from playwright-core rather than
# hardcoded in .mcp.json, so a Playwright bump (new chromium-<rev> dir) can't
# silently break the server.
set -e
cd /workspaces/polaris
CHROME=$(node -e "process.stdout.write(require('playwright-core').chromium.executablePath())")
exec npx -y chrome-devtools-mcp@1.10.1 \
  --headless --isolated \
  --executablePath "$CHROME" \
  --chrome-arg=--no-sandbox \
  --no-usage-statistics --no-performance-crux
