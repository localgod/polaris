---
title: Audit Trail
description: Comprehensive tracking of all data changes for compliance and security
---

## Overview

Polaris includes a comprehensive audit trail system that automatically tracks all data changes across the platform. Every create, update, delete, and approval operation is logged with complete context about who made the change, when, why, and what specifically changed.

## Why Audit Trails Matter

Audit trails are essential for:

- **Compliance**: Meet regulatory requirements (SOC 2, GDPR, HIPAA, PCI DSS)
- **Security**: Detect and investigate unauthorized access or suspicious activities
- **Debugging**: Understand what changed before a problem occurred
- **Accountability**: Know who made each decision and why
- **Analytics**: Analyze system usage patterns and user behavior

## What Gets Audited

All data modifications are tracked including:

### CRUD Operations
- Creating new technologies, systems, teams, policies
- Updating entity properties and configurations
- Deleting entities (with complete historical record)
- Restoring previously deleted entities

### Approval Operations
- Technology approvals with TIME framework categorization
- Version-specific approvals and rejections
- Approval revocations with reasons

### Relationship Changes
- Team ownership assignments
- Technology stewardship assignments
- System-component dependencies
- Policy applications

### SBOM Operations
- SBOM file uploads with metadata
- Component discovery from SBOM scanning
- Vulnerability detection and resolution
- License compliance updates

### User Activities
- Login and logout events
- Role changes and permission updates
- Team membership changes

## Audit Log Information

Each audit entry captures comprehensive information:

### What Changed
- **Entity Type**: Technology, System, Team, Component, Policy, User, etc.
- **Entity ID**: Unique identifier of the entity
- **Operation**: CREATE, UPDATE, DELETE, APPROVE, REJECT, etc.
- **Changed Fields**: List of fields that were modified
- **Before/After Values**: Field-level changes showing old and new values

### Who Changed It
- **User ID**: Unique identifier of the user
- **User Name**: Display name at time of change
- **User Email**: Contact information
- **Role**: User's role when change was made

### When It Changed
- **Timestamp**: High-precision date and time
- **Session ID**: Groups related changes in same session
- **Correlation ID**: Links changes across multiple entities

### Why It Changed
- **Reason**: User-provided explanation for the change
- **Source**: Where the change originated (UI, API, SBOM, System)
- **Tags**: Categorization labels (security, compliance, critical)

### Where It Came From
- **IP Address**: Client IP address
- **User Agent**: Browser or tool information
- **Request ID**: API request identifier

## Common Use Cases

### Compliance Auditing

**Track all technology approvals:**
```cypher
MATCH (a:AuditLog)-[:PERFORMED_BY]->(u:User)
WHERE a.operation IN ['APPROVE', 'REJECT', 'REVOKE']
  AND a.timestamp >= datetime() - duration('P90D')
RETURN a.timestamp as when,
       a.entityId as technology,
       a.operation as action,
       u.name as who,
       a.reason as why
ORDER BY a.timestamp DESC
```

**Verify approval changes:**
```cypher
MATCH (a:AuditLog)
WHERE a.entityType = 'Technology'
  AND a.entityId = 'React'
  AND 'timeCategory' IN a.changedFields
RETURN a.timestamp,
       a.userName,
       a.changes.timeCategory.before as oldCategory,
       a.changes.timeCategory.after as newCategory
ORDER BY a.timestamp DESC
```

### Security Monitoring

**Track sensitive operations:**
```cypher
MATCH (a:AuditLog)
WHERE a.operation IN ['DELETE', 'ROLE_CHANGE', 'REVOKE']
  AND a.timestamp >= datetime() - duration('P7D')
RETURN a
ORDER BY a.timestamp DESC
```

**Detect unusual access patterns:**
```cypher
MATCH (a:AuditLog)
WHERE a.timestamp >= datetime() - duration('P1D')
WITH a.userId, collect(DISTINCT a.ipAddress) as ips
WHERE size(ips) > 5
RETURN userId, ips, size(ips) as ipCount
ORDER BY ipCount DESC
```

**Track administrative actions:**
```cypher
MATCH (a:AuditLog)-[:PERFORMED_BY]->(u:User)
WHERE u.role = 'admin'
  AND a.timestamp >= datetime() - duration('P30D')
RETURN a
ORDER BY a.timestamp DESC
```

### Troubleshooting

**What changed before the incident?**
```cypher
MATCH (a:AuditLog)
WHERE a.entityType = 'System'
  AND a.entityId = 'API Gateway'
  AND a.timestamp >= datetime('2025-11-05T10:00:00Z')
  AND a.timestamp <= datetime('2025-11-05T12:00:00Z')
RETURN a.timestamp, a.operation, a.changes, a.userName
ORDER BY a.timestamp ASC
```

**Track configuration changes:**
```cypher
MATCH (a:AuditLog)
WHERE a.entityType = 'System'
  AND 'configuration' IN a.changedFields
RETURN a.timestamp,
       a.entityId as system,
       a.userName as changedBy,
       a.changes.configuration
ORDER BY a.timestamp DESC
```

**Find related changes:**
```cypher
MATCH (a:AuditLog)
WHERE a.correlationId = 'deployment-2025-11-05'
RETURN a
ORDER BY a.timestamp ASC
```

### Usage Analytics

**Most active users:**
```cypher
MATCH (a:AuditLog)
WHERE a.timestamp >= datetime() - duration('P30D')
RETURN a.userId, a.userName, count(*) as actionCount
ORDER BY actionCount DESC
LIMIT 10
```

**Activity by operation type:**
```cypher
MATCH (a:AuditLog)
WHERE a.timestamp >= datetime() - duration('P7D')
RETURN a.operation, count(*) as count
ORDER BY count DESC
```

**Most modified entities:**
```cypher
MATCH (a:AuditLog)
WHERE a.timestamp >= datetime() - duration('P30D')
RETURN a.entityType, a.entityId, count(*) as changes
ORDER BY changes DESC
LIMIT 20
```

### Vulnerability Tracking

**Track vulnerability lifecycle:**
```cypher
MATCH (a:AuditLog)
WHERE a.entityType = 'Component'
  AND a.operation IN ['VULNERABILITY_DETECTED', 'VULNERABILITY_RESOLVED']
RETURN a.timestamp,
       a.entityId as component,
       a.operation,
       a.metadata.vulnerabilityId as cve,
       a.metadata.severity
ORDER BY a.timestamp DESC
```

## Best Practices

### Provide Context

Always include meaningful information when making changes:

```javascript
// Good: Include reason and tags
await updateTechnology({
  name: 'React',
  status: 'deprecated',
  reason: 'Migrating to Vue.js as per architecture decision ADR-2025-11',
  tags: ['migration', 'architecture-decision']
})

// Better: Also include correlation ID for related changes
await updateTechnology({
  name: 'React',
  status: 'deprecated',
  reason: 'Migrating to Vue.js as per architecture decision ADR-2025-11',
  correlationId: 'migration-react-to-vue',
  tags: ['migration', 'architecture-decision', 'frontend']
})
```

### Use Tags Effectively

Categorize changes for easier filtering:
- `security` - Security-related changes
- `compliance` - Compliance-driven changes
- `critical` - Critical changes requiring attention
- `automated` - System-generated changes
- `migration` - Part of a migration effort
- `incident` - Related to an incident response

### Group Related Changes

Use session and correlation IDs to link related operations:

```javascript
const correlationId = `deployment-${Date.now()}`

// All these changes will be linked
await deploySystem(systemId, { correlationId })
await updateComponents(systemId, { correlationId })
await notifyTeam(teamId, { correlationId })
```

### Review Regularly

Set up regular audit reviews:
- **Daily**: Check for suspicious activities
- **Weekly**: Review all administrative actions
- **Monthly**: Analyze usage patterns and trends
- **Quarterly**: Generate compliance reports

## Data Retention

### Default Retention

Audit logs are retained indefinitely by default to support compliance requirements.

### Custom Retention Policies

Organizations may implement custom retention policies:

```cypher
// Archive logs older than 1 year
MATCH (a:AuditLog)
WHERE a.timestamp < datetime() - duration('P365D')
// Move to archive or external storage
```

### Compliance Considerations

Before implementing retention policies, consider:
- Regulatory requirements (some require 7 years)
- Industry standards (PCI DSS requires 1 year)
- Legal obligations and potential litigation
- Organizational policies

## Performance

### Query Optimization

The audit system uses comprehensive indexing for performance:

```cypher
// Efficient: Uses indexes
MATCH (a:AuditLog)
WHERE a.entityType = 'Technology'
  AND a.entityId = 'React'
  AND a.timestamp >= datetime() - duration('P90D')
RETURN a
ORDER BY a.timestamp DESC
LIMIT 100
```

### Pagination

For large result sets, use pagination:

```cypher
MATCH (a:AuditLog)
WHERE a.entityType = 'Technology'
RETURN a
ORDER BY a.timestamp DESC
SKIP 0
LIMIT 50
```

## Privacy and Security

### Access Control

Audit log access should be restricted:
- **Read**: Administrators, auditors, compliance officers
- **Write**: System only (never manual creation)
- **Delete**: Highly restricted or prohibited

### Sensitive Information

The audit system avoids logging:
- Passwords or authentication secrets
- API tokens or credentials
- Personally identifiable information (when possible)
- Credit card or payment information

### Compliance Support

Audit trails help demonstrate compliance with:

- **SOC 2**: Access controls and monitoring
- **GDPR**: Data processing activities and consent
- **HIPAA**: Access to protected health information
- **PCI DSS**: Changes to cardholder data environment
- **ISO 27001**: Information security management

## API Integration

Polaris provides API endpoints for working with audit logs:

### Query Audit Logs

```bash
# Get all audit logs for an entity
GET /api/audit/entity/Technology/React

# Get audit logs by user
GET /api/audit/user/{userId}

# Get audit logs by time range
GET /api/audit?from=2025-11-01&to=2025-11-07

# Get audit logs by operation
GET /api/audit?operation=APPROVE
```

### Create Audit Logs

Audit logs are created automatically by the system. When implementing new features that modify data, ensure they create appropriate audit entries:

```typescript
import { createAuditLog } from '~/server/utils/audit'

// After making a change
await createAuditLog({
  operation: 'APPROVE',
  entityType: 'Technology',
  entityId: 'React',
  userId: currentUser.id,
  changes: {
    timeCategory: { before: null, after: 'invest' }
  },
  reason: request.body.reason,
  source: 'UI',
  tags: ['approval']
})
```

## Roadmap

Planned enhancements:

- [ ] Real-time audit log streaming to external systems
- [ ] Interactive audit log dashboard with visualizations
- [ ] Automated anomaly detection using machine learning
- [ ] Export to SIEM systems (Splunk, ELK, etc.)
- [ ] Audit log compression and archival
- [ ] Advanced search with full-text indexing
- [ ] Custom alerts for specific operations

## Related Documentation

- [Graph Model](/architecture/graph-model) - Understanding the data model
- [Schema Documentation](/schema/schema/README_AUDIT_TRAIL.md) - Technical details
- [Example Queries](/schema/fixtures/audit-trail-examples.cypher) - Query examples

## Summary

The Polaris audit trail system provides:

✅ **Complete Traceability** - Track every change with full context
✅ **User Accountability** - Know who made each decision and why  
✅ **Compliance Support** - Meet regulatory requirements automatically
✅ **Security Monitoring** - Detect and investigate suspicious activities
✅ **Debugging Aid** - Understand what changed before incidents
✅ **Usage Analytics** - Analyze patterns and trends over time

With comprehensive audit logging, Polaris helps organizations maintain governance, ensure compliance, and build trust in their technology catalog.
