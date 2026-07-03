# Polaris Neo4j Graph Schema

## Nodes

**Technology** `name, type, vendor, domain, lastReviewed:DATE` — requires >=1 linked Component (via IS_VERSION_OF); can only be created by claiming an existing, unlinked Component
**Platform** `name, type, vendor, domain` — manually-declared, non-SBOM-observable technology (databases, cloud services); superuser-only to create, no Component relationship
**Version** `version, technologyName, approved:BOOL, releaseDate:DATE, eolDate:DATE, notes`
**System** `name, environment, businessCriticality, domain`
**Team** `name, responsibilityArea, email`
**Component** `name, version, type, purl, packageManager, group, bomRef, description, createdAt, updatedAt`
**Repository** `name, url, createdAt, updatedAt, lastSbomScanAt:DATETIME`
**License** `id, name, expression, url`
**Advisory** `id, summary, cvssVector, aliases:LIST, publishedAt:DATETIME, modifiedAt:DATETIME, advisoryUrl, source`
**HealthSnapshot** `componentPurl, componentName, eolStatus, eolDate, eolSource, eolRefreshedAt, maintenanceStatus, maintenanceConfidence, maintenanceSource, maintenanceRefreshedAt, vulnerabilityTotal:FLOAT, vulnerabilityCritical:FLOAT, vulnerabilityHigh:FLOAT, vulnerabilityMedium:FLOAT, vulnerabilityLow:FLOAT, advisoryCount:FLOAT, vulnerabilitySource, vulnerabilityRefreshedAt, securityScoreSource, securityScoreRefreshedAt, isDeprecated:BOOL, ageInDays:FLOAT, createdAt:DATETIME, updateType`
**AuditLog** `id, operation, entityType, entityLabel, entityId, userId, timestamp:DATETIME, changes, changedFields:LIST, reason, metadata, source`
**ImportJob** `id, type, organization, status, requestedBy, dryRun:BOOL, filters, total:INT, completed:INT, failed:INT, skipped:INT, createdAt:DATETIME, startedAt:DATETIME, finishedAt:DATETIME`
**ImportJobItem** `id, repositoryUrl, repositoryFullName, systemName, status, componentsAdded:FLOAT, componentsUpdated:FLOAT, manifestsFound:FLOAT, relationshipsCreated:FLOAT, message, startedAt:DATETIME, finishedAt:DATETIME`
**HealthRefreshJob** `id, systemName, status, trigger, totalItems:INT, completedItems:INT, failedItems:INT, createdAt:DATETIME, startedAt:DATETIME, finishedAt:DATETIME`
**HealthRefreshJobItem** `id, componentPurl, componentName, componentVersion, packageManager, status, errorSummary, failedFields:LIST, failedSources:LIST, startedAt:DATETIME, finishedAt:DATETIME`
**User** `id, email, name, role, provider, avatarUrl, createdAt:DATETIME, lastLogin:DATETIME`
**ExternalReference** `type, url`
**Hash** `algorithm, value`

## Relationships

```
(Team)-[:OWNS]->(System)
(Team)-[:APPROVES {time, approvedAt:DATETIME, approvedBy, deprecatedAt:DATETIME, migrationTarget, notes}]->(Technology)
(Team)-[:APPROVES {time, approvedAt:DATETIME, approvedBy, deprecatedAt:DATETIME, migrationTarget, notes}]->(Platform)
(Team)-[:STEWARDED_BY]->(Technology)
(Team)-[:STEWARDED_BY]->(Platform)
(Team)-[:MAINTAINS {since:DATETIME}]->(Repository)
(Technology)-[:HAS_VERSION]->(Version)
(Component)-[:IS_VERSION_OF]->(Technology)
(System)-[:USES {isDirect:BOOL, scope, addedAt}]->(Component)
(System)-[:HAS_SOURCE_IN {addedAt:DATETIME}]->(Repository)
(Component)-[:DEPENDS_ON {addedAt, lastSeenAt}]->(Component)
(Component)-[:HAS_HEALTH_SNAPSHOT]->(HealthSnapshot)
(Component)-[:HAS_ADVISORY {observedAt:DATETIME}]->(Advisory)
(Component)-[:HAS_LICENSE]->(License)
(Component)-[:HAS_HASH]->(Hash)
(Component)-[:HAS_EXTERNAL_REF]->(ExternalReference)
(AuditLog)-[:AUDITS]->(System)
(User)-[:REQUESTED]->(ImportJob)
(ImportJob)-[:HAS_ITEM]->(ImportJobItem)
(HealthRefreshJob)-[:HAS_ITEM]->(HealthRefreshJobItem)
```

## Key facts

- `APPROVES.time` is the TIME framework value: one of `invest`, `tolerate`, `migrate`, `eliminate`
- `USES.isDirect` — true if the component is a direct dependency of the system (not transitive)
- `Component.purl` is the unique identifier (Package URL format)
- `HealthSnapshot` is 1:1 with Component — always use `HAS_HEALTH_SNAPSHOT` to join
- A `Technology` can never exist without >=1 `Component` linked via `IS_VERSION_OF` — Neo4j Community Edition can't enforce this as a DB constraint, so it's enforced only in `TechnologyService.createFromComponent()`. `Platform` is the manually-declared escape valve for non-SBOM-observable technology; see `docs/architecture/decisions/0004-technology-requires-component.md`.
- Counts (2026-06, pre-dates the Technology/Platform split): 3,250 Components, 14 Systems, 8 Technologies, 6 Teams, 82 Advisories
