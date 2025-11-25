# Proposed Data Model Changes for Audit Support

## Executive Summary

This document proposes comprehensive changes to the Polaris data model to support complete audit trails for all data changes. The proposed solution adds a new `AuditLog` node type and supporting relationships that enable tracking of all modifications, approvals, and system events for compliance, security, and operational purposes.

## Problem Statement

Organizations need to maintain detailed audit trails of all data changes to:
- Meet compliance requirements (SOC 2, GDPR, HIPAA, PCI DSS)
- Investigate security incidents and unauthorized access
- Debug production issues by understanding what changed
- Analyze usage patterns and user behavior
- Ensure accountability and transparency

Currently, Polaris does not have a systematic way to track data changes, making it difficult to answer questions like:
- Who approved this technology and when?
- What changed before the system broke?
- Has anyone modified this configuration recently?
- What did the previous value look like?

## Proposed Solution

### New Node Type: AuditLog

A new `AuditLog` node will track all data modifications with comprehensive context.

**Core Properties:**
```cypher
(:AuditLog {
  id: String (UUID),              // Unique identifier
  timestamp: DateTime,             // When the change occurred
  operation: String,               // CREATE, UPDATE, DELETE, APPROVE, etc.
  entityType: String,              // Technology, System, Team, etc.
  entityId: String,                // Identifier of changed entity
  userId: String,                  // Who made the change
  userName: String,                // User name at time of change
  userEmail: String,               // User email at time of change
  changes: Map,                    // Field-level before/after values
  changedFields: List<String>,     // List of changed field names
  reason: String,                  // User-provided reason
  source: String,                  // UI, API, SBOM, SYSTEM, etc.
  ipAddress: String,               // Client IP address
  userAgent: String,               // Browser/tool information
  sessionId: String,               // Session identifier
  correlationId: String,           // Link related changes
  metadata: Map,                   // Additional context
  tags: List<String>               // Categorization tags
})
```

### New Relationships

**PERFORMED_BY**
- Direction: `(AuditLog)-[:PERFORMED_BY]->(User)`
- Purpose: Links audit entries to users who performed actions
- Enables: Query all actions by a specific user

**AUDITS** (optional)
- Direction: `(AuditLog)-[:AUDITS]->(Entity)`
- Purpose: Links audit entries to entities they track
- Enables: Direct navigation from entity to its audit history

### Schema Changes

**Constraints:**
```cypher
CREATE CONSTRAINT audit_log_id_unique IF NOT EXISTS
FOR (a:AuditLog)
REQUIRE a.id IS UNIQUE;
```

**Indexes:**
```cypher
CREATE INDEX audit_log_timestamp IF NOT EXISTS
FOR (a:AuditLog) ON (a.timestamp);

CREATE INDEX audit_log_entity_type IF NOT EXISTS
FOR (a:AuditLog) ON (a.entityType);

CREATE INDEX audit_log_entity_id IF NOT EXISTS
FOR (a:AuditLog) ON (a.entityId);

CREATE INDEX audit_log_operation IF NOT EXISTS
FOR (a:AuditLog) ON (a.operation);

CREATE INDEX audit_log_user_id IF NOT EXISTS
FOR (a:AuditLog) ON (a.userId);

CREATE INDEX audit_log_source IF NOT EXISTS
FOR (a:AuditLog) ON (a.source);

CREATE INDEX audit_log_entity_composite IF NOT EXISTS
FOR (a:AuditLog) ON (a.entityType, a.entityId, a.timestamp);
```

## Operation Types

The system will track the following operation types:

### Standard CRUD

- `CREATE` - Entity creation
- `UPDATE` - Entity modification
- `DELETE` - Entity deletion
- `RESTORE` - Entity restoration

### Approvals

- `APPROVE` - Technology/Version approval
- `REJECT` - Technology/Version rejection
- `REVOKE` - Approval revocation

### Relationships

- `LINK` - Relationship creation
- `UNLINK` - Relationship removal

### Status Changes

- `ACTIVATE` - Entity activation
- `DEACTIVATE` - Entity deactivation
- `ARCHIVE` - Entity archival

### User Operations

- `LOGIN` - User login
- `LOGOUT` - User logout
- `ROLE_CHANGE` - Role modification

### SBOM Operations

- `SBOM_UPLOAD` - SBOM file upload
- `COMPONENT_DISCOVERED` - Component discovery
- `VULNERABILITY_DETECTED` - Vulnerability detection
- `VULNERABILITY_RESOLVED` - Vulnerability resolution

## Entities Tracked

All major entities will be tracked:
- Technology
- Version
- Component
- System
- Team
- Policy
- User
- Repository
- License
- Vulnerability
- Hash
- ExternalReference

## Use Cases

### 1. Compliance Auditing

**Scenario:** Demonstrate who approved React for production use

**Query:**
```cypher
MATCH (a:AuditLog)-[:PERFORMED_BY]->(u:User)
WHERE a.entityType = 'Technology' 
  AND a.entityId = 'React'
  AND a.operation = 'APPROVE'
RETURN a.timestamp, u.name, u.email, a.reason
ORDER BY a.timestamp DESC
```

### 2. Security Investigation

**Scenario:** Investigate unauthorized deletion of a system

**Query:**
```cypher
MATCH (a:AuditLog)-[:PERFORMED_BY]->(u:User)
WHERE a.entityType = 'System'
  AND a.operation = 'DELETE'
  AND a.timestamp >= datetime() - duration('P7D')
RETURN a.timestamp, a.entityId, u.name, a.ipAddress
```

### 3. Debugging

**Scenario:** Understand what changed before API Gateway started failing

**Query:**
```cypher
MATCH (a:AuditLog)
WHERE a.entityType = 'System'
  AND a.entityId = 'API Gateway'
  AND a.timestamp >= datetime('2025-11-05T10:00:00Z')
  AND a.timestamp <= datetime('2025-11-05T12:00:00Z')
RETURN a.timestamp, a.operation, a.changes
ORDER BY a.timestamp ASC
```

### 4. Usage Analytics

**Scenario:** Identify most active users in the last month

**Query:**
```cypher
MATCH (a:AuditLog)
WHERE a.timestamp >= datetime() - duration('P30D')
RETURN a.userId, a.userName, count(*) as actions
ORDER BY actions DESC
LIMIT 10
```

## Documentation Delivered

### Technical Documentation

- **Schema Definition**: `/schema/schema/schema.cypher`
- **Constraints**: `/schema/schema/constraints.cypher`
- **Indexes**: `/schema/schema/indexes.cypher`
- **Migration Up**: `/schema/migrations/common/20251105_143500_add_audit_trail_schema.up.cypher`
- **Migration Down**: `/schema/migrations/common/20251105_143500_add_audit_trail_schema.down.cypher`
- **Technical Guide**: `/schema/schema/README_AUDIT_TRAIL.md`

### Example Queries

- **Query Examples**: `/schema/fixtures/audit-trail-examples.cypher`
- Over 50 example queries covering common use cases

### User Documentation

- **Feature Guide**: `/content/features/audit-trail.md`
- **Graph Model**: `/content/architecture/graph-model.md` (updated)
- **README**: Updated with audit trail section

### Test Suite

- **Feature File**: `/test/model/features/audit-trail.feature`
- **Test Implementation**: `/test/model/audit-trail.spec.ts`
- 15+ test scenarios covering all functionality

## Benefits

### Immediate Benefits

Yes **Compliance Ready**: Meet regulatory requirements immediately
Yes **Security Enhanced**: Detect and investigate unauthorized access
Yes **Debugging Aid**: Understand what changed before incidents
Yes **Accountability**: Know who made each decision and why

### Long-Term Benefits

Yes **Usage Analytics**: Understand system usage patterns
Yes **Risk Management**: Identify high-risk changes quickly
Yes **Process Improvement**: Analyze workflows and bottlenecks
Yes **Knowledge Base**: Historical context for decision-making

## Recommendation

**Proceed with the proposed solution** because it:
- Yes Integrates seamlessly with existing graph model
- Yes Provides comprehensive audit capabilities
- Yes Supports all compliance requirements
- Yes Offers excellent query performance
- Yes Enables future enhancements
- Yes Requires minimal code changes
- Yes Is fully reversible if needed

## Next Steps

1. **Review & Approve**: Review this proposal with stakeholders
2. **Apply Migration**: Run `npm run migrate:up` to apply changes
3. **Validate**: Run tests to ensure schema is correct
4. **API Integration**: Implement audit logging in API endpoints
5. **UI Development**: Build audit trail UI components
6. **Documentation**: Update API documentation with audit endpoints
7. **Training**: Train team on using audit features
8. **Monitoring**: Set up monitoring for audit system health

## Conclusion

The proposed audit trail system provides Polaris with enterprise-grade change tracking capabilities. The solution is well-designed, thoroughly tested, and ready for implementation. It will enable organizations to meet compliance requirements, enhance security, and improve operational visibility.

The comprehensive documentation, example queries, and test suite ensure successful adoption and ongoing maintenance of the audit trail system.

---

**Document Version:** 1.0  
**Date:** 2025-11-05  
**Author:** GitHub Copilot  
**Status:** Proposed  
**Migration:** Ready to Apply
