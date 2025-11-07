# Audit Trail System

## Overview

The Polaris audit trail system provides comprehensive tracking of all data changes across the platform. This enables compliance, security auditing, debugging, and understanding of how your technology catalog evolves over time.

## What Gets Audited?

All data changes are tracked including:

- **CRUD Operations**: Create, Read (for sensitive data), Update, Delete operations on all entities
- **Approval Changes**: Technology and version approvals, rejections, and revocations
- **Relationship Changes**: Links and unlinks between entities (team ownership, stewardship, etc.)
- **Status Changes**: Lifecycle state changes (activate, deactivate, archive)
- **User Activities**: Login, logout, role changes
- **SBOM Operations**: Upload, component discovery, vulnerability detection
- **System Events**: Automated changes, migrations, integrations

## Audit Log Schema

### Core Properties

Every audit log entry contains:

**Identity & Timing**
- `id` (UUID) - Unique identifier for the audit entry
- `timestamp` (DateTime) - When the change occurred (high precision)
- `operation` (String) - Type of operation performed

**Entity Information**
- `entityType` (String) - Type of entity that changed (Technology, System, Team, etc.)
- `entityId` (String) - Unique identifier of the entity
- `entityLabel` (String, optional) - Human-readable label

**Change Details**
- `changes` (Map) - Field-level changes as before/after pairs
- `changedFields` (List<String>) - List of field names that changed
- `previousState` (Map, optional) - Complete state before the change
- `currentState` (Map, optional) - Complete state after the change

**Actor Information**
- `userId` (String) - ID of the user who performed the action
- `userName` (String, optional) - Name of the user at time of action
- `userEmail` (String, optional) - Email of the user at time of action

**Context & Metadata**
- `reason` (String, optional) - User-provided reason for the change
- `source` (String) - Source of the change (UI, API, SBOM, etc.)
- `ipAddress` (String, optional) - IP address of the client
- `userAgent` (String, optional) - User agent string
- `sessionId` (String, optional) - Session identifier for grouping
- `correlationId` (String, optional) - For tracking related changes
- `requestId` (String, optional) - API request identifier
- `metadata` (Map, optional) - Additional context-specific information
- `tags` (List<String>, optional) - Tags for categorization

### Relationships

**PERFORMED_BY**
- Links audit log to the user who performed the action
- Direction: `(AuditLog)-[:PERFORMED_BY]->(User)`
- Enables querying all actions by a specific user

**AUDITS** (optional)
- Links audit log to the entity that was changed
- Direction: `(AuditLog)-[:AUDITS]->(Entity)`
- Enables direct navigation from entity to its audit history

## Operation Types

### Standard CRUD Operations

- `CREATE` - Entity was created
- `UPDATE` - Entity was modified
- `DELETE` - Entity was deleted
- `RESTORE` - Entity was restored from deleted state

### Approval Operations

- `APPROVE` - Technology/Version approved by team
- `REJECT` - Technology/Version rejected by team
- `REVOKE` - Approval was revoked

### Relationship Operations

- `LINK` - Relationship was created
- `UNLINK` - Relationship was removed

### Status Changes

- `ACTIVATE` - Entity was activated
- `DEACTIVATE` - Entity was deactivated
- `ARCHIVE` - Entity was archived

### User Operations

- `LOGIN` - User logged in
- `LOGOUT` - User logged out
- `ROLE_CHANGE` - User role was changed

### SBOM Operations

- `SBOM_UPLOAD` - SBOM file was uploaded
- `COMPONENT_DISCOVERED` - Component was discovered in SBOM
- `VULNERABILITY_DETECTED` - Vulnerability was detected
- `VULNERABILITY_RESOLVED` - Vulnerability was resolved

## Entity Types

The following entity types can be audited:

- `Technology` - Technology catalog entries
- `Version` - Technology versions
- `Component` - SBOM components
- `System` - Applications and services
- `Team` - Organizational teams
- `Policy` - Governance policies
- `User` - User accounts
- `Repository` - Source code repositories
- `License` - Software licenses
- `Vulnerability` - Security vulnerabilities
- `Hash` - Component hashes
- `ExternalReference` - External references

## Data Sources

Changes can originate from:

- `UI` - Web application interface
- `API` - REST API endpoints
- `SBOM` - SBOM upload/processing
- `MIGRATION` - Database migration scripts
- `SYSTEM` - System-generated changes
- `CLI` - Command-line interface
- `INTEGRATION` - External system integration

## Common Use Cases

### 1. Compliance Auditing

**Who approved this technology?**
```cypher
MATCH (a:AuditLog)-[:PERFORMED_BY]->(u:User)
WHERE a.entityType = 'Technology' 
  AND a.entityId = 'React'
  AND a.operation = 'APPROVE'
RETURN a.timestamp, u.name, u.email, a.reason
ORDER BY a.timestamp DESC
```

**What changed in the approval status?**
```cypher
MATCH (a:AuditLog)
WHERE a.entityType = 'Technology'
  AND a.entityId = 'React'
  AND 'timeCategory' IN a.changedFields
RETURN a.timestamp,
       a.userName,
       a.changes.timeCategory.before as oldCategory,
       a.changes.timeCategory.after as newCategory,
       a.reason
ORDER BY a.timestamp DESC
```

### 2. Security Auditing

**Track all deletions**
```cypher
MATCH (a:AuditLog)
WHERE a.operation = 'DELETE'
  AND a.timestamp >= datetime() - duration('P30D')
RETURN a.entityType, a.entityId, a.timestamp, a.userName
ORDER BY a.timestamp DESC
```

**Track role changes**
```cypher
MATCH (a:AuditLog)
WHERE a.operation = 'ROLE_CHANGE'
RETURN a.timestamp,
       a.entityId as userId,
       a.changes.role.before as oldRole,
       a.changes.role.after as newRole,
       a.userName as changedBy
ORDER BY a.timestamp DESC
```

**Detect unusual access patterns**
```cypher
MATCH (a:AuditLog)
WHERE a.ipAddress IS NOT NULL
  AND a.timestamp >= datetime() - duration('P1D')
WITH a.userId, collect(DISTINCT a.ipAddress) as ips
WHERE size(ips) > 5  // Same user from many IPs
RETURN userId, ips
```

### 3. Troubleshooting & Debugging

**What changed before the system broke?**
```cypher
MATCH (a:AuditLog)
WHERE a.entityType = 'System'
  AND a.entityId = 'API Gateway'
  AND a.timestamp >= datetime('2025-11-05T10:00:00Z')
  AND a.timestamp <= datetime('2025-11-05T12:00:00Z')
RETURN a.timestamp, a.operation, a.changes, a.userName
ORDER BY a.timestamp ASC
```

**Who modified this configuration?**
```cypher
MATCH (a:AuditLog)-[:PERFORMED_BY]->(u:User)
WHERE a.entityType = 'System'
  AND a.entityId = 'API Gateway'
  AND 'configuration' IN a.changedFields
RETURN a.timestamp, u.name, a.changes.configuration
ORDER BY a.timestamp DESC
```

### 4. Usage Analytics

**Most active users**
```cypher
MATCH (a:AuditLog)
WHERE a.timestamp >= datetime() - duration('P7D')
RETURN a.userId, a.userName, count(*) as actions
ORDER BY actions DESC
LIMIT 10
```

**Most modified entities**
```cypher
MATCH (a:AuditLog)
WHERE a.timestamp >= datetime() - duration('P30D')
RETURN a.entityType, a.entityId, count(*) as changes
ORDER BY changes DESC
LIMIT 20
```

**Activity trends**
```cypher
MATCH (a:AuditLog)
WHERE a.timestamp >= datetime() - duration('P30D')
RETURN date(a.timestamp) as day, count(*) as changes
ORDER BY day
```

### 5. Vulnerability Tracking

**When was this vulnerability detected?**
```cypher
MATCH (a:AuditLog)
WHERE a.operation = 'VULNERABILITY_DETECTED'
  AND a.metadata.vulnerabilityId = 'CVE-2024-12345'
RETURN a.timestamp, a.entityId as component, a.metadata
ORDER BY a.timestamp DESC
```

**Track vulnerability remediation**
```cypher
MATCH (a:AuditLog)
WHERE a.entityType = 'Component'
  AND a.entityId = 'react@18.2.0'
  AND a.operation IN ['VULNERABILITY_DETECTED', 'VULNERABILITY_RESOLVED']
RETURN a.timestamp, a.operation, a.metadata.vulnerabilityId
ORDER BY a.timestamp ASC
```

## Best Practices

### 1. Always Provide Context

When making changes through the API or UI, provide:
- **Reason**: Why the change was made
- **Tags**: Categorize the change (e.g., 'security', 'compliance', 'routine')
- **Correlation ID**: Link related changes together

### 2. Use Session and Correlation IDs

Group related changes:
- **Session ID**: All changes in the same user session
- **Correlation ID**: Changes that are part of the same logical operation
- **Request ID**: API requests that trigger multiple changes

### 3. Leverage Metadata

Store operation-specific information:
```cypher
// Example: SBOM upload
{
  operation: 'SBOM_UPLOAD',
  metadata: {
    sbomFormat: 'SPDX',
    sbomVersion: '2.3',
    componentCount: 150,
    repositoryUrl: 'github.com/company/repo'
  }
}
```

### 4. Tag Important Changes

Use tags for quick filtering:
- `security` - Security-related changes
- `compliance` - Compliance-related changes
- `critical` - Critical changes requiring attention
- `automated` - System-generated changes
- `manual` - Human-initiated changes

### 5. Implement Retention Policies

Consider audit log retention:
```cypher
// Archive logs older than 1 year
MATCH (a:AuditLog)
WHERE a.timestamp < datetime() - duration('P365D')
// Move to archive or delete
```

## Performance Considerations

### Indexes

The audit system uses several indexes for performance:
- `timestamp` - For time-based queries
- `entityType` + `entityId` - For entity-specific queries
- `userId` - For user-specific queries
- `operation` - For operation-type queries
- `source` - For source-based filtering
- Composite: `(entityType, entityId, timestamp)` - For entity history

### Query Optimization

**Good**: Specific entity + time range
```cypher
MATCH (a:AuditLog)
WHERE a.entityType = 'Technology'
  AND a.entityId = 'React'
  AND a.timestamp >= datetime() - duration('P30D')
RETURN a
```

**Better**: Use LIMIT for large result sets
```cypher
MATCH (a:AuditLog)
WHERE a.entityType = 'Technology'
RETURN a
ORDER BY a.timestamp DESC
LIMIT 100
```

**Best**: Use indexes and specific filters
```cypher
MATCH (a:AuditLog)
WHERE a.entityType = 'Technology'
  AND a.entityId = 'React'
  AND a.operation IN ['APPROVE', 'REVOKE']
  AND a.timestamp >= datetime() - duration('P90D')
RETURN a
ORDER BY a.timestamp DESC
```

## API Integration

### Creating Audit Logs

When implementing API endpoints that modify data, create audit logs:

```typescript
async function createAuditLog(params: {
  operation: string;
  entityType: string;
  entityId: string;
  userId: string;
  changes?: Record<string, {before: any, after: any}>;
  reason?: string;
  source: string;
  metadata?: Record<string, any>;
}) {
  const auditId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  
  await neo4j.run(`
    CREATE (a:AuditLog {
      id: $id,
      timestamp: datetime($timestamp),
      operation: $operation,
      entityType: $entityType,
      entityId: $entityId,
      userId: $userId,
      changes: $changes,
      changedFields: $changedFields,
      reason: $reason,
      source: $source,
      metadata: $metadata
    })
    WITH a
    MATCH (u:User {id: $userId})
    CREATE (a)-[:PERFORMED_BY]->(u)
  `, {
    id: auditId,
    timestamp,
    ...params,
    changedFields: params.changes ? Object.keys(params.changes) : []
  });
}
```

### Querying Audit Logs

Provide API endpoints for retrieving audit logs:

```typescript
// GET /api/audit/entity/:entityType/:entityId
async function getEntityAuditTrail(entityType: string, entityId: string) {
  return await neo4j.run(`
    MATCH (a:AuditLog)-[:PERFORMED_BY]->(u:User)
    WHERE a.entityType = $entityType AND a.entityId = $entityId
    RETURN a, u
    ORDER BY a.timestamp DESC
  `, { entityType, entityId });
}

// GET /api/audit/user/:userId
async function getUserActivity(userId: string) {
  return await neo4j.run(`
    MATCH (a:AuditLog)
    WHERE a.userId = $userId
    RETURN a
    ORDER BY a.timestamp DESC
  `, { userId });
}
```

## Security & Privacy

### Access Control

Implement proper access control for audit logs:
- **Read**: Only authorized users (admins, auditors)
- **Write**: System only (no manual creation)
- **Delete**: Never (or very restricted)

### Sensitive Data

Be careful with sensitive information:
- **Passwords**: Never log passwords or secrets
- **PII**: Consider anonymizing personal information
- **Tokens**: Never log authentication tokens

### Compliance

Audit logs help with compliance:
- **SOC 2**: Evidence of access controls and monitoring
- **GDPR**: Data processing activities and user consent
- **HIPAA**: Access to protected health information
- **PCI DSS**: Changes to cardholder data environment

## Migration Strategy

### Applying the Migration

```bash
# Apply the audit trail schema
npm run migrate:up
```

### Rollback

```bash
# WARNING: This will delete all audit history
npm run migrate:down
```

### Verification

```cypher
// Verify audit log schema is applied
SHOW CONSTRAINTS WHERE labelsOrTypes = 'AuditLog';
SHOW INDEXES WHERE labelsOrTypes = 'AuditLog';

// Check if audit logs are being created
MATCH (a:AuditLog)
RETURN count(a) as totalAuditLogs;
```

## Roadmap

Future enhancements:
- [ ] Real-time audit log streaming
- [ ] Audit log analytics dashboard
- [ ] Automated anomaly detection
- [ ] Export to external SIEM systems
- [ ] Audit log compression and archival
- [ ] Advanced search with full-text indexing
- [ ] Machine learning for pattern detection

## References

- [Neo4j Temporal Types](https://neo4j.com/docs/cypher-manual/current/syntax/temporal/)
- [Audit Logging Best Practices](https://owasp.org/www-community/Logging_Best_Practices)
- [SIEM Integration Patterns](https://en.wikipedia.org/wiki/Security_information_and_event_management)
