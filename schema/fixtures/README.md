# Database Fixtures and Seeding

This directory contains fixture data for seeding the Neo4j database with governance and catalog data.

## Overview

The seeding system has two complementary parts:

1. **Fixture seeding** (`npm run seed`) - Seeds governance data: teams, technologies, policies, and approvals
2. **GitHub seeding** (`npm run seed:github`) - Seeds real-world data: systems, repositories, and components from actual GitHub repos

## Files

- `tech-catalog.json` - Governance fixture data (teams, technologies, policies, approvals)
- `github-repos.json` - Configuration for GitHub repository SBOM seeding
- `../scripts/seed.ts` - Fixture seeding script
- `../scripts/seed-github.ts` - GitHub SBOM seeding script

## Usage

### Full Database Seeding (Recommended)

The `seed:github` command performs a complete seeding:
1. Seeds governance data (teams, technologies, policies, approvals)
2. Clones GitHub repositories and generates SBOMs
3. Creates systems, repositories, and components

```bash
# First time setup: create a technical user and API token via the UI (/users)
# or via the API (POST /api/admin/users, POST /api/admin/users/<id>/tokens)
# Add the token to .env as SEED_API_TOKEN

# Full seed
npm run seed:github

# Full seed with database clear first
npm run seed:github -- --clear
```

### Governance Data Only

If you only need governance data without GitHub repositories:

```bash
npm run seed
```

### Reset Database

Clear all data and reseed:

```bash
npm run seed:github -- --clear
```

## Fixture Data Structure

The `tech-catalog.json` file contains governance data only:

### Teams (5 teams)

- Frontend Platform
- Backend Platform
- Data Platform
- DevOps
- Security

### Technologies (14 technologies)

Curated technology catalog with approval status:

- **Approved**: React, Vue, Node.js, PostgreSQL, Neo4j, Express, TypeScript, Docker, Redis
- **Deprecated**: Angular, jQuery, Lodash
- **Experimental**: MongoDB, MySQL

### Versions (7 versions)

Specific versions for major technologies with EOL dates.

### Policies (6 policies)

Governance rules:

- Technology Approval Required
- Database Version Compliance
- Migration Target Required
- High Risk Technology Approval
- License Compliance
- EOL Warning

### Approvals (14 approvals)

Team-technology approval relationships with TIME categories:

- **adopt**: Recommended for new projects
- **trial**: Evaluating for specific use cases
- **assess**: Under evaluation
- **hold**: Legacy only, migrate away

## Relationships Created

The seed script creates:

- `(Technology)-[:HAS_VERSION]->(Version)`
- `(Team)-[:STEWARDED_BY]->(Technology)`
- `(Team)-[:APPROVES]->(Technology)` with TIME properties
- `(Policy)-[:GOVERNS]->(Technology)`
- `(Team)-[:ENFORCES]->(Policy)`
- `(Team)-[:SUBJECT_TO]->(Policy)`

## What GitHub Seeding Adds

Running `npm run seed:github` adds:

- `System` nodes (from repository configuration)
- `Repository` nodes (linked to systems)
- `Component` nodes (from generated SBOMs)
- `License` nodes (from component licenses)
- `(System)-[:USES]->(Component)` relationships
- `(System)-[:HAS_SOURCE_IN]->(Repository)` relationships
- `(Component)-[:HAS_LICENSE]->(License)` relationships

### GitHub API Integration

The seeding script automatically fetches metadata from the GitHub API for each repository:

- **Default branch** - Uses the actual default branch (main, master, etc.)
- **Description** - Gets the repository description
- **Visibility** - Detects if the repository is public or private

This means the `branch` and `description` values in `github-repos.json` are fallbacks that will be overridden by live GitHub data when available.

## Recommended Workflow

```bash
# 1. Run migrations (automatic on environment start)
npm run migrate:up

# 2. Full seed (governance + GitHub repos)
npm run seed:github
```

## Customizing Fixture Data

### Adding a New Team

```json
{
  "teams": [
    {
      "name": "Mobile Platform",
      "email": "mobile-platform@company.com",
      "responsibilityArea": "mobile"
    }
  ]
}
```

### Adding a New Technology

```json
{
  "technologies": [
    {
      "name": "Kotlin",
      "category": "language",
      "vendor": "JetBrains",
      "status": "approved",
      "approvedVersionRange": ">=1.9.0 <2.0.0",
      "ownerTeam": "Mobile Platform",
      "riskLevel": "low",
      "lastReviewed": "2025-10-01"
    }
  ]
}
```

### Adding an Approval

```json
{
  "approvals": {
    "team_technology_approvals": [
      {
        "team": "Mobile Platform",
        "technology": "Kotlin",
        "time": "adopt",
        "approvedAt": "2024-01-15",
        "notes": "Primary mobile language",
        "approvedBy": "Tech Lead",
        "versionConstraint": ">=1.9.0"
      }
    ]
  }
}
```

## Idempotency

Both seed scripts use `MERGE` statements, ensuring:

1. **No duplicates**: Running multiple times won't create duplicate nodes
2. **Updates properties**: Existing nodes get updated properties
3. **Safe relationships**: Relationships are merged, not duplicated

## Troubleshooting

### Seed script fails with connection error

Ensure Neo4j is running:

```bash
docker compose -f .devcontainer/docker-compose.yml ps neo4j
```

### GitHub seeding fails with API error

1. Ensure the Nuxt dev server is running: `npm run dev`
2. Verify `SEED_API_TOKEN` is set in `.env`
3. Check the token hasn't expired

### Missing relationships

Ensure referenced entities exist. For example, an approval requires both the team and technology to exist in the fixture data.
