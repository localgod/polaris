# Polaris Neo4j Graph Schema

## Nodes

**Technology** `name, type, vendor, domain, lastReviewed:DATE`
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
(Team)-[:OWNS]->(Technology)
(Team)-[:APPROVES {time, approvedAt:DATETIME, approvedBy, deprecatedAt:DATETIME, migrationTarget, notes}]->(Technology)
(Team)-[:STEWARDED_BY]->(Technology)
(Team)-[:MAINTAINS {since:DATETIME}]->(Repository)
(Technology)-[:HAS_VERSION]->(Version)
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

- `APPROVES.time` is the TIME framework value: one of `invest`, `hold`, `tolerate`, `exit`
- `USES.isDirect` — true if the component is a direct dependency of the system (not transitive)
- `Component.purl` is the unique identifier (Package URL format)
- `HealthSnapshot` is 1:1 with Component — always use `HAS_HEALTH_SNAPSHOT` to join
- Counts (2026-06): 3,250 Components, 14 Systems, 8 Technologies, 6 Teams, 82 Advisories
