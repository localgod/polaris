# Seeding Database from GitHub Repositories

This guide explains how to populate your Polaris database with real-world data by automatically generating SBOMs from GitHub repositories.

## Overview

The `seed:github` command clones GitHub repositories, generates Software Bill of Materials (SBOMs) using [cdxgen](https://github.com/CycloneDX/cdxgen), and posts them to the `/api/sboms` endpoint to populate your database with realistic component data.

## Prerequisites

### 1. Database Setup

Ensure your database is migrated and seeded with base data:

```bash
npm run migrate:up
npm run seed
```

### 2. API Token Setup

The GitHub seeding requires an API token for authentication.

**Automatic User Creation:**

The `seed:github` script automatically creates a technical user (`seed-bot@polaris.local`) if no technical users exist. You only need to generate an API token:

```bash
# Run seed:github - it will create the user automatically if needed
npm run seed:github

# If it prompts for a token, generate one for the created user
npx tsx schema/scripts/seed-api-token.ts seed-bot@polaris.local
```

**Manual User Creation (Optional):**

If you prefer to create a custom technical user:

```bash
# Create a technical user
npx tsx schema/scripts/create-technical-user.ts seed@example.com "Seed Bot" --superuser

# Generate API token
npx tsx schema/scripts/seed-api-token.ts seed@example.com
```

Copy the generated token and add it to your `.env` file:

```bash
SEED_API_TOKEN=your-token-here
```

**Note**: The technical user persists across database clears, so you only need to create it once.

## Verified Working

The GitHub seeding has been tested and verified with multiple repositories:

```bash
npm run seed:github  # Seeds all 3 configured repos

# Results:
# ✅ lodash/lodash: 603 components
# ✅ expressjs/express: 1 component  
# ✅ localgod/polaris: 1595 components (38 shared with lodash)
```

Shared dependencies are now properly handled - components are reused across systems without constraint violations.

### 3. Dependencies

The required dependencies are already installed:

- `@cyclonedx/cdxgen` - SBOM generation tool
- `git` - For cloning repositories (pre-installed in dev container)

## Usage

### Using Configuration File

The default configuration file is `schema/fixtures/github-repos.json` which includes:
- lodash/lodash
- expressjs/express  
- localgod/polaris (this project!)

```bash
# Seed from configured repositories
npm run seed:github

# Clear database first, then seed
npm run seed:github -- --clear
```

**Note**: ~~Due to a [known issue (#90)](https://github.com/localgod/polaris/issues/90) with the component uniqueness constraint, repositories that share common dependencies may fail if those dependencies were already seeded by another repository.~~ **This issue has been fixed in PR #91 and is now resolved.**

### Using CLI Arguments

Specify repositories directly via command line:

```bash
# Single repository
npm run seed:github -- --repos="lodash/lodash"

# Multiple repositories (comma-separated)
npm run seed:github -- --repos="lodash/lodash,expressjs/express,axios/axios"

# With full URLs
npm run seed:github -- --repos="https://github.com/lodash/lodash"
```

## Configuration File Format

Edit `schema/fixtures/github-repos.json` to customize repositories:

```json
{
  "repositories": [
    {
      "url": "https://github.com/lodash/lodash",
      "branch": "main",
      "system": {
        "name": "Lodash Utility Library",
        "domain": "Libraries",
        "ownerTeam": "Platform Team",
        "businessCriticality": "medium",
        "environment": "production",
        "sourceCodeType": "open-source",
        "hasSourceAccess": true
      },
      "repository": {
        "name": "lodash",
        "description": "A modern JavaScript utility library",
        "isPublic": true,
        "requiresAuth": false,
        "scmType": "git",
        "defaultBranch": "main"
      }
    }
  ]
}
```

### Configuration Fields

#### System Fields

- `name` - System name (required)
- `domain` - Business domain (required)
- `ownerTeam` - Team responsible for the system (required, must exist in database)
- `businessCriticality` - `low`, `medium`, `high`, or `critical`
- `environment` - `development`, `staging`, `production`
- `sourceCodeType` - `proprietary`, `open-source`, `mixed`
- `hasSourceAccess` - Boolean indicating if source code is accessible

#### Repository Fields

- `name` - Repository name (required)
- `description` - Repository description
- `isPublic` - Boolean indicating if repository is public
- `requiresAuth` - Boolean indicating if authentication is required
- `scmType` - Source control type (e.g., `git`, `svn`)
- `defaultBranch` - Default branch name

## How It Works

1. **Clone Repository**: Shallow clone (depth=1) of specified branch
2. **Generate SBOM**: Uses cdxgen to analyze dependencies and create CycloneDX SBOM
3. **Create System**: Ensures system exists in database (creates if missing)
4. **Create Repository**: Ensures repository exists and is linked to system
5. **Post SBOM**: Sends SBOM to `/api/sboms` endpoint for processing
6. **Cleanup**: Removes cloned repository from temporary directory

## Supported Project Types

cdxgen supports 20+ package managers and languages:

- **JavaScript/TypeScript**: npm, yarn, pnpm, bun
- **Python**: pip, poetry, pipenv
- **Java**: maven, gradle
- **Go**: go modules
- **Ruby**: bundler
- **PHP**: composer
- **Rust**: cargo
- **And many more...**

See [cdxgen documentation](https://github.com/CycloneDX/cdxgen#supported-languages) for full list.

## Example Workflow

```bash
# 1. Setup database
npm run migrate:up
npm run seed

# 2. Create API token
npx tsx schema/scripts/seed-api-token.ts frontend-platform@company.com
# Copy token to .env as SEED_API_TOKEN

# 3. Seed from GitHub
npm run seed:github

# 4. Verify data
# Open Polaris UI and browse systems, repositories, and components
```

## Output Example

```
🌟 GitHub SBOM Seeding

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Found existing technical user: seed-bot@polaris.local

📋 Found 3 repositories to process

📦 Processing: https://github.com/lodash/lodash
  📥 Cloning https://github.com/lodash/lodash (branch: main)...
  ✅ Cloned successfully
  🔨 Generating SBOM for lodash...
  ✅ SBOM generated successfully
  🔍 Ensuring system exists: Lodash Utility Library
  ✅ System created
  ✅ Repository created/verified
  ✅ Repository linked to system
  📤 Posting SBOM to API...
  ✅ SBOM processed successfully
     System: Lodash Utility Library
     Components added: 42
     Components updated: 0
     Relationships created: 42
✅ Successfully processed lodash

[... more repositories ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Summary:
   ✅ Successful: 3
   ❌ Failed: 0
   📦 Total: 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Troubleshooting

### "SEED_API_TOKEN environment variable not set"

The script will automatically create a technical user if none exists. Generate an API token for the user:

```bash
# The script will tell you which user email to use
npx tsx schema/scripts/seed-api-token.ts seed-bot@polaris.local
```

Add to `.env`:

```bash
SEED_API_TOKEN=your-token-here
```

### "Failed to clone repository"

- Verify repository URL is correct
- Check branch name exists (use `main` not `master` for most modern repos)
- Ensure internet connection is available
- For private repos, authentication is not currently supported

### "No system found with repository URL"

The script automatically creates systems, but if you see this error:

- Verify the `ownerTeam` exists in the database
- Check team names with: `npm run seed` output

### "Failed to generate SBOM"

- Repository may not have recognizable package manager files
- Try cloning manually to verify repository structure
- Check cdxgen logs for specific errors

## Limitations

- **Public repositories only**: Private repository authentication not implemented
- **No build step**: Projects requiring build before dependency analysis may have incomplete SBOMs
- **Network dependent**: Requires internet connection to clone repositories
- **Temporary storage**: Clones repositories to `.data/temp/` (ensure sufficient disk space)

## Advanced Usage

### Custom Configuration File

Create a custom configuration file:

```bash
# Create custom config
cat > my-repos.json << 'EOF'
{
  "repositories": [
    {
      "url": "https://github.com/my-org/my-repo",
      "branch": "main",
      "system": { ... },
      "repository": { ... }
    }
  ]
}
EOF

# Modify script to use custom config (edit CONFIG_PATH in seed-github.ts)
```

### Integration with CI/CD

```yaml
# .github/workflows/seed-database.yml
name: Seed Database
on:
  workflow_dispatch:

jobs:
  seed:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run migrate:up
      - run: npm run seed
      - run: npx tsx schema/scripts/seed-api-token.ts admin@example.com
        env:
          NEO4J_URI: ${{ secrets.NEO4J_URI }}
          NEO4J_USERNAME: ${{ secrets.NEO4J_USERNAME }}
          NEO4J_PASSWORD: ${{ secrets.NEO4J_PASSWORD }}
      - run: npm run seed:github
        env:
          SEED_API_TOKEN: ${{ secrets.SEED_API_TOKEN }}
```

## Related Documentation

- [Database Seeding](../schema/fixtures/README.md)
- [SBOM API Endpoint](../server/api/sboms.post.ts)
- [cdxgen Documentation](https://github.com/CycloneDX/cdxgen)
- [CycloneDX Specification](https://cyclonedx.org/specification/overview/)
